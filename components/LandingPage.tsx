import React from 'react';
interface LandingPageProps {
  onEnterApp: () => void;
}

const SectionTitle: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="space-y-2">
    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">{title}</h2>
    <p className="text-slate-400 text-base sm:text-lg">{subtitle}</p>
  </div>
);

const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  return (
    <div className="space-y-10 sm:space-y-16 pb-10">
      <section className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 p-6 sm:p-10">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_50%)]" />
        <div className="relative max-w-4xl space-y-6">
          <p className="text-xs font-black tracking-[0.18em] text-cyan-300 uppercase">Executive Summary</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight">
            Synapse AI is an <span className="text-cyan-300">AI coach for high-stakes communication</span>
          </h1>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            Helping people master job interviews, investor pitches, and presentations through realistic, personalized practice simulations.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { value: '$32B', label: 'Corporate Training Market' },
              { value: '$6B', label: 'Online Soft Skills Training' },
              { value: '85%', label: 'Jobs Won via Soft Skills' }
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-700/80 bg-slate-900/80 p-5 text-center">
                <p className="text-3xl font-black text-blue-300">{item.value}</p>
                <p className="text-sm text-slate-400 mt-2">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={onEnterApp}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:brightness-110 transition"
            >
              Open Main App
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <SectionTitle title="The Problem" subtitle="Why communication skills are broken" />
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4 sm:p-8">
          <div className="divide-y divide-slate-800">
            {[
              {
                title: 'Practice is expensive & inaccessible',
                body: 'Hiring a professional speech coach costs $150–$500/hour. Most people preparing for life-defining moments simply cannot afford it.'
              },
              {
                title: "Generic prep doesn't work",
                body: "YouTube videos and books cannot simulate the real pressure of being asked a follow-up question you didn't expect. People need reactive practice."
              },
              {
                title: 'High failure rate in critical moments',
                body: 'Up to 73% of job seekers report interview anxiety as a major barrier. Founders without pitch practice often fail to raise even when the idea is strong.'
              },
              {
                title: 'No feedback loop',
                body: "Practicing with a friend or recording yourself gives no actionable, structured feedback. People don't know what to fix."
              }
            ].map((item) => (
              <div key={item.title} className="py-5 sm:py-6 first:pt-0 last:pb-0">
                <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                <p className="text-slate-300 mt-2 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <SectionTitle title="Our Solution" subtitle="What Synapse AI actually does" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="md:col-span-2 rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-6">
            <p className="text-xs font-black text-cyan-300 uppercase tracking-[0.16em] mb-3">Core Product</p>
            <h3 className="text-2xl sm:text-3xl font-bold mb-3">AI-Powered Communication Simulator</h3>
            <p className="text-slate-300 leading-relaxed">
              Synapse AI creates realistic, interactive simulations of high-stakes communication scenarios. The AI plays the other party and responds dynamically, just like in real life.
            </p>
          </div>
          {[
            {
              title: 'Interview Prep',
              body: 'Role-play interviews for any role or company. The AI adapts to your industry, seniority level, and interview style.'
            },
            {
              title: 'Investor Pitching',
              body: 'Practice pitching to simulated angel investors and VCs. Get tough follow-up questions on your financials, market size, and business model.'
            },
            {
              title: 'Presentations',
              body: 'Rehearse public speaking, board presentations, and sales calls with real-time feedback on clarity, pacing, and filler words.'
            },
            {
              title: 'Actionable Feedback',
              body: 'After each session, receive a scored report: confidence language, structure quality, clarity score, filler word count, and next-step tips.'
            }
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
              <h4 className="text-xl font-semibold text-white mb-3">{item.title}</h4>
              <p className="text-slate-300">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
