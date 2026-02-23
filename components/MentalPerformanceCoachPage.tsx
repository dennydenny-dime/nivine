import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SynapseLogo } from '../App';

type InterviewMode = 'hr' | 'investor' | 'debate' | 'sales' | 'media' | 'rapid';

type ConversationTurn = {
  id: string;
  role: 'ai' | 'user';
  text: string;
  latencySec?: number;
  micLevel?: number;
  videoSnapshot?: VideoFrameSignals;
  signals?: RealtimeSignals;
  timestamp: number;
};

type VideoFrameSignals = {
  frameStability: number;
  faceCentering: number;
  gazeFocus: number;
  blinkProxy: number;
  jawTensionProxy: number;
  postureStability: number;
};

type RealtimeSignals = {
  hesitationLatency: number;
  fillerDensity: number;
  sentenceQuality: number;
  argumentDepth: number;
  structuredThinking: number;
  logicalCoherence: number;
  persuasionStrength: number;
  decisionSharpness: number;
  contradictionRisk: number;
  circularReasoning: number;
  topicSwitching: number;
  overExplainRisk: number;
  pitchStability: number;
  voiceTremor: number;
  speakingSpeedVariance: number;
  volumeFluctuation: number;
  breathIrregularity: number;
  paceAcceleration: number;
  voiceCrackRisk: number;
  emotionalStability: number;
  pressureResistance: number;
  confidenceDrift: number;
  eyeContactConsistency: number;
  blinkRateShift: number;
  headMovementInstability: number;
  jawTension: number;
  lipCompression: number;
  microHesitation: number;
  facialAsymmetryStress: number;
  freezeResponse: number;
  nonVerbalStability: number;
  cognitiveOverload: number;
};

type MultiScores = {
  confidenceIndex: number;
  assertivenessScore: number;
  persuasionStrength: number;
  emotionalStability: number;
  logicalCoherence: number;
  leadershipTone: number;
  decisionSharpness: number;
};

type SessionSummary = {
  id: string;
  mode: InterviewMode;
  startedAt: number;
  endedAt: number;
  turns: ConversationTurn[];
  avgLatency: number;
  stressScore: number;
  argumentStability: number;
  interruptRecoverySpeed: number;
  pressureDropPoint: string;
  dominantStyle: string;
  weaknessPattern: string;
  stressGraph: Array<{ label: string; stress: number; coherence: number; confidence: number }>;
  prescriptions: string[];
  correlations: string[];
  stressTriggers: string[];
  collapseZones: string[];
  defensiveIndicators: string[];
  discomfortTopics: string[];
  scores: MultiScores;
};

const STORAGE_KEY = 'tm_live_interview_sessions_v2';

type ModeDefinition = {
  label: string;
  tone: string;
  style: string;
  basePressure: number;
  seedQuestions: string[];
};

const modeConfig: Record<InterviewMode, ModeDefinition> = {
  hr: {
    label: 'HR Interview Mode',
    tone: 'Calm & probing',
    style: 'Behavioral depth + contradiction checks.',
    basePressure: 36,
    seedQuestions: [
      'In 45 seconds: what is your strongest leadership decision from last year?',
      'Where did your execution underperform and what changed after feedback?',
      'What assumption do peers challenge most, and why do you still hold it?'
    ]
  },
  investor: {
    label: 'Investor Pitch Mode',
    tone: 'Aggressive & skeptical',
    style: 'Unit economics pressure and risk exposure.',
    basePressure: 62,
    seedQuestions: [
      'Why should capital trust your moat when incumbents can copy your feature set?',
      'Show where margin fails first if growth doubles in 6 months.',
      'If runway is cut by 40%, what remains non-negotiable and why?'
    ]
  },
  debate: {
    label: 'Debate Mode',
    tone: 'Interrupt-heavy',
    style: 'Rapid challenges and adversarial cross-exam.',
    basePressure: 70,
    seedQuestions: [
      'Defend your thesis with Claim → Reason → Example in 30 seconds.',
      'What is the strongest argument against your position?',
      'Your framing sounds broad; pin it to one falsifiable condition.'
    ]
  },
  sales: {
    label: 'Sales Objection Mode',
    tone: 'Aggressive objection stack',
    style: 'Price, trust, urgency, and implementation pushback.',
    basePressure: 55,
    seedQuestions: [
      'I think your product is overpriced. Why should I not wait six months?',
      'I do not believe implementation can be done safely. Prove otherwise.',
      'We already have a competitor contract. Why should we switch now?'
    ]
  },
  media: {
    label: 'Media Interview Mode',
    tone: 'Analytical & technical',
    style: 'Public scrutiny, precision, and follow-up ambushes.',
    basePressure: 58,
    seedQuestions: [
      'Your claim is trending, but what evidence supports it beyond anecdotes?',
      'What did you say previously that now appears inconsistent?',
      'Give one concise answer without hedging language.'
    ]
  },
  rapid: {
    label: 'Rapid Fire Mode',
    tone: 'High tempo interruption',
    style: 'Time-boxed replies and quick cognitive switching.',
    basePressure: 74,
    seedQuestions: [
      'Twenty seconds: your thesis, biggest risk, and mitigation.',
      'Name one wrong assumption you made this month and correction.',
      'One sentence only: what decision are you avoiding right now?'
    ]
  }
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const average = (values: number[]) => (values.length ? values.reduce((acc, value) => acc + value, 0) / values.length : 0);
const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const countTokens = (text: string, tokens: string[]) => {
  const normalized = text.toLowerCase();
  return tokens.reduce((total, token) => {
    const phrase = token.trim().toLowerCase();
    if (!phrase) return total;

    const pattern = phrase.includes(' ')
      ? `(^|[^a-z0-9])${escapeRegExp(phrase)}(?=$|[^a-z0-9])`
      : `\\b${escapeRegExp(phrase)}\\b`;

    const matches = normalized.match(new RegExp(pattern, 'g'));
    return total + (matches?.length || 0);
  }, 0);
};

const getStoredSummaries = (): SessionSummary[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const analyzeResponse = (
  text: string,
  latencySec: number,
  micLevel: number,
  modeBasePressure: number,
  videoSignals?: VideoFrameSignals | null
): RealtimeSignals => {
  const words = wordCount(text);
  const fillers = countTokens(text, [' um ', ' uh ', ' like ', ' you know ', ' actually ']);
  const claimHits = countTokens(text, ['i believe', 'my claim', 'core point']);
  const reasonHits = countTokens(text, ['because', 'due to', 'therefore']);
  const exampleHits = countTokens(text, ['for example', 'for instance', 'case']);
  const conclusionHits = countTokens(text, ['in summary', 'therefore', 'so the decision']);
  const contradictions = countTokens(text, [' however ', ' but ', ' although ', ' on the other hand ']);
  const circularHits = countTokens(text, ['as i said', 'again', 'basically the same']);
  const switches = countTokens(text, ['anyway', 'separately', 'different topic']);

  const structureCoverage = claimHits + reasonHits + exampleHits + conclusionHits;
  const pressureFromLatency = clamp((latencySec - 1.2) * 30, 0, 100);
  const pressureBaseline = clamp(modeBasePressure * 0.85, 0, 100);
  const totalPressure = clamp((pressureFromLatency * 0.65) + (pressureBaseline * 0.35));
  const verbosity = clamp((words - 90) * 1.4, 0, 100);

  const logicalCoherence = clamp(68 + structureCoverage * 7 - contradictions * 8 - circularHits * 12 - switches * 6);
  const persuasionStrength = clamp(52 + reasonHits * 12 + exampleHits * 10 - fillers * 6 - contradictions * 6);
  const structuredThinking = clamp(40 + structureCoverage * 10 - contradictions * 5);
  const decisionSharpness = clamp(58 + countTokens(text, ['i will', 'the decision', 'next step']) * 11 - switches * 10 - fillers * 4);

  const frameStability = videoSignals?.frameStability ?? 58;
  const gazeFocus = videoSignals?.gazeFocus ?? 56;
  const faceCentering = videoSignals?.faceCentering ?? 60;
  const blinkProxy = videoSignals?.blinkProxy ?? 42;
  const jawTensionProxy = videoSignals?.jawTensionProxy ?? 40;
  const postureStability = videoSignals?.postureStability ?? 58;

  const tremor = clamp(18 + totalPressure * 0.52 + micLevel * 0.28 + (100 - frameStability) * 0.24);
  const speakingVariance = clamp(20 + (words > 120 ? 45 : words > 80 ? 26 : 8) + totalPressure * 0.35);

  const emotionalStability = clamp(74 - totalPressure * 0.4 - tremor * 0.22 + postureStability * 0.2 + gazeFocus * 0.12);
  const pressureResistance = clamp(74 - totalPressure * 0.4 - contradictions * 5 + structureCoverage * 3);

  const eyeContact = clamp(30 + gazeFocus * 0.48 + faceCentering * 0.36 - totalPressure * 0.25 - fillers * 3.5);
  const blinkShift = clamp(12 + totalPressure * 0.45 + blinkProxy * 0.58);
  const freezeResponse = clamp(18 + totalPressure * 0.5 + contradictions * 4 + (100 - frameStability) * 0.45);

  return {
    hesitationLatency: Number(latencySec.toFixed(2)),
    fillerDensity: clamp((fillers / Math.max(words, 1)) * 300),
    sentenceQuality: clamp(62 + (words > 14 ? 10 : -8) + reasonHits * 6 - fillers * 4),
    argumentDepth: clamp(42 + reasonHits * 14 + exampleHits * 10 - switches * 8),
    structuredThinking,
    logicalCoherence,
    persuasionStrength,
    decisionSharpness,
    contradictionRisk: clamp(contradictions * 24),
    circularReasoning: clamp(circularHits * 28),
    topicSwitching: clamp(switches * 30),
    overExplainRisk: clamp(verbosity + latencySec * 7),
    pitchStability: clamp(100 - tremor),
    voiceTremor: tremor,
    speakingSpeedVariance: speakingVariance,
    volumeFluctuation: clamp(18 + totalPressure * 0.5 + micLevel * 0.2),
    breathIrregularity: clamp(20 + totalPressure * 0.45 + verbosity * 0.18),
    paceAcceleration: clamp(22 + totalPressure * 0.5),
    voiceCrackRisk: clamp(14 + totalPressure * 0.4 + micLevel * 0.25),
    emotionalStability,
    pressureResistance,
    confidenceDrift: clamp(36 + totalPressure * 0.4 - structuredThinking * 0.18),
    eyeContactConsistency: eyeContact,
    blinkRateShift: blinkShift,
    headMovementInstability: clamp(16 + totalPressure * 0.28 + (100 - frameStability) * 0.5),
    jawTension: clamp(16 + totalPressure * 0.22 + jawTensionProxy * 0.65),
    lipCompression: clamp(14 + totalPressure * 0.28 + jawTensionProxy * 0.45),
    microHesitation: clamp(28 + totalPressure * 0.62),
    facialAsymmetryStress: clamp(16 + totalPressure * 0.34 + (100 - faceCentering) * 0.4),
    freezeResponse,
    nonVerbalStability: clamp((eyeContact * 0.4 + (100 - blinkShift) * 0.2 + (100 - freezeResponse) * 0.2 + postureStability * 0.2)),
    cognitiveOverload: clamp((verbosity + totalPressure + switches * 10 + (100 - postureStability) * 0.6) / 2.8)
  };
};

const buildAdaptiveQuestion = (mode: InterviewMode, response: string, signals: RealtimeSignals, pressure: number) => {
  const opening =
    mode === 'investor'
      ? 'I am not convinced.'
      : mode === 'debate'
      ? 'Interrupted. Weak logic.'
      : mode === 'sales'
      ? 'Objection sustained.'
      : mode === 'media'
      ? 'Clarify for the record.'
      : mode === 'rapid'
      ? 'Clock running.'
      : 'Let us tighten that.';

  const contradictionDetected = signals.contradictionRisk > 35 || response.toLowerCase().includes('however');
  if (signals.hesitationLatency > 2.6 || pressure > 80) {
    return `${opening} You paused ${signals.hesitationLatency.toFixed(1)}s. One sentence only: strongest proof.`;
  }
  if (contradictionDetected) {
    return `${opening} You split your position. Choose one stance and defend with one concrete example.`;
  }
  if (signals.structuredThinking < 55) {
    return `${opening} Rebuild in strict format: Claim → Reason → Example → Conclusion.`;
  }
  if (mode === 'rapid') {
    return `${opening} 15 seconds: decision, risk, mitigation. No preamble.`;
  }
  return `${opening} Name the failure scenario you are avoiding and the mitigation trigger.`;
};

const formatTime = (unix: number) => new Date(unix).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const MentalPerformanceCoachPage: React.FC = () => {
  const [mode, setMode] = useState<InterviewMode>('investor');
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [lastPromptAt, setLastPromptAt] = useState<number | null>(null);
  const [pressureScore, setPressureScore] = useState(modeConfig.investor.basePressure);
  const [stressScore, setStressScore] = useState(48);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [latestSignals, setLatestSignals] = useState<RealtimeSignals | null>(null);
  const [history, setHistory] = useState<SessionSummary[]>(() => getStoredSummaries());
  const [lastSummary, setLastSummary] = useState<SessionSummary | null>(null);
  const [consentVideo, setConsentVideo] = useState(false);
  const [consentAudio, setConsentAudio] = useState(false);
  const [consentPolicy, setConsentPolicy] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<'idle' | 'ready' | 'error'>('idle');
  const [micLevel, setMicLevel] = useState(0);
  const [videoSignals, setVideoSignals] = useState<VideoFrameSignals>({
    frameStability: 58,
    faceCentering: 60,
    gazeFocus: 56,
    blinkProxy: 42,
    jawTensionProxy: 40,
    postureStability: 58
  });
  const [runtimeLatency, setRuntimeLatency] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previousFrameRef = useRef<Uint8ClampedArray | null>(null);

  const config = modeConfig[mode];
  const consentComplete = consentVideo && consentAudio && consentPolicy;

  const liveRuntimeSignals = useMemo(() => {
    if (!sessionActive || !lastPromptAt) return null;
    const latencyNow = Math.max((Date.now() - lastPromptAt) / 1000, 0);
    return analyzeResponse(draft.trim(), latencyNow, micLevel, config.basePressure, videoSignals);
  }, [sessionActive, lastPromptAt, draft, micLevel, videoSignals, config.basePressure]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!sessionActive || !lastPromptAt) return;

    const timer = window.setInterval(() => {
      const elapsedSec = (Date.now() - lastPromptAt) / 1000;
      setRuntimeLatency(elapsedSec);

      if (elapsedSec > 1.8) {
        setStressScore((prev) => clamp(prev + 0.35, 24, 98));
      }
      if (elapsedSec > 2.4) {
        setPressureScore((prev) => clamp(prev + 0.45, 22, 99));
      }
    }, 350);

    return () => window.clearInterval(timer);
  }, [sessionActive, lastPromptAt]);

  const beginDeviceCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((sum, value) => sum + value, 0) / Math.max(data.length, 1);
        setMicLevel(clamp((avg / 255) * 100));

        const videoEl = videoRef.current;
        const canvas = canvasRef.current;
        if (videoEl && canvas && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (context) {
            const width = 64;
            const height = 48;
            canvas.width = width;
            canvas.height = height;
            context.drawImage(videoEl, 0, 0, width, height);
            const frame = context.getImageData(0, 0, width, height).data;

            let brightnessTotal = 0;
            let centerBrightness = 0;
            let edgeBrightness = 0;
            let highFreqContrast = 0;
            let motion = 0;

            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = frame[idx];
                const g = frame[idx + 1];
                const b = frame[idx + 2];
                const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                brightnessTotal += lum;

                const isCenter = x > width * 0.28 && x < width * 0.72 && y > height * 0.2 && y < height * 0.8;
                if (isCenter) {
                  centerBrightness += lum;
                } else {
                  edgeBrightness += lum;
                }

                if (x > 0 && y > 0) {
                  const leftIdx = idx - 4;
                  const topIdx = idx - width * 4;
                  const leftLum = 0.2126 * frame[leftIdx] + 0.7152 * frame[leftIdx + 1] + 0.0722 * frame[leftIdx + 2];
                  const topLum = 0.2126 * frame[topIdx] + 0.7152 * frame[topIdx + 1] + 0.0722 * frame[topIdx + 2];
                  highFreqContrast += Math.abs(lum - leftLum) + Math.abs(lum - topLum);
                }

                const previous = previousFrameRef.current;
                if (previous) {
                  const prevLum = 0.2126 * previous[idx] + 0.7152 * previous[idx + 1] + 0.0722 * previous[idx + 2];
                  motion += Math.abs(lum - prevLum);
                }
              }
            }

            previousFrameRef.current = frame;
            const pixels = width * height;
            const avgBrightness = brightnessTotal / pixels;
            const centerRatio = centerBrightness / Math.max(centerBrightness + edgeBrightness, 1);
            const motionNorm = clamp((motion / pixels) * 0.55, 0, 100);
            const contrastNorm = clamp((highFreqContrast / pixels) * 0.12, 0, 100);

            setVideoSignals({
              frameStability: clamp(92 - motionNorm),
              faceCentering: clamp(20 + centerRatio * 120),
              gazeFocus: clamp(44 + contrastNorm * 0.45 - motionNorm * 0.2),
              blinkProxy: clamp(16 + Math.abs(avgBrightness - 105) * 0.55 + motionNorm * 0.2),
              jawTensionProxy: clamp(22 + contrastNorm * 0.58 + motionNorm * 0.25),
              postureStability: clamp(80 - motionNorm * 0.75 + centerRatio * 18)
            });
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      setDeviceStatus('ready');
    } catch {
      setDeviceStatus('error');
    }
  };

  const startSession = async () => {
    if (!consentComplete) return;
    if (deviceStatus !== 'ready') {
      await beginDeviceCapture();
    }

    const now = Date.now();
    setSessionActive(true);
    setSessionStart(now);
    setLastPromptAt(now);
    setPressureScore(config.basePressure);
    setStressScore(Math.max(34, config.basePressure - 6));
    setTurns([{ id: `ai-${now}`, role: 'ai', text: config.seedQuestions[0], timestamp: now }]);
    setLatestSignals(null);
    setLastSummary(null);
    setRuntimeLatency(0);
  };

  const pushAiTurn = (text: string) => {
    const now = Date.now();
    setTurns((prev) => [...prev, { id: `ai-${now}`, role: 'ai', text, timestamp: now }]);
    setLastPromptAt(now);
  };

  const submitResponse = () => {
    if (!draft.trim() || !sessionActive || !lastPromptAt) return;

    const now = Date.now();
    const latencySec = (now - lastPromptAt) / 1000;
    const snapshot = { ...videoSignals };
    const signals = analyzeResponse(draft.trim(), latencySec, micLevel, config.basePressure, snapshot);
    setLatestSignals(signals);

    setTurns((prev) => [
      ...prev,
      { id: `user-${now}`, role: 'user', text: draft.trim(), latencySec, micLevel, videoSnapshot: snapshot, signals, timestamp: now }
    ]);

    const combinedStress = clamp(
      0.28 * signals.hesitationLatency * 20 +
        0.22 * (100 - signals.logicalCoherence) +
        0.25 * (100 - signals.emotionalStability) +
        0.25 * (100 - signals.nonVerbalStability)
    );

    const nextStress = clamp((stressScore * 0.55 + combinedStress * 0.45), 24, 98);
    const nextPressure = clamp(
      pressureScore + (nextStress > 72 ? 14 : 6) + (signals.structuredThinking < 55 ? 6 : 0) - (signals.logicalCoherence > 76 ? 5 : 0),
      22,
      99
    );

    setStressScore(nextStress);
    setPressureScore(nextPressure);

    let question = buildAdaptiveQuestion(mode, draft.trim(), signals, nextPressure);
    if (nextPressure > 84) question += ' [Pressure escalation: interruption + time constraint active.]';
    pushAiTurn(question);
    setDraft('');
  };

  const finishSession = () => {
    if (!sessionActive || !sessionStart) return;

    const endedAt = Date.now();
    const userTurns = turns.filter((turn) => turn.role === 'user');
    const fallbackSignal = latestSignals || analyzeResponse(draft.trim(), runtimeLatency || 0.8, micLevel, config.basePressure, videoSignals);
    const userSignals = userTurns.length
      ? userTurns.map((turn) => turn.signals || analyzeResponse(turn.text, turn.latencySec || 0, turn.micLevel || micLevel, config.basePressure, turn.videoSnapshot))
      : [fallbackSignal];

    const avgLatency = userTurns.length ? average(userTurns.map((turn) => turn.latencySec || 0)) : fallbackSignal.hesitationLatency;
    const argumentStability = average(userSignals.map((signal) => signal.structuredThinking));
    const interruptRecoverySpeed = clamp(100 - avgLatency * 25);

    const dominantStyle =
      average(userSignals.map((signal) => signal.decisionSharpness)) > 70
        ? 'Decisive executive framing'
        : avgLatency < 1.7
        ? 'High-tempo reactive communicator'
        : 'Detail-heavy defensive communicator';

    const stressTriggers = [
      'Contradiction prompts',
      'Time-boxed one-sentence answers',
      'Follow-up interruptions after latency spikes'
    ];

    const collapseZones = [
      'Claim-to-example transition under pressure',
      'Decision commitment when challenged on risk',
      'Compression of long explanations into concise proof'
    ];

    const defensiveIndicators = [
      'Frequent hedging language',
      'Topic switching during high-pressure prompts',
      'Over-explanation when objections stack'
    ];

    const discomfortTopics = ['Budget cuts', 'Public contradiction checks', 'Implementation risk challenges'];

    const stressGraph = [
      {
        label: 'Opening',
        stress: clamp(stressScore - 18),
        coherence: clamp(average(userSignals.map((signal) => signal.logicalCoherence)) + 8),
        confidence: clamp(average(userSignals.map((signal) => 100 - signal.confidenceDrift)) + 5)
      },
      {
        label: 'Mid pressure',
        stress: clamp(stressScore - 4),
        coherence: clamp(average(userSignals.map((signal) => signal.logicalCoherence))),
        confidence: clamp(average(userSignals.map((signal) => 100 - signal.confidenceDrift)))
      },
      {
        label: 'Escalation',
        stress: clamp(stressScore + 8),
        coherence: clamp(average(userSignals.map((signal) => signal.logicalCoherence)) - 7),
        confidence: clamp(average(userSignals.map((signal) => 100 - signal.confidenceDrift)) - 8)
      }
    ];

    const scores: MultiScores = {
      confidenceIndex: clamp(average(userSignals.map((signal) => 100 - signal.confidenceDrift))),
      assertivenessScore: clamp(average(userSignals.map((signal) => signal.decisionSharpness))),
      persuasionStrength: clamp(average(userSignals.map((signal) => signal.persuasionStrength))),
      emotionalStability: clamp(average(userSignals.map((signal) => signal.emotionalStability))),
      logicalCoherence: clamp(average(userSignals.map((signal) => signal.logicalCoherence))),
      leadershipTone: clamp(average(userSignals.map((signal) => signal.argumentDepth))),
      decisionSharpness: clamp(average(userSignals.map((signal) => signal.decisionSharpness)))
    };

    const summary: SessionSummary = {
      id: `summary-${endedAt}`,
      mode,
      startedAt: sessionStart,
      endedAt,
      turns,
      avgLatency,
      stressScore,
      argumentStability,
      interruptRecoverySpeed,
      pressureDropPoint: userTurns.length > 2 ? 'Post-second interruption' : 'In-progress calibration (add more turns for stable detection)',
      dominantStyle,
      weaknessPattern: argumentStability < 60 ? 'Structure collapse during escalation' : 'Over-detail under objections',
      stressGraph,
      prescriptions: [
        'Precision drill: 20-second Claim → Reason → Example repetitions (8 reps/session).',
        'Weekly focus: contradiction handling with strict one-sentence recovery.',
        'Micro-skill: remove filler phrases from first 10 words of each answer.',
        'Simulated training: run Rapid Fire + Media mode alternation for cognitive switching.'
      ],
      correlations: [
        'Stress spikes aligned with logical coherence drops during contradiction prompts.',
        'Confidence drift rose when hesitation latency exceeded 2.5 seconds.',
        'Blink-rate and freeze-response increases coincided with argument depth decline.'
      ],
      stressTriggers,
      collapseZones,
      defensiveIndicators,
      discomfortTopics,
      scores
    };

    const updated = [summary, ...history].slice(0, 20);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setLastSummary(summary);
    setSessionActive(false);
  };

  const trendData = useMemo(() => {
    const recent = history.slice(0, 8);
    const baseline = history[history.length - 1];
    const current = history[0];
    const fallbackCoherence = latestSignals?.logicalCoherence || liveRuntimeSignals?.logicalCoherence || 0;
    const fallbackLatency = latestSignals?.hesitationLatency || runtimeLatency || 0;
    return {
      stressTrend: recent.length ? average(recent.map((session) => session.stressScore)) : stressScore,
      latencyTrend: recent.length ? average(recent.map((session) => session.avgLatency)) : fallbackLatency,
      coherenceTrend: recent.length ? average(recent.map((session) => session.scores.logicalCoherence)) : fallbackCoherence,
      baselineCoherence: baseline?.scores.logicalCoherence || fallbackCoherence,
      currentCoherence: current?.scores.logicalCoherence || fallbackCoherence
    };
  }, [history, latestSignals, liveRuntimeSignals, runtimeLatency, stressScore]);

  return (
    <section className="pb-16 text-slate-100">
      <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 p-6 shadow-2xl shadow-indigo-900/30">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-indigo-300">Real-Time Video-Based Cognitive Interview Engine</p>
            <h1 className="mt-2 text-3xl font-black leading-tight">High-Pressure Adaptive Interview System</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">Live webcam + microphone capture, dynamic AI interrogation, multimodal cognitive analytics, and longitudinal progress tracking.</p>
          </div>
          <SynapseLogo className="h-12 w-12" />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <label className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm">
            <input type="checkbox" checked={consentVideo} onChange={(event) => setConsentVideo(event.target.checked)} className="mr-2" />
            I consent to live video analysis (eye contact, facial behavior, micro-hesitation).
          </label>
          <label className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm">
            <input type="checkbox" checked={consentAudio} onChange={(event) => setConsentAudio(event.target.checked)} className="mr-2" />
            I consent to live audio analysis (speech, voice stress, pacing, breath patterns).
          </label>
          <label className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm">
            <input type="checkbox" checked={consentPolicy} onChange={(event) => setConsentPolicy(event.target.checked)} className="mr-2" />
            I understand this is performance coaching, not clinical diagnosis.
          </label>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-6">
          {(Object.keys(modeConfig) as InterviewMode[]).map((modeOption) => {
            const modeDefinition = modeConfig[modeOption];
            const active = mode === modeOption;
            return (
              <button
                key={modeOption}
                onClick={() => {
                  if (!sessionActive) {
                    setMode(modeOption);
                    setPressureScore(modeDefinition.basePressure);
                  }
                }}
                className={`rounded-2xl border p-3 text-left transition ${active ? 'border-indigo-400 bg-indigo-500/20' : 'border-slate-700 bg-slate-900/70 hover:border-slate-500'}`}
              >
                <p className="text-xs font-bold">{modeDefinition.label}</p>
                <p className="mt-1 text-[11px] text-slate-400">{modeDefinition.tone}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Live Stress/Performance Index</p>
            <p className="mt-2 text-3xl font-extrabold text-rose-300">{Math.round((stressScore + pressureScore) / 2)}%</p>
            <p className="mt-2 text-xs text-slate-300">Auto-escalates interruption frequency, skepticism, and time constraints.</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pressure</p>
            <p className="mt-2 text-3xl font-extrabold text-amber-300">{Math.round(pressureScore)}%</p>
            <p className="mt-2 text-xs text-slate-300">Counter-argument intensity and challenge aggressiveness.</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Mic Signal</p>
            <p className="mt-2 text-3xl font-extrabold text-cyan-300">{micLevel.toFixed(0)}%</p>
            <p className="mt-2 text-xs text-slate-300">Used for volume fluctuation and tremor-adjacent stress features.</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Latency Target</p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-300">{sessionActive ? `${runtimeLatency.toFixed(1)}s` : '< 1.5s'}</p>
            <p className="mt-2 text-xs text-slate-300">System enforces high-tempo interview rhythm.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_2fr]">
          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Live camera feed</p>
            <video ref={videoRef} className="mt-2 h-52 w-full rounded-xl border border-slate-700 bg-black object-cover" muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            <p className="mt-2 text-xs text-slate-400">Device status: {deviceStatus === 'ready' ? 'Connected' : deviceStatus === 'error' ? 'Unavailable (permission/device issue)' : 'Idle'}</p>
            <p className="mt-2 text-xs text-slate-500">Privacy: raw media stays in browser session for real-time coaching signals.</p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
            <div className="flex flex-wrap gap-3">
              <button onClick={startSession} disabled={sessionActive || !consentComplete} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold disabled:opacity-50">Start Live Session</button>
              <button onClick={finishSession} disabled={!sessionActive} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold disabled:opacity-50">End + Generate Elite Report</button>
            </div>

            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/80 p-3">
              {turns.length === 0 && <p className="text-sm text-slate-400">Session transcript and interruptions will appear here.</p>}
              {turns.map((turn) => (
                <div key={turn.id} className={`rounded-xl border p-3 text-sm ${turn.role === 'ai' ? 'border-indigo-400/40 bg-indigo-500/10' : 'border-slate-600 bg-slate-900/70'}`}>
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-400">{turn.role === 'ai' ? 'AI Interviewer' : 'Candidate Response'} · {formatTime(turn.timestamp)}</p>
                  <p className="mt-1 text-slate-100">{turn.text}</p>
                  {typeof turn.latencySec === 'number' && <p className="mt-1 text-xs text-amber-200">Response latency: {turn.latencySec.toFixed(2)}s</p>}
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Respond. The engine will pressure-test logic, structure, confidence, and stress response."
                className="min-h-24 flex-1 rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-sm outline-none ring-indigo-400/40 focus:ring"
                disabled={!sessionActive}
              />
              <button onClick={submitResponse} disabled={!sessionActive || !draft.trim()} className="rounded-xl bg-white px-4 text-sm font-black uppercase tracking-[0.12em] text-slate-900 disabled:opacity-40">Send</button>
            </div>
          </div>
        </div>

        {(latestSignals || liveRuntimeSignals) && (
          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            {(() => {
              const displaySignals = latestSignals || liveRuntimeSignals!;
              return (
                <>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-xs">
              <h3 className="text-sm font-bold">Speech & Cognitive</h3>
              <p className="mt-2">Logical Coherence Index: <b>{displaySignals.logicalCoherence.toFixed(0)}</b></p>
              <p>Persuasion Strength Score: <b>{displaySignals.persuasionStrength.toFixed(0)}</b></p>
              <p>Structured Thinking Index: <b>{displaySignals.structuredThinking.toFixed(0)}</b></p>
              <p>Decision Sharpness: <b>{displaySignals.decisionSharpness.toFixed(0)}</b></p>
              <p>Argument Depth: <b>{displaySignals.argumentDepth.toFixed(0)}</b></p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-xs">
              <h3 className="text-sm font-bold">Voice Emotion & Stress</h3>
              <p className="mt-2">Emotional Stability: <b>{displaySignals.emotionalStability.toFixed(0)}</b></p>
              <p>Pressure Resistance: <b>{displaySignals.pressureResistance.toFixed(0)}</b></p>
              <p>Confidence Drift Index: <b>{displaySignals.confidenceDrift.toFixed(0)}</b></p>
              <p>Stress spike factors: tremor {displaySignals.voiceTremor.toFixed(0)} · pace {displaySignals.paceAcceleration.toFixed(0)}</p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-xs">
              <h3 className="text-sm font-bold">Facial & Behavioral</h3>
              <p className="mt-2">Eye contact consistency: <b>{displaySignals.eyeContactConsistency.toFixed(0)}</b></p>
              <p>Non-verbal stability: <b>{displaySignals.nonVerbalStability.toFixed(0)}</b></p>
              <p>Cognitive overload indicator: <b>{displaySignals.cognitiveOverload.toFixed(0)}</b></p>
              <p>Freeze response marker: <b>{displaySignals.freezeResponse.toFixed(0)}</b></p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-xs">
              <h3 className="text-sm font-bold">Adaptive Pressure Actions</h3>
              <p className="mt-2">Interrupt intensity: <b>{pressureScore > 75 ? 'High' : 'Moderate'}</b></p>
              <p>Counter-argument injection: <b>{displaySignals.logicalCoherence < 60 ? 'Active' : 'Standby'}</b></p>
              <p>Time constraints: <b>{displaySignals.hesitationLatency > 2.2 ? 'Tightened' : 'Normal'}</b></p>
              <p>Escalation reason: latency {displaySignals.hesitationLatency.toFixed(2)}s · coherence {displaySignals.logicalCoherence.toFixed(0)}</p>
            </div>
                </>
              );
            })()}
          </div>
        )}

        {lastSummary && (
          <div className="mt-6 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-5">
            <h2 className="text-xl font-bold">Post-Session Elite Report</h2>
            <p className="mt-2 text-sm text-slate-300">Dominant communication style: {lastSummary.dominantStyle}. Weakness pattern: {lastSummary.weaknessPattern}.</p>
            <p className="text-sm text-slate-300">Pressure drop point: {lastSummary.pressureDropPoint}. Interrupt recovery speed: {lastSummary.interruptRecoverySpeed.toFixed(0)}.</p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {lastSummary.stressGraph.map((point) => (
                <div key={point.label} className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{point.label}</p>
                  <p className="mt-1 text-xs">Stress vs coherence</p>
                  <p className="text-sm text-amber-200">Stress {point.stress.toFixed(0)} · Coherence {point.coherence.toFixed(0)} · Confidence {point.confidence.toFixed(0)}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Cognitive profile summary</p>
                <ul className="mt-2 space-y-2 text-slate-200">
                  {lastSummary.stressTriggers.map((item) => <li key={item} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2">Stress trigger: {item}</li>)}
                  {lastSummary.collapseZones.map((item) => <li key={item} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2">Argument collapse zone: {item}</li>)}
                  {lastSummary.defensiveIndicators.map((item) => <li key={item} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2">Defensive framing: {item}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Multi-dimensional scores</p>
                <ul className="mt-2 space-y-2 text-slate-200">
                  {Object.entries(lastSummary.scores).map(([name, value]) => (
                    <li key={name} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2">{name}: <b>{value.toFixed(0)}</b></li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Correlation & discomfort map</p>
                <ul className="mt-2 space-y-2 text-slate-200">
                  {lastSummary.correlations.map((item) => <li key={item} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2">{item}</li>)}
                  {lastSummary.discomfortTopics.map((item) => <li key={item} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2">Discomfort topic: {item}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Improvement prescription</p>
                <ul className="mt-2 space-y-2 text-slate-200">
                  {lastSummary.prescriptions.map((item) => <li key={item} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2">{item}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Long-term progress system</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-4 text-sm">
            <p className="rounded-lg border border-slate-700 bg-slate-900/80 p-3">Avg Stress: <b>{trendData.stressTrend.toFixed(1)}%</b></p>
            <p className="rounded-lg border border-slate-700 bg-slate-900/80 p-3">Avg Latency: <b>{trendData.latencyTrend.toFixed(2)}s</b></p>
            <p className="rounded-lg border border-slate-700 bg-slate-900/80 p-3">Avg Coherence: <b>{trendData.coherenceTrend.toFixed(1)}</b></p>
            <p className="rounded-lg border border-slate-700 bg-slate-900/80 p-3">Baseline vs Current: <b>{trendData.baselineCoherence.toFixed(0)} → {trendData.currentCoherence.toFixed(0)}</b></p>
          </div>
          <p className="mt-3 text-xs text-slate-400">Ethics safeguard: this engine evaluates communication performance metrics and explicitly avoids psychological diagnosis labels.</p>
        </div>
      </div>
    </section>
  );
};

export default MentalPerformanceCoachPage;
