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
  'Executive Recruiter': 'You are an Executive Recruiter. Be formal, professional, and concise. Ask competency-based interview questions and require measurable examples.',
  'Angel Investor': 'You are an Angel Investor. Be challenging, analytical, and probing. Pressure-test assumptions, traction, market size, and unit economics.',
  Salesman: 'You are a Salesman. Be energetic, persuasive, and conversational. Push for strong value articulation, objection handling, and clear closes.',
  'Strict Academic Supervisor': 'You are a Strict Academic Supervisor. Be serious, critical, and analytical. Challenge weak arguments and require precise evidence.',
  'Company Manager': 'You are a Company Manager. Be practical, professional, and structured. Focus on prioritization, accountability, and execution clarity.',
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

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const forcedStopRef = useRef(false);
  const sessionTimerRef = useRef<number | null>(null);
  const transcriptRef = useRef<TranscriptionItem[]>([]);
  const questionCountRef = useRef(0);
  const nextPlaybackAtRef = useRef(0);

  const apiKey = useMemo(() => import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '', []);

  const pushTranscript = useCallback((speaker: 'user' | 'ai', text: string) => {
    const item: TranscriptionItem = { speaker, text, timestamp: Date.now() };
    transcriptRef.current = [...transcriptRef.current, item];
    setTranscriptions(transcriptRef.current);
  }, []);

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
    source.onended = () => {
      if (sessionActive) setSessionState('Listening');
    };
  }, [sessionActive]);

  const handleSocketMessage = useCallback((event: MessageEvent) => {
    let payload: any;
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
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
      throw new Error('Missing Gemini API key. Set VITE_GEMINI_API_KEY.');
    }

    const instructionText = ROLE_INSTRUCTIONS[selectedRole];
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
        const channelData = audioEvent.inputBuffer.getChannelData(0);
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
  }, [apiKey, closeSession, handleSocketMessage]);

  const startInterview = useCallback(() => {
    setError(null);
    setTranscriptions([]);
    transcriptRef.current = [];
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
    persistSession();
    closeSession('Ended');
  }, [closeSession, persistSession]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto px-4 lg:px-8 gap-5">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="text-lg font-bold text-white">Live Neural Interview</h2>
        <p className="text-xs text-slate-400 mt-1">Live Gemini bidi stream with microphone PCM16@16kHz uplink and real-time audio playback.</p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as RoleOption)}
            disabled={sessionActive}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          >
            {(Object.keys(ROLE_INSTRUCTIONS) as RoleOption[]).map((roleName) => (
              <option key={roleName} value={roleName}>{roleName}</option>
            ))}
          </select>

          {!sessionActive ? (
            <button onClick={startInterview} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-bold">
              Start Interview
            </button>
          ) : (
            <button onClick={stopInterview} className="rounded-lg bg-rose-600 hover:bg-rose-500 px-4 py-2 text-sm font-bold">
              Stop Interview
            </button>
          )}

          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs">State: {sessionState}</span>
          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs">Question Limit: {ROLE_QUESTION_LIMIT[role]}</span>
          <button onClick={onExit} className="rounded-lg border border-slate-700 px-4 py-2 text-xs">Exit</button>
        </div>

        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-900/40 border border-slate-800 rounded-3xl">
        {transcriptions.length === 0 ? (
          <p className="text-slate-500 text-sm">No transcript yet. Start interview to begin real-time streaming.</p>
        ) : transcriptions.map((t, idx) => (
          <div key={`${t.timestamp}-${idx}`} className={`flex ${t.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm ${t.speaker === 'user' ? 'bg-blue-600' : 'bg-slate-800 border border-slate-700'}`}>
              {t.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversationRoom;
