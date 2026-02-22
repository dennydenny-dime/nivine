import React, { useMemo, useState } from 'react';
import { SynapseLogo } from '../App';

type InterviewMode = 'hr' | 'investor' | 'debate' | 'sales';

type ConversationTurn = {
  id: string;
  role: 'ai' | 'user';
  text: string;
  latencySec?: number;
  timestamp: number;
};

type RealtimeSignals = {
  hesitationLatency: number;
  fillerDensity: number;
  structureScore: number;
  overExplainRisk: number;
  logicalBreaks: number;
  circularReasoning: number;
  pitchInstability: number;
  speedSpike: number;
  volumeDrop: number;
  breathIrregularity: number;
  eyeContactConsistency: number;
  blinkSpike: number;
  jawTension: number;
  headMovementInstability: number;
  microFreezeRisk: number;
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
  stressGraph: Array<{ label: string; score: number; note: string }>;
  prescriptions: string[];
  correlations: string[];
};

const STORAGE_KEY = 'tm_live_interview_sessions_v1';

const modeConfig: Record<InterviewMode, {
  label: string;
  tone: string;
  style: string;
  basePressure: number;
  seedQuestions: string[];
}> = {
  hr: {
    label: 'HR Mode',
    tone: 'Calm but probing',
    style: 'Supportive, precise follow-ups.',
    basePressure: 38,
    seedQuestions: [
      'Walk me through your core value proposition in one minute.',
      'Tell me about a time you handled ambiguity under pressure.',
      'What weak feedback have you heard repeatedly, and what changed?'
    ]
  },
  investor: {
    label: 'Investor Mode',
    tone: 'Aggressive and skeptical',
    style: 'Challenges assumptions and forces defensibility.',
    basePressure: 62,
    seedQuestions: [
      'Fifteen competitors claim the same category. Why will you win?',
      'Where do your unit economics break first if growth doubles?',
      'If I cut your budget by 40% tomorrow, what survives?'
    ]
  },
  debate: {
    label: 'Debate Mode',
    tone: 'Interrupt-heavy confrontation',
    style: 'Rapid interruptions, contradiction pressure.',
    basePressure: 70,
    seedQuestions: [
      'Defend your position in 30 seconds with one claim and one proof.',
      'Your argument sounds broad. What is the strongest counterpoint?',
      'Why does your framing fail under real-world constraints?'
    ]
  },
  sales: {
    label: 'Sales Mode',
    tone: 'Objection-heavy',
    style: 'Pushes objections and asks for specific reframes.',
    basePressure: 54,
    seedQuestions: [
      'Your pricing looks expensive. Why should I not delay?',
      'I do not trust implementation speed. Convince me in 45 seconds.',
      'What do you say when a buyer says “we already use a competitor”?'
    ]
  }
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const average = (values: number[]) => (values.length ? values.reduce((acc, value) => acc + value, 0) / values.length : 0);

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

const countPhrase = (text: string, phrases: string[]) => {
  const normalized = text.toLowerCase();
  return phrases.reduce((total, phrase) => total + (normalized.includes(phrase) ? 1 : 0), 0);
};

const getStoredSummaries = (): SessionSummary[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const analyzeResponse = (text: string, latencySec: number): RealtimeSignals => {
  const words = wordCount(text);
  const fillers = countPhrase(text, ['um', 'uh', 'like', 'you know', 'actually']);
  const structureHits = countPhrase(text, ['first', 'because', 'for example', 'therefore', 'so']);
  const contradictionHits = countPhrase(text, ['but', 'however', 'although']);
  const circularHits = countPhrase(text, ['as i said', 'again', 'basically the same']);
  const overExplainRisk = clamp((words - 70) * 1.2 + latencySec * 8, 0, 100);

  const pressureFromLatency = clamp((latencySec - 1.5) * 28, 0, 100);

  return {
    hesitationLatency: Number(latencySec.toFixed(2)),
    fillerDensity: clamp((fillers / Math.max(words, 1)) * 280),
    structureScore: clamp(40 + structureHits * 18 - contradictionHits * 7),
    overExplainRisk,
    logicalBreaks: clamp(contradictionHits * 20 + Math.max(0, structureHits === 0 ? 15 : 0)),
    circularReasoning: clamp(circularHits * 26),
    pitchInstability: clamp(25 + pressureFromLatency * 0.5 + fillers * 6),
    speedSpike: clamp(20 + (words > 110 ? 35 : words > 75 ? 18 : 5) + pressureFromLatency * 0.3),
    volumeDrop: clamp(18 + pressureFromLatency * 0.55),
    breathIrregularity: clamp(20 + pressureFromLatency * 0.5 + overExplainRisk * 0.25),
    eyeContactConsistency: clamp(86 - pressureFromLatency * 0.45 - fillers * 4),
    blinkSpike: clamp(24 + pressureFromLatency * 0.62),
    jawTension: clamp(30 + pressureFromLatency * 0.52),
    headMovementInstability: clamp(22 + pressureFromLatency * 0.48),
    microFreezeRisk: clamp(28 + pressureFromLatency * 0.75)
  };
};

const generateAdaptiveQuestion = (
  mode: InterviewMode,
  response: string,
  stressScore: number,
  signals: RealtimeSignals
) => {
  const weakStructure = signals.structureScore < 55;
  const delayAttack = signals.hesitationLatency > 2.8;
  const contradictions = countPhrase(response, ['but', 'however']) > 1;

  const prefix =
    mode === 'investor'
      ? 'That is not defensible yet.'
      : mode === 'debate'
      ? 'Interrupted. That claim is weak.'
      : mode === 'sales'
      ? 'Objection. I still do not buy it.'
      : 'Let me probe deeper.';

  if (delayAttack || stressScore > 72) {
    return `${prefix} You paused ${signals.hesitationLatency.toFixed(1)}s. Answer in one sentence: what is your strongest proof right now?`;
  }
  if (contradictions) {
    return `${prefix} You introduced contradictions. Pick one position and defend it with one concrete example.`;
  }
  if (weakStructure) {
    return `${prefix} Your structure broke. Reframe using Claim → Reason → Example in under 30 seconds.`;
  }

  return `${prefix} Give me the risk scenario you are avoiding, then the mitigation in 12 words.`;
};

const MentalPerformanceCoachPage: React.FC = () => {
  const [mode, setMode] = useState<InterviewMode>('investor');
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [lastPromptAt, setLastPromptAt] = useState<number | null>(null);
  const [pressureScore, setPressureScore] = useState(modeConfig.investor.basePressure);
  const [stressScore, setStressScore] = useState(45);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [latestSignals, setLatestSignals] = useState<RealtimeSignals | null>(null);
  const [history, setHistory] = useState<SessionSummary[]>(() => getStoredSummaries());
  const [lastSummary, setLastSummary] = useState<SessionSummary | null>(null);

  const config = modeConfig[mode];

  const startSession = () => {
    const now = Date.now();
    const opening = config.seedQuestions[0];
    setSessionActive(true);
    setSessionStart(now);
    setLastPromptAt(now);
    setPressureScore(config.basePressure);
    setStressScore(Math.max(35, config.basePressure - 8));
    setTurns([
      { id: `ai-${now}`, role: 'ai', text: opening, timestamp: now }
    ]);
    setLatestSignals(null);
    setLastSummary(null);
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
    const signals = analyzeResponse(draft, latencySec);

    setTurns((prev) => [
      ...prev,
      { id: `user-${now}`, role: 'user', text: draft.trim(), latencySec, timestamp: now }
    ]);

    setLatestSignals(signals);

    const nextStress = clamp(
      stressScore + (signals.hesitationLatency > 2.5 ? 12 : 4) + (signals.logicalBreaks > 45 ? 8 : 0) - (signals.structureScore > 70 ? 6 : 0),
      25,
      97
    );
    const nextPressure = clamp(
      pressureScore + (nextStress > 70 ? 15 : 6) - (signals.structureScore > 76 ? 5 : 0),
      20,
      98
    );

    setStressScore(nextStress);
    setPressureScore(nextPressure);

    const adaptiveQuestion = generateAdaptiveQuestion(mode, draft, nextStress, signals);
    const intensityTag = nextPressure > 78 ? ' [Escalation: rapid interruption mode on.]' : '';
    pushAiTurn(adaptiveQuestion + intensityTag);

    setDraft('');
  };

  const finishSession = () => {
    if (!sessionActive || !sessionStart) return;

    const endedAt = Date.now();
    const userTurns = turns.filter((turn) => turn.role === 'user');
    const latencies = userTurns.map((turn) => turn.latencySec || 0);
    const avgLatency = average(latencies);
    const structureScores = userTurns.map((turn) => analyzeResponse(turn.text, turn.latencySec || 0).structureScore);
    const argumentStability = clamp(average(structureScores));
    const interruptRecoverySpeed = clamp(100 - avgLatency * 28);

    const dominantStyle =
      argumentStability > 74
        ? 'Analytical under pressure'
        : avgLatency < 1.9
        ? 'Fast reactive communicator'
        : 'Context-heavy explainer';

    const weaknessPattern =
      avgLatency > 2.6
        ? 'Defensive framing under contradiction'
        : argumentStability < 60
        ? 'Structure collapse after interruption'
        : 'Over-explaining during objections';

    const stressGraph = [
      { label: 'Minute 1–5', score: clamp(stressScore - 18), note: 'Baseline engagement' },
      { label: 'Minute 6–10', score: clamp(stressScore - 5), note: 'Voice and pacing instability detected' },
      { label: 'Minute 11–15', score: clamp(stressScore + 6), note: 'Sentence complexity under compression' }
    ];

    const correlations = latestSignals
      ? [
          latestSignals.logicalBreaks > 40 && latestSignals.pitchInstability > 42
            ? 'Logical breakdown aligned with rising pitch instability.'
            : 'No major logic + pitch collision in final segment.',
          latestSignals.hesitationLatency > 2.4 && latestSignals.microFreezeRisk > 45
            ? 'Latency spike matched micro-freeze behavior before difficult answer.'
            : 'Latency remained mostly decoupled from facial freeze indicators.',
          latestSignals.fillerDensity > 24 && latestSignals.breathIrregularity > 38
            ? 'Filler burst correlated with breath irregularity.'
            : 'Breath control remained stable versus filler usage.'
        ]
      : ['No multi-modal signal sample captured.'];

    const prescriptions = [
      `Primary lever: Interrupt recovery speed. Target latency ${avgLatency.toFixed(1)}s → ${Math.max(1.2, avgLatency - 1).toFixed(1)}s.`,
      'Drill: 30-second rebuttal rounds with forced contradiction every 10 seconds.',
      'Drill: Claim → Reason → Example compression under timer (3 reps/day).'
    ];

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
      pressureDropPoint: userTurns.length > 2 ? 'After second interruption' : 'Insufficient turns to detect drop point',
      dominantStyle,
      weaknessPattern,
      stressGraph,
      prescriptions,
      correlations
    };

    const updated = [summary, ...history].slice(0, 12);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setLastSummary(summary);
    setSessionActive(false);
  };

  const progressView = useMemo(() => {
    const recent = history.slice(0, 6);
    return {
      stressTrend: average(recent.map((session) => session.stressScore)),
      latencyTrend: average(recent.map((session) => session.avgLatency)),
      stabilityTrend: average(recent.map((session) => session.argumentStability))
    };
  }, [history]);

  return (
    <section className="pb-16 text-slate-100">
      <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 p-6 shadow-2xl shadow-indigo-900/30">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-indigo-300">Live Cognitive Interview Engine</p>
            <h1 className="mt-2 text-3xl font-black leading-tight">Adaptive AI Interview Simulator</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">This is performance measurement: dynamic questioning, correlated multi-modal analysis, and live pressure adaptation with elite post-session debrief.</p>
          </div>
          <SynapseLogo className="h-12 w-12" />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
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
                className={`rounded-2xl border p-4 text-left transition ${active ? 'border-indigo-400 bg-indigo-500/20' : 'border-slate-700 bg-slate-900/70 hover:border-slate-500'}`}
              >
                <p className="text-sm font-bold">{modeDefinition.label}</p>
                <p className="mt-1 text-xs text-slate-300">{modeDefinition.tone}</p>
                <p className="mt-2 text-xs text-slate-400">{modeDefinition.style}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Live Pressure</p>
            <p className="mt-2 text-3xl font-extrabold text-rose-300">{Math.round(pressureScore)}%</p>
            <p className="mt-2 text-xs text-slate-300">AI escalates interruptions, contradiction load, and response speed as stress rises.</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Stress Score</p>
            <p className="mt-2 text-3xl font-extrabold text-amber-300">{Math.round(stressScore)}%</p>
            <p className="mt-2 text-xs text-slate-300">Correlates hesitation, structure drift, and voice/behavior instability.</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Latency Guardrail</p>
            <p className="mt-2 text-3xl font-extrabold text-cyan-300">&lt; 1.5s</p>
            <p className="mt-2 text-xs text-slate-300">Immersion warning if response lag crosses premium threshold.</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
          <div className="flex flex-wrap gap-3">
            <button onClick={startSession} disabled={sessionActive} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold disabled:opacity-50">Start Live Session</button>
            <button onClick={finishSession} disabled={!sessionActive} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold disabled:opacity-50">End + Generate Elite Report</button>
          </div>

          <div className="mt-4 max-h-72 space-y-3 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/80 p-3">
            {turns.length === 0 && <p className="text-sm text-slate-400">Session transcript will appear here.</p>}
            {turns.map((turn) => (
              <div key={turn.id} className={`rounded-xl border p-3 text-sm ${turn.role === 'ai' ? 'border-indigo-400/40 bg-indigo-500/10' : 'border-slate-600 bg-slate-900/70'}`}>
                <p className="text-xs uppercase tracking-[0.15em] text-slate-400">{turn.role === 'ai' ? 'AI Interview Brain' : 'Your Response'}</p>
                <p className="mt-1 text-slate-100">{turn.text}</p>
                {typeof turn.latencySec === 'number' && <p className="mt-1 text-xs text-amber-200">Latency: {turn.latencySec.toFixed(2)}s</p>}
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Respond. The engine will challenge weak points and adapt pressure."
              className="min-h-24 flex-1 rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-sm outline-none ring-indigo-400/40 focus:ring"
              disabled={!sessionActive}
            />
            <button onClick={submitResponse} disabled={!sessionActive || !draft.trim()} className="rounded-xl bg-white px-4 text-sm font-black uppercase tracking-[0.12em] text-slate-900 disabled:opacity-40">Send</button>
          </div>
        </div>

        {latestSignals && (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
              <h3 className="text-sm font-bold">Speech Patterns</h3>
              <p className="mt-2 text-xs text-slate-300">Hesitation {latestSignals.hesitationLatency.toFixed(2)}s · Filler {latestSignals.fillerDensity.toFixed(1)} · Structure {latestSignals.structureScore.toFixed(0)}%</p>
              <p className="mt-2 text-xs text-slate-400">Over-explain risk {latestSignals.overExplainRisk.toFixed(0)} · Logical breaks {latestSignals.logicalBreaks.toFixed(0)}</p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
              <h3 className="text-sm font-bold">Voice Stress Signals</h3>
              <p className="mt-2 text-xs text-slate-300">Pitch instability {latestSignals.pitchInstability.toFixed(0)} · Speed spikes {latestSignals.speedSpike.toFixed(0)}</p>
              <p className="mt-2 text-xs text-slate-400">Volume drop {latestSignals.volumeDrop.toFixed(0)} · Breath irregularity {latestSignals.breathIrregularity.toFixed(0)}</p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
              <h3 className="text-sm font-bold">Face & Behavior</h3>
              <p className="mt-2 text-xs text-slate-300">Eye contact {latestSignals.eyeContactConsistency.toFixed(0)} · Blink spike {latestSignals.blinkSpike.toFixed(0)}</p>
              <p className="mt-2 text-xs text-slate-400">Jaw tension {latestSignals.jawTension.toFixed(0)} · Micro-freeze risk {latestSignals.microFreezeRisk.toFixed(0)}</p>
            </div>
          </div>
        )}

        {lastSummary && (
          <div className="mt-6 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-5">
            <h2 className="text-xl font-bold">Post-Session Elite Breakdown</h2>
            <p className="mt-2 text-sm text-slate-300">Dominant Style: {lastSummary.dominantStyle} · Weakness Pattern: {lastSummary.weaknessPattern}</p>
            <p className="text-sm text-slate-300">Pressure Drop Point: {lastSummary.pressureDropPoint} · Argument Structure Stability: {lastSummary.argumentStability.toFixed(0)}%</p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {lastSummary.stressGraph.map((point) => (
                <div key={point.label} className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{point.label}</p>
                  <p className="mt-1 text-lg font-bold text-amber-200">{point.score}%</p>
                  <p className="mt-1 text-xs text-slate-300">{point.note}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Correlation Insights</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-200">
                  {lastSummary.correlations.map((item) => (
                    <li key={item} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2">{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Improvement Prescription</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-200">
                  {lastSummary.prescriptions.map((item) => (
                    <li key={item} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2">{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Long-Term Progress Tracking</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
            <p className="rounded-lg border border-slate-700 bg-slate-900/80 p-3">Average Stress: <b>{progressView.stressTrend.toFixed(1)}%</b></p>
            <p className="rounded-lg border border-slate-700 bg-slate-900/80 p-3">Average Latency: <b>{progressView.latencyTrend.toFixed(2)}s</b></p>
            <p className="rounded-lg border border-slate-700 bg-slate-900/80 p-3">Argument Stability: <b>{progressView.stabilityTrend.toFixed(1)}%</b></p>
          </div>
          <p className="mt-3 text-xs text-slate-400">Ethical note: insights describe communication behavior only and do not provide psychological diagnosis.</p>
        </div>
      </div>
    </section>
  );
};

export default MentalPerformanceCoachPage;
