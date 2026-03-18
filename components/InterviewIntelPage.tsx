import React, { useEffect, useMemo, useState } from 'react';

type Insight = {
  category: string;
  title: string;
  description: string;
  action: string;
};

type ApiResponse = {
  insights?: Insight[];
  error?: string;
  notice?: string;
};

const rawData = [
  'Google is focusing more on system design interviews',
  'Startups are reducing hiring rounds',
  'Candidates struggle with behavioral questions',
  'Companies prefer candidates with real project experience',
];

const filters = ['All', 'Hiring Trends', 'Interview Questions', 'Company Insights', 'Tips & Strategies'] as const;

type Filter = (typeof filters)[number];

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

const InterviewIntelPage: React.FC = () => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadInsights = async () => {
      try {
        setLoading(true);
        setError(null);
        setNotice(null);

        const response = await fetch('/api/generate-insights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ rawData }),
          signal: controller.signal,
        });

        const payload = (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to generate interview insights.');
        }

        setInsights(payload.insights || []);
        setNotice(payload.notice || null);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        setError(fetchError instanceof Error ? fetchError.message : 'Unable to load interview intel right now.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadInsights();

    return () => controller.abort();
  }, []);

  const visibleInsights = useMemo(() => {
    if (activeFilter === 'All') return insights;
    return insights.filter((insight) => categoryToFilter(insight.category) === activeFilter);
  }, [activeFilter, insights]);

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
                Premium intelligence stream
              </span>
              <div className="space-y-3">
                <h1 className="text-4xl font-black tracking-tight text-white md:text-6xl">Interview Intel ⚡</h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-300 md:text-lg">
                  Real-time insights to crack your next interview. We turn raw hiring chatter into structured, actionable prep you can scan in seconds.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left sm:grid-cols-4 lg:w-[30rem]">
              {[
                { label: 'Signals', value: `${insights.length || rawData.length}` },
                { label: 'Filters', value: '4' },
                { label: 'Latency', value: '< 5s' },
                { label: 'Mode', value: notice ? 'Fallback' : 'AI' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{stat.label}</p>
                  <p className="mt-2 text-2xl font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {notice && (
          <section className="rounded-[1.5rem] border border-amber-400/30 bg-amber-400/10 p-5 text-amber-50 backdrop-blur-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-200">Live AI temporarily unavailable</p>
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
            <h2 className="mt-3 text-2xl font-bold text-white">We couldn’t generate Interview Intel right now.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-rose-100/90">{error}</p>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleInsights.map((insight, index) => (
              <article
                key={`${insight.title}-${index}`}
                className="group relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5 p-5 backdrop-blur-2xl transition duration-300 hover:-translate-y-1.5 hover:scale-[1.01] hover:border-cyan-300/30 hover:shadow-[0_20px_80px_rgba(6,182,212,0.18)]"
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${cardAccents[index % cardAccents.length]} opacity-80 transition duration-300 group-hover:opacity-100`} />
                <div className="pointer-events-none absolute -right-10 top-8 h-24 w-24 rounded-full bg-white/10 blur-3xl opacity-0 transition duration-300 group-hover:opacity-100" />

                <div className="relative space-y-5">
                  <span className="inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
                    {insight.category}
                  </span>

                  <div>
                    <h3 className="text-2xl font-bold tracking-tight text-white">{insight.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{insight.description}</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <span className="font-semibold text-cyan-200">👉 Action:</span> {insight.action}
                  </div>
                </div>
              </article>
            ))}
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
