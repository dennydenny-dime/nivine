import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Persona, TranscriptionItem } from '../types';
import { buildCandidateMemoryProfile, buildCandidateMemoryPrompt, extractPastResultsFromHistory } from '../lib/candidateMemory';
import { getConversationHistoryKey, getUserConversationHistory } from '../lib/userStorage';
import { buildNeuralSpeechScoreCard } from '../lib/interviewEvaluation';
import { VOICE_MAP, getSystemApiKey } from '../constants';
import { decode, decodeAudioData, createBlob } from '../utils/audioUtils';

interface ConversationRoomProps {
  persona: Persona;
  onExit: () => void;
  maxDurationMinutes: number | null;
}

interface CoachPromptConfig {
  personaName: string;
  description: string;
  mood: string;
  hardness: number;
  language: string;
}

interface SessionLanguage {
  label: string;
  code: string;
}

const SESSION_LANGUAGE_MAP: Record<string, string> = {
  English: 'en-US',
  Spanish: 'es-ES',
  French: 'fr-FR',
  German: 'de-DE',
  Italian: 'it-IT',
  Portuguese: 'pt-PT',
  Hindi: 'hi-IN',
  Arabic: 'ar-SA',
  Japanese: 'ja-JP',
  Korean: 'ko-KR',
  Mandarin: 'zh-CN',
  Russian: 'ru-RU',
};

const getSessionLanguage = (language?: string): SessionLanguage => {
  const label = language && SESSION_LANGUAGE_MAP[language] ? language : 'English';
  return { label, code: SESSION_LANGUAGE_MAP[label] || 'en-US' };
};

const getAllowedCharacterPattern = (languageCode: string): RegExp | null => {
  if (languageCode.startsWith('hi')) return /[^\p{Script=Devanagari}\p{Number}\p{Punctuation}\s]/gu;
  if (languageCode.startsWith('ar')) return /[^\p{Script=Arabic}\p{Number}\p{Punctuation}\s]/gu;
  if (languageCode.startsWith('ja')) return /[^\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\p{Number}\p{Punctuation}\s]/gu;
  if (languageCode.startsWith('ko')) return /[^\p{Script=Hangul}\p{Number}\p{Punctuation}\s]/gu;
  if (languageCode.startsWith('zh')) return /[^\p{Script=Han}\p{Number}\p{Punctuation}\s]/gu;
  if (languageCode.startsWith('ru')) return /[^\p{Script=Cyrillic}\p{Number}\p{Punctuation}\s]/gu;
  return /[^\p{Script=Latin}\p{Number}\p{Punctuation}\s]/gu;
};

const sanitizeTranscript = (text: string, languageCode: string): string => {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  const allowedPattern = getAllowedCharacterPattern(languageCode);
  return (allowedPattern ? compact.replace(allowedPattern, ' ') : compact)
    .replace(/\s+/g, ' ')
    .trim();
};

const buildCoachSystemPrompt = (config: CoachPromptConfig): string => {
  const hardness = Number.isFinite(config.hardness) ? Math.max(1, Math.min(10, Math.floor(config.hardness))) : 5;
  const intensity = hardness <= 3 ? 'supportive' : hardness <= 6 ? 'professional' : hardness <= 9 ? 'demanding' : 'maximum-pressure';

  return [
    `You are ${config.personaName}, ${config.description}.`,
    `Mood: ${config.mood}. Hardness: ${hardness}/10. Interview intensity: ${intensity}.`,
    `Conduct the interview strictly in ${config.language}. Respond quickly and concisely. Do not switch languages.`,
    'Stay fully in character. Never mention being an AI or simulation.',
    'Ask one question at a time, react to the candidate\'s actual answer, and keep spoken responses brief.',
    'If the answer is weak, challenge it in proportion to the hardness level.',
    'Track clarity, confidence, specificity, consistency, and response latency internally.',
    'When the user ends the session, stop roleplay and deliver a concise structured performance report with scores, strengths, weaknesses, key moments, verdict, and next-step recommendation.',
  ].join('\n');
};

const ConversationRoom: React.FC<ConversationRoomProps> = ({ persona, onExit, maxDurationMinutes }) => {
  const sessionLanguageRef = useRef<SessionLanguage>(getSessionLanguage(persona.language));
  const [isConnecting, setIsConnecting] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const candidateMemoryPrompt = React.useMemo(() => {
    const history = getUserConversationHistory().slice(0, 3);
    const profile = buildCandidateMemoryProfile(extractPastResultsFromHistory(history));
    return buildCandidateMemoryPrompt(profile);
  }, []);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isUnmountingRef = useRef(false);
  const transcriptionRef = useRef({ input: '', output: '' });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputSilenceTimeoutRef = useRef<number | null>(null);
  const hasDetectedSpeechRef = useRef(false);
  const isSpeakingRef = useRef(false);

  const resetConnectionResources = useCallback(() => {
    if (scriptProcessorRef.current) {
      try { scriptProcessorRef.current.disconnect(); } catch(e) {}
      scriptProcessorRef.current.onaudioprocess = null;
      scriptProcessorRef.current = null;
    }
    if (inputSourceRef.current) {
      try { inputSourceRef.current.disconnect(); } catch(e) {}
      inputSourceRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    if (inputSilenceTimeoutRef.current !== null) {
      window.clearTimeout(inputSilenceTimeoutRef.current);
      inputSilenceTimeoutRef.current = null;
    }
    hasDetectedSpeechRef.current = false;
    setIsAnalyzing(false);
    outputNodeRef.current = null;
    nextStartTimeRef.current = 0;
  }, []);

  const cleanup = useCallback(() => {
    isUnmountingRef.current = true;
    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    if (scriptProcessorRef.current) {
      try { scriptProcessorRef.current.disconnect(); } catch(e) {}
      scriptProcessorRef.current.onaudioprocess = null;
      scriptProcessorRef.current = null;
    }
    if (inputSourceRef.current) {
      try { inputSourceRef.current.disconnect(); } catch(e) {}
      inputSourceRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    resetConnectionResources();
  }, [resetConnectionResources]);

  const handleSaveAndExit = useCallback(() => {
    if (transcriptions.length > 0) {
      try {
        const historyItem = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          persona: { ...persona, language: sessionLanguageRef.current.label },
          transcriptions,
          scoreCard: buildNeuralSpeechScoreCard(transcriptions),
        };

        const conversationHistoryKey = getConversationHistoryKey();
        const storedHistory = localStorage.getItem(conversationHistoryKey) ?? localStorage.getItem('tm_conversation_history');
        const history = storedHistory ? JSON.parse(storedHistory) : [];
        const updatedHistory = [historyItem, ...history].slice(0, 50);

        localStorage.setItem(conversationHistoryKey, JSON.stringify(updatedHistory));
        localStorage.setItem('tm_conversation_history', JSON.stringify(updatedHistory));
      } catch (e) {
        console.error("Failed to save conversation history", e);
      }
    }
    cleanup();
    onExit();
  }, [transcriptions, persona, onExit, cleanup]);

  useEffect(() => {
    sessionLanguageRef.current = getSessionLanguage(persona.language);
  }, [persona.language]);

  useEffect(() => {
    const initSession = async () => {
      if (isUnmountingRef.current) {
        return;
      }

      try {
        resetConnectionResources();
        const apiKey = getSystemApiKey();
        if (!apiKey) {
          setError("Environment Config Error: No API Key found. In Vercel, please set your variable as 'VITE_API_KEY' or 'REACT_APP_API_KEY'.");
          return;
        }

        const ai = new GoogleGenAI({ apiKey });
        const sessionLanguage = sessionLanguageRef.current;

        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        outputNodeRef.current = outputAudioContextRef.current.createGain();
        outputNodeRef.current.connect(outputAudioContextRef.current.destination);

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        await audioContextRef.current.resume();
        await outputAudioContextRef.current.resume();

        const hardness = persona.difficultyLevel || 5;
        const systemInstruction = [
          buildCoachSystemPrompt({
            personaName: persona.name,
            description: persona.role,
            mood: persona.mood,
            hardness,
            language: sessionLanguage.label,
          }),
          candidateMemoryPrompt,
        ].filter(Boolean).join('\n\n');

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              languageCode: sessionLanguage.code,
              voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_MAP[persona.gender] } },
            } as any,
            thinkingConfig: { thinkingBudget: 0 },
            generationConfig: { maxOutputTokens: 140 } as any,
            systemInstruction,
            outputAudioTranscription: { languageCode: sessionLanguage.code } as any,
            inputAudioTranscription: { languageCode: sessionLanguage.code } as any,
          } as any,
          callbacks: {
            onopen: () => {
              reconnectAttemptsRef.current = 0;
              setError(null);
              setIsConnecting(false);
              const source = audioContextRef.current!.createMediaStreamSource(stream);
              inputSourceRef.current = source;
              const scriptProcessor = audioContextRef.current!.createScriptProcessor(2048, 1, 1);
              scriptProcessorRef.current = scriptProcessor;

              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                let sumSquares = 0;
                for (let i = 0; i < inputData.length; i++) {
                  sumSquares += inputData[i] * inputData[i];
                }
                const rms = Math.sqrt(sumSquares / inputData.length);
                if (rms > 0.015) {
                  hasDetectedSpeechRef.current = true;
                  setIsAnalyzing(false);
                  if (inputSilenceTimeoutRef.current !== null) {
                    window.clearTimeout(inputSilenceTimeoutRef.current);
                  }
                  inputSilenceTimeoutRef.current = window.setTimeout(() => {
                    if (hasDetectedSpeechRef.current && !isSpeakingRef.current) {
                      setIsAnalyzing(true);
                    }
                  }, 350);
                }

                const pcmBlob = createBlob(inputData);
                sessionPromise.then(s => {
                  try { s.sendRealtimeInput({ media: pcmBlob }); } catch(err) {
                    console.warn("Input dropped:", err);
                  }
                });
              };

              source.connect(scriptProcessor);
              scriptProcessor.connect(audioContextRef.current!.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
              if (message.serverContent?.outputTranscription) {
                transcriptionRef.current.output += message.serverContent.outputTranscription.text;
              } else if (message.serverContent?.inputTranscription) {
                transcriptionRef.current.input += message.serverContent.inputTranscription.text;
              }

              if (message.serverContent?.turnComplete) {
                const items: TranscriptionItem[] = [];
                const sanitizedInput = sanitizeTranscript(transcriptionRef.current.input, sessionLanguage.code);
                const sanitizedOutput = sanitizeTranscript(transcriptionRef.current.output, sessionLanguage.code);
                if (sanitizedInput) {
                  items.push({ speaker: 'user', text: sanitizedInput, timestamp: Date.now() });
                }
                if (sanitizedOutput) {
                  items.push({ speaker: 'ai', text: sanitizedOutput, timestamp: Date.now() });
                }
                setTranscriptions(prev => [...prev, ...items]);
                transcriptionRef.current = { input: '', output: '' };
                hasDetectedSpeechRef.current = false;
                setIsAnalyzing(false);
              }

              const parts = message.serverContent?.modelTurn?.parts;
              if (parts && outputAudioContextRef.current && outputNodeRef.current) {
                setIsAnalyzing(false);
                for (const part of parts) {
                  const audioData = part.inlineData?.data;
                  if (audioData) {
                    setIsSpeaking(true);
                    const ctx = outputAudioContextRef.current;
                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                    const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
                    const source = ctx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(outputNodeRef.current);
                    source.addEventListener('ended', () => {
                      sourcesRef.current.delete(source);
                      if (sourcesRef.current.size === 0) setIsSpeaking(false);
                    });
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += buffer.duration;
                    sourcesRef.current.add(source);
                  }
                }
              }

              if (message.serverContent?.interrupted) {
                for (const source of sourcesRef.current.values()) {
                  try { source.stop(); } catch(e) {}
                }
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                setIsSpeaking(false);
              }
            },
            onerror: async (e: any) => {
              console.error("Gemini Live Error:", e);
              const errMsg = e?.message || e?.toString() || "";

              if (errMsg.includes('Network error') || errMsg.includes('Requested entity was not found') || errMsg.includes('403')) {
                setError("Neural Connection Error: Ensure your API Key is valid and has Gemini API enabled in Google Cloud Console.");
              } else {
                setError("Synapse Error: The link was severed unexpectedly. Attempting to restore the session.");
              }
            },
            onclose: () => {
              console.log("Session Closed");
              sessionRef.current = null;
              if (isUnmountingRef.current) {
                return;
              }

              const shouldReconnect = reconnectAttemptsRef.current < 2;
              if (!shouldReconnect) {
                setIsConnecting(false);
                setError("Synapse Error: The neural link became unstable and could not be restored. Please restart the session.");
                return;
              }

              reconnectAttemptsRef.current += 1;
              setIsConnecting(true);
              setError(`Neural link interrupted. Reconnecting (${reconnectAttemptsRef.current}/2)...`);
              reconnectTimeoutRef.current = window.setTimeout(() => {
                reconnectTimeoutRef.current = null;
                void initSession();
              }, 1000);
            }
          }
        });

        sessionRef.current = await sessionPromise;
        (sessionRef.current as any).language = sessionLanguage;
      } catch (err: any) {
        console.error("Initialization Error:", err);
        setError("Could not establish neural link. Ensure mic access is granted and your billing is active.");
      }
    };

    isUnmountingRef.current = false;
    initSession();
    return cleanup;
  }, [persona, cleanup, resetConnectionResources, candidateMemoryPrompt]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

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
  }, [transcriptions, isAnalyzing]);

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
          <span className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-slate-300">{sessionLanguageRef.current.label} locked</span>
          <span className={`flex items-center gap-2 ${isSpeaking ? 'text-indigo-300' : 'text-slate-500'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />Mic {isSpeaking ? 'active' : 'idle'}</span>
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
              <p className="mt-3 text-lg leading-relaxed text-[#ededed]">
                {transcriptions.filter((t) => t.speaker === 'ai').at(-1)?.text || 'The AI interviewer is calibrating the session. Maintain concise high-signal responses.'}
              </p>
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
          <div className="rounded-md border border-white/15 bg-black/40 px-2 py-1 text-xs text-slate-300">
            Session language: {sessionLanguageRef.current.label}
          </div>
        </div>
        <div ref={containerRef} className="h-[calc(100%-2rem)] space-y-3 overflow-y-auto pr-2">
          {isConnecting && <p className="text-sm text-slate-500">Establishing encrypted interview channel...</p>}
          {isAnalyzing && !isConnecting && <p className="text-sm text-indigo-300">Analyzing response...</p>}
          {transcriptions.map((t, idx) => {
            const words = t.text.split(/\s+/);
            return (
              <div key={idx} className="rounded-xl border border-white/10 bg-black/25 p-3 text-sm leading-relaxed text-slate-200">
                <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">{t.speaker === 'user' ? 'You' : 'AI'}</p>
                <p>
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
