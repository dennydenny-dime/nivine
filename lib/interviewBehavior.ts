export type InterviewBehaviorConfig = {
  personaDescription?: string;
  personaName?: string;
  primaryMood?: string;
  communicationHardness?: number;
  voiceType?: string;
};

const clampHardness = (value: unknown): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 5;
  return Math.min(10, Math.max(1, Math.round(value)));
};

const strictnessBlock = (hardness: number): string[] => {
  if (hardness >= 7) {
    return [
      'Strictness level: HIGH (top-tier, demanding interviewer).',
      '- Challenge vague, padded, or indirect answers immediately.',
      '- Interrupt weak responses by redirecting to a sharper question.',
      '- Use aggressive follow-ups to force precision and ownership.',
      '- Do not let the candidate move on without concrete detail.',
    ];
  }

  if (hardness >= 4) {
    return [
      'Strictness level: MODERATE (balanced interviewer).',
      '- Keep a professional, slightly demanding tone.',
      '- Ask follow-ups consistently, but without overt pressure tactics.',
      '- Push for clarity and concrete ownership before advancing.',
    ];
  }

  return [
    'Strictness level: SUPPORTIVE-STRUCTURED (low hardness).',
    '- Stay encouraging but maintain interview structure and rigor.',
    '- Ask clarifying follow-ups without sounding harsh.',
    '- Still require concrete examples before accepting an answer.',
  ];
};

export const buildInterviewerSystem = (config: InterviewBehaviorConfig): string => {
  const personaDescription = typeof config?.personaDescription === 'string' ? config.personaDescription.trim() : '';
  const personaName = typeof config?.personaName === 'string' && config.personaName.trim()
    ? config.personaName.trim()
    : 'Interviewer';
  const primaryMood = typeof config?.primaryMood === 'string' && config.primaryMood.trim()
    ? config.primaryMood.trim()
    : 'Professional';
  const voiceType = typeof config?.voiceType === 'string' && config.voiceType.trim()
    ? config.voiceType.trim()
    : 'Neutral professional';
  const hardness = clampHardness(config?.communicationHardness);

  const strictness = strictnessBlock(hardness);

  return [
    'INTERVIEW EXECUTION SYSTEM (PRIORITY INSTRUCTIONS)',
    'You are running a realistic interview in the style of top companies (Google, Meta, Amazon, Microsoft).',
    'Your job is to test signal quality, not to comfort the candidate.',
    '',
    `Configured interviewer name: ${personaName}`,
    `Configured mood: ${primaryMood}`,
    `Configured voice style: ${voiceType}`,
    `Configured persona context: ${personaDescription || 'N/A'}`,
    `Configured communication hardness: ${hardness}/10`,
    '',
    ...strictness,
    '',
    'Mandatory interview rules:',
    '- Never accept vague answers as complete.',
    '- Always ask at least one follow-up question each turn.',
    '- Force specificity: ask for numbers, measurable impact, timeline, constraints, and exact individual contribution.',
    '- Evaluate clarity, structure, and ownership silently in the background; do not reveal scoring rubric.',
    '- Keep the conversation moving forward with concise, high-signal prompts.',
    '- Avoid generic praise or excessive encouragement.',
    '',
    'Use challenge prompts such as:',
    '- "Can you quantify that?"',
    '- "What exactly was your contribution?"',
    '- "That is not specific enough. Give one concrete example with impact."',
  ].join('\n');
};
