import { ConversationHistoryItem, InterviewEvaluationEligibleResult } from '../types';

export interface PastInterviewResult {
  clarity_score: number;
  confidence_score: number;
  structure_score: number;
  depth_score: number;
  strengths: string[];
  weaknesses: string[];
  summary: string;
}

export interface CandidateMemoryProfile {
  average_scores: {
    clarity: number;
    confidence: number;
    structure: number;
    depth: number;
  };
  consistent_strengths: string[];
  consistent_weaknesses: string[];
  trend: {
    clarity: 'improving' | 'declining' | 'stable';
    confidence: 'improving' | 'declining' | 'stable';
    structure: 'improving' | 'declining' | 'stable';
    depth: 'improving' | 'declining' | 'stable';
  };
  key_focus_area: string;
  memory_summary: string;
}

const roundToTenth = (value: number): number => Math.round(value * 10) / 10;

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const canonicalizeFeedback = (value: string): string => {
  const normalized = normalizeText(value);

  if (/hedg|ownership|assertive|credible|confidence|hesitat/.test(normalized)) {
    return 'Own answers more directly and reduce hedge language.';
  }
  if (/struct|sequenc|star|beginning middle end|framework/.test(normalized)) {
    return 'Use tighter answer structure with a clear beginning, middle, and end.';
  }
  if (/metric|numbers|quantif|impact|scope|concrete|specific|generic|detail/.test(normalized)) {
    return 'Add more metrics, scope, and concrete impact to examples.';
  }
  if (/clarity|wordy|imprecise|follow|top line|frame|concise/.test(normalized)) {
    return 'Lead with the main point faster and keep answers concise.';
  }

  return value.trim();
};

const pickRecurringItems = (items: string[], fallback: string): string[] => {
  const counts = new Map<string, { label: string; count: number }>();

  items.forEach((item) => {
    const canonical = canonicalizeFeedback(item);
    const key = normalizeText(canonical);
    if (!key) return;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }
    counts.set(key, { label: canonical, count: 1 });
  });

  const recurring = [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((entry) => entry.label)
    .slice(0, 2);

  return recurring.length ? recurring : [fallback];
};

const detectTrend = (values: number[]): 'improving' | 'declining' | 'stable' => {
  if (values.length < 2) return 'stable';
  const delta = values[values.length - 1] - values[0];
  if (delta >= 0.75) return 'improving';
  if (delta <= -0.75) return 'declining';
  return 'stable';
};

const getKeyFocusArea = (profile: CandidateMemoryProfile, weaknessCounts: string[]): string => {
  if (profile.consistent_weaknesses.length > 0) {
    return profile.consistent_weaknesses[0];
  }

  const averages = profile.average_scores;
  const ranked = [
    { key: 'clarity', value: averages.clarity, label: 'Lead with the main point faster and keep answers concise.' },
    { key: 'confidence', value: averages.confidence, label: 'Own answers more directly and reduce hedge language.' },
    { key: 'structure', value: averages.structure, label: 'Use tighter answer structure with a clear beginning, middle, and end.' },
    { key: 'depth', value: averages.depth, label: 'Add more metrics, scope, and concrete impact to examples.' },
  ].sort((a, b) => a.value - b.value);

  return weaknessCounts[0] || ranked[0].label;
};

export const toPastInterviewResult = (evaluation: InterviewEvaluationEligibleResult): PastInterviewResult => ({
  clarity_score: evaluation.scores.clarity,
  confidence_score: evaluation.scores.confidence,
  structure_score: evaluation.scores.structure,
  depth_score: evaluation.scores.depth,
  strengths: evaluation.strengths,
  weaknesses: evaluation.weaknesses,
  summary: evaluation.summary,
});

export const extractPastResultsFromHistory = (history: ConversationHistoryItem[]): PastInterviewResult[] =>
  history
    .map((item) => item.scoreCard?.evaluation)
    .filter((evaluation): evaluation is InterviewEvaluationEligibleResult => Boolean(evaluation?.eligible))
    .map(toPastInterviewResult);

export const buildCandidateMemoryProfile = (pastResults: PastInterviewResult[]): CandidateMemoryProfile | null => {
  if (!Array.isArray(pastResults) || pastResults.length === 0) {
    return null;
  }

  const averages = {
    clarity: roundToTenth(pastResults.reduce((sum, item) => sum + item.clarity_score, 0) / pastResults.length),
    confidence: roundToTenth(pastResults.reduce((sum, item) => sum + item.confidence_score, 0) / pastResults.length),
    structure: roundToTenth(pastResults.reduce((sum, item) => sum + item.structure_score, 0) / pastResults.length),
    depth: roundToTenth(pastResults.reduce((sum, item) => sum + item.depth_score, 0) / pastResults.length),
  };

  const consistentStrengths = pickRecurringItems(
    pastResults.flatMap((item) => item.strengths),
    'Shows enough baseline communication ability to build on under pressure.',
  );

  const consistentWeaknesses = pickRecurringItems(
    pastResults.flatMap((item) => item.weaknesses),
    'Needs more consistency across answers under pressure.',
  );

  const profile: CandidateMemoryProfile = {
    average_scores: averages,
    consistent_strengths: consistentStrengths,
    consistent_weaknesses: consistentWeaknesses,
    trend: {
      clarity: detectTrend(pastResults.map((item) => item.clarity_score)),
      confidence: detectTrend(pastResults.map((item) => item.confidence_score)),
      structure: detectTrend(pastResults.map((item) => item.structure_score)),
      depth: detectTrend(pastResults.map((item) => item.depth_score)),
    },
    key_focus_area: '',
    memory_summary: '',
  };

  profile.key_focus_area = getKeyFocusArea(profile, consistentWeaknesses);
  profile.memory_summary = [
    `Candidate usually performs best in ${consistentStrengths[0].toLowerCase()}`,
    `The main recurring gap is ${profile.key_focus_area.toLowerCase()}`,
    `Current trend: clarity ${profile.trend.clarity}, confidence ${profile.trend.confidence}, structure ${profile.trend.structure}, depth ${profile.trend.depth}.`,
  ].join(' ');

  return profile;
};

export const buildCandidateMemoryPrompt = (profile: CandidateMemoryProfile | null): string => {
  if (!profile) return '';

  return [
    '=== CANDIDATE MEMORY PROFILE ===',
    'This is a pre-interview memory layer based on previous interview evaluations.',
    'Use it only to adapt how you challenge the candidate before the next interview starts.',
    'Do not mention this profile unless the user explicitly asks about prior performance.',
    JSON.stringify(profile, null, 2),
    'Coaching adaptation rules:',
    '- Reinforce the recurring strengths by giving the candidate chances to use them early.',
    '- Challenge the key focus area quickly with targeted follow-up questions.',
    '- Be slightly strict: optimize for recurring patterns, not one-off mistakes.',
    '- If a score trend is improving, raise the bar instead of repeating easy prompts.',
    '- If a score trend is declining, test that area again within the first few questions.',
  ].join('\n');
};
