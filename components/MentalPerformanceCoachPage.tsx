import React, { useMemo, useRef, useState } from 'react';
import { SynapseLogo } from '../App';

type CoreMetricKey = 'confidence' | 'assertiveness' | 'persuasion' | 'emotionalStability' | 'logicalCoherence';

type CoreMetric = {
  key: CoreMetricKey;
  label: string;
  value: number;
  explanation: string;
  trainHint: string;
};

type SimulationScenario = {
  id: string;
  title: string;
  interruptFrequency: number;
  toneAggression: number;
  unpredictability: number;
  timeConstraint: number;
};

type SessionSnapshot = {
  id: string;
  createdAt: number;
  scenarioId: string;
  transcript: string;
  responseDelaySec: number;
  interruptionRecoverySec: number;
  sentenceComplexity: number;
  loopRepetitionRate: number;
  logicalBreaks: number;
  structureConsistency: number;
  emotionalShiftUnderStress: number;
  metrics: Record<CoreMetricKey, number>;
};

type LongitudinalProfile = {
  dominantCognitiveStyle: string;
  weaknessPattern: string;
  stressResponse: string;
  decisionBias: string;
  averageResponseDelay: number;
  structureConsistency: number;
  emotionalShiftUnderStress: number;
  interruptRecoveryTime: number;
  sentenceComplexityDropUnderPressure: number;
  argumentLoopRepetition: number;
  logicalChainBreaks: number;
};

const STORAGE_KEY = 'tm_mental_performance_sessions_v2';

const scenarios: SimulationScenario[] = [
  { id: 'investor', title: 'Aggressive investor grilling', interruptFrequency: 0.85, toneAggression: 0.9, unpredictability: 0.82, timeConstraint: 0.9 },
  { id: 'debate', title: 'Hostile debate opponent', interruptFrequency: 0.8, toneAggression: 0.88, unpredictability: 0.84, timeConstraint: 0.75 },
  { id: 'client', title: 'Angry client call', interruptFrequency: 0.62, toneAggression: 0.86, unpredictability: 0.65, timeConstraint: 0.72 },
  { id: 'media', title: 'Media interview', interruptFrequency: 0.55, toneAggression: 0.6, unpredictability: 0.92, timeConstraint: 0.88 },
  { id: 'rapid', title: 'Rapid-fire Q&A', interruptFrequency: 0.7, toneAggression: 0.52, unpredictability: 0.95, timeConstraint: 0.96 },
  { id: 'ethical', title: 'Ethical dilemma under time pressure', interruptFrequency: 0.42, toneAggression: 0.5, unpredictability: 0.87, timeConstraint: 0.94 },
];

const clamp = (n: number) => Math.max(20, Math.min(99, Math.round(n)));
const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

const countMatches = (text: string, words: string[]) => {
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
  return (text.match(regex) || []).length;
};

const getStoredSessions = (): SessionSnapshot[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const buildSession = (
  transcript: string,
  responseDelaySec: number,
  interruptionRecoverySec: number,
  scenario: SimulationScenario
): SessionSnapshot => {
  const normalized = transcript.toLowerCase();
  const words = normalized.split(/\s+/).filter(Boolean);
  const sentences = transcript.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const avgSentenceLength = words.length / Math.max(sentences.length, 1);

  const qualifiers = countMatches(normalized, ['i think', 'maybe', 'sort of', 'kind of', 'possibly', 'perhaps', 'might']);
  const declarative = countMatches(normalized, ['will', 'must', 'clear', 'definitely', 'we decide', 'i decide', 'i will']);
  const boundaryPhrases = countMatches(normalized, ['i disagree', 'that is incorrect', 'let me be clear', 'we should not']);
  const passiveVoiceFlags = countMatches(normalized, ['was done', 'were made', 'it was decided', 'is being']);
  const claimReasonExampleConclusion =
    countMatches(normalized, ['claim', 'reason', 'example', 'conclusion']) +
    countMatches(normalized, ['first', 'because', 'for example', 'therefore']);
  const evidenceUsage = countMatches(normalized, ['data', 'evidence', 'numbers', 'metric', 'results', 'observed']);
  const contradictionFlags = countMatches(normalized, ['but', 'however', 'although']) > 2 ? 1 : 0;
  const topicJumps = Math.max(0, countMatches(normalized, ['anyway', 'moving on', 'different point']) - 1);
  const missingPremiseFlags = countMatches(normalized, ['obviously', 'everyone knows']) > 0 ? 1 : 0;
  const fillerDensity = countMatches(normalized, ['um', 'uh', 'like', 'you know', 'actually']) / Math.max(words.length, 1);

  const pressureLoad = (scenario.interruptFrequency + scenario.toneAggression + scenario.unpredictability + scenario.timeConstraint) / 4;

  const confidence = clamp(80 + declarative * 2 - qualifiers * 3 - responseDelaySec * 6 - fillerDensity * 140);
  const assertiveness = clamp(74 + boundaryPhrases * 5 - passiveVoiceFlags * 4 - qualifiers * 2 - scenario.toneAggression * 12);
  const persuasion = clamp(66 + claimReasonExampleConclusion * 4 + evidenceUsage * 3 - topicJumps * 8 - fillerDensity * 120);
  const emotionalStability = clamp(78 - pressureLoad * 16 - fillerDensity * 130 - interruptionRecoverySec * 5);
  const logicalCoherence = clamp(72 + claimReasonExampleConclusion * 3 - contradictionFlags * 8 - topicJumps * 9 - missingPremiseFlags * 10);

  const structureConsistency = clamp(62 + claimReasonExampleConclusion * 5 - topicJumps * 7);
  const emotionalShiftUnderStress = clamp(34 + pressureLoad * 30 + fillerDensity * 220 + interruptionRecoverySec * 4);
  const sentenceComplexity = Math.max(4, Math.min(28, avgSentenceLength));
  const loopRepetitionRate = Math.max(0, Math.min(100, Math.round((countMatches(normalized, ['again', 'as i said', 'repeat']) * 100) / Math.max(sentences.length, 1))));
  const logicalBreaks = Math.max(0, contradictionFlags + topicJumps + missingPremiseFlags);

  return {
    id: `mc-${Date.now()}`,
    createdAt: Date.now(),
    scenarioId: scenario.id,
    transcript,
    responseDelaySec,
    interruptionRecoverySec,
    sentenceComplexity,
    loopRepetitionRate,
    logicalBreaks,
    structureConsistency,
    emotionalShiftUnderStress,
    metrics: {
      confidence,
      assertiveness,
      persuasion,
      emotionalStability,
      logicalCoherence,
    },
  };
};

const deriveProfile = (sessions: SessionSnapshot[]): LongitudinalProfile => {
  if (!sessions.length) {
    return {
      dominantCognitiveStyle: 'Exploratory Thinker',
      weaknessPattern: 'Insufficient data — complete at least one voice pressure simulation.',
      stressResponse: 'Pending baseline calibration.',
      decisionBias: 'Pending baseline calibration.',
      averageResponseDelay: 0,
      structureConsistency: 0,
      emotionalShiftUnderStress: 0,
      interruptRecoveryTime: 0,
      sentenceComplexityDropUnderPressure: 0,
      argumentLoopRepetition: 0,
      logicalChainBreaks: 0,
    };
  }

  const byPressureHigh = sessions.filter((s) => {
    const scenario = scenarios.find((x) => x.id === s.scenarioId);
    return !!scenario && scenario.timeConstraint > 0.85;
  });

  const baseComplexity = avg(sessions.map((s) => s.sentenceComplexity));
  const highPressureComplexity = avg(byPressureHigh.map((s) => s.sentenceComplexity)) || baseComplexity;
  const complexityDropPct = Math.max(0, ((baseComplexity - highPressureComplexity) / Math.max(baseComplexity, 1)) * 100);

  const meanAssertiveness = avg(sessions.map((s) => s.metrics.assertiveness));
  const meanConfidence = avg(sessions.map((s) => s.metrics.confidence));
  const meanLogical = avg(sessions.map((s) => s.metrics.logicalCoherence));

  const dominantCognitiveStyle =
    meanLogical >= 75 && meanConfidence >= 70
      ? 'Strategic Synthesizer'
      : meanConfidence >= 70 && meanAssertiveness < 65
      ? 'Reflective Analyzer'
      : meanLogical < 63
      ? 'Exploratory Thinker'
      : 'Adaptive Communicator';

  const weaknessPattern =
    meanAssertiveness < 60
      ? 'Defensive framing under challenge'
      : meanLogical < 62
      ? 'Argument branch drift under pressure'
      : 'Over-qualification before commitment';

  const stressResponse =
    complexityDropPct > 18
      ? 'Complexity collapse after interruption'
      : avg(sessions.map((s) => s.emotionalShiftUnderStress)) > 70
      ? 'Volatility spikes in unpredictable questioning'
      : 'Stable cognitive flow under challenge';

  const decisionBias =
    meanConfidence >= 72 && meanAssertiveness < 64
      ? 'Over-qualification before commitment'
      : meanConfidence < 60
      ? 'Delayed commitment bias'
      : 'Decisive with moderate caution';

  return {
    dominantCognitiveStyle,
    weaknessPattern,
    stressResponse,
    decisionBias,
    averageResponseDelay: avg(sessions.map((s) => s.responseDelaySec)),
    structureConsistency: avg(sessions.map((s) => s.structureConsistency)),
    emotionalShiftUnderStress: avg(sessions.map((s) => s.emotionalShiftUnderStress)),
    interruptRecoveryTime: avg(sessions.map((s) => s.interruptionRecoverySec)),
    sentenceComplexityDropUnderPressure: complexityDropPct,
    argumentLoopRepetition: avg(sessions.map((s) => s.loopRepetitionRate)),
    logicalChainBreaks: avg(sessions.map((s) => s.logicalBreaks)),
  };
};

const MentalPerformanceCoachPage: React.FC = () => {
  const recognitionRef = useRef<any>(null);
  const listeningStartedAtRef = useRef<number | null>(null);
  const firstFinalTranscriptAtRef = useRef<number | null>(null);
  const interruptionMarkedAtRef = useRef<number | null>(null);

  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('Ready for voice pressure simulation');
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const [sessions, setSessions] = useState<SessionSnapshot[]>(() => getStoredSessions());
  const [latestSession, setLatestSession] = useState<SessionSnapshot | null>(null);

  const selectedScenario = useMemo(() => scenarios.find((s) => s.id === scenarioId) || scenarios[0], [scenarioId]);
  const profile = useMemo(() => deriveProfile(sessions), [sessions]);

  const latestMetrics: CoreMetric[] = useMemo(() => {
    if (!latestSession) {
      return [
        { key: 'confidence', label: 'Confidence Index', value: 0, explanation: 'Measured from qualifier density, declarative phrasing, and response delay.', trainHint: 'Reduce qualifier density by 30%.' },
        { key: 'assertiveness', label: 'Assertiveness Score', value: 0, explanation: 'Measured from disagreement clarity, passive voice use, and boundary-setting language.', trainHint: 'Use direct disagreement statements without softeners.' },
        { key: 'persuasion', label: 'Persuasion Strength', value: 0, explanation: 'Measured from Claim → Reason → Example → Conclusion structure plus evidence usage.', trainHint: 'Use one concrete evidence point in each response.' },
        { key: 'emotionalStability', label: 'Emotional Stability', value: 0, explanation: 'Measured from pressure load, filler spikes, and interruption recovery behavior.', trainHint: 'Practice 2-second reset after interruption.' },
        { key: 'logicalCoherence', label: 'Logical Coherence', value: 0, explanation: 'Measured from contradiction frequency, topic jumps, and unstated premises.', trainHint: 'State premise before conclusion.' },
      ];
    }

    return [
      {
        key: 'confidence',
        label: 'Confidence Index',
        value: latestSession.metrics.confidence,
        explanation: 'Measured by declarative vs tentative phrasing, qualifier density, directness, and delay before answering.',
        trainHint: latestSession.metrics.confidence < 65 ? 'Train: Reduce qualifier density by 30%.' : 'Train: Keep concise declarative conclusions.'
      },
      {
        key: 'assertiveness',
        label: 'Assertiveness Score',
        value: latestSession.metrics.assertiveness,
        explanation: 'Measured by boundary-setting phrases, disagreement clarity, passive voice usage, and confrontation avoidance.',
        trainHint: latestSession.metrics.assertiveness < 65 ? 'Train: one clear disagreement sentence per response.' : 'Train: maintain direct boundary setting under pressure.'
      },
      {
        key: 'persuasion',
        label: 'Persuasion Strength',
        value: latestSession.metrics.persuasion,
        explanation: 'Measured by logical flow, evidence usage, emotional framing, and structured argument presence.',
        trainHint: latestSession.metrics.persuasion < 65 ? 'Train: Claim → Reason → Example → Conclusion in 60 seconds.' : 'Train: increase evidence density per claim.'
      },
      {
        key: 'emotionalStability',
        label: 'Emotional Stability',
        value: latestSession.metrics.emotionalStability,
        explanation: 'Measured by sentence variance under stress, filler spikes, and interruption recovery time.',
        trainHint: latestSession.metrics.emotionalStability < 65 ? 'Train: pressure breathing + concise 1-sentence reset.' : 'Train: keep stability while speeding responses.'
      },
      {
        key: 'logicalCoherence',
        label: 'Logical Coherence',
        value: latestSession.metrics.logicalCoherence,
        explanation: 'Measured by contradiction detection, topic jumping, and missing premises.',
        trainHint: latestSession.metrics.logicalCoherence < 65 ? 'Train: state premise explicitly before recommendation.' : 'Train: tighten transitions to avoid branch drift.'
      },
    ];
  }, [latestSession]);

  const growthRows = useMemo(() => {
    const now = Date.now();
    const in30Days = sessions.filter((s) => now - s.createdAt <= 1000 * 60 * 60 * 24 * 30);
    const basePool = sessions.length > 1 ? sessions.slice(0, Math.ceil(sessions.length / 2)) : sessions;
    const recentPool = in30Days.length ? in30Days : sessions.slice(Math.floor(sessions.length / 2));

    const safeDelta = (a: number, b: number) => (a === 0 ? 0 : ((b - a) / Math.max(1, a)) * 100);

    return [
      { label: 'Assertiveness', delta: safeDelta(avg(basePool.map((s) => s.metrics.assertiveness)), avg(recentPool.map((s) => s.metrics.assertiveness))), suffix: '%' },
      { label: 'Hesitation latency', delta: -safeDelta(avg(basePool.map((s) => s.responseDelaySec)), avg(recentPool.map((s) => s.responseDelaySec))), suffix: '%' },
      { label: 'Argument completion', delta: safeDelta(avg(basePool.map((s) => s.structureConsistency)), avg(recentPool.map((s) => s.structureConsistency))), suffix: '%' },
      { label: 'Emotional volatility', delta: -safeDelta(avg(basePool.map((s) => s.emotionalShiftUnderStress)), avg(recentPool.map((s) => s.emotionalShiftUnderStress))), suffix: '%' },
    ];
  }, [sessions]);

  const recommendedDrills = useMemo(() => {
    const drills: string[] = [];
    if (profile.weaknessPattern.includes('Defensive')) {
      drills.push('Daily micro-disagreement drills: deliver one respectful, direct disagreement in < 12 seconds.');
    }
    if (profile.sentenceComplexityDropUnderPressure > 15) {
      drills.push('Timed 60-second structured response training: Claim → Reason → Example.');
    }
    if (profile.averageResponseDelay > 1.8) {
      drills.push('Rapid start protocol: begin answer within 1.2 seconds for 10 rounds/day.');
    }
    if (profile.argumentLoopRepetition > 25) {
      drills.push('Concise argument constraint: max 2 supporting points, no restatement loop.');
    }
    if (!drills.length) {
      drills.push('Your biggest growth lever is structural clarity. For next 14 days, focus on 3-step framing.');
    }
    return drills;
  }, [profile]);

  const startVoiceCapture = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatus('Voice transcription not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      listeningStartedAtRef.current = Date.now();
      firstFinalTranscriptAtRef.current = null;
      setVoiceStatus(`Live in scenario: ${selectedScenario.title}`);
    };

    recognition.onresult = (event: any) => {
      let finalChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalChunk += `${result[0].transcript} `;
      }
      if (finalChunk) {
        if (!firstFinalTranscriptAtRef.current) firstFinalTranscriptAtRef.current = Date.now();
        setTranscript((prev) => `${prev} ${finalChunk}`.trim());

        if (interruptionMarkedAtRef.current) {
          const recoverSec = (Date.now() - interruptionMarkedAtRef.current) / 1000;
          setVoiceStatus(`Recovered after interruption in ${recoverSec.toFixed(2)}s`);
          interruptionMarkedAtRef.current = null;
        }
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setVoiceStatus('Voice capture interrupted. Retry to continue simulation.');
    };

    recognition.onend = () => {
      setIsListening(false);
      setVoiceStatus('Voice session paused. Analyze to update long-term profile.');
    };

    recognition.start();
  };

  const stopVoiceCapture = () => {
    recognitionRef.current?.stop?.();
    setIsListening(false);
  };

  const markInterruption = () => {
    interruptionMarkedAtRef.current = Date.now();
    setVoiceStatus('Interruption injected. Resume with clear response.');
  };

  const runAnalysis = () => {
    const responseDelaySec = listeningStartedAtRef.current && firstFinalTranscriptAtRef.current
      ? (firstFinalTranscriptAtRef.current - listeningStartedAtRef.current) / 1000
      : 2.1;

    const interruptionRecoverySec = interruptionMarkedAtRef.current
      ? (Date.now() - interruptionMarkedAtRef.current) / 1000
      : 1.4;

    const session = buildSession(transcript || 'No transcript captured.', responseDelaySec, interruptionRecoverySec, selectedScenario);
    const updated = [...sessions, session];
    setLatestSession(session);
    setSessions(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    stopVoiceCapture();
    setVoiceStatus('Analysis complete. Long-term profile updated.');
  };

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-indigo-400/20 bg-slate-950 px-6 py-12 shadow-[0_0_80px_rgba(99,102,241,0.14)] md:px-12 md:py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(129,140,248,0.22),transparent_58%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.18),transparent_42%)]" />

      <div className="relative z-10 space-y-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
          <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-indigo-400/40 bg-indigo-500/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-200">
            <SynapseLogo className="h-7 w-7" />
            Elite Mental Performance Engine
          </div>
          <h1 className="text-3xl font-black text-white md:text-6xl">Mental Performance Coach</h1>
          <p className="mt-4 max-w-4xl text-base text-slate-300 md:text-xl">
            Longitudinal, scenario-driven coaching for communication under pressure — built for measurable cognitive performance growth.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-slate-700/80 bg-slate-900/60 p-6 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white">Pressure Simulation System</h2>
            <p className="mt-2 text-sm text-slate-400">Select a scenario, run voice simulation, inject interruption, then update your evolving profile.</p>

            <select
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
              className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none"
            >
              {scenarios.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>

            <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/60 p-4 text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-3">
                <p>Interrupt frequency: <b>{Math.round(selectedScenario.interruptFrequency * 100)}%</b></p>
                <p>Tone aggression: <b>{Math.round(selectedScenario.toneAggression * 100)}%</b></p>
                <p>Question unpredictability: <b>{Math.round(selectedScenario.unpredictability * 100)}%</b></p>
                <p>Time constraint: <b>{Math.round(selectedScenario.timeConstraint * 100)}%</b></p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>{voiceStatus}</span>
                <span className={`h-2.5 w-2.5 rounded-full ${isListening ? 'bg-rose-500 animate-pulse' : 'bg-slate-500'}`} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button onClick={startVoiceCapture} disabled={isListening} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Start Voice Session</button>
                <button onClick={stopVoiceCapture} disabled={!isListening} className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold text-slate-200 disabled:opacity-50">Stop</button>
                <button onClick={markInterruption} disabled={!isListening} className="rounded-xl bg-amber-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Inject Interruption</button>
                <button onClick={runAnalysis} className="rounded-xl bg-white px-4 py-3 text-sm font-extrabold uppercase tracking-[0.1em] text-slate-900">Analyze + Update Profile</button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Live Transcript</p>
              <p className="mt-3 min-h-24 text-sm text-slate-200">{transcript || 'No speech captured yet. Start your scenario to begin.'}</p>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-700/80 bg-slate-900/60 p-6 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white">Evolving Cognitive Profile</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-200">
              <p><span className="text-slate-500">Dominant cognitive style:</span> {profile.dominantCognitiveStyle}</p>
              <p><span className="text-slate-500">Weakness pattern:</span> {profile.weaknessPattern}</p>
              <p><span className="text-slate-500">Stress response:</span> {profile.stressResponse}</p>
              <p><span className="text-slate-500">Decision bias:</span> {profile.decisionBias}</p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">Avg response delay: <b>{profile.averageResponseDelay.toFixed(2)}s</b></div>
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">Structure consistency: <b>{profile.structureConsistency.toFixed(1)}</b></div>
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">Emotional shift under stress: <b>{profile.emotionalShiftUnderStress.toFixed(1)}</b></div>
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">Interrupt recovery time: <b>{profile.interruptRecoveryTime.toFixed(2)}s</b></div>
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">Complexity drop under pressure: <b>{profile.sentenceComplexityDropUnderPressure.toFixed(1)}%</b></div>
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">Argument loop repetition: <b>{profile.argumentLoopRepetition.toFixed(1)}%</b></div>
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 col-span-2">Logical chain breaks: <b>{profile.logicalChainBreaks.toFixed(2)}</b></div>
            </div>
          </article>
        </div>

        <div className="grid gap-3 lg:grid-cols-5">
          {latestMetrics.map((metric) => (
            <div key={metric.key} className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 to-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{metric.label}</p>
              <p className="mt-2 text-3xl font-extrabold text-white">{metric.value ? `${metric.value}%` : '--'}</p>
              <p className="mt-2 text-xs text-slate-300">{metric.explanation}</p>
              <p className="mt-2 text-xs text-indigo-200">{metric.trainHint}</p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-indigo-400/30 bg-gradient-to-r from-indigo-600/20 via-violet-600/20 to-cyan-500/20 p-6">
          <h3 className="text-lg font-bold text-white">Growth Graph (Last 30 Days)</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {growthRows.map((row) => {
              const positive = row.delta >= 0;
              return (
                <div key={row.label} className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{row.label}</p>
                  <p className={`mt-2 text-lg font-bold ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {positive ? '↑' : '↓'} {Math.abs(row.delta).toFixed(1)}{row.suffix}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-700 bg-slate-900/60 p-6">
          <h3 className="text-lg font-bold text-white">AI Personal Training Loop</h3>
          <p className="mt-2 text-sm text-slate-400">Custom drills generated from your longitudinal weakness patterns.</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-200">
            {recommendedDrills.map((drill) => (
              <li key={drill} className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2">{drill}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default MentalPerformanceCoachPage;
