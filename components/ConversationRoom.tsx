import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Persona, TranscriptionItem } from '../types';
import { getConversationHistoryKey } from '../lib/userStorage';
import { saveEligibleInterviewHistory } from '../lib/interviewHistorySync';
import { buildNeuralSpeechScoreCard } from '../lib/interviewEvaluation';
import { COMMON_LANGUAGES } from '../constants';

interface ConversationRoomProps {
  persona: Persona;
  onExit: () => void;
  maxDurationMinutes: number | null;
  userId?: string;
}

type ServerMessage = {
  type: string;
  text?: string;
  fullText?: string;
  audio?: string;
  message?: string;
  sessionId?: string;
  isFinal?: boolean;
  speechFinal?: boolean;
  sampleRate?: number;
  turnId?: number;
};

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_WS_URL || 'http://localhost:3001';
const AUDIO_MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

const getSupportedMimeType = () => AUDIO_MIME_CANDIDATES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || '';

const decodePcm16Chunk = (base64: string): Float32Array => {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const view = new DataView(bytes.buffer);
  const samples = new Float32Array(bytes.byteLength / 2);
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = view.getInt16(i * 2, true) / 32768;
  }

  return samples;
};

const buildSessionStartPayload = (persona: Persona, sessionId: string) => ({
  type: 'start',
  sessionId,
  persona: {
    name: persona.name,
    role: persona.role,
    mood: persona.mood,
    language: persona.language,
    difficultyLevel: persona.difficultyLevel,
  },
});

const ConversationRoom: React.FC<ConversationRoomProps> = ({ persona, onExit, maxDurationMinutes, userId }) => {
  const [isConnecting, setIsConnecting] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [liveUserTranscript, setLiveUserTranscript] = useState('');
  const [liveAiQuestion, setLiveAiQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState(persona.language || 'English');

  const socketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const activePlaybackTurnRef = useRef<number | null>(null);
  const activeSourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const isUnmountingRef = useRef(false);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const sessionIdRef = useRef(`session-${crypto.randomUUID()}`);
  const containerRef = useRef<HTMLDivElement>(null);
  const liveAiTextRef = useRef('');
  const recorderStartedRef = useRef(false);
  const aiTurnActiveRef = useRef(false);

  const currentQuestionText = useMemo(() => {
    const latestCommittedAiQuestion = transcriptions.filter((t) => t.speaker === 'ai').at(-1)?.text;
    return liveAiQuestion || latestCommittedAiQuestion || 'The AI interviewer is calibrating the session. Maintain concise high-signal responses.';
  }, [liveAiQuestion, transcriptions]);

  const stopPlayback = useCallback((resetTurn = false) => {
    activeSourcesRef.current.forEach((source) => {
      try { source.stop(); } catch {}
    });
    activeSourcesRef.current.clear();
    if (outputAudioContextRef.current) {
      nextStartTimeRef.current = outputAudioContextRef.current.currentTime;
    }
    if (resetTurn) {
      activePlaybackTurnRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const pauseRecorder = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorderStartedRef.current || !recorder || recorder.state !== 'recording') {
      return;
    }

    try {
      recorder.pause();
    } catch {}
  }, []);

  const resumeRecorder = useCallback(() => {
    if (aiTurnActiveRef.current) {
      return;
    }

    const recorder = mediaRecorderRef.current;
    const socket = socketRef.current;
    if (!recorderStartedRef.current || !recorder || !socket || !socket.connected) {
      return;
    }

    if (recorder.state === 'paused') {
      try {
        recorder.resume();
      } catch {}
    }
  }, []);

  const playPcmChunk = useCallback(async (base64Audio: string, turnId?: number, sampleRate = 24000) => {
    try {
      if (!outputAudioContextRef.current) {
        outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }

      const ctx = outputAudioContextRef.current;
      await ctx.resume();

      if (typeof turnId === 'number') {
        if (activePlaybackTurnRef.current !== null && activePlaybackTurnRef.current !== turnId) {
          stopPlayback();
        }
        activePlaybackTurnRef.current = turnId;
      }

      const pcm = decodePcm16Chunk(base64Audio);
      const audioBuffer = ctx.createBuffer(1, pcm.length, sampleRate);
      audioBuffer.copyToChannel(pcm, 0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      activeSourcesRef.current.add(source);
      source.onended = () => {
        activeSourcesRef.current.delete(source);
        if (ctx.currentTime >= nextStartTimeRef.current - 0.02 && activeSourcesRef.current.size === 0) {
          setIsSpeaking(false);
          if (!aiTurnActiveRef.current) {
            resumeRecorder();
          }
        }
      });

      nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime + 0.01);
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
      setIsSpeaking(true);
    } catch (playbackError) {
      console.error('Audio playback failed', playbackError);
      setError('Voice playback was interrupted. You can continue the interview and reconnect if needed.');
    }
  }, [resumeRecorder, stopPlayback]);

  const cleanupMedia = useCallback(() => {
    recorderStartedRef.current = false;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    mediaRecorderRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (outputAudioContextRef.current) {
      void outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    nextStartTimeRef.current = 0;
    stopPlayback(true);
  }, [stopPlayback]);

  const disconnectSocket = useCallback((sendEnd = false) => {
    const socket = socketRef.current;
    socketRef.current = null;
    if (!socket) return;

    if (sendEnd && socket.connected) {
      socket.emit('client_event', { type: 'end' });
    }

    socket.disconnect();
  }, []);

  const cleanup = useCallback((sendEnd = false) => {
    isUnmountingRef.current = true;
    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    disconnectSocket(sendEnd);
    cleanupMedia();
  }, [cleanupMedia, disconnectSocket]);

  const startRecorder = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    const socket = socketRef.current;

    if (!recorder || !socket || !socket.connected) {
      return;
    }

    if (!recorderStartedRef.current) {
      recorderStartedRef.current = true;
      recorder.start(100);
      return;
    }

    if (recorder.state === 'paused' && !aiTurnActiveRef.current) {
      recorder.resume();
    }
  }, []);

  const handleSaveAndExit = useCallback(() => {
    if (transcriptions.length > 0) {
      try {
        const historyItem = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          persona,
          transcriptions,
          scoreCard: buildNeuralSpeechScoreCard(transcriptions),
        };

        const conversationHistoryKey = getConversationHistoryKey(userId);
        const storedHistory = localStorage.getItem(conversationHistoryKey) ?? localStorage.getItem('tm_conversation_history');
        const history = storedHistory ? JSON.parse(storedHistory) : [];
        const updatedHistory = [historyItem, ...history].slice(0, 50);

        localStorage.setItem(conversationHistoryKey, JSON.stringify(updatedHistory));
        localStorage.setItem('tm_conversation_history', JSON.stringify(updatedHistory));

        void saveEligibleInterviewHistory({ id: userId }, historyItem).catch((syncError) => {
          console.error('Failed to sync eligible interview history', syncError);
        });
      } catch (saveError) {
        console.error('Failed to save conversation history', saveError);
      }
    }

    cleanup(true);
    onExit();
  }, [cleanup, onExit, persona, transcriptions, userId]);

  const connectWebSocket = useCallback(async () => {
    if (isUnmountingRef.current) return;

    try {
      setIsConnecting(true);
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      if (!outputAudioContextRef.current) {
        outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }
      await outputAudioContextRef.current.resume();

      const socket = io(SOCKET_URL, {
        path: '/socket.io',
        transports: ['websocket'],
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        reconnectAttemptsRef.current = 0;
        socket.emit('client_event', buildSessionStartPayload({ ...persona, language: currentLanguage }, sessionIdRef.current));

        const mimeType = getSupportedMimeType();
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 64000 })
          : new MediaRecorder(stream);

        recorderStartedRef.current = false;
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = async (event) => {
          if (!event.data || event.data.size === 0 || !socket.connected) return;
          const arrayBuffer = await event.data.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i += 1) {
            binary += String.fromCharCode(bytes[i]);
          }
          socket.emit('client_event', { type: 'audio_chunk', audio: window.btoa(binary) });
        };
      });

      socket.on('server_event', async (message: ServerMessage) => {
        switch (message.type) {
          case 'ready':
          case 'session_resumed':
            startRecorder();
            setIsConnecting(false);
            setError(null);
            break;
          case 'transcript':
            if (!aiTurnActiveRef.current) {
              setLiveUserTranscript(message.text || '');
            }
            break;
          case 'user_turn_complete':
            stopPlayback(true);
            if (message.text) {
              setTranscriptions((prev) => [...prev, { speaker: 'user', text: message.text!, timestamp: Date.now() }]);
            }
            setLiveUserTranscript('');
            break;
          case 'ai_text':
            aiTurnActiveRef.current = true;
            pauseRecorder();
            if (typeof message.turnId === 'number' && activePlaybackTurnRef.current !== null && activePlaybackTurnRef.current !== message.turnId) {
              stopPlayback();
            }
            liveAiTextRef.current = message.fullText || message.text || '';
            setLiveAiQuestion(liveAiTextRef.current);
            break;
          case 'ai_turn_complete':
            if (message.text) {
              setTranscriptions((prev) => [...prev, { speaker: 'ai', text: message.text!, timestamp: Date.now() }]);
            }
            aiTurnActiveRef.current = false;
            liveAiTextRef.current = '';
            setLiveAiQuestion('');
            if (activeSourcesRef.current.size === 0) {
              resumeRecorder();
            }
            break;
          case 'tts_audio':
            aiTurnActiveRef.current = true;
            pauseRecorder();
            if (message.audio) {
              await playPcmChunk(message.audio, message.turnId, message.sampleRate || 24000);
            }
            break;
          case 'tts_flushed':
            if (message.turnId === undefined || activePlaybackTurnRef.current === null || message.turnId === activePlaybackTurnRef.current) {
              stopPlayback();
            }
            break;
          case 'warning':
            console.warn(message.message || 'Server warning');
            break;
          case 'error':
            setError(message.message || 'Realtime interview server error.');
            break;
          default:
            break;
        }
      });

      socket.on('connect_error', () => {
        setError('Realtime interview connection encountered an error. Attempting to recover.');
      });

      socket.on('disconnect', () => {
        socketRef.current = null;
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          try { mediaRecorderRef.current.stop(); } catch {}
        }
        mediaRecorderRef.current = null;

        if (isUnmountingRef.current) return;

        if (reconnectAttemptsRef.current >= 2) {
          setIsConnecting(false);
          setError('Realtime interview connection was lost and could not be restored.');
          return;
        }

        reconnectAttemptsRef.current += 1;
        setIsConnecting(true);
        reconnectTimeoutRef.current = window.setTimeout(() => {
          reconnectTimeoutRef.current = null;
          void connectWebSocket();
        }, 1000 * reconnectAttemptsRef.current);
      });
    } catch (connectionError) {
      console.error('Failed to initialize interview connection', connectionError);
      setError('Could not establish the realtime interview connection. Please verify microphone access.');
    }
  }, [currentLanguage, pauseRecorder, persona, playPcmChunk, resumeRecorder, startRecorder, stopPlayback]);

  const handleLanguageChange = useCallback((newLang: string) => {
    setCurrentLanguage(newLang);
  }, []);

  useEffect(() => {
    isUnmountingRef.current = false;
    void connectWebSocket();
    return () => cleanup(true);
  }, [cleanup, connectWebSocket]);

  useEffect(() => {
    if (maxDurationMinutes === null || !transcriptions.length) {
      return;
    }

    const elapsedMs = Date.now() - transcriptions[0].timestamp;
    const maxDurationMs = maxDurationMinutes * 60 * 1000;

    if (elapsedMs >= maxDurationMs) {
      window.alert(`This call reached your plan limit of ${maxDurationMinutes} minutes.`);
      handleSaveAndExit();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      window.alert(`This call reached your plan limit of ${maxDurationMinutes} minutes.`);
      handleSaveAndExit();
    }, maxDurationMs - elapsedMs);

    return () => window.clearTimeout(timeoutId);
  }, [handleSaveAndExit, maxDurationMinutes, transcriptions]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [liveAiQuestion, liveUserTranscript, transcriptions]);

  if (error) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center px-4">
        <div className="premium-panel w-full max-w-lg rounded-3xl p-8 text-center">
          <h3 className="text-lg font-semibold tracking-tight text-[#ededed]">Signal interrupted</h3>
          <p className="mt-3 text-sm leading-relaxed text-[#8a8f98]">{error}</p>
          <button onClick={onExit} className="mt-7 rounded-xl border border-white/20 px-4 py-2 text-sm text-[#ededed] transition hover:border-white/35">
            Return to console
          </button>
        </div>
      </div>
    );
  }

  const interviewSeconds = Math.max(0, transcriptions.length ? Math.round((Date.now() - transcriptions[0].timestamp) / 1000) : 0);
  const timerLabel = `${Math.floor(interviewSeconds / 60).toString().padStart(2, '0')}:${(interviewSeconds % 60).toString().padStart(2, '0')}`;
  const fillerWords = ['um', 'uh', 'like', 'you know', 'actually'];

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-[95rem] flex-col gap-4 px-4 pb-4 lg:px-8">
      <div className="premium-panel flex items-center justify-between rounded-2xl px-4 py-3">
        <div className="flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-[#8a8f98]">
          <span>Live Interview</span>
          <span className="rounded-md border border-white/10 bg-black/20 px-2 py-1 font-mono text-[#ededed]">{timerLabel}</span>
          <span className={`flex items-center gap-2 ${isSpeaking ? 'text-indigo-300' : 'text-slate-500'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />Mic {isConnecting ? 'connecting' : 'active'}</span>
        </div>
        <button onClick={handleSaveAndExit} className="rounded-lg border border-red-500/55 px-3 py-1.5 text-xs tracking-wide text-red-300 transition hover:bg-red-500/10">
          End Interview
        </button>
      </div>

      <div className="grid flex-1 gap-4 lg:grid-cols-[1.1fr,1fr]">
        <section className="premium-panel relative overflow-hidden rounded-3xl p-7">
          <div className="absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">AI Analyst</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#ededed]">{persona.name}</h2>
              <p className="mt-1 text-sm text-[#8a8f98]">{persona.role}</p>
            </div>

            <div className="flex flex-col items-center gap-7 py-8">
              <div className={`pulse-orb h-28 w-28 ${isSpeaking ? 'is-active premium-glow-active' : ''}`} />
              <div className="flex h-10 items-end gap-1">
                {[...Array(28)].map((_, i) => (
                  <div key={i} className={`neural-wave-bar ${isSpeaking ? 'is-active' : ''}`} style={{ animationDelay: `${i * 0.04}s` }} />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Current question</p>
              <p className="mt-3 break-words text-lg leading-relaxed text-[#ededed]">{currentQuestionText}</p>
            </div>
          </div>
        </section>

        <section className="premium-panel rounded-3xl p-4">
          <div className="h-full rounded-2xl border border-white/10 bg-black/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]" />
          <p className="mt-3 text-center text-[11px] uppercase tracking-[0.2em] text-slate-500">User video feed</p>
        </section>
      </div>

      <section className="premium-panel h-60 rounded-3xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Real-time transcript</p>
          <select
            value={currentLanguage}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="rounded-md border border-white/15 bg-black/40 px-2 py-1 text-xs text-slate-300"
          >
            {COMMON_LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
          </select>
        </div>
        <div ref={containerRef} className="h-[calc(100%-2rem)] space-y-3 overflow-y-auto pr-2">
          {isConnecting && <p className="text-sm text-slate-500">Establishing encrypted interview channel...</p>}
          {liveUserTranscript && (
            <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-3 text-sm leading-relaxed text-slate-100">
              <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-indigo-200/80">You · live</p>
              <p className="break-words">{liveUserTranscript}</p>
            </div>
          )}
          {liveAiQuestion && (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3 text-sm leading-relaxed text-slate-100">
              <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-emerald-200/80">AI · live</p>
              <p className="break-words">{liveAiQuestion}</p>
            </div>
          )}
          {transcriptions.map((t, idx) => {
            const words = t.text.split(/\s+/);
            return (
              <div key={idx} className="rounded-xl border border-white/10 bg-black/25 p-3 text-sm leading-relaxed text-slate-200">
                <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">{t.speaker === 'user' ? 'You' : 'AI'}</p>
                <p className="break-words">
                  {words.map((word, i) => {
                    const clean = word.toLowerCase().replace(/[^a-z]/g, '');
                    const isFiller = fillerWords.includes(clean) || (clean === 'you' && words[i + 1]?.toLowerCase().replace(/[^a-z]/g, '') === 'know');
                    return <span key={`${idx}-${i}`} className={isFiller ? 'underline decoration-red-400/70 decoration-2 underline-offset-[3px] text-red-200/90' : ''}>{word} </span>;
                  })}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default ConversationRoom;
