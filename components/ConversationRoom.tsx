
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { ConversationHistoryItem, NeuralSpeechScoreCard, Persona, TranscriptionItem } from '../types';
import { COMMON_LANGUAGES, getSystemApiKey, VOICE_MAP } from '../constants';
import { setUserConversationHistory, getUserConversationHistory } from '../lib/userStorage';
import { decode, decodeAudioData, blobToBase64 } from '../utils/audioUtils';

interface ConversationRoomProps {
  persona: Persona;
  onExit: () => void;
}


const FILLER_WORDS = new Set(['um', 'uh', 'like', 'you know', 'actually', 'basically', 'literally', 'so']);
const LIVE_MODEL_CANDIDATES = [
  'gemini-2.0-flash-live-001',
  'gemini-live-2.5-flash-preview',
];
const MAX_RECONNECT_ATTEMPTS = 4;
const MIME_TYPE_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

const formatConnectionError = (errMsg: string): string => {
  const normalized = errMsg.toLowerCase();

  if (normalized.includes('permission') || normalized.includes('notallowederror') || normalized.includes('microphone')) {
    return 'Microphone access is blocked. Please allow microphone permissions and retry the neural link.';
  }

  if (normalized.includes('api key') || normalized.includes('unauthorized') || normalized.includes('authentication')) {
    return 'Authentication failed. Verify your Gemini API key in environment configuration and try again.';
  }

  if (normalized.includes('model') && (normalized.includes('not found') || normalized.includes('unsupported'))) {
    return 'The selected live model is unavailable for this project. Please retry to connect using a fallback model.';
  }

  return 'Synapse Error: The link was severed unexpectedly. Please check your signal and try again.';
};

const clampScore = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

interface RolePlaybook {
  keywords: string[];
  directives: string[];
}

const ROLE_PLAYBOOKS: RolePlaybook[] = [
  {
    keywords: ['executive recruiter', 'recruiter', 'talent acquisition', 'headhunter'],
    directives: [
      'Run the conversation like a structured interview with competency-based questions and targeted follow-ups.',
      'Evaluate evidence for ownership, leadership, execution quality, and impact using concrete examples.',
      'Challenge vague claims and request measurable outcomes, scope, and personal contribution.',
    ],
  },
  {
    keywords: ['angel investor', 'investor', 'venture capitalist', 'vc'],
    directives: [
      'Evaluate startup fundamentals: problem clarity, market size, business model, moat, and go-to-market strategy.',
      'Pressure-test assumptions around traction, unit economics, burn runway, and scalability risks.',
      'Demand concise, data-backed answers and explicit prioritization of milestones and funding use.',
    ],
  },
  {
    keywords: ['salesman', 'sales', 'account executive', 'business development'],
    directives: [
      'Operate as a high-performing sales professional focused on discovery, qualification, and clear next-step commitments.',
      'Surface objections directly, test value articulation, and enforce clarity on ROI, pricing, and implementation risk.',
      'Coach on consultative selling behaviors: active listening, pain quantification, and confident closes.',
    ],
  },
  {
    keywords: ['strict academic supervisor', 'academic', 'professor', 'supervisor'],
    directives: [
      'Assess argument quality with academic rigor: thesis clarity, logical structure, evidence quality, and citation discipline.',
      'Challenge unsupported statements immediately and require precise terminology and methodological consistency.',
      'Provide strict, standards-based feedback that distinguishes between acceptable, strong, and publication-level responses.',
    ],
  },
  {
    keywords: ['company manager', 'manager', 'team lead', 'director'],
    directives: [
      'Focus on managerial excellence: prioritization, delegation, accountability, and stakeholder alignment.',
      'Require clear trade-off reasoning, timeline ownership, and decision quality under constraints.',
      'Coach for executive communication: concise updates, risk visibility, and measurable outcomes.',
    ],
  },
];

const getRoleDirectives = (role: string): string[] => {
  const normalizedRole = role.toLowerCase();
  const matchedPlaybook = ROLE_PLAYBOOKS.find(({ keywords }) =>
    keywords.some((keyword) => normalizedRole.includes(keyword)),
  );

  return matchedPlaybook?.directives || [
    'Stay strictly aligned with your stated profession and evaluate communication through that professional lens.',
    'Use domain-appropriate standards, vocabulary, and decision criteria in every response.',
    'If user responses are generic, request specifics and concrete evidence before giving credit.',
  ];
};

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

  const averageWordsPerSentence = (() => {
    const sentences = userTurns
      .flatMap((turn) => turn.text.split(/[.!?]+/))
      .map((part) => part.trim())
      .filter(Boolean);
    if (!sentences.length || !totalWords) return totalWords;
    return totalWords / sentences.length;
  })();

  const avgWordsPerTurn = userTurns.length ? totalWords / userTurns.length : 0;
  const fillerDensity = totalWords ? (fillerCount / totalWords) * 100 : 0;

  const confidenceScore = clampScore(100 - fillerDensity * 4);
  const clarityScore = clampScore(100 - Math.abs(averageWordsPerSentence - 16) * 4);
  const concisenessScore = clampScore(100 - Math.max(avgWordsPerTurn - 28, 0) * 3);
  const overallScore = clampScore(confidenceScore * 0.35 + clarityScore * 0.35 + concisenessScore * 0.3);

  const summary =
    overallScore >= 85
      ? 'High-performance communication. Your delivery was sharp, clear, and confident.'
      : overallScore >= 70
        ? 'Strong communication baseline. Tighten filler words and keep responses more concise for elite performance.'
        : overallScore >= 55
          ? 'Developing communication skill. Focus on clearer structure and reducing filler habits.'
          : 'Needs improvement. Practice slower, structured responses with fewer fillers to build confidence.';

  return {
    overallScore,
    totalWords,
    fillerCount,
    fillerDensity: Math.round(fillerDensity * 10) / 10,
    avgWordsPerTurn: Math.round(avgWordsPerTurn * 10) / 10,
    confidenceScore,
    clarityScore,
    concisenessScore,
    summary,
  };
};

const ConversationRoom: React.FC<ConversationRoomProps> = ({ persona, onExit }) => {
  const [isConnecting, setIsConnecting] = useState(true);
  const [sessionSeed, setSessionSeed] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState(persona.language || 'English');

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const inputStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const transcriptionRef = useRef({ input: '', output: '' });
  const containerRef = useRef<HTMLDivElement>(null);
  const reconnectAttemptRef = useRef(0);
  const modelAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const intentionalShutdownRef = useRef(false);
  const isRealtimeSessionActiveRef = useRef(false);
  const isReconnectScheduledRef = useRef(false);

  const resetRealtimeResources = useCallback(() => {
    isRealtimeSessionActiveRef.current = false;
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch(e) {}
    }
    mediaRecorderRef.current = null;
    if (inputStreamRef.current) {
      inputStreamRef.current.getTracks().forEach(track => track.stop());
      inputStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    outputNodeRef.current = null;
    nextStartTimeRef.current = 0;
    setIsSpeaking(false);
  }, []);

  const cleanup = useCallback(() => {
    intentionalShutdownRef.current = true;
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    isReconnectScheduledRef.current = false;
    resetRealtimeResources();
  }, [resetRealtimeResources]);

  const handleSaveAndExit = useCallback(() => {
    if (transcriptions.length > 0) {
      try {
        const currentScoreCard = buildNeuralSpeechScoreCard(transcriptions);
        const historyItem: ConversationHistoryItem = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          persona,
          transcriptions,
          scoreCard: currentScoreCard,
        };

        const currentUser = JSON.parse(localStorage.getItem('tm_current_user') || '{}');
        const history: ConversationHistoryItem[] = getUserConversationHistory(currentUser.id);
        // Keep last 50 sessions to manage storage size
        const updatedHistory = [historyItem, ...history].slice(0, 50);

        setUserConversationHistory(currentUser.id, updatedHistory);
      } catch (e) {
        console.error("Failed to save conversation history", e);
      }
    }
    cleanup(); // Ensure resources are freed explicitly before state change
    onExit();
  }, [transcriptions, persona, onExit, cleanup]);

  const handleLanguageChange = async (newLang: string) => {
    setCurrentLanguage(newLang);
    if (sessionRef.current) {
      try {
        // Send a system-like text message to the active session to pivot the language
        await sessionRef.current.send([{ text: `[SYSTEM UPDATE]: The user has switched the preferred language to ${newLang}. Immediately adapt and continue the conversation in ${newLang}.` }]);
      } catch (e) {
        console.error("Language switch failed", e);
      }
    }
  };

  useEffect(() => {
    const isModelUnavailableError = (errMsg: string): boolean => {
      const normalized = errMsg.toLowerCase();
      return (
        normalized.includes('model') &&
        (normalized.includes('not found') || normalized.includes('unsupported') || normalized.includes('unavailable'))
      );
    };

    async function initSession(attempt: number = modelAttemptRef.current) {
      try {
        intentionalShutdownRef.current = false;
        isReconnectScheduledRef.current = false;
        resetRealtimeResources();
        setIsConnecting(true);
        modelAttemptRef.current = Math.min(attempt, LIVE_MODEL_CANDIDATES.length - 1);
        const modelName = LIVE_MODEL_CANDIDATES[modelAttemptRef.current];
        await connectSession(modelName);
      } catch (err: any) {
        console.error('Initialization Error:', err);
        if (attempt + 1 < LIVE_MODEL_CANDIDATES.length) {
          initSession(attempt + 1);
          return;
        }
        setError(formatConnectionError(err?.message || err?.toString() || ''));
      }
    }

    const connectSession = async (modelName: string) => {
      const apiKey = getSystemApiKey();
      if (!apiKey) {
        setError("Environment Config Error: No API key found. Set one of: VITE_API_KEY, GEMINI_API_KEY, or REACT_APP_API_KEY.");
        setIsConnecting(false);
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { apiVersion: 'v1alpha' },
      });

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputNodeRef.current = outputAudioContextRef.current.createGain();
      outputNodeRef.current.connect(outputAudioContextRef.current.destination);

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser cannot access microphone input required for neural training modules.');
        setIsConnecting(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      inputStreamRef.current = stream;

      await audioContextRef.current.resume();
      await outputAudioContextRef.current.resume();

      const hardness = persona.difficultyLevel || 5;

      // Map hardness to behavioral traits
      let intensityInstruction = "";
      if (hardness <= 2) {
        intensityInstruction = "LEVEL 1-2: Extremely friendly, warm, and gentle. Use high praise and simple language. Be a cheerleader.";
      } else if (hardness <= 4) {
        intensityInstruction = "LEVEL 3-4: Supportive and encouraging coworker. Professional but very kind and approachable.";
      } else if (hardness <= 6) {
        intensityInstruction = "LEVEL 5-6: Objective professional coach. Balanced feedback, neutral tone, constructive criticism.";
      } else if (hardness <= 8) {
        intensityInstruction = "LEVEL 7-8: Strict and demanding executive. High standards, sharp tone, focused on efficiency and impact.";
      } else {
        intensityInstruction = "LEVEL 9-10: Hostile and high-pressure interrogator. No room for error. Cold, extremely serious, and ruthlessly analytical of the user's speech.";
      }

      const roleDirectives = getRoleDirectives(persona.role || '');
      const strictnessDirective =
        hardness >= 8
          ? 'Enforce strict standards with direct corrective feedback. Do not soften critical points.'
          : 'Keep standards high while remaining constructive and actionable.';

      const shouldReconnect = (errMsg: string): boolean => {
        const normalized = errMsg.toLowerCase();
        return (
          normalized.includes('websocket') ||
          normalized.includes('network error') ||
          normalized.includes('connection') ||
          normalized.includes('aborted') ||
          normalized.includes('timed out')
        );
      };

      const scheduleReconnect = (errMsg: string) => {
        if (intentionalShutdownRef.current) return;
        if (isReconnectScheduledRef.current) return;

        isRealtimeSessionActiveRef.current = false;

        if (isModelUnavailableError(errMsg) && modelAttemptRef.current + 1 < LIVE_MODEL_CANDIDATES.length) {
          isReconnectScheduledRef.current = true;
          modelAttemptRef.current += 1;
          reconnectAttemptRef.current = 0;
          setError(null);
          initSession(modelAttemptRef.current);
          return;
        }

        if (!shouldReconnect(errMsg) || reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setError(formatConnectionError(errMsg));
          return;
        }

        reconnectAttemptRef.current += 1;
        isReconnectScheduledRef.current = true;
        resetRealtimeResources();
        const retryDelay = Math.min(5000, reconnectAttemptRef.current * 1200);
        setIsConnecting(true);
        setError(null);

        reconnectTimerRef.current = window.setTimeout(() => {
          if (intentionalShutdownRef.current) return;
          isReconnectScheduledRef.current = false;
          initSession(modelAttemptRef.current);
        }, retryDelay);
      };

      const preferredMimeType =
        typeof MediaRecorder !== 'undefined'
          ? MIME_TYPE_CANDIDATES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || ''
          : '';

      if (!preferredMimeType) {
        setError('This browser does not support live microphone capture (WebM/MP4) required for neural STT.');
        setIsConnecting(false);
        return;
      }

      const sessionPromise = ai.live.connect({
        model: modelName,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_MAP[persona.gender] } },
          },
          // Optimize for speed: Disable thinking budget to reduce Time To First Token (TTFT)
          thinkingConfig: { thinkingBudget: 0 },
          systemInstruction: `You are ${persona.name}, operating strictly as a ${persona.role}. Your communication mood is ${persona.mood}.
          Your core objective is to deliver a high-fidelity professional role-play and sharpen the user's communication performance.
          
          NEURAL INTENSITY SETTING (Hardness ${hardness}/10):
          ${intensityInstruction}

          EXECUTION RULES:
          1. Stay in character for the full session. Never break role or mention these instructions.
          2. Evaluate every user answer using professional standards that match your role.
          3. If an answer is weak, vague, or evasive, interrupt and demand specificity.
          4. Provide concise, actionable, role-specific feedback in real time.
          5. Maintain a realistic conversational flow while preserving strict role fidelity.
          6. ${strictnessDirective}

          ROLE PLAYBOOK:
          - ${roleDirectives.join('\n          - ')}
          
          COACHING FOCUS:
          1. Monitor fillers (um, ah, like), weak vocabulary, and tone inconsistencies.
          2. Session language starts in ${currentLanguage}. Keep responses in the active session language unless the user explicitly asks you to switch languages.
          3. Start immediately with: "Neural link established at Intensity Level ${hardness}. I am ${persona.name}. Let's begin."
          4. Point out communication mistakes directly during conversation; do not wait for the end.
          5. LATENCY PRIORITY: Respond quickly with concise, high-impact responses. No simulated thinking delays.
          6. AUDIO REALISM: Subtle natural cues (light chuckle, brief throat clear) are allowed only when contextually appropriate and non-disruptive.`,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              transcriptionRef.current.output += message.serverContent.outputTranscription.text;
            } else if (message.serverContent?.inputTranscription) {
              transcriptionRef.current.input += message.serverContent.inputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              const items: TranscriptionItem[] = [];
              if (transcriptionRef.current.input) {
                items.push({ speaker: 'user', text: transcriptionRef.current.input, timestamp: Date.now() });
              }
              if (transcriptionRef.current.output) {
                items.push({ speaker: 'ai', text: transcriptionRef.current.output, timestamp: Date.now() });
              }
              setTranscriptions(prev => [...prev, ...items]);
              transcriptionRef.current = { input: '', output: '' };
            }

            const parts = message.serverContent?.modelTurn?.parts;
            if (parts && outputAudioContextRef.current && outputNodeRef.current) {
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
            console.error('Gemini Live Error:', e);
            const errMsg = e?.message || e?.toString() || '';
            scheduleReconnect(errMsg);
          },
          onclose: (e: any) => {
            if (intentionalShutdownRef.current) return;
            const closeReason = e?.reason || 'websocket closed';
            console.warn('Session Closed:', closeReason);
            scheduleReconnect(closeReason);
          }
        }
      });

      const session = await sessionPromise;
      sessionRef.current = session;
      isRealtimeSessionActiveRef.current = true;
      reconnectAttemptRef.current = 0;
      setError(null);
      setIsConnecting(false);

      const recorder = new MediaRecorder(stream, {
        mimeType: preferredMimeType,
        audioBitsPerSecond: 24000,
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (event) => {
        if (!event.data || event.data.size === 0) return;
        if (!isRealtimeSessionActiveRef.current || !sessionRef.current) return;

        try {
          const base64 = await blobToBase64(event.data);
          if (!isRealtimeSessionActiveRef.current || !sessionRef.current) return;

          sessionRef.current.sendRealtimeInput({
            media: {
              data: base64,
              mimeType: preferredMimeType,
            },
          });
        } catch (err) {
          console.warn('Input chunk dropped:', err);
        }
      };

      // Send compact 300ms chunks for faster STT + response turnaround.
      recorder.start(300);
    };
    modelAttemptRef.current = 0;
    initSession();
    return cleanup;
  }, [persona, cleanup, resetRealtimeResources, sessionSeed]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcriptions]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 px-4">
        <div className="p-8 bg-slate-900 border border-red-500/30 rounded-3xl text-center max-w-md shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">⚠️</div>
          <h3 className="text-xl font-bold text-white mb-2">Neural Link Failed</h3>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">{error}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setError(null);
                setSessionSeed((value) => value + 1);
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all shadow-lg text-white"
            >
              Retry Connection
            </button>
            <button onClick={onExit} className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all shadow-lg text-white">
              Return to Labs
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto px-4 lg:px-8">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4 animate-in fade-in duration-700">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-500 to-blue-500 flex items-center justify-center text-3xl shadow-lg ring-4 ring-blue-500/10 flex-shrink-0 animate-pulse">
            {persona.gender === 'Male' ? '🧠' : '🧬'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">{persona.name}</h2>
            <p className="text-blue-400 font-bold text-[10px] uppercase tracking-widest line-clamp-1 max-w-[250px]">{persona.role}</p>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="text-[8px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-black uppercase tracking-widest">Neural Feed: Active</span>
              <span className="text-[8px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-black uppercase">Intensity: {persona.difficultyLevel}/10</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none group">
            <select
              value={currentLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="w-full sm:w-32 bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-wider rounded-full px-4 py-2 appearance-none outline-none focus:border-blue-500/50 hover:bg-slate-800 transition-all cursor-pointer text-center"
            >
              {COMMON_LANGUAGES.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500 group-hover:text-blue-400">
              <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>

          <button 
            onClick={handleSaveAndExit}
            className="flex-1 sm:flex-none px-6 py-2 bg-slate-900 border border-slate-800 rounded-full hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all font-black text-[9px] uppercase tracking-widest whitespace-nowrap"
          >
            Exit Session
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden relative shadow-2xl synapse-glow animate-in zoom-in-95 duration-500">
        {isConnecting && (
          <div className="absolute inset-0 bg-slate-950/90 z-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] animate-pulse">Initializing Synapse Network...</p>
          </div>
        )}

        <div className="h-32 sm:h-40 flex items-center justify-center bg-slate-950 border-b border-slate-800 relative overflow-hidden shrink-0">
          <div className={`absolute inset-0 bg-blue-500/5 transition-opacity duration-1000 ${isSpeaking ? 'opacity-100' : 'opacity-0'}`}></div>
          <div className="flex items-end gap-1.5 h-16">
            {[...Array(32)].map((_, i) => (
              <div 
                key={i} 
                className={`w-0.5 sm:w-1 bg-gradient-to-t from-blue-600 to-pink-500 rounded-full transition-all duration-300 ${isSpeaking ? 'animate-bounce' : 'h-1 opacity-10'}`}
                style={{ 
                  animationDelay: `${i * 0.03}s`,
                  height: isSpeaking ? `${Math.random() * 80 + 20}%` : '4px'
                }}
              ></div>
            ))}
          </div>
          <div className="absolute bottom-3 flex items-center gap-3">
             <div className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-700">
               {isSpeaking ? `COACH SYNAPSE FIRING` : 'AWAITING NEURAL INPUT'}
             </div>
          </div>
        </div>

        <div 
          ref={containerRef}
          className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-6 scroll-smooth bg-slate-900/40"
        >
          {transcriptions.length === 0 && !isConnecting && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-12">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-blue-400 animate-pulse border border-slate-700">⚡</div>
              <div>
                <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Neural Link Synchronized</p>
                <p className="text-slate-600 italic text-sm mt-1">Speak clearly to begin your training session.</p>
              </div>
            </div>
          )}
          {transcriptions.map((t, idx) => (
            <div 
              key={idx} 
              className={`flex flex-col ${t.speaker === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div className={`max-w-[90%] sm:max-w-[75%] p-4 sm:p-5 rounded-2xl shadow-xl leading-relaxed ${
                t.speaker === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700'
              }`}>
                <p className="text-sm md:text-base">{t.text}</p>
              </div>
              <span className="text-[8px] uppercase font-black text-slate-600 mt-2 px-1 tracking-[0.2em]">
                {t.speaker === 'user' ? 'Linguistic Impulse' : 'Neuro-Response'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-6 py-2.5 px-6 bg-slate-900/50 rounded-full border border-slate-800 w-fit mx-auto shadow-lg backdrop-blur-sm animate-in fade-in duration-1000 delay-500">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Signal Locked</span>
        </div>
        <div className="h-3 w-px bg-slate-800"></div>
        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
          Secure Neural Stream v3.2
        </div>
      </div>
    </div>
  );
};

export default ConversationRoom;
