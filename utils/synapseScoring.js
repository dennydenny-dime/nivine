const FILLER_WORDS = [
  'um',
  'uh',
  'like',
  'you know',
  'sort of',
  'kind of',
  'basically',
  'actually',
  'literally',
  'i mean',
];

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const calculateConcisenessScore = (answer) => {
  const words = (answer.match(/\b[\w'-]+\b/g) || []).length;
  if (words <= 15) return 3;
  if (words <= 30) return 10;
  if (words <= 80) return 15;
  if (words <= 120) return 12;
  if (words <= 180) return 8;
  return 5;
};

export const calculateFillerScore = (answer) => {
  const normalized = answer.toLowerCase();
  const totalWords = (normalized.match(/\b[\w'-]+\b/g) || []).length;
  if (!totalWords) return 0;

  const fillerCount = FILLER_WORDS.reduce((count, phrase) => {
    const matcher = new RegExp(`\\b${phrase.replace(/ /g, '\\s+')}\\b`, 'g');
    return count + (normalized.match(matcher)?.length || 0);
  }, 0);

  const fillerDensity = (fillerCount / totalWords) * 100;

  if (fillerDensity === 0) return 10;
  if (fillerDensity <= 1) return 9;
  if (fillerDensity <= 2) return 8;
  if (fillerDensity <= 4) return 6;
  if (fillerDensity <= 6) return 4;
  return 2;
};

export const scoreToGrade = (score) => {
  if (score >= 92) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 75) return 'B';
  if (score >= 65) return 'C';
  if (score >= 50) return 'D';
  return 'F';
};

export const computeSynapseTotal = ({
  structure,
  clarity,
  impact,
  confidence,
  relevance,
  answer,
}) => {
  const conciseness = calculateConcisenessScore(answer);
  const filler_density = calculateFillerScore(answer);
  const synapse_total_score = clamp(
    structure + clarity + impact + confidence + relevance + conciseness + filler_density,
    0,
    100,
  );

  return {
    synapse_total_score,
    percentile: clamp(Math.round((synapse_total_score / 100) * 99), 1, 99),
    pillar_breakdown: {
      structure,
      clarity,
      impact,
      confidence,
      conciseness,
      filler_density,
      relevance,
    },
  };
};
