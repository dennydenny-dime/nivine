type Insight = {
  category: string;
  title: string;
  description: string;
  action: string;
};

type OpenAIMessage = {
  role: 'system' | 'user';
  content: string;
};

const FALLBACK_RAW_DATA = [
  'Google is focusing more on system design interviews',
  'Startups are reducing hiring rounds',
  'Candidates struggle with behavioral questions',
  'Companies prefer candidates with real project experience',
];

const SYSTEM_PROMPT = 'You are an expert interviewer. Convert the input into a short, actionable interview insight. Return JSON with category, title, description (2 lines), and action.';

const getOpenAiApiKey = () =>
  process.env.OPENAI_API_KEY ||
  process.env.VITE_OPENAI_API_KEY ||
  process.env.OPENAI_KEY;


const normalizeInsight = (input: Partial<Insight>, fallbackSource: string): Insight => ({
  category: typeof input.category === 'string' && input.category.trim() ? input.category.trim() : 'Tips & Strategies',
  title: typeof input.title === 'string' && input.title.trim() ? input.title.trim() : fallbackSource,
  description:
    typeof input.description === 'string' && input.description.trim()
      ? input.description.trim()
      : 'Focus on the signal behind this hiring update and prepare a concise response that proves readiness.',
  action:
    typeof input.action === 'string' && input.action.trim()
      ? input.action.trim()
      : 'Turn this theme into one concrete talking point before your next interview.',
});

const parseInsight = (content: string, fallbackSource: string): Insight => {
  const fenced = content.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || content;
  const parsed = JSON.parse(candidate) as Partial<Insight>;
  return normalizeInsight(parsed, fallbackSource);
};

const createFallbackInsight = (rawItem: string): Insight => {
  const normalized = rawItem.trim();
  const lower = normalized.toLowerCase();

  if (lower.includes('system design')) {
    return {
      category: 'Interview Questions',
      title: 'System design screens are carrying more weight',
      description: 'Expect broader architecture prompts earlier in the loop. Practice explaining trade-offs, scaling risks, and how you would validate a design.',
      action: 'Prepare one end-to-end system design story with clear assumptions, bottlenecks, and monitoring choices.',
    };
  }

  if (lower.includes('startup')) {
    return {
      category: 'Hiring Trends',
      title: 'Lean teams are compressing interview loops',
      description: 'Smaller companies want signal faster, so each round matters more. Your examples should show speed, ownership, and comfort with ambiguity.',
      action: 'Tighten your top three stories so you can explain impact, trade-offs, and outcomes in under two minutes each.',
    };
  }

  if (lower.includes('behavioral')) {
    return {
      category: 'Interview Questions',
      title: 'Behavioral preparation is still a major differentiator',
      description: 'Candidates often know the work but undersell the context, conflict, and measurable result. Strong STAR answers make your judgment easier to trust.',
      action: 'Write and rehearse five STAR examples that cover leadership, conflict, failure, ownership, and learning.',
    };
  }

  if (lower.includes('project')) {
    return {
      category: 'Company Insights',
      title: 'Proof of execution beats generic claims',
      description: 'Interviewers increasingly look for real examples that show what you built, why it mattered, and how you handled trade-offs under pressure.',
      action: 'Turn one recent project into a portfolio-style walkthrough with scope, stack, metrics, and lessons learned.',
    };
  }

  return {
    category: 'Tips & Strategies',
    title: normalized,
    description: 'This signal is worth translating into a short interview-ready talking point that shows how you think and adapt.',
    action: 'Connect this trend to one concrete example from your own work before the next interview.',
  };
};

const buildFallbackInsights = (rawData: string[]): Insight[] => rawData.map((item) => createFallbackInsight(item));

const isQuotaError = (details: string) => {
  const normalized = details.toLowerCase();
  return normalized.includes('insufficient_quota') || normalized.includes('exceeded your current quota');
};

const createInsight = async (rawItem: string, apiKey: string): Promise<Insight> => {
  const messages: OpenAIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: rawItem },
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages,
    }),
  });

  if (!response.ok) {
    const details = await response.text();

    if (response.status === 429 && isQuotaError(details)) {
      throw new Error(
        'OpenAI project quota is unavailable for this API key. The API billing/project balance can be exhausted even when your usage dashboard shows 0 for a different project or date range.',
      );
    }

    throw new Error(`OpenAI request failed (${response.status}): ${details}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenAI response did not contain structured insight content.');
  }

  return parseInsight(content, rawItem);
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const rawData = Array.isArray(req.body?.rawData) && req.body.rawData.length > 0 ? req.body.rawData : FALLBACK_RAW_DATA;
  const sanitizedRawData = rawData.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0);

  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    res.status(200).json({
      insights: buildFallbackInsights(sanitizedRawData),
      notice: 'OpenAI API key is missing, so sample interview insights are being shown instead of live AI-generated ones.',
    });
    return;
  }

  try {
    const insights = await Promise.all(sanitizedRawData.map((item) => createInsight(item, apiKey)));
    res.status(200).json({ insights });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate insights.';
    res.status(200).json({
      insights: buildFallbackInsights(sanitizedRawData),
      notice: `${message} Showing sample interview insights while live generation is unavailable.`,
    });
  }
}
