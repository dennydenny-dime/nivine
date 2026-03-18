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

const getOpenAiApiKey = () => process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

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

  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    res.status(500).json({ error: 'Missing OPENAI_API_KEY environment variable.' });
    return;
  }

  try {
    const rawData = Array.isArray(req.body?.rawData) && req.body.rawData.length > 0 ? req.body.rawData : FALLBACK_RAW_DATA;
    const sanitizedRawData = rawData.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0);

    const insights = await Promise.all(sanitizedRawData.map((item) => createInsight(item, apiKey)));
    res.status(200).json({ insights });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate insights.';
    res.status(500).json({ error: message });
  }
}
