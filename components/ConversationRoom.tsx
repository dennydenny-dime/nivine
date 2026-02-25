import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConversationHistoryItem, NeuralSpeechScoreCard, Persona, TranscriptionItem } from '../types';
import { setUserConversationHistory, getUserConversationHistory } from '../lib/userStorage';

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

type StreamEvent = {
  event: string;
  data: string;
};

type SpeechRecognitionEventLike = Event & {
  results: ArrayLike<{
    isFinal: boolean;
    0: {
      transcript: string;
    };
  }>;
};

type SpeechRecognitionLike = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
};

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

const backendBase = (import.meta.env.VITE_BACKEND_API_URL || '').replace(/\/$/, '');
const chatEndpoint = backendBase ? `${backendBase}/chat` : '/api/chat';

const getSpeechRecognition = (): (new () => SpeechRecognitionLike) | null => {
  const win = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };

  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
};

const ConversationRoom: React.FC<ConversationRoomProps> = ({ persona, onExit }) => {
  const [role] = useState<RoleOption>((Object.keys(ROLE_INSTRUCTIONS).includes(persona.role) ? persona.role : 'Executive Recruiter') as RoleOption);
  const [sessionState, setSessionState] = useState<SessionState>('Idle');
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isHumanSpeaking, setIsHumanSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const transcriptRef = useRef<TranscriptionItem[]>([]);
  const questionCountRef = useRef(0);
  const streamingBufferRef = useRef('');
  const aiSpeakingTimeoutRef = useRef<number | null>(null);
  const humanSpeakingTimeoutRef = useRef<number | null>(null);
  const sessionStateRef = useRef<SessionState>('Idle');
  const sessionActiveRef = useRef(false);
  const isMicMutedRef = useRef(false);
  const recognitionRestartTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    sessionStateRef.current = sessionState;
  }, [sessionState]);

  useEffect(() => {
    sessionActiveRef.current = sessionActive;
  }, [sessionActive]);

  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
  }, [isMicMuted]);

  const pushTranscript = useCallback((speaker: 'user' | 'ai', text: string) => {
    const item: TranscriptionItem = { speaker, text, timestamp: Date.now() };
    transcriptRef.current = [...transcriptRef.current, item];
    setTranscriptions(transcriptRef.current);
  }, []);

  const updateLastAiTurn = useCallback((text: string) => {
    const next = [...transcriptRef.current];
    const idx = [...next].reverse().findIndex((item) => item.speaker === 'ai');
    if (idx === -1) {
      pushTranscript('ai', text);
      return;
    }
    const absoluteIdx = next.length - 1 - idx;
    next[absoluteIdx] = { ...next[absoluteIdx], text };
    transcriptRef.current = next;
    setTranscriptions(next);
  }, [pushTranscript]);

  const markAiSpeaking = useCallback(() => {
    setIsAiSpeaking(true);
    if (aiSpeakingTimeoutRef.current) window.clearTimeout(aiSpeakingTimeoutRef.current);
    aiSpeakingTimeoutRef.current = window.setTimeout(() => setIsAiSpeaking(false), 280);
  }, []);

  const markHumanSpeaking = useCallback(() => {
    setIsHumanSpeaking(true);
    if (humanSpeakingTimeoutRef.current) window.clearTimeout(humanSpeakingTimeoutRef.current);
    humanSpeakingTimeoutRef.current = window.setTimeout(() => setIsHumanSpeaking(false), 280);
  }, []);

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

  const stopSession = useCallback((state: SessionState = 'Ended') => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (recognitionRestartTimeoutRef.current) {
      window.clearTimeout(recognitionRestartTimeoutRef.current);
      recognitionRestartTimeoutRef.current = null;
    }
    sessionActiveRef.current = false;
    setSessionActive(false);
    setSessionState(state);
    sessionStateRef.current = state;
    setIsAiSpeaking(false);
    setIsHumanSpeaking(false);
    setLiveTranscript('');
    setStatusBanner(null);
  }, []);

  const parseSseBlock = (block: string): StreamEvent | null => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return null;
    const event = lines.find((line) => line.startsWith('event:'))?.slice(6).trim() || 'message';
    const data = lines.filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('');
    return { event, data };
  };

  const streamAssistantReply = useCallback(async (transcript: string) => {
    setSessionState('Thinking');
    streamingBufferRef.current = '';
    pushTranscript('ai', '');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const response = await fetch(`${chatEndpoint}?stream=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        stream: true,
        transcript,
        language: persona.language || 'English',
        persona,
        roleDirectives: [ROLE_INSTRUCTIONS[role]],
        history: transcriptRef.current,
      }),
    });

    if (!response.ok || !response.body) {
      const details = await response.text();
      throw new Error(`Streaming request failed (${response.status}): ${details}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      pending += decoder.decode(value, { stream: true });
      const blocks = pending.split('\n\n');
      pending = blocks.pop() || '';

      for (const block of blocks) {
        const event = parseSseBlock(block);
        if (!event) continue;

        if (event.event === 'token') {
          try {
            const payload = JSON.parse(event.data) as { token?: string };
            if (!payload.token) continue;
            streamingBufferRef.current += payload.token;
            updateLastAiTurn(streamingBufferRef.current.trimStart());
            setSessionState('Speaking');
            markAiSpeaking();
          } catch {
            // ignore malformed token payload
          }
        }

        if (event.event === 'error') {
          const payload = JSON.parse(event.data) as { error?: string };
          throw new Error(payload.error || 'Unknown streaming error.');
        }
      }
    }

    questionCountRef.current += 1;
    if (questionCountRef.current >= ROLE_QUESTION_LIMIT[role]) {
      stopSession('Ended');
      return;
    }

    const text = streamingBufferRef.current.trim();
    if (text && !isMicMuted && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = persona.language || 'en-US';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }

    setSessionState('Listening');
  }, [isMicMuted, markAiSpeaking, persona, pushTranscript, role, stopSession, updateLastAiTurn]);

  const startInterview = useCallback(() => {
    if (sessionActiveRef.current) return;

    setError(null);
    setStatusBanner('Neural link established. Listening for your voice signal.');
    setTranscriptions([]);
    transcriptRef.current = [];
    questionCountRef.current = 0;
    setLiveTranscript('');

    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) {
      setError('Speech Recognition is unavailable in this browser.');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = persona.language || 'en-US';

    recognition.onresult = (event) => {
      if (sessionStateRef.current !== 'Listening') return;
      if (isMicMutedRef.current) return;

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.results.length - 1; i >= 0; i -= 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript?.trim();
        if (!transcript) continue;

        if (result.isFinal) {
          finalTranscript = transcript;
          break;
        }

        interimTranscript = transcript;
      }

      setLiveTranscript(interimTranscript);
      if (interimTranscript) {
        markHumanSpeaking();
      }
      if (!finalTranscript) return;

      pushTranscript('user', finalTranscript);
      setLiveTranscript('');
      markHumanSpeaking();
      void streamAssistantReply(finalTranscript).catch((err) => {
        setError(err instanceof Error ? err.message : 'Stream failed.');
        stopSession('Ended');
      });
    };

    recognition.onerror = (event) => {
      const errorType = event.error || 'unknown';
      if (errorType === 'network') {
        setError('Speech recognition network issue detected. Reconnecting neural microphone...');
        setStatusBanner('Neural microphone reconnecting...');
        if (sessionActiveRef.current && recognitionRef.current) {
          recognition.stop();
          if (recognitionRestartTimeoutRef.current) {
            window.clearTimeout(recognitionRestartTimeoutRef.current);
          }
          recognitionRestartTimeoutRef.current = window.setTimeout(() => {
            if (!sessionActiveRef.current || !recognitionRef.current) return;
            try {
              recognitionRef.current.start();
              setError(null);
              setStatusBanner('Neural link established. Listening for your voice signal.');
            } catch {
              stopSession('Ended');
            }
          }, 700);
          return;
        }
      }

      setError(`Speech recognition error: ${errorType}`);
      stopSession('Ended');
    };

    recognition.onend = () => {
      if (!sessionActiveRef.current) return;
      if (sessionStateRef.current === 'Listening') {
        try {
          recognition.start();
        } catch {
          setError('Speech recognizer was interrupted. Please start a new session.');
          stopSession('Ended');
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    sessionActiveRef.current = true;
    setSessionActive(true);
    setSessionState('Listening');
    sessionStateRef.current = 'Listening';

    const introLine = 'Neural link established.';
    pushTranscript('ai', introLine);

    if (!isMicMutedRef.current && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(introLine);
      utterance.lang = persona.language || 'en-US';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }, [markHumanSpeaking, persona.language, pushTranscript, stopSession, streamAssistantReply]);

  const stopInterview = useCallback(() => {
    persistSession();
    stopSession('Ended');
  }, [persistSession, stopSession]);

  useEffect(() => () => {
    if (aiSpeakingTimeoutRef.current) window.clearTimeout(aiSpeakingTimeoutRef.current);
    if (humanSpeakingTimeoutRef.current) window.clearTimeout(humanSpeakingTimeoutRef.current);
    if (recognitionRestartTimeoutRef.current) window.clearTimeout(recognitionRestartTimeoutRef.current);
    persistSession();
    stopSession('Ended');
  }, [persistSession, stopSession]);

  useEffect(() => {
    startInterview();
  }, [startInterview]);

  const currentUserName = useMemo(() => {
    const currentUser = JSON.parse(localStorage.getItem('tm_current_user') || '{}');
    return currentUser?.name || currentUser?.email || 'You';
  }, []);

  const aiName = useMemo(() => `${role} AI`, [role]);
  const aiTurns = useMemo(() => transcriptions.filter((item) => item.speaker === 'ai'), [transcriptions]);
  const userTurns = useMemo(() => transcriptions.filter((item) => item.speaker === 'user'), [transcriptions]);
  const neuralIntensity = useMemo(() => `${persona.difficultyLevel || 5}/10`, [persona.difficultyLevel]);

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
              <span className="rounded-md border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-1 text-fuchsia-100">Workflow: FE → SSE → Gemini Stream</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-700 bg-slate-900/70 px-6 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-100">{persona.language || 'English'}</span>
          <button onClick={stopInterview} className="rounded-full border border-rose-400/30 bg-rose-500/15 px-6 py-2 text-xs font-bold uppercase tracking-[0.12em] text-rose-100 hover:bg-rose-500/25">End Session</button>
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
          {statusBanner ? <p className="mb-2 text-xs uppercase tracking-[0.24em] text-cyan-200/80">{statusBanner}</p> : null}
          {error && <p className="mb-4 text-sm text-rose-300">{error}</p>}
          <div className="space-y-4 pb-16">
            {aiTurns.length === 0 && userTurns.length === 0 && !liveTranscript ? <p className="text-xs uppercase tracking-[0.22em] text-blue-200/40">Live neural stream online. Waiting for the first linguistic impulse.</p> : null}
            {transcriptions.map((turn, idx) => (
              <div key={`${turn.timestamp}-${idx}`} className={`flex ${turn.speaker === 'ai' ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${turn.speaker === 'ai' ? 'border border-indigo-400/30 bg-indigo-500/15 text-indigo-50' : 'border border-blue-300/35 bg-blue-500 font-semibold text-white'}`}
                >
                  {turn.text}
                </div>
              </div>
            ))}
            {liveTranscript ? (
              <div className="flex justify-end">
                <div className="max-w-[75%] whitespace-pre-wrap rounded-2xl border border-blue-300/35 bg-blue-500/60 px-4 py-3 text-sm font-semibold text-white/90">
                  {liveTranscript}
                </div>
              </div>
            ) : null}
          </div>

        </div>

        <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full border border-cyan-400/20 bg-[#07112b] px-6 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100/70">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.8)]" />Signal Locked</span>
          <span className="text-slate-400">|</span>
          <span>Secure Neural Stream v3.2</span>
          <button type="button" onClick={() => setIsMicMuted((prev) => !prev)} className="pointer-events-auto rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-[10px] text-blue-100">Mic {isMicMuted ? 'Off' : 'On'}</button>
          <span className={`pointer-events-auto neural-voice-bubble human ${isHumanSpeaking && !isMicMuted ? 'is-active' : ''}`} />
          <span className={`pointer-events-auto neural-voice-bubble ${isAiSpeaking ? 'is-active' : ''}`} />
        </div>
      </div>
      <p className="mt-3 text-center text-[10px] uppercase tracking-[0.22em] text-slate-500">{aiName} • Max prompts {ROLE_QUESTION_LIMIT[role]} • Candidate {currentUserName}</p>
    </div>
  );
};

export default ConversationRoom;
