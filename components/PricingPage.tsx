import React from 'react';
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
}

type Plan = {
  label: string;
  value: string;
  cta: string;
  href?: string;
  fallbackHref?: string;
  usdPrice?: number;
  razorpayDescription?: string;
  blurb?: string;
  badge?: string;
  highlight?: boolean;
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
    blurb: 'A great solution for getting started',
    badge: 'Starter',
    value: '6 calls · 3 mins each · Any neural module',
    cta: 'Start Free',
    href: '/#app',
  },
  {
    label: 'Premium',
    blurb: 'Everything you need to scale your learning',
    badge: 'Popular',
    highlight: true,
    value: '30 calls · 10 mins each · All neural modules, 120 minutes of custom coach calls + quizzes + leaderboards (Learning modules locked)',
    cta: 'Buy Premium',
    usdPrice: 10,
    razorpayDescription: 'Premium monthly subscription',
    fallbackHref: 'mailto:sales@synapseai.app?subject=Buy%20Premium%20Plan',
  },
  {
    label: 'Elite',
    blurb: 'More power and flexibility for experts',
    badge: 'Best Value',
    value: '60 calls · 10 mins each · All neural modules, 540 minutes of custom coach calls + quizzes + leaderboards (Learning modules unlocked)',
    cta: 'Buy Elite',
    usdPrice: 25,
    razorpayDescription: 'Elite monthly subscription',
    fallbackHref: 'mailto:sales@synapseai.app?subject=Buy%20Elite%20Plan',
  },
];

const teamPlans: Plan[] = [
  {
    label: 'Team',
    blurb: 'Full access for your whole organization',
    badge: 'Teams',
    value: '25 members · 150 calls · 15 mins each · All features included',
    cta: 'Buy Team',
    usdPrice: 299,
    razorpayDescription: 'Team monthly subscription',
    fallbackHref: 'mailto:sales@synapseai.app?subject=Buy%20Team%20Plan',
  },
];

const PricingPage: React.FC<PricingPageProps> = ({ onBack, onPurchaseSuccess }) => {
  const allPlans = [...individualPlans, ...teamPlans];

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
        let purchasedTier: SubscriptionTier = 'free';

        if (label.includes('premium')) purchasedTier = 'premium';
        else if (label.includes('elite')) purchasedTier = 'elite';
        else if (label.includes('team')) purchasedTier = 'team';

        onPurchaseSuccess(purchasedTier);
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
      onPurchaseSuccess('free');
    }

    if (href.startsWith('mailto:')) {
      window.location.href = href;
      return;
    }

    window.location.assign(href);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-[1320px] mx-auto py-12 px-4 md:px-6">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-slate-100">
          Pick the plan that fits your <span className="text-violet-400">next level</span>
        </h2>
        <p className="text-slate-400 text-lg max-w-3xl mx-auto">
          Same plans and limits, redesigned in a cleaner dark layout for easier comparison.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {allPlans.map((plan) => {
          const wasPrice = plan.usdPrice ? Math.round(plan.usdPrice * 2.4) : undefined;

          return (
            <article
              key={plan.label}
              className={`rounded-3xl bg-slate-900 border p-6 min-h-[620px] flex flex-col transition-all ${
                plan.highlight
                  ? 'border-violet-400 shadow-[0_0_0_1px_rgba(167,139,250,0.7),0_18px_50px_rgba(124,58,237,0.2)]'
                  : 'border-slate-700/90 shadow-[0_14px_35px_rgba(2,6,23,0.45)]'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-3xl font-bold text-slate-100">{plan.label}</h3>
                  <p className="text-slate-400 text-sm mt-2 leading-relaxed">{plan.blurb}</p>
                </div>
                <span className="bg-lime-300 text-slate-900 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                  {plan.badge}
                </span>
              </div>

              <div className="mb-5">
                {typeof wasPrice === 'number' ? (
                  <p className="text-slate-500 line-through text-lg mb-1">${wasPrice.toFixed(2)}</p>
                ) : (
                  <p className="text-slate-500 text-lg mb-1">No payment required</p>
                )}
                <p className="text-slate-100 text-5xl font-extrabold tracking-tight">
                  {plan.usdPrice ? `$${plan.usdPrice.toFixed(2)}` : '$0.00'}
                  <span className="text-lg font-medium text-slate-400">/mo</span>
                </p>
              </div>

              <p className="text-violet-300 text-sm font-semibold mb-5 rounded-xl bg-violet-500/10 border border-violet-400/20 px-3 py-2 text-center">
                Limited time offer
              </p>

              <button
                onClick={() => void handleBuyClick(plan)}
                className={`w-full rounded-xl border text-base font-semibold py-3 transition-colors ${
                  plan.highlight
                    ? 'bg-slate-100 text-slate-950 border-slate-100 hover:bg-white'
                    : 'bg-transparent text-slate-100 border-slate-500 hover:border-slate-200 hover:text-white'
                }`}
              >
                {plan.cta}
              </button>

              <p className="text-slate-500 text-sm mt-4 leading-relaxed border-b border-slate-700/70 pb-5">
                {plan.value}
              </p>

              <div className="mt-6 space-y-3 text-sm text-slate-300">
                <h4 className="text-slate-100 font-semibold text-base">What you get:</h4>
                <p className="leading-relaxed">• {plan.value}</p>
                {plan.usdPrice ? (
                  <p className="leading-relaxed">• Secure checkout with cards, netbanking, and UPI.</p>
                ) : (
                  <p className="leading-relaxed">• Instant activation so you can start right away.</p>
                )}
                <p className="leading-relaxed">• Keep full access to all features included in {plan.label}.</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-10 flex justify-center">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors text-slate-100 font-semibold"
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default PricingPage;
