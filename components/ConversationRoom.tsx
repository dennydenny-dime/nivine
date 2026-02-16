
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
        const apiKey = import.meta.env.VITE_API_KEY;
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

        let liveSession: any = null;

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
              // Reduced buffer size from 4096 -> 1024 to lower input latency further (~64ms at 16kHz)
              const scriptProcessor = audioContextRef.current!.createScriptProcessor(1024, 1, 1);
              
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                if (!liveSession) return;
                try { liveSession.sendRealtimeInput({ media: pcmBlob }); } catch(err) {
                  console.warn("Input dropped:", err);
                }
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

        liveSession = await sessionPromise;
        sessionRef.current = liveSession;
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 px-4">
        <div className="p-8 bg-slate-900 border border-red-500/30 rounded-3xl text-center max-w-md shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">⚠️</div>
          <h3 className="text-xl font-bold text-white mb-2">Neural Link Failed</h3>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">{error}</p>
          <div className="flex flex-col gap-3">
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
