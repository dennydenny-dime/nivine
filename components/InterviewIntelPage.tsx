import React, { useEffect, useMemo, useState } from 'react';

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

type ApiResponse = {
  insights?: Insight[];
  overview?: string;
  error?: string;
  notice?: string;
};

const filters = ['All', 'Hiring Trends', 'Interview Questions', 'Company Insights', 'Tips & Strategies'] as const;
const focusSuggestions = ['Hiring trends', 'Behavioral questions', 'AI jobs', 'Remote roles', 'Leadership interviews'];
const roleSuggestions = ['Software Engineer', 'Product Manager', 'Designer', 'Sales', 'Data Analyst'];

type Filter = (typeof filters)[number];

type QueryState = {
  focus: string;
  role: string;
  includeQuestions: boolean;
  includeHiringTrends: boolean;
  includeCompanySignals: boolean;
  includePrepAdvice: boolean;
};

const cardAccents = [
  'from-cyan-400/20 via-sky-500/10 to-transparent',
  'from-violet-400/20 via-fuchsia-500/10 to-transparent',
  'from-emerald-400/20 via-teal-500/10 to-transparent',
  'from-amber-300/20 via-orange-500/10 to-transparent',
];

const categoryToFilter = (category: string): Filter => {
  const normalized = category.toLowerCase();

  if (normalized.includes('trend') || normalized.includes('hiring')) return 'Hiring Trends';
  if (normalized.includes('question') || normalized.includes('behavioral') || normalized.includes('technical')) return 'Interview Questions';
  if (normalized.includes('company') || normalized.includes('employer')) return 'Company Insights';
  return 'Tips & Strategies';
};

const formatPublishedAt = (value?: string) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const defaultQueryState: QueryState = {
  focus: 'Hiring trends and interview questions',
  role: 'Software Engineer',
  includeQuestions: true,
  includeHiringTrends: true,
  includeCompanySignals: true,
  includePrepAdvice: true,
};

const InterviewIntelPage: React.FC = () => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [overview, setOverview] = useState<string | null>(null);
  const [query, setQuery] = useState<QueryState>(defaultQueryState);
  const [submittedQuery, setSubmittedQuery] = useState<QueryState>(defaultQueryState);

  const loadInsights = async (nextQuery: QueryState, signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      setNotice(null);

      const response = await fetch('/api/generate-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...nextQuery,
          maxItems: 9,
        }),
        signal,
      });

      const payload = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load interview intel feed.');
      }

      setInsights(payload.insights || []);
      setOverview(payload.overview || null);
      setNotice(payload.notice || null);
    } catch (fetchError) {
      if (signal?.aborted) return;
      setError(fetchError instanceof Error ? fetchError.message : 'Unable to load interview intel right now.');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadInsights(defaultQueryState, controller.signal);
    return () => controller.abort();
  }, []);

  const visibleInsights = useMemo(() => {
    if (activeFilter === 'All') return insights;
    return insights.filter((insight) => categoryToFilter(insight.category) === activeFilter);
  }, [activeFilter, insights]);

  const enabledModes = [
    query.includeQuestions ? 'Questions' : null,
    query.includeHiringTrends ? 'Hiring' : null,
    query.includeCompanySignals ? 'Companies' : null,
    query.includePrepAdvice ? 'Prep moves' : null,
  ].filter(Boolean);

  const handleRefresh = async () => {
    setSubmittedQuery(query);
    await loadInsights(query);
  };

  const toggleFlag = (key: keyof Pick<QueryState, 'includeQuestions' | 'includeHiringTrends' | 'includeCompanySignals' | 'includePrepAdvice'>) => {
    setQuery((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#050816] px-5 py-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] md:px-8 md:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_30%),radial-gradient(circle_at_top_right,rgba(129,140,248,0.14),transparent_32%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.1),transparent_36%)]" />
      <div className="pointer-events-none absolute -left-16 top-20 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 top-12 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative z-10 space-y-8">
        <section className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <span className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
                NewsData + OpenAI reasoning
              </span>
              <div className="space-y-3">
                <h1 className="text-4xl font-black tracking-tight text-white md:text-6xl">Interview Intel ⚡</h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-300 md:text-lg">
                  Pull live NewsData headlines, then let OpenAI act as the brain that filters signals into hiring trends, likely interview questions, company shifts, and prep actions.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left sm:grid-cols-4 lg:w-[30rem]">
              {[
                { label: 'Signals', value: `${insights.length}` },
                { label: 'Filters', value: `${filters.length - 1}` },
                { label: 'Source', value: 'NewsData' },
                { label: 'Brain', value: notice?.includes('OPENAI_API_KEY') ? 'Fallback' : 'OpenAI' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{stat.label}</p>
                  <p className="mt-2 text-2xl font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-5 backdrop-blur-2xl lg:grid-cols-[1.5fr_1fr] lg:p-6">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Ask the news section</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Tune the live feed for your role, questions, and trends.</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Focus</span>
                <input
                  value={query.focus}
                  onChange={(event) => setQuery((current) => ({ ...current, focus: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                  placeholder="e.g. hiring freeze, ML interviews, PM case questions"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Role</span>
                <input
                  value={query.role}
                  onChange={(event) => setQuery((current) => ({ ...current, role: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                  placeholder="e.g. Software Engineer"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {focusSuggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setQuery((current) => ({ ...current, focus: item }))}
                  className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-cyan-300/40 hover:text-white"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {roleSuggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setQuery((current) => ({ ...current, role: item }))}
                  className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-violet-300/40 hover:text-white"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Reasoning lenses</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">Choose what OpenAI should extract from the NewsData feed.</p>
            </div>

            {[
              { key: 'includeQuestions', label: 'Likely interview questions' },
              { key: 'includeHiringTrends', label: 'Hiring trends' },
              { key: 'includeCompanySignals', label: 'Company signals' },
              { key: 'includePrepAdvice', label: 'Prep actions' },
            ].map((item) => {
              const selected = query[item.key as keyof QueryState] as boolean;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleFlag(item.key as keyof Pick<QueryState, 'includeQuestions' | 'includeHiringTrends' | 'includeCompanySignals' | 'includePrepAdvice'>)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                    selected ? 'border-cyan-300/40 bg-cyan-400/10 text-white' : 'border-white/10 bg-white/5 text-slate-300'
                  }`}
                >
                  <span>{item.label}</span>
                  <span>{selected ? 'On' : 'Off'}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={handleRefresh}
              className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              {loading ? 'Refreshing live feed…' : 'Refresh intel'}
            </button>
          </div>
        </section>

        {overview && !error && (
          <section className="rounded-[1.5rem] border border-cyan-400/20 bg-cyan-400/10 p-5 text-cyan-50 backdrop-blur-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">AI overview</p>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-cyan-50/90">{overview}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-cyan-100/90">
              <span className="rounded-full border border-cyan-200/20 px-3 py-1">Focus: {submittedQuery.focus}</span>
              <span className="rounded-full border border-cyan-200/20 px-3 py-1">Role: {submittedQuery.role}</span>
              <span className="rounded-full border border-cyan-200/20 px-3 py-1">Modes: {enabledModes.join(', ') || 'None'}</span>
            </div>
          </section>
        )}

        {notice && (
          <section className="rounded-[1.5rem] border border-amber-400/30 bg-amber-400/10 p-5 text-amber-50 backdrop-blur-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-200">Live feed notice</p>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-amber-50/90">{notice}</p>
          </section>
        )}

        <section className="flex flex-wrap gap-3">
          {filters.map((filter) => {
            const active = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300 ${
                  active
                    ? 'border-cyan-300/50 bg-cyan-400/15 text-white shadow-[0_0_30px_rgba(34,211,238,0.18)]'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white'
                }`}
              >
                {filter}
              </button>
            );
          })}
        </section>

        {loading ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 backdrop-blur-2xl animate-pulse"
              >
                <div className="h-5 w-28 rounded-full bg-white/10" />
                <div className="mt-5 h-7 w-3/4 rounded-xl bg-white/10" />
                <div className="mt-4 space-y-2">
                  <div className="h-4 rounded-full bg-white/10" />
                  <div className="h-4 w-11/12 rounded-full bg-white/10" />
                  <div className="h-4 w-4/5 rounded-full bg-white/10" />
                </div>
                <div className="mt-6 h-12 rounded-2xl bg-white/10" />
              </div>
            ))}
          </section>
        ) : error ? (
          <section className="rounded-[1.5rem] border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100 backdrop-blur-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-rose-200">Insight stream unavailable</p>
            <h2 className="mt-3 text-2xl font-bold text-white">We couldn’t load the live Interview Intel feed.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-rose-100/90">{error}</p>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleInsights.map((insight, index) => {
              const publishedLabel = formatPublishedAt(insight.publishedAt);

              return (
                <article
                  key={`${insight.title}-${index}`}
                  className="group relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5 p-5 backdrop-blur-2xl transition duration-300 hover:-translate-y-1.5 hover:scale-[1.01] hover:border-cyan-300/30 hover:shadow-[0_20px_80px_rgba(6,182,212,0.18)]"
                >
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${cardAccents[index % cardAccents.length]} opacity-80 transition duration-300 group-hover:opacity-100`} />
                  <div className="pointer-events-none absolute -right-10 top-8 h-24 w-24 rounded-full bg-white/10 blur-3xl opacity-0 transition duration-300 group-hover:opacity-100" />

                  <div className="relative space-y-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
                        {insight.category}
                      </span>
                      {typeof insight.score === 'number' && (
                        <span className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium text-emerald-100">
                          {insight.score}/100 relevance
                        </span>
                      )}
                      {insight.source && (
                        <span className="inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-medium text-slate-300">
                          {insight.source}
                        </span>
                      )}
                      {publishedLabel && (
                        <span className="inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-medium text-slate-300">
                          {publishedLabel}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold tracking-tight text-white">{insight.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-300">{insight.description}</p>
                    </div>

                    {insight.whyItMatters && (
                      <div className="rounded-2xl border border-violet-300/10 bg-violet-400/10 p-4 text-sm text-violet-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                        <span className="font-semibold text-violet-200">Why it matters:</span> {insight.whyItMatters}
                      </div>
                    )}

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                      <span className="font-semibold text-cyan-200">Prep move:</span> {insight.action}
                    </div>

                    {insight.tags && insight.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {insight.tags.map((tag) => (
                          <span key={tag} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] text-slate-300">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {insight.link && (
                      <a
                        href={insight.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 transition hover:text-cyan-100"
                      >
                        Read source
                        <span aria-hidden="true">↗</span>
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {!loading && !error && visibleInsights.length === 0 && (
          <section className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6 text-slate-200 backdrop-blur-xl">
            No insights matched the selected filter. Try another lens.
          </section>
        )}
      </div>
    </div>
  );
};

export default InterviewIntelPage;
