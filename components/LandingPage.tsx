import React from 'react';

interface LandingPageProps {
  onEnterApp: () => void;
}

const howItWorks = [
  {
    title: 'Simulate',
    body: 'Run a realistic interview with an adaptive AI interviewer that changes depth based on your answers.',
  },
  {
    title: 'Measure',
    body: 'Track confidence, clarity, hesitation patterns, and response architecture in real-time.',
  },
  {
    title: 'Improve',
    body: 'Get objective cognitive feedback after each session so every round is more structured than the last.',
  },
];

const features = [
  {
    title: 'Confidence Analysis',
    body: 'Detect stability under pressure and how conviction shifts during follow-up questions.',
  },
  {
    title: 'Hesitation Tracking',
    body: 'Identify pauses, filler density, and response latency to expose cognitive friction points.',
  },
  {
    title: 'Clarity Score',
    body: 'Score precision, sentence discipline, and delivery sharpness for interview-readiness.',
  },
];

const plans = [
  { name: 'Starter', price: '$0', detail: 'Core interview simulations and transcript playback.' },
  { name: 'Pro', price: '$29', detail: 'Advanced analytics, profile benchmarks, and full session history.' },
  { name: 'Teams', price: 'Custom', detail: 'Hiring pipelines, team-level dashboards, and centralized insights.' },
];

const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  return (
    <div className="space-y-20 pb-14">
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#0B0F14] px-6 py-16 sm:px-10 sm:py-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-14 h-60 w-60 -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute left-1/2 top-24 h-40 w-[28rem] -translate-x-1/2 bg-gradient-to-r from-transparent via-blue-400/15 to-transparent blur-2xl" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center animate-in fade-in duration-500">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">AI Interview Intelligence</p>
          <h1 className="mt-6 text-4xl font-semibold leading-tight text-slate-100 sm:text-6xl">
            Train How You Think. Not Just What You Answer.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            A live cognitive interview platform that evaluates how you reason, structure, hesitate, and communicate under pressure.
          </p>
          <button
            onClick={onEnterApp}
            className="mt-10 rounded-xl border border-blue-400/40 bg-blue-500/90 px-7 py-3 text-sm font-semibold text-slate-50 transition hover:bg-blue-500"
          >
            Start AI Interview
          </button>
        </div>
      </section>

      <section className="space-y-8">
        <h2 className="text-2xl font-semibold text-slate-100 sm:text-3xl">How It Works</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {howItWorks.map((item, i) => (
            <div key={item.title} className="rounded-2xl border border-slate-800 bg-slate-900/55 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">0{i + 1}</p>
              <h3 className="mt-3 text-lg font-medium text-slate-100">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <h2 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Core Analysis</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-800 bg-[#111827] p-6"
            >
              <h3 className="text-base font-medium text-slate-100">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <h2 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Pricing</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className="rounded-2xl border border-slate-800 bg-slate-900/55 p-6">
              <h3 className="text-lg font-medium text-slate-100">{plan.name}</h3>
              <p className="mt-3 text-2xl font-semibold text-slate-200">{plan.price}</p>
              <p className="mt-2 text-sm text-slate-400">{plan.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-800 pt-6 text-sm text-slate-500">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>© 2026 NODE AI</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-300">Privacy</a>
            <a href="#" className="hover:text-slate-300">Terms</a>
            <a href="#" className="hover:text-slate-300">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
