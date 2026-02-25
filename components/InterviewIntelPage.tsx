import React, { useMemo, useState } from 'react';

type NewsItem = {
  id: string;
  title: string;
  description: string;
  source: string;
  publishedAt: string;
  url: string;
  image: string;
  tags: string[];
};

type InterviewQuestion = {
  id: string;
  role: 'SDE' | 'HR' | 'MBA' | 'Product';
  category: 'Behavioral' | 'Technical' | 'HR' | 'Case Study';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  company: string;
  question: string;
  year: number;
  source: string;
  upvotes: number;
};

type LearningModule = {
  id: string;
  role: string;
  moduleTitle: string;
  contentHtml: string;
  order: number;
  estimatedTime: string;
};

const KEYWORDS = [
  'hiring trends',
  'job market',
  'tech hiring',
  'interview process',
  'campus placements',
  'layoffs and hiring',
  'AI jobs',
  'recruitment strategy',
];

const sampleNews: NewsItem[] = [
  {
    id: 'n1',
    title: 'AI jobs surge as companies rebuild talent pipelines in 2026',
    description: 'Top companies report increasing interview loops for AI product and platform roles after Q1 planning.',
    source: 'Hiring Weekly',
    publishedAt: '2026-02-24T08:00:00.000Z',
    url: '#',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1000&q=80',
    tags: ['AI jobs', 'tech hiring', 'recruitment strategy'],
  },
  {
    id: 'n2',
    title: 'Campus placements return stronger for software + analytics roles',
    description: 'Universities across India and the US show improved offer ratios compared to the prior year.',
    source: 'Campus Pulse',
    publishedAt: '2026-02-23T12:30:00.000Z',
    url: '#',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1000&q=80',
    tags: ['campus placements', 'job market'],
  },
  {
    id: 'n3',
    title: 'Layoffs and hiring happen in parallel across cloud and cybersecurity',
    description: 'Leaders cite selective hiring for high-impact teams while reducing low-priority program budgets.',
    source: 'Market Ledger',
    publishedAt: '2026-02-22T19:20:00.000Z',
    url: '#',
    image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1000&q=80',
    tags: ['layoffs and hiring', 'hiring trends'],
  },
  {
    id: 'n4',
    title: 'Interview process redesign: fewer rounds, deeper practical tests',
    description: 'Enterprises experiment with role simulations to cut time-to-hire and increase signal quality.',
    source: 'Talent Ops Daily',
    publishedAt: '2026-02-21T17:10:00.000Z',
    url: '#',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1000&q=80',
    tags: ['interview process', 'recruitment strategy'],
  },
];

const sampleQuestions: InterviewQuestion[] = [
  {
    id: 'q1',
    role: 'SDE',
    category: 'Technical',
    difficulty: 'Hard',
    company: 'Google',
    question: 'Design a distributed rate limiter for global traffic spikes with strict fairness guarantees.',
    year: 2026,
    source: 'Community verified',
    upvotes: 341,
  },
  {
    id: 'q2',
    role: 'SDE',
    category: 'Behavioral',
    difficulty: 'Medium',
    company: 'Amazon',
    question: 'Tell me about a time you disagreed with a design decision and what changed after your pushback.',
    year: 2025,
    source: 'Candidate report',
    upvotes: 277,
  },
  {
    id: 'q3',
    role: 'MBA',
    category: 'Case Study',
    difficulty: 'Hard',
    company: 'McKinsey',
    question: 'A digital lender is losing customers to fintechs. Build a 2-year retention and growth strategy.',
    year: 2026,
    source: 'Prep panel',
    upvotes: 198,
  },
  {
    id: 'q4',
    role: 'HR',
    category: 'HR',
    difficulty: 'Easy',
    company: 'Deloitte',
    question: 'How do you measure hiring quality in the first 90 days of onboarding?',
    year: 2026,
    source: 'Recruiter share',
    upvotes: 154,
  },
];

const sampleLearningModules: LearningModule[] = [
  {
    id: 'm1',
    role: 'SDE',
    moduleTitle: 'System Design Interview Blueprint',
    contentHtml: '<p>Learn requirement scoping, back-of-envelope estimates, API boundaries, and trade-off storytelling.</p>',
    order: 1,
    estimatedTime: '35 mins',
  },
  {
    id: 'm2',
    role: 'HR',
    moduleTitle: 'Behavioral Precision Framework',
    contentHtml: '<p>Master STAR+Metrics responses with confidence calibration and recruiter expectation mapping.</p>',
    order: 2,
    estimatedTime: '22 mins',
  },
  {
    id: 'm3',
    role: 'MBA',
    moduleTitle: 'Case Structuring Essentials',
    contentHtml: '<p>Use issue trees, hypothesis-led analysis, and executive synthesis for final recommendations.</p>',
    order: 3,
    estimatedTime: '28 mins',
  },
];

const prettyDate = (input: string) =>
  new Date(input).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const InterviewIntelPage: React.FC = () => {
  const [keyword, setKeyword] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [openModuleId, setOpenModuleId] = useState<string>(sampleLearningModules[0].id);

  const filteredNews = useMemo(() => {
    if (keyword === 'all') return sampleNews;
    return sampleNews.filter((article) => article.tags.includes(keyword));
  }, [keyword]);

  const filteredQuestions = useMemo(() => {
    if (roleFilter === 'All') return sampleQuestions;
    return sampleQuestions.filter((q) => q.role === roleFilter);
  }, [roleFilter]);

  const featuredNews = filteredNews[0];
  const railNews = filteredNews.slice(1);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/60 p-6 md:p-8">
        <div className="absolute -top-12 -right-8 w-40 h-40 bg-indigo-500/20 blur-3xl rounded-full" />
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.22em] text-indigo-300 mb-3">Interview Intelligence Hub</p>
          <h1 className="text-2xl md:text-4xl font-black text-white leading-tight">Live-style Interview News + Questions + Learning Modules</h1>
          <p className="mt-3 text-slate-300 max-w-3xl">
            Built for backend-first architecture: News API ingestion via CRON, curated interview-question database, and role-based learning modules served fast from your own data layer.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold">📰 Interview News (Netflix-style Rail)</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setKeyword('all')}
              className={`px-3 py-1.5 rounded-full text-xs border ${keyword === 'all' ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`}
            >
              All
            </button>
            {KEYWORDS.map((k) => (
              <button
                key={k}
                onClick={() => setKeyword(k)}
                className={`px-3 py-1.5 rounded-full text-xs border ${keyword === k ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        {featuredNews && (
          <article className="group relative overflow-hidden rounded-2xl border border-slate-800 min-h-[300px] md:min-h-[360px] mb-5">
            <img
              src={featuredNews.image}
              alt={featuredNews.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
            <div className="relative z-10 p-5 md:p-7 h-full flex flex-col justify-end gap-2">
              <p className="text-xs uppercase tracking-[0.18em] text-red-300">Featured Story</p>
              <h3 className="text-xl md:text-3xl font-extrabold text-white max-w-3xl">{featuredNews.title}</h3>
              <p className="text-sm md:text-base text-slate-200 max-w-2xl">{featuredNews.description}</p>
              <p className="text-xs text-slate-300">{featuredNews.source} • {prettyDate(featuredNews.publishedAt)}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {featuredNews.tags.map((tag) => (
                  <span key={tag} className="text-[10px] px-2 py-1 rounded-full border border-slate-500/60 text-slate-100 bg-slate-900/50">{tag}</span>
                ))}
              </div>
              <a href={featuredNews.url} className="inline-flex items-center text-red-200 text-sm mt-1 hover:text-red-100">Read source →</a>
            </div>
          </article>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">More Like This</h3>
          <div className="flex gap-4 overflow-x-auto pb-2 pr-2 snap-x snap-mandatory">
            {railNews.map((article) => (
              <article
                key={article.id}
                className="group relative min-w-[240px] sm:min-w-[280px] md:min-w-[320px] h-[180px] rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/70 snap-start transition duration-300 hover:scale-[1.03] hover:border-red-400/70"
              >
                <img src={article.image} alt={article.title} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
                <div className="relative h-full p-4 flex flex-col justify-end">
                  <p className="text-[11px] text-slate-300">{article.source} • {prettyDate(article.publishedAt)}</p>
                  <h4 className="text-sm font-bold text-white leading-snug">{article.title}</h4>
                  <a href={article.url} className="text-xs text-red-200 opacity-0 group-hover:opacity-100 transition-opacity mt-1">Open story →</a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-5">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">📚 Previously Asked Questions</h2>
            <select
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              {['All', 'SDE', 'HR', 'MBA', 'Product'].map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <div className="space-y-3 max-h-[460px] overflow-auto pr-1">
            {filteredQuestions.map((q) => (
              <div key={q.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs text-slate-400">{q.company} • {q.role} • {q.category} • {q.year}</p>
                <p className="text-sm md:text-base text-white mt-1">{q.question}</p>
                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-slate-800 text-slate-200">Difficulty: {q.difficulty}</span>
                  <span className="px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-200">⬆ {q.upvotes}</span>
                  <span className="px-2 py-1 rounded-full border border-slate-700 text-slate-300">{q.source}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4">Supports both curated DB and community-submitted workflow with admin review.</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 md:p-6">
          <h2 className="text-xl font-bold mb-4">📖 Learning Modules (Role-based)</h2>
          <div className="space-y-3">
            {sampleLearningModules
              .sort((a, b) => a.order - b.order)
              .map((module) => {
                const open = openModuleId === module.id;
                return (
                  <div key={module.id} className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/60">
                    <button
                      onClick={() => setOpenModuleId(open ? '' : module.id)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-900/70 transition-colors"
                    >
                      <div>
                        <p className="text-xs text-slate-400">{module.role} • {module.estimatedTime}</p>
                        <h3 className="font-semibold text-white">{module.moduleTitle}</h3>
                      </div>
                      <span className="text-slate-300">{open ? '−' : '+'}</span>
                    </button>
                    {open && (
                      <div className="px-4 pb-4 text-slate-300 text-sm" dangerouslySetInnerHTML={{ __html: module.contentHtml }} />
                    )}
                  </div>
                );
              })}
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-indigo-500/40 p-3 text-xs text-indigo-200 bg-indigo-500/10">
            DB fields: <strong>role</strong>, <strong>module_title</strong>, <strong>content_html</strong>, <strong>order</strong>, <strong>estimated_time</strong>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-5 md:p-6">
        <h2 className="text-lg font-bold text-emerald-200">Recommended Backend Endpoints (Ready for your API integration)</h2>
        <pre className="mt-3 text-xs md:text-sm whitespace-pre-wrap text-emerald-100/90 bg-slate-950/60 border border-emerald-600/30 rounded-xl p-4 overflow-auto">
{`GET    /api/interview-news?keyword=&limit=
POST   /api/interview-news/sync (cron-triggered worker)
GET    /api/interview-questions?role=&company=&sort=trending
POST   /api/interview-questions/submit
PATCH  /api/interview-questions/:id/review
GET    /api/learning-modules?role=`}
        </pre>
      </section>
    </div>
  );
};

export default InterviewIntelPage;
