import React from 'react';

interface LandingPageProps {
  onEnterApp: () => void;
}

const systems = [
  ['Cognitive Load Mapping', 'Detects latency, verbal drag, and thought compression in live responses.'],
  ['Pressure Signal Tracking', 'Models composure drift and confidence oscillation under hostile questioning.'],
  ['Narrative Precision Index', 'Measures structure discipline, relevance density, and result clarity.'],
];

const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  return (
    <div className="space-y-20 pb-12">
      <section className="premium-panel premium-noise relative overflow-hidden rounded-[2.2rem] px-8 py-24 text-center sm:px-14">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-20 h-64 w-[40rem] -translate-x-1/2 bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent blur-3xl" />
          <div className="absolute left-1/2 top-2 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl">
          <p className="text-[11px] uppercase tracking-[0.34em] text-slate-500">Node AI Intelligence Console</p>
          <h1 className="mt-9 text-5xl font-semibold leading-[0.95] text-[#ededed] sm:text-7xl">
            Train How You Think.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-[#8a8f98] sm:text-lg">
            AI-powered cognitive interview analysis.
          </p>
          <button
            onClick={onEnterApp}
            className="mt-11 rounded-xl border border-white/25 bg-white px-8 py-3 text-sm font-semibold tracking-wide text-[#0a0a0b] transition hover:scale-[1.01] hover:bg-[#f5f5f5]"
          >
            Enter Interview System
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {systems.map(([title, copy]) => (
          <article key={title} className="premium-panel rounded-2xl p-6 transition duration-300 hover:border-white/20">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Core Module</p>
            <h3 className="mt-3 text-lg font-semibold text-[#ededed]">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#8a8f98]">{copy}</p>
          </article>
        ))}
      </section>
    </div>
  );
};

export default LandingPage;
