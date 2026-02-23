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
  { label: 'Free', value: '3 sessions/mo', cta: 'Start Free', href: '/#app' },
  { label: 'Pro — $19/mo', value: 'Unlimited sessions', cta: 'Buy Pro', href: 'mailto:sales@synapseai.app?subject=Buy%20Pro%20Plan' },
  { label: 'Premium — $39/mo', value: 'All scenarios + analytics', cta: 'Buy Premium', href: 'mailto:sales@synapseai.app?subject=Buy%20Premium%20Plan' },
];

const teamPlans: Plan[] = [
  { label: 'Starter — $299/mo', value: 'Up to 25 seats', cta: 'Buy Starter', href: 'mailto:sales@synapseai.app?subject=Buy%20Starter%20Plan' },
  { label: 'Growth — $799/mo', value: 'Up to 100 seats', cta: 'Buy Growth', href: 'mailto:sales@synapseai.app?subject=Buy%20Growth%20Plan' },
  { label: 'Enterprise', value: 'Custom pricing', cta: 'Contact Sales', href: 'mailto:sales@synapseai.app?subject=Enterprise%20Plan%20Inquiry' },
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
          Choose between individual subscriptions or institutional seats, with clear options for learners and teams.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-950 border border-cyan-500/40 rounded-[28px] p-7 md:p-10 shadow-[0_0_60px_rgba(8,145,178,0.08)]">
          <p className="text-cyan-400 uppercase tracking-[0.2em] text-xs md:text-sm font-semibold mb-5">B2C — Freemium SaaS</p>
          <h3 className="text-3xl md:text-4xl font-bold text-slate-100 mb-6">Individual Plans</h3>
          <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-lg">
            Free tier (3 sessions/month) drives viral growth. Paid plans unlock unlimited practice, detailed analytics,
            and advanced scenarios.
          </p>

          <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
            {individualPlans.map((plan) => (
              <div key={plan.label} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 items-start py-5">
                <span className="text-slate-200 font-semibold text-2xl leading-tight">{plan.label}</span>
                <span className="text-slate-300 text-2xl leading-tight md:text-right">{plan.value}</span>
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
          <p className="text-cyan-400 uppercase tracking-[0.2em] text-xs md:text-sm font-semibold mb-5">B2B — Institutional</p>
          <h3 className="text-3xl md:text-4xl font-bold text-slate-100 mb-6">Team &amp; Campus Plans</h3>
          <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-lg">
            Bootcamps, universities, and career centers pay per-seat or flat monthly. High LTV, low churn.
          </p>

          <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
            {teamPlans.map((plan) => (
              <div key={plan.label} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 items-start py-5">
                <span className="text-slate-200 font-semibold text-2xl leading-tight">{plan.label}</span>
                <span className="text-slate-300 text-2xl leading-tight md:text-right">{plan.value}</span>
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
