import React from 'react';
import { setSubscriptionTier } from '../lib/subscription';

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
}

type Plan = {
  label: string;
  value: string;
  cta: string;
  href?: string;
  fallbackHref?: string;
  usdPrice?: number;
  razorpayDescription?: string;
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

const individualPlans: Plan[] = [
  {
    label: 'Free',
    value: '6 calls · 3 mins each · Any neural module',
    cta: 'Start Free',
    href: '/#app',
  },
  {
    label: 'Premium',
    value: '30 calls · 10 mins each · All neural modules + quizzes + unlimited custom coaches',
    cta: 'Buy Premium',
    usdPrice: 20,
    razorpayDescription: 'Premium monthly subscription',
    fallbackHref: 'mailto:sales@synapseai.app?subject=Buy%20Premium%20Plan',
  },
  {
    label: 'Elite',
    value: 'All features included',
    cta: 'Buy Elite',
    usdPrice: 25,
    razorpayDescription: 'Elite monthly subscription',
    fallbackHref: 'mailto:sales@synapseai.app?subject=Buy%20Elite%20Plan',
  },
];

const teamPlans: Plan[] = [
  {
    label: 'Team',
    value: '25 members · 150 calls · 15 mins each · All features included',
    cta: 'Buy Team',
    usdPrice: 299,
    razorpayDescription: 'Team monthly subscription',
    fallbackHref: 'mailto:sales@synapseai.app?subject=Buy%20Team%20Plan',
  },
];

const PricingPage: React.FC<PricingPageProps> = ({ onBack }) => {
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
    if (!plan.usdPrice) return null;

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

    const localizedAmount = plan.usdPrice * exchangeRate;
    const fractionDigits = getCurrencyFractionDigits(currency);
    const amountInMinorUnits = Math.round(localizedAmount * Math.pow(10, fractionDigits));

    return {
      currency,
      amountInMinorUnits,
      displayPrice: formatDisplayPrice(localizedAmount, currency),
    };
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
      name: 'Synapse AI',
      description: `${plan.razorpayDescription ?? plan.label} (${pricingConfig.displayPrice})`,
      method: RAZORPAY_PAYMENT_METHODS,
      notes: {
        availablePaymentOptions: 'Cards, Net Banking, and BHIM/UPI',
        localizedPrice: pricingConfig.displayPrice,
      },
      handler: () => {
        const label = plan.label.toLowerCase();
        if (label.includes('premium')) setSubscriptionTier('premium');
        else if (label.includes('elite')) setSubscriptionTier('elite');
        else if (label.includes('team')) setSubscriptionTier('team');
        window.alert('Payment successful! Your subscription has been activated.');
      },
      theme: {
        color: '#06b6d4',
      },
    });

    razorpay.open();
    return true;
  };

  const handleBuyClick = async (plan: Plan) => {
    if (plan.usdPrice) {
      const pricingConfig = await resolvePricingForPlan(plan);
      if (!pricingConfig) {
        return;
      }

      const checkoutOpened = await openRazorpayCheckout(plan, pricingConfig);
      if (!checkoutOpened) {
        const fallbackHref = plan.fallbackHref ?? 'mailto:sales@synapseai.app?subject=Payment%20Support';
        window.alert('Online checkout is temporarily unavailable. You will be redirected so we can help you complete your purchase.');
        window.location.href = fallbackHref;
      }
      return;
    }

    const href = plan.href;
    if (!href) {
      return;
    }

    if (plan.label.toLowerCase() === 'free') {
      setSubscriptionTier('free');
    }

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
                <span className="text-slate-200 font-semibold text-2xl leading-tight">
                  {plan.label}
                  {plan.usdPrice ? ` — $${plan.usdPrice}/mo` : ''}
                </span>
                <span className="text-slate-300 text-xl leading-tight md:text-right">{plan.value}</span>
                <button
                  onClick={() => void handleBuyClick(plan)}
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
                <span className="text-slate-200 font-semibold text-2xl leading-tight">
                  {plan.label}
                  {plan.usdPrice ? ` — $${plan.usdPrice}/mo` : ''}
                </span>
                <span className="text-slate-300 text-xl leading-tight md:text-right">{plan.value}</span>
                <button
                  onClick={() => void handleBuyClick(plan)}
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
