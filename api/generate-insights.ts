type Insight = {
  category: string;
  title: string;
  description: string;
  action: string;
  source?: string;
  link?: string;
  publishedAt?: string;
  whyItMatters?: string;
  tags?: string[];
  score?: number;
};

type NewsDataArticle = {
  title?: string | null;
  description?: string | null;
  content?: string | null;
  link?: string | null;
  source_id?: string | null;
  pubDate?: string | null;
  keywords?: string[] | null;
  category?: string[] | null;
};

type GenerateInsightsRequest = {
  focus?: string;
  role?: string;
  includeQuestions?: boolean;
  includeHiringTrends?: boolean;
  includeCompanySignals?: boolean;
  includePrepAdvice?: boolean;
  maxItems?: number;
};

type OpenAIInsightPayload = {
  overview?: string;
  insights?: Partial<Insight>[];
};

const FALLBACK_RAW_DATA = [
  'Google is focusing more on system design interviews',
  'Startups are reducing hiring rounds',
  'Candidates struggle with behavioral questions',
  'Companies prefer candidates with real project experience',
];

const DEFAULT_NEWSDATA_API_KEY = 'pub_be997e9b8cca467ab32475524e55e7f2';
const NEWSDATA_ENDPOINT = 'https://newsdata.io/api/1/latest';
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';
const NEWS_QUERY = 'interview OR hiring OR recruiter OR career OR jobs';

const getNewsDataApiKey = () =>
  process.env.NEWSDATA_API_KEY ||
  process.env.VITE_NEWSDATA_API_KEY ||
  DEFAULT_NEWSDATA_API_KEY;

const getOpenAIApiKey = () =>
  process.env.OPENAI_API_KEY ||
  process.env.VITE_OPENAI_API_KEY ||
  '';

const getOpenAIModel = () => process.env.OPENAI_NEWS_MODEL || DEFAULT_OPENAI_MODEL;

const clampMaxItems = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 8;
  return Math.min(12, Math.max(4, Math.round(value)));
};

const normalizeInsight = (input: Partial<Insight>, fallbackTitle: string): Insight => ({
  category: typeof input.category === 'string' && input.category.trim() ? input.category.trim() : 'Tips & Strategies',
  title: typeof input.title === 'string' && input.title.trim() ? input.title.trim() : fallbackTitle,
  description:
    typeof input.description === 'string' && input.description.trim()
      ? input.description.trim()
      : 'Focus on the signal behind this hiring update and prepare a concise response that proves readiness.',
  action:
    typeof input.action === 'string' && input.action.trim()
      ? input.action.trim()
      : 'Turn this theme into one concrete talking point before your next interview.',
  whyItMatters:
    typeof input.whyItMatters === 'string' && input.whyItMatters.trim()
      ? input.whyItMatters.trim()
      : 'This signal can influence how interviewers evaluate readiness, priorities, and communication depth.',
  source: typeof input.source === 'string' && input.source.trim() ? input.source.trim() : undefined,
  link: typeof input.link === 'string' && input.link.trim() ? input.link.trim() : undefined,
  publishedAt: typeof input.publishedAt === 'string' && input.publishedAt.trim() ? input.publishedAt.trim() : undefined,
  tags: Array.isArray(input.tags)
    ? input.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0).slice(0, 4)
    : undefined,
  score:
    typeof input.score === 'number' && Number.isFinite(input.score)
      ? Math.min(100, Math.max(1, Math.round(input.score)))
      : undefined,
});

const createFallbackInsight = (rawItem: string): Insight => {
  const normalized = rawItem.trim();
  const lower = normalized.toLowerCase();

  if (lower.includes('system design')) {
    return {
      category: 'Interview Questions',
      title: 'System design screens are carrying more weight',
      description: 'Expect broader architecture prompts earlier in the loop. Practice explaining trade-offs, scaling risks, and validation steps.',
      whyItMatters: 'Technical interviewers are using architecture depth to test seniority, prioritization, and product judgment.',
      action: 'Prepare one end-to-end system design story with clear assumptions, bottlenecks, and monitoring choices.',
      tags: ['system design', 'technical rounds'],
      score: 84,
    };
  }

  if (lower.includes('startup')) {
    return {
      category: 'Hiring Trends',
      title: 'Lean teams are compressing interview loops',
      description: 'Smaller companies want stronger signal in fewer rounds, so concise and outcome-focused answers matter more.',
      whyItMatters: 'Candidates have less time to establish ownership, pace, and ability to execute in ambiguity.',
      action: 'Tighten your top three stories so you can explain impact, trade-offs, and outcomes in under two minutes each.',
      tags: ['startup hiring', 'lean teams'],
      score: 78,
    };
  }

  if (lower.includes('behavioral')) {
    return {
      category: 'Interview Questions',
      title: 'Behavioral preparation is still a major differentiator',
      description: 'Candidates often know the work but undersell context, conflict, and measurable outcomes in their answers.',
      whyItMatters: 'Structured behavioral examples help interviewers trust judgment and collaboration under pressure.',
      action: 'Write and rehearse five STAR examples that cover leadership, conflict, failure, ownership, and learning.',
      tags: ['behavioral', 'STAR'],
      score: 82,
    };
  }

  if (lower.includes('project')) {
    return {
      category: 'Company Insights',
      title: 'Proof of execution beats generic claims',
      description: 'Interviewers increasingly want examples showing what you built, why it mattered, and how you handled trade-offs.',
      whyItMatters: 'Clear evidence of shipped work makes it easier to justify hiring decisions in a cautious market.',
      action: 'Turn one recent project into a portfolio-style walkthrough with scope, stack, metrics, and lessons learned.',
      tags: ['portfolio', 'execution'],
      score: 76,
    };
  }

  return {
    category: 'Tips & Strategies',
    title: normalized,
    description: 'This signal is worth translating into a short interview-ready talking point that shows how you think and adapt.',
    whyItMatters: 'The strongest candidates connect market news to relevant examples from their own experience.',
    action: 'Connect this trend to one concrete example from your own work before the next interview.',
    score: 70,
  };
};

const buildFallbackInsights = (rawData: string[], maxItems: number): Insight[] =>
  rawData.slice(0, maxItems).map((item) => createFallbackInsight(item));

const mapArticleToInsight = (article: NewsDataArticle): Insight =>
  normalizeInsight(
    {
      category: 'Tips & Strategies',
      title: article.title || 'Interview market update',
      description: article.description || article.content || 'A live market headline related to interviews, hiring, and career readiness.',
      whyItMatters: 'This live headline may affect what employers emphasize in screenings, team fit discussions, and role expectations.',
      action: 'Turn this headline into a 30-second prep talking point that connects the news to your recent work and interview goals.',
      source: article.source_id || undefined,
      link: article.link || undefined,
      publishedAt: article.pubDate || undefined,
      tags: [...(article.category || []), ...(article.keywords || [])].slice(0, 4),
    },
    'Interview market update',
  );

const fetchLiveArticles = async (maxItems: number): Promise<NewsDataArticle[]> => {
  const apiKey = getNewsDataApiKey();
  const url = new URL(NEWSDATA_ENDPOINT);
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('q', NEWS_QUERY);
  url.searchParams.set('language', 'en');
  // NewsData rejects oversized `size` values on this endpoint, so keep the request
  // within the documented small-page range and trim locally after filtering.
  url.searchParams.set('size', String(Math.min(Math.max(maxItems, 4), 10)));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`NewsData request failed (${response.status}): ${details}`);
  }

  const payload = await response.json();
  const results = Array.isArray(payload?.results) ? (payload.results as NewsDataArticle[]) : [];
  const filteredResults = results.filter((article) => article.title || article.description || article.content).slice(0, maxItems);

  if (filteredResults.length === 0) {
    throw new Error('NewsData did not return any interview-related articles.');
  }

  return filteredResults;
};

const buildPrompt = (request: Required<GenerateInsightsRequest>, articles: NewsDataArticle[]) => {
  const requestedModes = [
    request.includeQuestions ? 'interview questions' : null,
    request.includeHiringTrends ? 'hiring trends' : null,
    request.includeCompanySignals ? 'company signals' : null,
    request.includePrepAdvice ? 'prep advice' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return [
    'You are an expert job-market analyst and interview coach.',
    'Reason over the provided NewsData articles and turn them into a practical intelligence feed for candidates.',
    `Primary focus/topic from user: ${request.focus || 'general interview readiness'}.`,
    `Target role/persona from user: ${request.role || 'general candidate'}.`,
    `Requested analysis modes: ${requestedModes || 'all modes'}.`,
    'Return strict JSON with shape {"overview":"string","insights":[{"category":"Hiring Trends | Interview Questions | Company Insights | Tips & Strategies","title":"string","description":"string","whyItMatters":"string","action":"string","source":"string","link":"string","publishedAt":"ISO string","tags":["tag"],"score":1}]}.',
    `Generate ${request.maxItems} insights maximum.`,
    'Use only the supplied articles; do not invent companies, dates, or claims.',
    'Prefer concise but concrete reasoning. Mention likely candidate implications, hiring shifts, questions to prepare for, and practical prep moves.',
    `Articles: ${JSON.stringify(articles)}`,
  ].join('\n');
};

const parseOpenAIResponse = (payload: any): OpenAIInsightPayload | null => {
  const directText = typeof payload?.output_text === 'string' ? payload.output_text : '';
  if (directText) {
    try {
      return JSON.parse(directText) as OpenAIInsightPayload;
    } catch {
      // Fall through to block extraction.
    }
  }

  const textParts: string[] = [];
  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === 'string') {
        textParts.push(part.text);
      }
    }
  }

  const joined = textParts.join('\n').trim();
  if (!joined) return null;

  const start = joined.indexOf('{');
  const end = joined.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;

  try {
    return JSON.parse(joined.slice(start, end + 1)) as OpenAIInsightPayload;
  } catch {
    return null;
  }
};

const synthesizeWithOpenAI = async (
  request: Required<GenerateInsightsRequest>,
  articles: NewsDataArticle[],
): Promise<{ insights: Insight[]; overview?: string; notice?: string }> => {
  const apiKey = getOpenAIApiKey();

  if (!apiKey) {
    return {
      insights: articles.map(mapArticleToInsight).slice(0, request.maxItems),
      notice: 'OPENAI_API_KEY is not configured, so the feed is showing direct NewsData summaries instead of AI reasoning.',
    };
  }

  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getOpenAIModel(),
      input: buildPrompt(request, articles),
      text: {
        format: {
          type: 'json_object',
        },
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI reasoning request failed (${response.status}): ${details}`);
  }

  const payload = await response.json();
  const parsed = parseOpenAIResponse(payload);

  if (!parsed || !Array.isArray(parsed.insights) || parsed.insights.length === 0) {
    throw new Error('OpenAI returned an unexpected insight payload.');
  }

  return {
    overview: typeof parsed.overview === 'string' ? parsed.overview.trim() : undefined,
    insights: parsed.insights.slice(0, request.maxItems).map((insight, index) => {
      const article = articles[index] || articles[0];
      return normalizeInsight(
        {
          ...insight,
          source: insight.source || article?.source_id || undefined,
          link: insight.link || article?.link || undefined,
          publishedAt: insight.publishedAt || article?.pubDate || undefined,
          tags: Array.isArray(insight.tags) && insight.tags.length > 0 ? insight.tags : [...(article?.category || []), ...(article?.keywords || [])].slice(0, 4),
        },
        article?.title || 'Interview market update',
      );
    }),
  };
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

  const requestBody = (req.body || {}) as GenerateInsightsRequest;
  const maxItems = clampMaxItems(requestBody.maxItems);
  const request: Required<GenerateInsightsRequest> = {
    focus: typeof requestBody.focus === 'string' ? requestBody.focus.trim() : '',
    role: typeof requestBody.role === 'string' ? requestBody.role.trim() : '',
    includeQuestions: requestBody.includeQuestions !== false,
    includeHiringTrends: requestBody.includeHiringTrends !== false,
    includeCompanySignals: requestBody.includeCompanySignals !== false,
    includePrepAdvice: requestBody.includePrepAdvice !== false,
    maxItems,
  };

  const rawData = Array.isArray(req.body?.rawData) && req.body.rawData.length > 0 ? req.body.rawData : FALLBACK_RAW_DATA;
  const sanitizedRawData = rawData.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0);

  try {
    const articles = await fetchLiveArticles(maxItems);
    const reasoning = await synthesizeWithOpenAI(request, articles);
    res.status(200).json({ insights: reasoning.insights, overview: reasoning.overview, notice: reasoning.notice });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load the live news feed.';
    res.status(200).json({
      insights: buildFallbackInsights(sanitizedRawData, maxItems),
      notice: `${message} Showing fallback interview prep signals instead.`,
    });
  }
}
