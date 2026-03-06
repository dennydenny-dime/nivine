import React, { useMemo, useState } from 'react';
import { SubscriptionTier } from '../lib/subscription';

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  method: Record<string, boolean>;
  notes?: Record<string, string>;
  handler: () => void;
  theme?: {
    color?: string;
  };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => {
      open: () => void;
    };
  }
}

interface PricingPageProps {
  onBack: () => void;
  onPurchaseSuccess: (tier: SubscriptionTier) => void;
  onRequireSignIn?: () => void;
  currentUser?: { id?: string; email?: string | null } | null;
}

type PlanFeature = {
  text: string;
  icon: 'spark' | 'coach' | 'chart' | 'doc' | 'speed' | 'team' | 'shield';
};

type Plan = {
  label: string;
  monthlyUsdPrice: number;
  yearlyUsdPrice: number;
  cta: string;
  fallbackHref?: string;
  razorpayDescription?: string;
  blurb: string;
  badge?: string;
  highlight?: boolean;
  subtitle: string;
  features: PlanFeature[];
};

type PricingConfig = {
  currency: string;
  amountInMinorUnits: number;
  displayPrice: string;
};

const RAZORPAY_PAYMENT_METHODS: Record<string, boolean> = {
  card: true,
  netbanking: true,
  upi: true,
};

const plans: Plan[] = [
  {
    label: 'PRO',
    subtitle: 'Best for serious job seekers.',
    blurb: 'Build confidence with focused mock interviews and actionable guidance.',
    monthlyUsdPrice: 18,
    yearlyUsdPrice: 16,
    cta: 'Start Pro',
    razorpayDescription: 'Node AI Pro subscription',
    fallbackHref: 'mailto:sales@nodeai.app?subject=Start%20Pro%20Plan',
    features: [
      { text: '4 AI-powered mock interviews (25 minutes each)', icon: 'spark' },
      { text: 'Custom AI Coach access (2 sessions of 15 minutes each)', icon: 'coach' },
      { text: 'Behavioral & communication analysis', icon: 'chart' },
      { text: 'Interview transcript', icon: 'doc' },
      { text: 'Performance score breakdown', icon: 'chart' },
      { text: 'Hiring recommendation', icon: 'shield' },
      { text: 'PDF report export', icon: 'doc' },
    ],
  },
  {
    label: 'ELITE',
    subtitle: 'Best for ambitious candidates & placement prep.',
    blurb: 'Get deeper recruiter-style signal and faster AI performance feedback loops.',
    monthlyUsdPrice: 29,
    yearlyUsdPrice: 24,
    cta: 'Go Elite',
    badge: 'Most Popular',
    highlight: true,
    razorpayDescription: 'Node AI Elite subscription',
    fallbackHref: 'mailto:sales@nodeai.app?subject=Go%20Elite%20Plan',
    features: [
      { text: '8 AI-powered mock interviews (25 minutes each)', icon: 'spark' },
      { text: 'Custom AI Coach access (5 sessions of 15 minutes each)', icon: 'coach' },
      { text: 'Advanced behavioral analysis', icon: 'chart' },
      { text: 'Detailed recruiter-style evaluation', icon: 'doc' },
      { text: 'Performance insights dashboard', icon: 'chart' },
      { text: 'Unlimited report access', icon: 'doc' },
      { text: 'Priority AI response speed', icon: 'speed' },
    ],
  },
  {
    label: 'TEAMS',
    subtitle: 'For startups, colleges & hiring teams.',
    blurb: 'Enterprise controls, team intelligence, and priority implementation support.',
    monthlyUsdPrice: 299,
    yearlyUsdPrice: 249,
    cta: 'Contact Sales',
    razorpayDescription: 'Node AI Teams subscription',
    fallbackHref: 'mailto:sales@nodeai.app?subject=Node%20AI%20Teams',
    features: [
      { text: 'Custom interview volume based on organization needs', icon: 'spark' },
      { text: 'Dedicated AI Interview environment', icon: 'shield' },
      { text: 'Team analytics dashboard', icon: 'team' },
      { text: 'Candidate comparison scoring', icon: 'chart' },
      { text: 'Admin panel with role management', icon: 'team' },
      { text: 'Priority support', icon: 'speed' },
      { text: 'Custom onboarding', icon: 'coach' },
    ],
  },
];

const faqs = [
  {
    question: 'Can I switch plans at any time?',
    answer: 'Yes. Upgrade instantly or change to a different tier from billing settings. Your usage and reports stay preserved.',
  },
  {
    question: 'How does the AI Coach work?',
    answer: 'Coach sessions are structured, guided practice windows where Node AI simulates role-specific interview challenges and provides tactical feedback.',
  },
  {
    question: 'Do teams get onboarding support?',
    answer: 'Absolutely. Teams receive implementation guidance, dashboard setup, and role access configuration during onboarding.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'You can preview the platform experience before checkout and choose the plan once you are ready to begin interview prep.',
  },
];

const iconClassName = 'w-4 h-4 text-cyan-300 shrink-0';

const FeatureIcon: React.FC<{ icon: PlanFeature['icon'] }> = ({ icon }) => {
  if (icon === 'coach') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
        <path d="M12 3.75a4.25 4.25 0 1 0 0 8.5 4.25 4.25 0 0 0 0-8.5ZM4.75 19c0-3.45 3.23-5.5 7.25-5.5s7.25 2.05 7.25 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === 'chart') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
        <path d="M4 19.25h16M7.25 15.25v-4.5m4.75 4.5V6.75m4.75 8.5V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === 'doc') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
        <path d="M8 4.75h6l3 3V19a1.25 1.25 0 0 1-1.25 1.25h-7.5A1.25 1.25 0 0 1 7 19V6A1.25 1.25 0 0 1 8.25 4.75Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === 'speed') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
        <path d="m5 13 4-4 3 3 7-7M16 5h3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === 'team') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
        <path d="M8 11.5a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5Zm8 0a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5ZM3.75 18.5c0-2.13 1.95-3.5 4.25-3.5s4.25 1.37 4.25 3.5m3.5 0c0-1.64 1.43-2.75 3.25-2.75s3.25 1.1 3.25 2.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === 'shield') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
        <path d="M12 4.75 5.75 7.5v4.5c0 3.57 2.65 6.85 6.25 7.75 3.6-.9 6.25-4.18 6.25-7.75V7.5L12 4.75Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
      <path d="m12 4 1.9 4.35L18.5 10l-3.35 3.1.95 4.65L12 15.5l-4.1 2.25.95-4.65L5.5 10l4.6-1.65L12 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
};

const PricingPage: React.FC<PricingPageProps> = ({ onBack, onPurchaseSuccess, onRequireSignIn, currentUser }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const defaultRazorpayKeyId = 'rzp_live_SJfxhwyl0mfTHg';
  const razorpayKeyId =
    import.meta.env.VITE_RAZORPAY_KEY_ID ||
    import.meta.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    import.meta.env.RAZORPAY_KEY_ID ||
    defaultRazorpayKeyId;

  const loadRazorpayScript = async () => {
    if (window.Razorpay) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true), { once: true });
        existingScript.addEventListener('error', () => resolve(false), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const getCurrencyFractionDigits = (currency: string) => {
    try {
      const formatted = new Intl.NumberFormat('en', { style: 'currency', currency });
      return formatted.resolvedOptions().maximumFractionDigits;
    } catch {
      return 2;
    }
  };

  const formatDisplayPrice = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  };

  const resolvePricingForPlan = async (plan: Plan): Promise<PricingConfig | null> => {
    const usdPrice = billingCycle === 'monthly' ? plan.monthlyUsdPrice : plan.yearlyUsdPrice;

    let currency = 'USD';
    let exchangeRate = 1;

    try {
      const geoResponse = await fetch('https://ipapi.co/json/');
      if (geoResponse.ok) {
        const geoData = (await geoResponse.json()) as { currency?: string };
        if (geoData.currency) {
          currency = geoData.currency.toUpperCase();
        }
      }
    } catch {
      // Ignore geo failures and keep USD fallback.
    }

    if (currency !== 'USD') {
      try {
        const ratesResponse = await fetch('https://open.er-api.com/v6/latest/USD');
        if (ratesResponse.ok) {
          const ratesData = (await ratesResponse.json()) as { rates?: Record<string, number> };
          const targetRate = ratesData.rates?.[currency];
          if (typeof targetRate === 'number' && targetRate > 0) {
            exchangeRate = targetRate;
          }
        }
      } catch {
        // Ignore exchange-rate failures and keep USD fallback.
      }
    }

    const localizedAmount = usdPrice * exchangeRate;
    const fractionDigits = getCurrencyFractionDigits(currency);
    const amountInMinorUnits = Math.round(localizedAmount * Math.pow(10, fractionDigits));

    return {
      currency,
      amountInMinorUnits,
      displayPrice: formatDisplayPrice(localizedAmount, currency),
    };
  };

  const getTierFromPlanLabel = (label: string): SubscriptionTier => {
    const value = label.toLowerCase();
    if (value.includes('pro')) return 'premium';
    if (value.includes('elite')) return 'elite';
    if (value.includes('team')) return 'team';
    return 'free';
  };

  const openRazorpayCheckout = async (plan: Plan, pricingConfig: PricingConfig) => {
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded || !window.Razorpay || !razorpayKeyId) {
      return false;
    }

    const razorpay = new window.Razorpay({
      key: razorpayKeyId,
      amount: pricingConfig.amountInMinorUnits,
      currency: pricingConfig.currency,
      name: 'Node AI',
      description: `${plan.razorpayDescription ?? plan.label} (${pricingConfig.displayPrice})`,
      method: RAZORPAY_PAYMENT_METHODS,
      notes: {
        availablePaymentOptions: 'Cards, Net Banking, and BHIM/UPI',
        localizedPrice: pricingConfig.displayPrice,
        planTier: getTierFromPlanLabel(plan.label),
        billingCycle,
        userEmail: currentUser?.email || '',
        userId: currentUser?.id || '',
      },
      handler: () => {
        onPurchaseSuccess(getTierFromPlanLabel(plan.label));
        window.alert('Payment successful! Your Node AI subscription is now active.');
      },
      theme: {
        color: '#22d3ee',
      },
    });

    razorpay.open();
    return true;
  };

  const handleBuyClick = async (plan: Plan) => {
    if (!currentUser) {
      window.alert(`Please sign in first to continue with the ${plan.label} plan.`);
      onRequireSignIn?.();
      return;
    }

    if (plan.label === 'TEAMS') {
      window.location.href = plan.fallbackHref ?? 'mailto:sales@nodeai.app?subject=Node%20AI%20Teams';
      return;
    }

    const pricingConfig = await resolvePricingForPlan(plan);
    if (!pricingConfig) {
      return;
    }

    const checkoutOpened = await openRazorpayCheckout(plan, pricingConfig);
    if (!checkoutOpened) {
      const fallbackHref = plan.fallbackHref ?? 'mailto:sales@nodeai.app?subject=Payment%20Support';
      window.alert('Online checkout is temporarily unavailable. You will be redirected so we can help you complete your purchase.');
      window.location.href = fallbackHref;
    }
  };

  const pricingTitle = useMemo(
    () => (billingCycle === 'monthly' ? 'Simple monthly pricing for every stage' : 'Save up to 20% with annual billing'),
    [billingCycle],
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 relative max-w-[1280px] mx-auto py-12 px-4 md:px-8">
      <div className="absolute inset-x-8 top-4 h-64 bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-fuchsia-500/10 blur-3xl pointer-events-none" />

      <div className="relative text-center mb-12">
        <p className="inline-flex items-center px-3 py-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 text-xs tracking-[0.18em] font-semibold uppercase mb-5">
          Node AI Pricing
        </p>
        <h2 className="text-4xl md:text-5xl font-black mb-4 text-slate-100 leading-tight">
          Premium interview prep that <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-violet-300">converts offers</span>
        </h2>
        <p className="text-slate-400 text-lg max-w-3xl mx-auto">{pricingTitle}</p>

        <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-900/80 border border-slate-700/70 p-1 backdrop-blur-xl">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              billingCycle === 'monthly' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300 hover:text-slate-100'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              billingCycle === 'yearly' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300 hover:text-slate-100'
            }`}
          >
            Yearly
          </button>
          <span className="text-[11px] px-2 py-1 rounded-full bg-violet-400/20 border border-violet-300/30 text-violet-200">Save up to 20%</span>
        </div>
      </div>

      <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const price = billingCycle === 'monthly' ? plan.monthlyUsdPrice : plan.yearlyUsdPrice;
          const yearlyTotal = plan.yearlyUsdPrice * 12;

          return (
            <article
              key={plan.label}
              className={`group rounded-3xl p-6 md:p-7 border backdrop-blur-xl bg-gradient-to-b from-white/[0.07] to-white/[0.03] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_65px_rgba(15,23,42,0.45)] ${
                plan.highlight
                  ? 'border-violet-300/60 shadow-[0_0_0_1px_rgba(192,132,252,0.7),0_0_35px_rgba(139,92,246,0.45)]'
                  : 'border-slate-700/80'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-100 tracking-wide">{plan.label}</h3>
                  <p className="text-sm text-cyan-100/90 mt-2">{plan.subtitle}</p>
                </div>
                {plan.badge ? (
                  <span className="text-xs font-bold px-3 py-1 rounded-full border border-violet-300/70 bg-violet-400/20 text-violet-100 animate-pulse">
                    {plan.badge}
                  </span>
                ) : null}
              </div>

              <p className="mt-4 text-slate-400 text-sm leading-relaxed">{plan.blurb}</p>

              <div className="mt-6">
                <p className="text-5xl font-extrabold text-slate-100 tracking-tight">${price}</p>
                <p className="text-sm text-slate-400 mt-1">per seat / month</p>
                {billingCycle === 'yearly' ? (
                  <p className="text-xs text-violet-200 mt-1">${yearlyTotal} total per year (${plan.yearlyUsdPrice} × 12)</p>
                ) : null}
              </div>

              <button
                onClick={() => void handleBuyClick(plan)}
                className={`mt-6 w-full rounded-xl py-3 text-sm font-semibold border transition-all duration-300 ${
                  plan.highlight
                    ? 'bg-cyan-300 text-slate-950 border-cyan-200 hover:bg-cyan-200'
                    : 'bg-slate-900/70 border-slate-600 text-slate-100 hover:bg-slate-800/90 hover:border-slate-400'
                }`}
              >
                {plan.cta}
              </button>

              <ul className="mt-6 space-y-3 border-t border-slate-700/70 pt-6">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-start gap-3 text-sm text-slate-200 leading-relaxed">
                    <FeatureIcon icon={feature.icon} />
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>

      <section className="relative mt-10 rounded-2xl border border-slate-700/80 bg-slate-900/65 backdrop-blur-lg p-6 md:p-8">
        <h3 className="text-slate-100 text-2xl font-semibold">FAQ</h3>
        <div className="mt-5 space-y-4">
          {faqs.map((item) => (
            <div key={item.question} className="rounded-xl border border-slate-700/80 bg-slate-950/60 p-4">
              <h4 className="text-slate-100 font-medium">{item.question}</h4>
              <p className="text-sm text-slate-400 mt-2">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-10 flex justify-center">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors text-slate-100 font-semibold"
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default PricingPage;
