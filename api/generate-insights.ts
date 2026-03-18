type Insight = {
  category: string;
  title: string;
  description: string;
  action: string;
  source?: string;
  link?: string;
  publishedAt?: string;
};

type NewsDataArticle = {
  title?: string | null;
  description?: string | null;
  link?: string | null;
  source_id?: string | null;
  pubDate?: string | null;
  keywords?: string[] | null;
  category?: string[] | null;
};

const FALLBACK_RAW_DATA = [
  'Google is focusing more on system design interviews',
  'Startups are reducing hiring rounds',
  'Candidates struggle with behavioral questions',
  'Companies prefer candidates with real project experience',
];

const DEFAULT_NEWSDATA_API_KEY = 'pub_be997e9b8cca467ab32475524e55e7f2';
const NEWSDATA_ENDPOINT = 'https://newsdata.io/api/1/latest';
const NEWS_QUERY = 'interview OR hiring OR recruiter OR career';

const getNewsDataApiKey = () =>
  process.env.NEWSDATA_API_KEY ||
  process.env.VITE_NEWSDATA_API_KEY ||
  DEFAULT_NEWSDATA_API_KEY;

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
  source: typeof input.source === 'string' && input.source.trim() ? input.source.trim() : undefined,
  link: typeof input.link === 'string' && input.link.trim() ? input.link.trim() : undefined,
  publishedAt: typeof input.publishedAt === 'string' && input.publishedAt.trim() ? input.publishedAt.trim() : undefined,
});

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

const pickCategory = (article: NewsDataArticle): Insight['category'] => {
  const haystack = [
    article.title,
    article.description,
    article.source_id,
    ...(article.keywords || []),
    ...(article.category || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (haystack.includes('interview') || haystack.includes('behavioral') || haystack.includes('technical')) return 'Interview Questions';
  if (haystack.includes('hiring') || haystack.includes('recruit') || haystack.includes('job market')) return 'Hiring Trends';
  if (haystack.includes('company') || haystack.includes('employer') || haystack.includes('startup')) return 'Company Insights';
  return 'Tips & Strategies';
};

const buildAction = (article: NewsDataArticle): string => {
  const haystack = [article.title, article.description, ...(article.keywords || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (haystack.includes('layoff') || haystack.includes('slowdown') || haystack.includes('hiring freeze')) {
    return 'Prepare a concise value pitch that shows why you can deliver impact quickly in a tighter hiring market.';
  }

  if (haystack.includes('ai') || haystack.includes('automation')) {
    return 'Add one example of how you use AI or automation responsibly to improve quality, speed, or decision-making.';
  }

  if (haystack.includes('behavioral') || haystack.includes('leadership')) {
    return 'Refresh STAR stories that show conflict management, ownership, and measurable outcomes.';
  }

  if (haystack.includes('engineer') || haystack.includes('technical') || haystack.includes('system design')) {
    return 'Rehearse one technical story that explains your architecture choices, trade-offs, and impact in plain language.';
  }

  return 'Turn this headline into a 30-second prep talking point that connects the news to your recent work and interview goals.';
};

const mapArticleToInsight = (article: NewsDataArticle): Insight =>
  normalizeInsight(
    {
      category: pickCategory(article),
      title: article.title || 'Interview market update',
      description: article.description || 'A live market headline related to interviews, hiring, and career readiness.',
      action: buildAction(article),
      source: article.source_id || undefined,
      link: article.link || undefined,
      publishedAt: article.pubDate || undefined,
    },
    'Interview market update',
  );

const fetchLiveInsights = async (): Promise<Insight[]> => {
  const apiKey = getNewsDataApiKey();
  const url = new URL(NEWSDATA_ENDPOINT);
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('q', NEWS_QUERY);
  url.searchParams.set('language', 'en');
  url.searchParams.set('size', '9');

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
  const filteredResults = results.filter((article) => article.title || article.description);

  if (filteredResults.length === 0) {
    throw new Error('NewsData did not return any interview-related articles.');
  }

  return filteredResults.map(mapArticleToInsight);
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

  try {
    const insights = await fetchLiveInsights();
    res.status(200).json({ insights });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load the live news feed.';
    res.status(200).json({
      insights: buildFallbackInsights(sanitizedRawData),
      notice: `${message} Showing fallback interview prep signals instead.`,
    });
  }
}
