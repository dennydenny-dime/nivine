import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Persona, TranscriptionItem } from '../types';
import { VOICE_MAP, getSystemApiKey, COMMON_LANGUAGES } from '../constants';
import { decode, decodeAudioData, createBlob } from '../utils/audioUtils';

interface ConversationRoomProps {
  persona: Persona;
  onExit: () => void;
}

const ConversationRoom: React.FC<ConversationRoomProps> = ({ persona, onExit }) => {
  const [isConnecting, setIsConnecting] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState(persona.language || 'English');

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const transcriptionRef = useRef({ input: '', output: '' });
  const containerRef = useRef<HTMLDivElement>(null);

  const cleanup = useCallback(() => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    if (audioContextRef.current) audioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
  }, []);

  const handleSaveAndExit = useCallback(() => {
    if (transcriptions.length > 0) {
      try {
        const historyItem = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          persona,
          transcriptions
        };
        
        const storedHistory = localStorage.getItem('tm_conversation_history');
        const history = storedHistory ? JSON.parse(storedHistory) : [];
        // Keep last 50 sessions to manage storage size
        const updatedHistory = [historyItem, ...history].slice(0, 50);
        
        localStorage.setItem('tm_conversation_history', JSON.stringify(updatedHistory));
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
    const initSession = async () => {
      try {
        const apiKey = getSystemApiKey();
        if (!apiKey) {
          setError("Environment Config Error: No API Key found. In Vercel, please set your variable as 'VITE_API_KEY' or 'REACT_APP_API_KEY'.");
          return;
        }

        // Always create a fresh instance right before connecting
        const ai = new GoogleGenAI({ apiKey });
        
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        outputNodeRef.current = outputAudioContextRef.current.createGain();
        outputNodeRef.current.connect(outputAudioContextRef.current.destination);

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

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

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_MAP[persona.gender] } },
            },
            // Optimize for speed: Disable thinking budget to reduce Time To First Token (TTFT)
            thinkingConfig: { thinkingBudget: 0 },
            systemInstruction: `You are acting as ${persona.name}, whose profile is: ${persona.role}. Your primary mood is ${persona.mood}. 
            
            NEURAL INTENSITY SETTING (Hardness ${hardness}/10):
            ${intensityInstruction}
            
            COACHING FOCUS:
            1. Monitor for fillers (um, ah, like), weak vocabulary, and tone inconsistencies.
            2. Language: The session starts in ${currentLanguage}. Detect and switch instantly if the user changes language or if instructed.
            3. Flow: Start immediately. Introduction: "Neural link established at Intensity Level ${hardness}. I am ${persona.name}. Let's begin."
            4. Real-time Feedback: Point out mistakes in communication style and vocabulary directly during the conversation.
            5. LATENCY PRIORITY: Respond immediately. Keep responses concise, punchy, and fast-paced. Do not simulate "thinking" pauses. Interject quickly if necessary.
            6. AUDIO REALISM: To feel like a real human presence, occasionally include subtle audio cues such as a soft chuckle/laugh (when context is funny or light) or a gentle clearing of the throat/cough (when shifting topics or thinking). These should be natural and not disruptive.`,
            outputAudioTranscription: {},
            inputAudioTranscription: {},
          },
          callbacks: {
            onopen: () => {
              setIsConnecting(false);
              const source = audioContextRef.current!.createMediaStreamSource(stream);
              // Reduced buffer size from 4096 to 2048 to lower input latency (approx 128ms at 16kHz)
              const scriptProcessor = audioContextRef.current!.createScriptProcessor(2048, 1, 1);
              
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                // Rely on sessionPromise resolving to send input
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
              console.error("Gemini Live Error:", e);
              const errMsg = e?.message || e?.toString() || "";
              
              // Handle standard network/resource errors by prompting for a paid key
              if (errMsg.includes('Network error') || errMsg.includes('Requested entity was not found') || errMsg.includes('403')) {
                setError("Neural Connection Error: Ensure your API Key is valid and has Gemini API enabled in Google Cloud Console.");
              } else {
                setError("Synapse Error: The link was severed unexpectedly. Please check your signal.");
              }
            },
            onclose: () => {
              console.log("Session Closed");
            }
          }
        });

        sessionRef.current = await sessionPromise;
      } catch (err: any) {
        console.error("Initialization Error:", err);
        setError("Could not establish neural link. Ensure mic access is granted and your billing is active.");
      }
    };

    initSession();
    return cleanup;
  }, [persona, cleanup]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcriptions]);

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
