import { SubscriptionPlan, PLAN_CONFIGS } from './subscription';

interface RazorpayCheckoutPayload {
  plan: SubscriptionPlan;
  userName?: string;
  userEmail?: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  handler: (response: { razorpay_payment_id?: string }) => void;
  modal?: {
    ondismiss?: () => void;
  };
  prefill?: {
    name?: string;
    email?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

const PLAN_PRICES: Record<SubscriptionPlan, { amount: number; currency: string }> = {
  free: { amount: 0, currency: 'USD' },
  premium: { amount: 2000, currency: 'USD' },
  elite: { amount: 2500, currency: 'USD' },
};

const getRazorpayKey = () => {
  const key = import.meta.env.VITE_RAZORPAY_KEY_ID || import.meta.env.RAZORPAY_KEY_ID;
  if (!key) {
    throw new Error('Razorpay is not configured. Set VITE_RAZORPAY_KEY_ID in your environment.');
  }

  return key;
};

const loadRazorpayScript = async () => {
  if (window.Razorpay) return;

  const existingScript = document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`);
  if (existingScript) {
    await new Promise<void>((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Razorpay checkout script.')), { once: true });
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout script.'));
    document.body.appendChild(script);
  });
};

export const startRazorpayCheckout = async ({ plan, userName, userEmail }: RazorpayCheckoutPayload): Promise<boolean> => {
  if (plan === 'free') return true;

  const planDetails = PLAN_CONFIGS[plan];
  const pricing = PLAN_PRICES[plan];

  await loadRazorpayScript();

  if (!window.Razorpay) {
    throw new Error('Razorpay SDK is unavailable.');
  }

  const key = getRazorpayKey();

  return new Promise<boolean>((resolve) => {
    const razorpay = new window.Razorpay({
      key,
      amount: pricing.amount,
      currency: pricing.currency,
      name: 'Synapse AI',
      description: `${planDetails.label} Subscription`,
      handler: (response) => {
        resolve(Boolean(response.razorpay_payment_id));
      },
      modal: {
        ondismiss: () => resolve(false),
      },
      prefill: {
        name: userName,
        email: userEmail,
      },
      notes: {
        plan,
      },
      theme: {
        color: '#4f46e5',
      },
    });

    razorpay.open();
  });
};
