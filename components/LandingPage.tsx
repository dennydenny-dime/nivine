import React from 'react';

interface LandingPageProps {
  onEnterApp: () => void;
}

const SectionTitle: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="space-y-2">
    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">{title}</h2>
    <p className="text-slate-300/90 text-base sm:text-lg">{subtitle}</p>
  </div>
);

const marketStats = [
  { value: '$32B', label: 'Corporate Training Market' },
  { value: '$6B', label: 'Online Soft Skills Training' },
  { value: '85%', label: 'Jobs Won via Soft Skills' }
];

const problemPoints = [
  {
    title: 'Practice is expensive & inaccessible',
    body: 'Hiring a professional speech coach costs $150–$500/hour. Most people preparing for life-defining moments simply cannot afford it.',
    icon: '💸'
  },
  {
    title: "Generic prep doesn't work",
    body: "YouTube videos and books cannot simulate the real pressure of being asked a follow-up question you didn't expect. People need reactive practice.",
    icon: '🧩'
  },
  {
    title: 'High failure rate in critical moments',
    body: 'Up to 73% of job seekers report interview anxiety as a major barrier. Founders without pitch practice often fail to raise even when the idea is strong.',
    icon: '📉'
  },
  {
    title: 'No feedback loop',
    body: "Practicing with a friend or recording yourself gives no actionable, structured feedback. People don't know what to fix.",
    icon: '🔁'
  }
];

const solutionCards = [
  {
    title: 'Interview Prep',
    body: 'Role-play interviews for any role or company. The AI adapts to your industry, seniority level, and interview style.',
    icon: '🎯'
  },
  {
    title: 'Investor Pitching',
    body: 'Practice pitching to simulated angel investors and VCs. Get tough follow-up questions on your financials, market size, and business model.',
    icon: '📈'
  },
  {
    title: 'Presentations',
    body: 'Rehearse public speaking, board presentations, and sales calls with real-time feedback on clarity, pacing, and filler words.',
    icon: '🎤'
  },
  {
    title: 'Actionable Feedback',
    body: 'After each session, receive a scored report: confidence language, structure quality, clarity score, filler word count, and next-step tips.',
    icon: '🧠'
  }
];

const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  return (
    <div className="relative isolate space-y-10 sm:space-y-16 pb-12">
      <div className="pointer-events-none absolute inset-x-0 top-4 -z-10 h-[520px] bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.2),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(14,165,233,0.15),transparent_45%)]" />

      <section className="relative overflow-hidden rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-slate-900/95 via-slate-950 to-blue-950/95 p-6 shadow-[0_20px_80px_rgba(2,6,23,0.55)] backdrop-blur sm:p-10">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.2),transparent_45%)]" />
        <div className="absolute right-8 top-8 h-24 w-24 rounded-full border border-cyan-300/20 bg-cyan-400/10 blur-2xl" />
        <div className="relative max-w-4xl space-y-6">
          <p className="text-xs font-black tracking-[0.2em] text-cyan-200 uppercase">Executive Summary</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight text-balance">
            NODE AI is an <span className="bg-gradient-to-r from-cyan-200 to-blue-300 bg-clip-text text-transparent">AI coach for high-stakes communication</span>
          </h1>
          <p className="text-slate-200 text-base sm:text-lg leading-relaxed max-w-3xl">
            Helping people master job interviews, investor pitches, and presentations through realistic, personalized practice simulations.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {marketStats.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5 text-center shadow-inner shadow-cyan-950/30 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-slate-900"
              >
                <p className="text-3xl font-black text-cyan-200">{item.value}</p>
                <p className="text-sm text-slate-300 mt-2">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={onEnterApp}
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500 px-6 py-3 font-semibold text-white shadow-lg shadow-cyan-900/30 transition hover:-translate-y-0.5 hover:brightness-110"
            >
              Open Main App
              <span className="transition group-hover:translate-x-0.5">→</span>
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <SectionTitle title="The Problem" subtitle="Why communication skills are broken" />
        <div className="rounded-3xl border border-slate-700/70 bg-gradient-to-b from-slate-900/65 to-slate-950/80 p-4 shadow-[0_14px_50px_rgba(2,6,23,0.35)] backdrop-blur sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {problemPoints.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-800/90 bg-slate-900/70 p-5 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-slate-900"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1 text-lg" aria-hidden="true">{item.icon}</span>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white">{item.title}</h3>
                    <p className="text-slate-300 mt-2 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <SectionTitle title="Our Solution" subtitle="What NODE AI actually does" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="md:col-span-2 rounded-2xl border border-cyan-400/25 bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-blue-950/70 p-6 shadow-[0_14px_45px_rgba(6,182,212,0.13)]">
            <p className="text-xs font-black text-cyan-300 uppercase tracking-[0.16em] mb-3">Core Product</p>
            <h3 className="text-2xl sm:text-3xl font-bold mb-3 text-white">AI-Powered Communication Simulator</h3>
            <p className="text-slate-200 leading-relaxed">
              NODE AI creates realistic, interactive simulations of high-stakes communication scenarios. The AI plays the other party and responds dynamically, just like in real life.
            </p>
          </div>
          {solutionCards.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-800 bg-slate-900/55 p-6 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-slate-900"
            >
              <div className="mb-3 flex items-center gap-3">
                <span aria-hidden="true" className="text-lg">{item.icon}</span>
                <h4 className="text-xl font-semibold text-white">{item.title}</h4>
              </div>
              <p className="text-slate-300 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
