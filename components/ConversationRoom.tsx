import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConversationHistoryItem, NeuralSpeechScoreCard, Persona, TranscriptionItem } from '../types';
import { setUserConversationHistory, getUserConversationHistory } from '../lib/userStorage';
import { hasPaidSubscription, isAdminEmail } from '../lib/subscription';

interface ConversationRoomProps {
  persona: Persona;
  onExit: () => void;
}

type SessionState = 'Idle' | 'Listening' | 'Thinking' | 'Speaking' | 'Ended';

type RoleOption =
  | 'Executive Recruiter'
  | 'Angel Investor'
  | 'Salesman'
  | 'Strict Academic Supervisor'
  | 'Company Manager';

const ROLE_INSTRUCTIONS: Record<RoleOption, string> = {
  'Executive Recruiter': 'You are an Executive Recruiter. Stay in-role with formal, professional, and concise interview delivery. Ask competency-based questions only, require measurable examples, and never switch personas.',
  'Angel Investor': 'You are an Angel Investor. Stay in-role with challenging, analytical, and probing investor questioning. Pressure-test assumptions, traction, market size, and unit economics without leaving the investor perspective.',
  Salesman: 'You are a Salesman. Stay in-role with energetic, persuasive, and conversational momentum. Drive value articulation, objection handling, and clear closes while maintaining a professional sales posture.',
  'Strict Academic Supervisor': 'You are a Strict Academic Supervisor. Stay in-role with serious, critical, and analytical academic standards. Challenge weak arguments, require precise evidence, and preserve strict supervisory tone.',
  'Company Manager': 'You are a Company Manager. Stay in-role with practical, professional, and structured management dialogue. Focus on prioritization, accountability, and execution clarity as a manager at all times.',
};

const ROLE_QUESTION_LIMIT: Record<RoleOption, number> = {
  'Executive Recruiter': 6,
  'Angel Investor': 8,
  Salesman: 7,
  'Strict Academic Supervisor': 6,
  'Company Manager': 6,
};

const FILLER_WORDS = new Set(['um', 'uh', 'like', 'you know', 'actually', 'basically', 'literally', 'so']);
const GEMINI_WS_ENDPOINT = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';

const clampScore = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const buildNeuralSpeechScoreCard = (items: TranscriptionItem[]): NeuralSpeechScoreCard => {
  const userTurns = items.filter((item) => item.speaker === 'user');
  const fullText = userTurns.map((item) => item.text.toLowerCase()).join(' ');
  const words = fullText.match(/\b[\w']+\b/g) || [];
  const totalWords = words.length;

  let fillerCount = 0;
  for (const filler of FILLER_WORDS) {
    if (filler.includes(' ')) {
      const escaped = filler.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const multiWordMatches = fullText.match(new RegExp(`\\b${escaped}\\b`, 'g'));
      fillerCount += multiWordMatches?.length || 0;
    } else {
      fillerCount += words.filter((word) => word === filler).length;
    }
  }

  const sentences = userTurns.flatMap((turn) => turn.text.split(/[.!?]+/)).map((part) => part.trim()).filter(Boolean);
  const averageWordsPerSentence = !sentences.length || !totalWords ? totalWords : totalWords / sentences.length;
  const avgWordsPerTurn = userTurns.length ? totalWords / userTurns.length : 0;
  const fillerDensity = totalWords ? (fillerCount / totalWords) * 100 : 0;

  const confidenceScore = clampScore(100 - fillerDensity * 4);
  const clarityScore = clampScore(100 - Math.abs(averageWordsPerSentence - 16) * 4);
  const concisenessScore = clampScore(100 - Math.max(avgWordsPerTurn - 28, 0) * 3);
  const overallScore = clampScore(confidenceScore * 0.35 + clarityScore * 0.35 + concisenessScore * 0.3);

  return {
    overallScore,
    totalWords,
    fillerCount,
    fillerDensity: Math.round(fillerDensity * 10) / 10,
    avgWordsPerTurn: Math.round(avgWordsPerTurn * 10) / 10,
    confidenceScore,
    clarityScore,
    concisenessScore,
    summary: overallScore >= 70 ? 'Strong communication baseline.' : 'Continue structured speaking drills.',
  };
};

const downsampleTo16kPcm16 = (input: Float32Array, inputSampleRate: number): Int16Array => {
  if (inputSampleRate === 16000) {
    const pcm16 = new Int16Array(input.length);
    for (let i = 0; i < input.length; i += 1) {
      const s = Math.max(-1, Math.min(1, input[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm16;
  }

  const ratio = inputSampleRate / 16000;
  const newLength = Math.round(input.length / ratio);
  const result = new Int16Array(newLength);

  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;

    for (let i = offsetBuffer; i < nextOffsetBuffer && i < input.length; i += 1) {
      accum += input[i];
      count += 1;
    }

    const sample = count ? accum / count : 0;
    const clamped = Math.max(-1, Math.min(1, sample));
    result[offsetResult] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
};

const base64FromInt16 = (pcm16: Int16Array): string => {
  const bytes = new Uint8Array(pcm16.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const ConversationRoom: React.FC<ConversationRoomProps> = ({ persona, onExit }) => {
  const [role, setRole] = useState<RoleOption>((Object.keys(ROLE_INSTRUCTIONS).includes(persona.role) ? persona.role : 'Executive Recruiter') as RoleOption);
  const [sessionState, setSessionState] = useState<SessionState>('Idle');
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isHumanSpeaking, setIsHumanSpeaking] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const forcedStopRef = useRef(false);
  const sessionTimerRef = useRef<number | null>(null);
  const aiSpeakingTimeoutRef = useRef<number | null>(null);
  const humanSpeakingTimeoutRef = useRef<number | null>(null);
  const transcriptRef = useRef<TranscriptionItem[]>([]);
  const questionCountRef = useRef(0);
  const nextPlaybackAtRef = useRef(0);
  const latestUserTranscriptRef = useRef('');

  const apiKey = useMemo(
    () =>
      import.meta.env.VITE_GEMINI_API_KEY ||
      import.meta.env.VITE_API_KEY ||
      import.meta.env.GEMINI_API_KEY ||
      import.meta.env.API_KEY ||
      '',
    [],
  );

  const pushTranscript = useCallback((speaker: 'user' | 'ai', text: string) => {
    const item: TranscriptionItem = { speaker, text, timestamp: Date.now() };
    transcriptRef.current = [...transcriptRef.current, item];
    setTranscriptions(transcriptRef.current);
  }, []);

  const currentUserName = useMemo(() => {
    const currentUser = JSON.parse(localStorage.getItem('tm_current_user') || '{}');
    return currentUser?.name || currentUser?.email || 'You';
  }, []);

  const aiName = useMemo(() => `${role} AI`, [role]);
  const aiTurns = useMemo(() => transcriptions.filter((item) => item.speaker === 'ai'), [transcriptions]);
  const userTurns = useMemo(() => transcriptions.filter((item) => item.speaker === 'user'), [transcriptions]);
  const neuralIntensity = useMemo(() => `${persona.difficultyLevel || 5}/10`, [persona.difficultyLevel]);

  const stopAudioPipeline = useCallback(() => {
    processorRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    processorRef.current = null;
    sourceNodeRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      void audioCtxRef.current.close();
    }
    audioCtxRef.current = null;
  }, []);

  const markAiSpeaking = useCallback(() => {
    setIsAiSpeaking(true);
    if (aiSpeakingTimeoutRef.current) {
      window.clearTimeout(aiSpeakingTimeoutRef.current);
    }
    aiSpeakingTimeoutRef.current = window.setTimeout(() => setIsAiSpeaking(false), 260);
  }, []);

  const markHumanSpeaking = useCallback(() => {
    setIsHumanSpeaking(true);
    if (humanSpeakingTimeoutRef.current) {
      window.clearTimeout(humanSpeakingTimeoutRef.current);
    }
    humanSpeakingTimeoutRef.current = window.setTimeout(() => setIsHumanSpeaking(false), 260);
  }, []);

  const closeSession = useCallback((state: SessionState = 'Ended') => {
    forcedStopRef.current = true;
    if (sessionTimerRef.current) {
      window.clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    wsRef.current?.close();
    wsRef.current = null;
    stopAudioPipeline();
    setSessionActive(false);
    setSessionState(state);
    setIsAiSpeaking(false);
    setIsHumanSpeaking(false);
  }, [stopAudioPipeline]);

  const persistSession = useCallback(() => {
    if (!transcriptRef.current.length) return;
    const currentUser = JSON.parse(localStorage.getItem('tm_current_user') || '{}');
    const historyItem: ConversationHistoryItem = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      persona: { ...persona, role },
      transcriptions: transcriptRef.current,
      scoreCard: buildNeuralSpeechScoreCard(transcriptRef.current),
    };
    const history = getUserConversationHistory(currentUser.id);
    setUserConversationHistory(currentUser.id, [historyItem, ...history].slice(0, 50));
  }, [persona, role]);

  const playPcmChunk = useCallback((base64Data: string, sampleRate: number) => {
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;

    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i += 1) float32[i] = pcm16[i] / 0x8000;

    const buffer = audioCtx.createBuffer(1, float32.length, sampleRate);
    buffer.copyToChannel(float32, 0);

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    const startAt = Math.max(now + 0.02, nextPlaybackAtRef.current || now + 0.02);
    source.start(startAt);
    nextPlaybackAtRef.current = startAt + buffer.duration;
    setSessionState('Speaking');
    markAiSpeaking();
    source.onended = () => {
      if (sessionActive) setSessionState('Listening');
    };
  }, [markAiSpeaking, sessionActive]);

  const handleSocketMessage = useCallback((event: MessageEvent) => {
    let payload: any;
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }

    const userTranscript =
      payload?.serverContent?.inputTranscription?.text ||
      payload?.serverContent?.inputTranscription?.transcript ||
      payload?.inputTranscription?.text ||
      payload?.inputTranscription?.transcript;
    if (typeof userTranscript === 'string' && userTranscript.trim()) {
      const normalizedTranscript = userTranscript.trim();
      if (normalizedTranscript !== latestUserTranscriptRef.current) {
        latestUserTranscriptRef.current = normalizedTranscript;
        pushTranscript('user', normalizedTranscript);
      }
    }

    if (payload?.serverContent?.modelTurn?.parts) {
      const parts = payload.serverContent.modelTurn.parts as any[];
      parts.forEach((part) => {
        if (part?.text) {
          pushTranscript('ai', part.text);
          questionCountRef.current += 1;
          if (questionCountRef.current >= ROLE_QUESTION_LIMIT[role]) {
            closeSession();
          }
        }

        const audio = part?.inlineData;
        if (audio?.data && typeof audio.data === 'string') {
          const mime = audio.mimeType || 'audio/pcm;rate=24000';
          const rateMatch = /rate=(\d+)/.exec(mime);
          const sampleRate = rateMatch ? Number(rateMatch[1]) : 24000;
          playPcmChunk(audio.data, sampleRate);
        }
      });
    }

    if (payload?.serverContent?.generationComplete) {
      setSessionState('Listening');
    }
  }, [closeSession, playPcmChunk, pushTranscript, role]);

  // Generic live session opener required for all role variants.
  const openLiveSession = useCallback(async (selectedRole: RoleOption) => {
    const currentUser = JSON.parse(localStorage.getItem('tm_current_user') || '{}');
    const adminUser = isAdminEmail(currentUser?.email);
    if (!adminUser && !hasPaidSubscription()) {
      throw new Error('Paid subscription is required for live Gemini audio sessions.');
    }

    if (!apiKey) {
      throw new Error('Missing Gemini API key. Set VITE_GEMINI_API_KEY (or VITE_API_KEY).');
    }

    const instructionText = `${ROLE_INSTRUCTIONS[selectedRole]} Address the user as ${persona.name}. Keep language output in ${persona.language || 'English'} unless asked to switch.`;
    const ws = new WebSocket(`${GEMINI_WS_ENDPOINT}?key=${encodeURIComponent(apiKey)}`);
    wsRef.current = ws;

    ws.onopen = async () => {
      reconnectAttemptsRef.current = 0;
      setSessionState('Thinking');
      ws.send(
        JSON.stringify({
          setup: {
            model: 'models/gemini-2.0-flash-exp',
            systemInstruction: {
              parts: [{ text: instructionText }],
            },
            generationConfig: {
              responseModalities: ['AUDIO'],
            },
          },
        }),
      );

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      nextPlaybackAtRef.current = audioCtx.currentTime;

      const sourceNode = audioCtx.createMediaStreamSource(stream);
      sourceNodeRef.current = sourceNode;

      // ScriptProcessor keeps vanilla Web API compatibility for real-time PCM capture.
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      sourceNode.connect(processor);
      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (audioEvent) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        if (isMicMuted) return;
        const channelData = audioEvent.inputBuffer.getChannelData(0);
        let peak = 0;
        for (let i = 0; i < channelData.length; i += 1) {
          peak = Math.max(peak, Math.abs(channelData[i]));
        }
        if (peak > 0.03) {
          markHumanSpeaking();
        }
        const pcm16 = downsampleTo16kPcm16(channelData, audioCtx.sampleRate);
        const b64 = base64FromInt16(pcm16);
        wsRef.current.send(
          JSON.stringify({
            realtimeInput: {
              mediaChunks: [
                {
                  mimeType: 'audio/pcm;rate=16000',
                  data: b64,
                },
              ],
            },
          }),
        );
      };

      setSessionState('Listening');
      setSessionActive(true);
      sessionTimerRef.current = window.setTimeout(() => closeSession(), 60_000);
    };

    ws.onmessage = handleSocketMessage;

    ws.onerror = () => {
      setError('Live socket error occurred. Reconnecting...');
    };

    ws.onclose = () => {
      if (forcedStopRef.current) return;

      if (reconnectAttemptsRef.current >= 3) {
        setError('Connection closed after retries. Please start again.');
        closeSession('Ended');
        return;
      }

      reconnectAttemptsRef.current += 1;
      setSessionState('Thinking');
      window.setTimeout(() => {
        void openLiveSession(selectedRole).catch((err) => {
          setError(err instanceof Error ? err.message : 'Reconnect failed.');
          closeSession('Ended');
        });
      }, 800 * reconnectAttemptsRef.current);
    };
  }, [apiKey, closeSession, handleSocketMessage, isMicMuted, markHumanSpeaking]);

  const startInterview = useCallback(() => {
    setError(null);
    setTranscriptions([]);
    transcriptRef.current = [];
    latestUserTranscriptRef.current = '';
    questionCountRef.current = 0;
    forcedStopRef.current = false;
    void openLiveSession(role).catch((err) => {
      setError(err instanceof Error ? err.message : 'Unable to start live session.');
      closeSession('Ended');
    });
  }, [closeSession, openLiveSession, role]);

  const stopInterview = useCallback(() => {
    persistSession();
    closeSession('Ended');
  }, [closeSession, persistSession]);

  useEffect(() => () => {
    if (aiSpeakingTimeoutRef.current) {
      window.clearTimeout(aiSpeakingTimeoutRef.current);
    }
    if (humanSpeakingTimeoutRef.current) {
      window.clearTimeout(humanSpeakingTimeoutRef.current);
    }
    persistSession();
    closeSession('Ended');
  }, [closeSession, persistSession]);

  return (
    <div className="mx-auto flex h-[calc(100vh-7.5rem)] w-full max-w-5xl flex-col px-4 pb-4 lg:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500/50 to-blue-500/60 text-xl font-bold text-white ring-2 ring-indigo-500/40">🧠</div>
          <div>
            <h2 className="text-3xl font-bold leading-none text-white">{persona.name}</h2>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-blue-300">{role}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.18em]">
              <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-sky-200">Neural Feed: {sessionActive ? 'Active' : 'Idle'}</span>
              <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 text-indigo-100">Intensity: {neuralIntensity}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-700 bg-slate-900/70 px-6 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-100">{persona.language || 'English'}</span>
          {!sessionActive ? (
            <button onClick={startInterview} className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-6 py-2 text-xs font-bold uppercase tracking-[0.12em] text-emerald-100 hover:bg-emerald-500/25">
              Start Session
            </button>
          ) : (
            <button onClick={stopInterview} className="rounded-full border border-rose-400/30 bg-rose-500/15 px-6 py-2 text-xs font-bold uppercase tracking-[0.12em] text-rose-100 hover:bg-rose-500/25">
              End Session
            </button>
          )}
          <button onClick={onExit} className="rounded-full border border-slate-700 bg-slate-900/70 px-6 py-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-100 hover:bg-slate-800/80">Exit Session</button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-blue-500/20 bg-[#020b2a]">
        <div className="h-[34%] border-b border-blue-500/10 bg-gradient-to-b from-[#020824] to-[#020a22] px-6 py-8 text-center">
          <div className="mx-auto mt-12 max-w-xs border-t border-dashed border-blue-300/30 pt-4 text-[11px] font-semibold uppercase tracking-[0.35em] text-blue-200/45">
            {sessionActive ? `Session ${sessionState}` : 'Awaiting Neural Input'}
          </div>
        </div>

        <div className="relative flex-1 overflow-y-auto bg-[#081838] px-6 py-5">
          {error && <p className="mb-4 text-sm text-rose-300">{error}</p>}
          <div className="space-y-4 pb-16">
            {aiTurns.length === 0 && userTurns.length === 0 ? (
              <p className="text-xs uppercase tracking-[0.22em] text-blue-200/40">Live neural stream online. Waiting for the first linguistic impulse.</p>
            ) : null}

            {aiTurns.map((turn, idx) => (
              <div key={`${turn.timestamp}-${idx}`} className="flex justify-start">
                <div className="max-w-[75%] rounded-2xl border border-indigo-400/30 bg-indigo-500/15 px-4 py-3 text-sm text-indigo-50">{turn.text}</div>
              </div>
            ))}

            {userTurns.map((turn, idx) => (
              <div key={`${turn.timestamp}-${idx}`} className="flex justify-end">
                <div className="max-w-[75%] rounded-2xl border border-blue-300/35 bg-blue-500 px-4 py-3 text-sm font-semibold text-white">{turn.text}</div>
              </div>
            ))}
          </div>

          <div className="absolute right-8 top-8 text-right">
            <div className="inline-flex h-16 w-20 items-center justify-center rounded-2xl bg-blue-500 text-3xl font-semibold text-blue-100 shadow-[0_0_24px_rgba(59,130,246,0.35)]">{isAiSpeaking ? '…' : ''}</div>
            <p className="mt-2 text-[10px] uppercase tracking-[0.28em] text-blue-100/40">Linguistic Impulse</p>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full border border-cyan-400/20 bg-[#07112b] px-6 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100/70">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.8)]" />Signal Locked</span>
          <span className="text-slate-400">|</span>
          <span>Secure Neural Stream v3.2</span>
          <button
            type="button"
            onClick={() => setIsMicMuted((prev) => !prev)}
            className="pointer-events-auto rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-[10px] text-blue-100"
          >
            Mic {isMicMuted ? 'Off' : 'On'}
          </button>
          <span className={`pointer-events-auto neural-voice-bubble human ${isHumanSpeaking && !isMicMuted ? 'is-active' : ''}`} />
          <span className={`pointer-events-auto neural-voice-bubble ${isAiSpeaking ? 'is-active' : ''}`} />
        </div>
      </div>
      <p className="mt-3 text-center text-[10px] uppercase tracking-[0.22em] text-slate-500">{aiName} • Max prompts {ROLE_QUESTION_LIMIT[role]} • Candidate {currentUserName}</p>
    </div>
  );
};

export default ConversationRoom;
