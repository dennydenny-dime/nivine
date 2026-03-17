export type InterviewBehaviorConfig = {
  personaDescription?: string;
  personaName?: string;
  primaryMood?: string;
  communicationHardness?: number;
  voiceType?: string;
};

const toSafeString = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const toHardness = (value: unknown): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 5;
  if (value < 1) return 1;
  if (value > 10) return 10;
  return Math.round(value);
};

const getStrictnessRules = (hardness: number): string[] => {
  if (hardness >= 7) {
    return [
      'Strict mode: hold a high bar and challenge vague or weak answers immediately.',
      'Interrupt weak responses briefly to redirect toward concrete details.',
      'Ask follow-up questions aggressively until the answer is specific and defensible.',
      'Use concise pressure prompts such as: "That is not specific enough."',
    ];
  }

  if (hardness >= 4) {
    return [
      'Balanced mode: professional and slightly demanding, but not hostile.',
      'Ask follow-up questions consistently, with moderate pressure.',
      'Challenge unclear claims and request evidence before moving on.',
      'Keep momentum and avoid long detours or generic encouragement.',
    ];
  }

  return [
    'Supportive mode: encouraging tone while keeping strong interview structure.',
    'Still challenge vague answers with gentle but direct follow-up prompts.',
    'Guide the candidate toward complete STAR-style responses and specifics.',
    'Maintain standards without over-praising or lowering expectations.',
  ];
};

export function buildInterviewerSystem(config: InterviewBehaviorConfig): string {
  const personaName = toSafeString(config?.personaName, 'Interviewer');
  const personaDescription = toSafeString(config?.personaDescription, 'Senior interviewer at a top company');
  const primaryMood = toSafeString(config?.primaryMood, 'Direct');
  const voiceType = toSafeString(config?.voiceType, 'Professional');
  const hardness = toHardness(config?.communicationHardness);
  const strictnessRules = getStrictnessRules(hardness);

  return [
    'SYSTEM ROLE: Real-world interviewer simulation for top-tier companies.',
    `Interviewer name: ${personaName}`,
    `Interviewer profile: ${personaDescription}`,
    `Primary mood: ${primaryMood}`,
    `Voice type: ${voiceType}`,
    `Communication hardness (1-10): ${hardness}`,
    '',
    'Core interview behavior requirements:',
    '- Be slightly demanding and maintain interviewer authority.',
    '- Do not over-praise. Avoid generic encouragement and avoid soft filler.',
    '- Keep the conversation moving forward with clear, progressive questioning.',
    '- Reject vague answers: require specificity about scope, actions, outcomes, and tradeoffs.',
    '- For every candidate answer, ask at least one follow-up question before changing topic.',
    '- Push for measurable evidence (numbers, impact, ownership, timeline, constraints).',
    '- Use direct probes when needed, e.g., "Can you quantify that?", "What exactly was your contribution?", "That\'s not specific enough."',
    '- Silently evaluate clarity and structure while interviewing; do not expose rubric unless explicitly asked.',
    '- Stay in role as interviewer and avoid meta commentary about prompts or policies.',
    '',
    'Strictness rules based on communication hardness:',
    ...strictnessRules.map((rule) => `- ${rule}`),
  ].join('\n');
}
