import { InterviewEvaluationResult, NeuralSpeechScoreCard, TranscriptionItem } from '../types';

const MINIMUM_ELIGIBLE_MINUTES = 3.5;
const FILLER_WORDS = ['um', 'uh', 'like', 'actually', 'basically', 'literally', 'you know', 'i mean', 'sort of', 'kind of', 'maybe', 'perhaps'];
const HESITATION_PHRASES = ['i think', 'maybe', 'kind of', 'sort of', 'i guess', 'probably', 'not sure', 'i believe'];
const STRUCTURE_MARKERS = ['first', 'second', 'third', 'finally', 'because', 'therefore', 'situation', 'task', 'action', 'result'];
const DEPTH_MARKERS = ['%', 'percent', 'reduced', 'increased', 'grew', 'shipped', 'built', 'designed', 'launched', 'kpi', 'metric', 'revenue', 'latency', 'scale', 'users'];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const roundMetric = (value: number) => clamp(Math.round(value), 1, 10);

const tokenize = (text: string) => text
  .toLowerCase()
  .replace(/[^a-z0-9%\s]/g, ' ')
  .split(/\s+/)
  .filter(Boolean);

const countPhraseMatches = (text: string, phrases: string[]) => phrases.reduce((total, phrase) => {
  const pattern = new RegExp(`\\b${phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s+/g, '\\s+')}\\b`, 'gi');
  return total + (text.match(pattern)?.length ?? 0);
}, 0);

const buildSummary = (clarity: number, confidence: number, structure: number, depth: number) => {
  if (Math.max(clarity, confidence, structure, depth) <= 4) {
    return 'The transcript shows an underdeveloped interview performance with weak structure, limited specificity, and too much uncertain language. The candidate needs sharper, more direct answers with clearer examples.';
  }

  if (Math.min(clarity, confidence, structure, depth) >= 7) {
    return 'The candidate communicates with solid control and gives mostly structured, specific answers. To reach a standout bar, they should keep adding sharper metrics and crisper top-line framing.';
  }

  return 'The candidate shows some useful signals, but the interview performance is inconsistent. Stronger organization, more direct language, and more concrete evidence would make the answers feel interview-ready.';
};

export const evaluateInterviewTranscript = (transcriptions: TranscriptionItem[]): InterviewEvaluationResult => {
  const userTurns = transcriptions.filter((item) => item.speaker === 'user' && item.text.trim());
  const firstTimestamp = transcriptions[0]?.timestamp ?? Date.now();
  const lastTimestamp = transcriptions.at(-1)?.timestamp ?? firstTimestamp;
  const durationMinutes = Math.max(0, (lastTimestamp - firstTimestamp) / 60000);

  if (durationMinutes < MINIMUM_ELIGIBLE_MINUTES) {
    return {
      eligible: false,
      message: 'Interview too short for evaluation. Minimum 3.5 minutes required.',
    };
  }

  const transcript = userTurns.map((item) => item.text.trim()).join(' ');
  const allWords = tokenize(transcript);
  const totalWords = allWords.length;
  const fillerCount = countPhraseMatches(transcript, FILLER_WORDS);
  const hesitationCount = countPhraseMatches(transcript, HESITATION_PHRASES);
  const structureSignalCount = countPhraseMatches(transcript, STRUCTURE_MARKERS);
  const depthSignalCount = countPhraseMatches(transcript, DEPTH_MARKERS) + (transcript.match(/\b\d+(?:\.\d+)?\b/g)?.length ?? 0);
  const longTurns = userTurns.filter((item) => tokenize(item.text).length >= 35).length;
  const conciseTurns = userTurns.filter((item) => {
    const wordCount = tokenize(item.text).length;
    return wordCount >= 15 && wordCount <= 90;
  }).length;
  const repeatedStarts = userTurns.reduce((count, item) => {
    const firstThreeWords = tokenize(item.text).slice(0, 3).join(' ');
    return count + (firstThreeWords ? (userTurns.filter((turn) => tokenize(turn.text).slice(0, 3).join(' ') === firstThreeWords).length > 1 ? 1 : 0) : 0);
  }, 0);

  const fillerDensity = totalWords ? fillerCount / totalWords : 0;
  const clarity = roundMetric(7.2 - fillerDensity * 180 - repeatedStarts * 0.12 + conciseTurns * 0.15 + longTurns * 0.08);
  const confidence = roundMetric(7.1 - hesitationCount * 0.45 - fillerDensity * 120 + Math.min(1.2, longTurns * 0.12));
  const structure = roundMetric(4.8 + structureSignalCount * 0.35 + conciseTurns * 0.2 - Math.max(0, userTurns.length - conciseTurns) * 0.08);
  const depth = roundMetric(3.8 + depthSignalCount * 0.18 + longTurns * 0.25 - fillerDensity * 60);
  const overall = roundMetric((clarity + confidence + structure + depth) / 4);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  if (clarity >= 7) strengths.push('Ideas are communicated directly with limited verbal clutter.');
  if (confidence >= 7) strengths.push('Language is mostly assertive and avoids excessive hedging.');
  if (structure >= 7) strengths.push('Answers show visible sequencing instead of scattered points.');
  if (depth >= 7) strengths.push('Responses include concrete details, tools, numbers, or outcome signals.');

  if (!strengths.length) {
    strengths.push('The candidate stayed engaged long enough to produce evaluable material.');
    strengths.push('There are some usable content points that could become stronger with better framing.');
  } else if (strengths.length === 1) {
    strengths.push('There are occasional signals of relevant experience that can be expanded with stronger examples.');
  }

  if (clarity <= 5) weaknesses.push('Answers become wordy or imprecise, making key points harder to follow.');
  if (confidence <= 5) weaknesses.push('Frequent hedging weakens ownership and makes claims sound less credible.');
  if (structure <= 5) weaknesses.push('Responses do not consistently follow a clear beginning, middle, and end.');
  if (depth <= 5) weaknesses.push('Examples are too generic and often miss metrics, scope, or concrete impact.');

  if (!weaknesses.length) {
    weaknesses.push('The interview would still benefit from more top-line framing before details.');
    weaknesses.push('Some examples could be tightened so the business impact lands faster.');
  } else if (weaknesses.length === 1) {
    weaknesses.push('The performance is uneven across answers, so consistency is still a concern.');
  }

  if (clarity <= 6) suggestions.push('Lead with the answer first, then support it with two or three precise points.');
  if (confidence <= 6) suggestions.push('Replace hedge phrases with direct ownership statements such as “I led,” “I decided,” or “I improved.”');
  if (structure <= 6) suggestions.push('Use a repeatable structure like Situation, Task, Action, Result for experience-based questions.');
  if (depth <= 6) suggestions.push('Add metrics, tools, scale, and measurable outcomes so each example proves impact.');

  while (suggestions.length < 2) {
    suggestions.push('Practice shorter, more deliberate responses so your strongest point appears in the first sentence.');
  }

  return {
    eligible: true,
    scores: {
      clarity,
      confidence,
      structure,
      depth,
      overall,
    },
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
    summary: buildSummary(clarity, confidence, structure, depth),
    improvement_suggestions: suggestions.slice(0, 3),
  };
};

export const buildNeuralSpeechScoreCard = (transcriptions: TranscriptionItem[]): NeuralSpeechScoreCard => {
  const evaluation = evaluateInterviewTranscript(transcriptions);
  const userTurns = transcriptions.filter((item) => item.speaker === 'user' && item.text.trim());
  const transcript = userTurns.map((item) => item.text.trim()).join(' ');
  const totalWords = tokenize(transcript).length;
  const fillerCount = countPhraseMatches(transcript, FILLER_WORDS);
  const avgWordsPerTurn = userTurns.length ? Math.round(totalWords / userTurns.length) : 0;

  return {
    overallScore: evaluation.eligible ? evaluation.scores.overall * 10 : 0,
    totalWords,
    fillerCount,
    fillerDensity: totalWords ? Number((fillerCount / totalWords).toFixed(3)) : 0,
    avgWordsPerTurn,
    confidenceScore: evaluation.eligible ? evaluation.scores.confidence * 10 : 0,
    clarityScore: evaluation.eligible ? evaluation.scores.clarity * 10 : 0,
    concisenessScore: evaluation.eligible ? evaluation.scores.structure : 0,
    summary: evaluation.eligible ? evaluation.summary : evaluation.message,
    evaluation,
  };
};
