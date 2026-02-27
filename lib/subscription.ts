const ADMIN_EMAILS = new Set([
  'aryancode192@gmail.com',
  'work.of.god02@gmail.com',
  'admin@gmail.com',
]);

export type SubscriptionTier = 'free' | 'premium' | 'elite' | 'team';

type PlanAccess = {
  tier: SubscriptionTier;
  monthlyCallLimit: number | null;
  maxMinutesPerCall: number | null;
  quizzesEnabled: boolean;
  customCoachEnabled: boolean;
  mentalPerformanceEnabled: boolean;
  allNeuralModulesEnabled: boolean;
  unlimitedCustomCoaches: boolean;
};

const PLAN_ACCESS: Record<SubscriptionTier, PlanAccess> = {
  free: {
    tier: 'free',
    monthlyCallLimit: 6,
    maxMinutesPerCall: 3,
    quizzesEnabled: false,
    customCoachEnabled: false,
    mentalPerformanceEnabled: false,
    allNeuralModulesEnabled: false,
    unlimitedCustomCoaches: false,
  },
  premium: {
    tier: 'premium',
    monthlyCallLimit: 30,
    maxMinutesPerCall: 10,
    quizzesEnabled: true,
    customCoachEnabled: true,
    mentalPerformanceEnabled: true,
    allNeuralModulesEnabled: true,
    unlimitedCustomCoaches: true,
  },
  elite: {
    tier: 'elite',
    monthlyCallLimit: null,
    maxMinutesPerCall: null,
    quizzesEnabled: true,
    customCoachEnabled: true,
    mentalPerformanceEnabled: true,
    allNeuralModulesEnabled: true,
    unlimitedCustomCoaches: true,
  },
  team: {
    tier: 'team',
    monthlyCallLimit: 150,
    maxMinutesPerCall: 15,
    quizzesEnabled: true,
    customCoachEnabled: true,
    mentalPerformanceEnabled: true,
    allNeuralModulesEnabled: true,
    unlimitedCustomCoaches: true,
  },
};

const SUBSCRIPTION_TIER_KEY = 'tm_subscription_tier';
const CALL_USAGE_KEY = 'tm_plan_usage_calls';

export const isAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.trim().toLowerCase());
};

export const normalizeTier = (tier?: string | null): SubscriptionTier => {
  const normalized = (tier || '').trim().toLowerCase();
  if (normalized === 'premium' || normalized === 'elite' || normalized === 'team') {
    return normalized;
  }
  return 'free';
};

export const getSubscriptionTier = (): SubscriptionTier => {
  try {
    return normalizeTier(localStorage.getItem(SUBSCRIPTION_TIER_KEY));
  } catch {
    return 'free';
  }
};

export const hasPaidSubscription = (): boolean => {
  const tier = getSubscriptionTier();
  return tier === 'premium' || tier === 'elite' || tier === 'team';
};

export const setSubscriptionTier = (tier: string) => {
  const normalizedTier = normalizeTier(tier);
  localStorage.setItem(SUBSCRIPTION_TIER_KEY, normalizedTier);
};

export const getPlanAccess = (tier: SubscriptionTier): PlanAccess => PLAN_ACCESS[tier];

const getUsageMonthKey = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
};

type UsagePayload = {
  month: string;
  callsUsed: number;
};

const readUsage = (): UsagePayload => {
  const defaultUsage = { month: getUsageMonthKey(), callsUsed: 0 };

  try {
    const raw = localStorage.getItem(CALL_USAGE_KEY);
    if (!raw) return defaultUsage;

    const parsed = JSON.parse(raw) as UsagePayload;
    if (!parsed || typeof parsed.callsUsed !== 'number' || typeof parsed.month !== 'string') {
      return defaultUsage;
    }

    if (parsed.month !== getUsageMonthKey()) {
      return defaultUsage;
    }

    return parsed;
  } catch {
    return defaultUsage;
  }
};

const writeUsage = (usage: UsagePayload) => {
  localStorage.setItem(CALL_USAGE_KEY, JSON.stringify(usage));
};

export const getCallsUsedThisMonth = (): number => readUsage().callsUsed;

export const getRemainingCalls = (tier: SubscriptionTier): number | null => {
  const plan = getPlanAccess(tier);
  if (plan.monthlyCallLimit === null) return null;
  return Math.max(0, plan.monthlyCallLimit - getCallsUsedThisMonth());
};

export const consumeCall = () => {
  const usage = readUsage();
  const updated = {
    month: getUsageMonthKey(),
    callsUsed: usage.callsUsed + 1,
  };
  writeUsage(updated);
};
