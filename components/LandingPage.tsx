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
            <a href="#business-model" className="px-6 py-3 rounded-xl border border-slate-600 text-slate-200 font-semibold hover:border-cyan-400/60 transition text-center">
              View Business Model
            </a>
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

      <section id="business-model" className="space-y-6">
        <SectionTitle title="Business Model" subtitle="How Synapse AI makes money" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <p className="text-xs font-black text-cyan-300 uppercase tracking-[0.16em] mb-3">B2C — Freemium SaaS</p>
            <h3 className="text-2xl font-bold mb-4">Individual Plans</h3>
            <p className="text-slate-300 mb-5">Free tier (3 sessions/month) drives viral growth. Paid plans unlock unlimited practice, detailed analytics, and advanced scenarios.</p>
            <div className="space-y-3 text-sm sm:text-base">
              <div className="flex justify-between border-b border-slate-800 pb-2"><span className="font-semibold">Free</span><span>3 sessions/mo</span></div>
              <div className="flex justify-between border-b border-slate-800 pb-2"><span className="font-semibold">Pro — $19/mo</span><span>Unlimited sessions</span></div>
              <div className="flex justify-between"><span className="font-semibold">Premium — $39/mo</span><span>All scenarios + analytics</span></div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <p className="text-xs font-black text-cyan-300 uppercase tracking-[0.16em] mb-3">B2B — Institutional</p>
            <h3 className="text-2xl font-bold mb-4">Team & Campus Plans</h3>
            <p className="text-slate-300 mb-5">Bootcamps, universities, and career centers pay per-seat or flat monthly. High LTV, low churn.</p>
            <div className="space-y-3 text-sm sm:text-base">
              <div className="flex justify-between border-b border-slate-800 pb-2"><span className="font-semibold">Starter — $299/mo</span><span>Up to 25 seats</span></div>
              <div className="flex justify-between border-b border-slate-800 pb-2"><span className="font-semibold">Growth — $799/mo</span><span>Up to 100 seats</span></div>
              <div className="flex justify-between"><span className="font-semibold">Enterprise</span><span>Custom pricing</span></div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:p-6 overflow-x-auto">
          <p className="text-xs font-black text-cyan-300 uppercase tracking-[0.16em] mb-4">Revenue Projections (Conservative)</p>
          <table className="w-full min-w-[620px] text-left">
            <thead className="text-slate-400 text-sm">
              <tr>
                <th className="pb-3">Year</th>
                <th className="pb-3">B2C Users</th>
                <th className="pb-3">B2B Clients</th>
                <th className="pb-3">MRR</th>
                <th className="pb-3">ARR</th>
              </tr>
            </thead>
            <tbody className="text-sm sm:text-base">
              <tr className="border-t border-slate-800"><td className="py-3">Year 1</td><td>2,000 paid</td><td>10 institutions</td><td>$12K</td><td>$144K</td></tr>
              <tr className="border-t border-slate-800"><td className="py-3">Year 2</td><td>12,000 paid</td><td>60 institutions</td><td>$75K</td><td>$900K</td></tr>
              <tr className="border-t border-slate-800 text-emerald-300 font-semibold"><td className="py-3">Year 3</td><td>40,000 paid</td><td>200 institutions</td><td>$280K</td><td>$3.4M</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
