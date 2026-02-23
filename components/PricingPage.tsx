import React from 'react';

interface PricingPageProps {
  onBack: () => void;
}

type Plan = {
  label: string;
  value: string;
  cta: string;
  href: string;
};

const individualPlans: Plan[] = [
  {
    label: 'Free',
    value: '6 calls · 3 mins each · Any neural module',
    cta: 'Start Free',
    href: '/#app',
  },
  {
    label: 'Premium — $20/mo',
    value: '30 calls · 10 mins each · All neural modules + quizzes + unlimited custom coaches',
    cta: 'Buy Premium',
    href: 'mailto:sales@synapseai.app?subject=Buy%20Premium%20Plan',
  },
  {
    label: 'Elite — $25/mo',
    value: 'All features included',
    cta: 'Buy Elite',
    href: 'mailto:sales@synapseai.app?subject=Buy%20Elite%20Plan',
  },
];

const teamPlans: Plan[] = [
  {
    label: 'Team — $299/mo',
    value: '25 members · 150 calls · 15 mins each · All features included',
    cta: 'Buy Team',
    href: 'mailto:sales@synapseai.app?subject=Buy%20Team%20Plan',
  },
];

const PricingPage: React.FC<PricingPageProps> = ({ onBack }) => {
  const handleBuyClick = (href: string) => {
    if (href.startsWith('mailto:')) {
      window.location.href = href;
      return;
    }

    window.location.assign(href);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-6xl mx-auto py-12">
      <div className="text-center mb-14">
        <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
          Pricing Built for <span className="gradient-text">Every Stage</span>
        </h2>
        <p className="text-slate-400 text-lg max-w-3xl mx-auto">
          Flexible plans for individuals and teams, with clear usage limits and feature access.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-950 border border-cyan-500/40 rounded-[28px] p-7 md:p-10 shadow-[0_0_60px_rgba(8,145,178,0.08)]">
          <p className="text-cyan-400 uppercase tracking-[0.2em] text-xs md:text-sm font-semibold mb-5">Individual</p>
          <h3 className="text-3xl md:text-4xl font-bold text-slate-100 mb-6">Individual Plans</h3>
          <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-lg">
            Start on Free, then upgrade to Premium or Elite for broader access, longer calls, and full coaching workflows.
          </p>

          <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
            {individualPlans.map((plan) => (
              <div key={plan.label} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 items-start py-5">
                <span className="text-slate-200 font-semibold text-2xl leading-tight">{plan.label}</span>
                <span className="text-slate-300 text-xl leading-tight md:text-right">{plan.value}</span>
                <button
                  onClick={() => handleBuyClick(plan.href)}
                  className="justify-self-start md:justify-self-end px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition-colors"
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-950 border border-cyan-500/40 rounded-[28px] p-7 md:p-10 shadow-[0_0_60px_rgba(8,145,178,0.08)]">
          <p className="text-cyan-400 uppercase tracking-[0.2em] text-xs md:text-sm font-semibold mb-5">Team</p>
          <h3 className="text-3xl md:text-4xl font-bold text-slate-100 mb-6">Team Plan</h3>
          <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-lg">
            One unified plan for organizations that need full platform access for cohorts and teams.
          </p>

          <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
            {teamPlans.map((plan) => (
              <div key={plan.label} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 items-start py-5">
                <span className="text-slate-200 font-semibold text-2xl leading-tight">{plan.label}</span>
                <span className="text-slate-300 text-xl leading-tight md:text-right">{plan.value}</span>
                <button
                  onClick={() => handleBuyClick(plan.href)}
                  className="justify-self-start md:justify-self-end px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition-colors"
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 flex justify-center">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-slate-100 font-semibold"
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default PricingPage;
