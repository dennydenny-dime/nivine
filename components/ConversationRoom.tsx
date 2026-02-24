import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ConversationHistoryItem, NeuralSpeechScoreCard, Persona, TranscriptionItem } from '../types';
import { COMMON_LANGUAGES, getBackendApiBaseUrl } from '../constants';
import { setUserConversationHistory, getUserConversationHistory } from '../lib/userStorage';

interface ConversationRoomProps {
  persona: Persona;
  onExit: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognition;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionCtor;
    SpeechRecognition?: SpeechRecognitionCtor;
  }

  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
  }
}

const FILLER_WORDS = new Set(['um', 'uh', 'like', 'you know', 'actually', 'basically', 'literally', 'so']);

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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState(persona.language || 'English');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldListenRef = useRef(false);
  const isHandlingTurnRef = useRef(false);
  const restartTimeoutRef = useRef<number | null>(null);
  const transcriptionsRef = useRef<TranscriptionItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const backendUrl = useMemo(() => {
    const base = getBackendApiBaseUrl();
    if (!base) return '/api/chat';
    return `${base.replace(/\/$/, '')}/chat`;
  }, []);

  const speak = useCallback((text: string) => {
    return new Promise<void>((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const sendToBackend = useCallback(async (transcript: string): Promise<string> => {
    const roleDirectives = getRoleDirectives(persona.role || '');
    const payload = {
      transcript,
      language: currentLanguage,
      persona,
      roleDirectives,
      history: transcriptionsRef.current.slice(-12),
      workflow: 'voice-stt-backend-gemini-tts-relisten',
    };

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `Backend call failed (${response.status})`);
    }

    const data = await response.json();
    if (!data?.text || typeof data.text !== 'string') {
      throw new Error('Backend response is missing `text`.');
    }

    return data.text;
  }, [backendUrl, currentLanguage, persona]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isHandlingTurnRef.current) return;
    try {
      setIsConnecting(true);
      recognitionRef.current.start();
    } catch (e) {
      // Ignore duplicate start race.
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      if (restartTimeoutRef.current) {
        window.clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      recognitionRef.current.stop();
    } catch (e) {
      // noop
    }
  }, []);

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
        const updatedHistory = [historyItem, ...history].slice(0, 50);

        setUserConversationHistory(currentUser.id, updatedHistory);
      } catch (e) {
        console.error('Failed to save conversation history', e);
      }
    }

    shouldListenRef.current = false;
    stopListening();
    window.speechSynthesis?.cancel();
    onExit();
  }, [onExit, persona, stopListening, transcriptions]);

  useEffect(() => {
    transcriptionsRef.current = transcriptions;
  }, [transcriptions]);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [transcriptions]);

  useEffect(() => {
    const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionApi) {
      setError('Speech recognition is not supported in this browser. Use a Chromium-based browser for STT modules.');
      setIsConnecting(false);
      return;
    }

    const recognition = new SpeechRecognitionApi();
    recognition.lang = currentLanguage === 'English' ? 'en-US' : currentLanguage;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setIsConnecting(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (shouldListenRef.current && !isHandlingTurnRef.current) {
        startListening();
      }
    };

    recognition.onerror = (event: Event) => {
      const speechError = event as SpeechRecognitionErrorEvent;
      const errorCode = speechError.error || 'unknown';

      if (errorCode === 'no-speech' || errorCode === 'aborted') return;

      if (errorCode === 'network') {
        setIsListening(false);
        setIsConnecting(true);

        if (restartTimeoutRef.current) {
          window.clearTimeout(restartTimeoutRef.current);
        }

        restartTimeoutRef.current = window.setTimeout(() => {
          restartTimeoutRef.current = null;
          if (!shouldListenRef.current || isHandlingTurnRef.current) return;
          startListening();
        }, 1200);
        return;
      }

      if (errorCode === 'audio-capture') {
        setError('Microphone not detected. Connect a microphone, allow browser access, and retry.');
        return;
      }

      if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed') {
        setError('Microphone permission denied. Allow mic access in browser settings and retry.');
        return;
      }

      setError(`STT error: ${errorCode}`);
    };

    recognition.onresult = async (event: Event) => {
      const speechEvent = event as SpeechRecognitionEvent;
      const result = speechEvent.results[speechEvent.resultIndex];
      const transcript = result?.[0]?.transcript?.trim();
      if (!transcript) return;

      isHandlingTurnRef.current = true;
      setError(null);
      setTranscriptions((prev) => [...prev, { speaker: 'user', text: transcript, timestamp: Date.now() }]);

      try {
        const aiText = await sendToBackend(transcript);
        setTranscriptions((prev) => [...prev, { speaker: 'ai', text: aiText, timestamp: Date.now() }]);
        await speak(aiText);
      } catch (e: any) {
        const message = e?.message || 'Backend request failed.';
        setError(message);
      } finally {
        isHandlingTurnRef.current = false;
        if (shouldListenRef.current) startListening();
      }
    };

    recognitionRef.current = recognition;
    shouldListenRef.current = true;

    startListening();

    return () => {
      shouldListenRef.current = false;
      if (restartTimeoutRef.current) {
        window.clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      recognition.stop();
      recognitionRef.current = null;
      window.speechSynthesis?.cancel();
    };
  }, [currentLanguage, sendToBackend, speak, startListening]);

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
                shouldListenRef.current = true;
                startListening();
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all shadow-lg text-white"
            >
              Retry Listening
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
              <span className="text-[8px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-black uppercase tracking-widest">Pipeline: Voice→Backend→Gemini</span>
              <span className="text-[8px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-black uppercase">Status: {isListening ? 'Listening' : isSpeaking ? 'Speaking' : 'Processing'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none group">
            <select
              value={currentLanguage}
              onChange={(e) => setCurrentLanguage(e.target.value)}
              className="w-full sm:w-32 bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-wider rounded-full px-4 py-2 appearance-none outline-none focus:border-blue-500/50 hover:bg-slate-800 transition-all cursor-pointer text-center"
            >
              {COMMON_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSaveAndExit}
            className="flex-1 sm:flex-none px-6 py-2 bg-slate-900 border border-slate-800 rounded-full hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all font-black text-[9px] uppercase tracking-widest whitespace-nowrap"
          >
            Exit Session
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-6 scroll-smooth bg-slate-900/40 border border-slate-800 rounded-3xl"
      >
        {transcriptions.length === 0 && !isConnecting && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-12">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-blue-400 animate-pulse border border-slate-700">⚡</div>
            <div>
              <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Neural Workflow Ready</p>
              <p className="text-slate-600 italic text-sm mt-1">Speak, wait for Gemini response, TTS will play, then listening resumes.</p>
            </div>
          </div>
        )}
        {transcriptions.map((t, idx) => (
          <div key={idx} className={`flex flex-col ${t.speaker === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] sm:max-w-[75%] p-4 sm:p-5 rounded-2xl shadow-xl leading-relaxed ${
              t.speaker === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700'
            }`}>
              <p className="text-sm md:text-base">{t.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversationRoom;
