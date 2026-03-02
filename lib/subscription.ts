const ADMIN_EMAILS = new Set([
  'aryancode192@gmail.com',
  'work.of.god02@gmail.com',
  'admin@gmail.com',
]);

export type SubscriptionTier = 'free' | 'premium' | 'elite' | 'team';

type PlanAccess = {
  tier: SubscriptionTier;
  neuralMonthlyCallLimit: number | null;
  neuralMaxMinutesPerCall: number | null;
  coachingMonthlyCallLimit: number | null;
  coachingMaxMinutesPerCall: number | null;
  quizzesEnabled: boolean;
  leaderboardEnabled: boolean;
  customCoachEnabled: boolean;
  mentalPerformanceEnabled: boolean;
  learningModulesEnabled: boolean;
  allNeuralModulesEnabled: boolean;
  unlimitedCustomCoaches: boolean;
};

export type CallCategory = 'neural' | 'coaching';

const PLAN_ACCESS: Record<SubscriptionTier, PlanAccess> = {
  free: {
    tier: 'free',
    neuralMonthlyCallLimit: 6,
    neuralMaxMinutesPerCall: 5,
    coachingMonthlyCallLimit: 0,
    coachingMaxMinutesPerCall: 0,
    quizzesEnabled: true,
    leaderboardEnabled: false,
    customCoachEnabled: false,
    mentalPerformanceEnabled: false,
    learningModulesEnabled: false,
    allNeuralModulesEnabled: false,
    unlimitedCustomCoaches: false,
  },
  premium: {
    tier: 'premium',
    neuralMonthlyCallLimit: 30,
    neuralMaxMinutesPerCall: 10,
    coachingMonthlyCallLimit: 24,
    coachingMaxMinutesPerCall: 5,
    quizzesEnabled: true,
    leaderboardEnabled: true,
    customCoachEnabled: true,
    mentalPerformanceEnabled: true,
    learningModulesEnabled: false,
    allNeuralModulesEnabled: true,
    unlimitedCustomCoaches: false,
  },
  elite: {
    tier: 'elite',
    neuralMonthlyCallLimit: 60,
    neuralMaxMinutesPerCall: 10,
    coachingMonthlyCallLimit: 54,
    coachingMaxMinutesPerCall: 10,
    quizzesEnabled: true,
    leaderboardEnabled: true,
    customCoachEnabled: true,
    mentalPerformanceEnabled: true,
    learningModulesEnabled: true,
    allNeuralModulesEnabled: true,
    unlimitedCustomCoaches: false,
  },
  team: {
    tier: 'team',
    neuralMonthlyCallLimit: 150,
    neuralMaxMinutesPerCall: 15,
    coachingMonthlyCallLimit: 150,
    coachingMaxMinutesPerCall: 15,
    quizzesEnabled: true,
    leaderboardEnabled: true,
    customCoachEnabled: true,
    mentalPerformanceEnabled: true,
    learningModulesEnabled: true,
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

const getScopedSubscriptionKey = (userKey?: string | null) => {
  const normalizedUserKey = (userKey || '').trim().toLowerCase();
  return normalizedUserKey ? `${SUBSCRIPTION_TIER_KEY}:${normalizedUserKey}` : SUBSCRIPTION_TIER_KEY;
};

export const getSubscriptionTier = (userKey?: string | null): SubscriptionTier => {
  try {
    const scopedTier = localStorage.getItem(getScopedSubscriptionKey(userKey));

    if (scopedTier) {
      return normalizeTier(scopedTier);
    }

    // Ensure first-time users always start on free if no user-scoped tier is found.
    if (userKey) {
      return 'free';
    }

    return normalizeTier(localStorage.getItem(SUBSCRIPTION_TIER_KEY));
  } catch {
    return 'free';
  }
};

export const hasPaidSubscription = (): boolean => {
  const tier = getSubscriptionTier();
  return tier === 'premium' || tier === 'elite' || tier === 'team';
};

export const setSubscriptionTier = (tier: string, userKey?: string | null) => {
  const normalizedTier = normalizeTier(tier);
  localStorage.setItem(getScopedSubscriptionKey(userKey), normalizedTier);

  if (!userKey) {
    localStorage.setItem(SUBSCRIPTION_TIER_KEY, normalizedTier);
  }
};

export const getPlanAccess = (tier: SubscriptionTier): PlanAccess => PLAN_ACCESS[tier];

const getUsageMonthKey = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
};

type UsagePayload = {
  month: string;
  neuralCallsUsed: number;
  coachingCallsUsed: number;
};

const readUsage = (): UsagePayload => {
  const defaultUsage = { month: getUsageMonthKey(), neuralCallsUsed: 0, coachingCallsUsed: 0 };

  try {
    const raw = localStorage.getItem(CALL_USAGE_KEY);
    if (!raw) return defaultUsage;

    const parsed = JSON.parse(raw) as UsagePayload;
    if (
      !parsed ||
      typeof parsed.neuralCallsUsed !== 'number' ||
      typeof parsed.coachingCallsUsed !== 'number' ||
      typeof parsed.month !== 'string'
    ) {
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

export const getCallsUsedThisMonth = (category: CallCategory = 'neural'): number => {
  const usage = readUsage();
  return category === 'coaching' ? usage.coachingCallsUsed : usage.neuralCallsUsed;
};

export const getRemainingCalls = (tier: SubscriptionTier, category: CallCategory = 'neural'): number | null => {
  const plan = getPlanAccess(tier);
  const limit = category === 'coaching' ? plan.coachingMonthlyCallLimit : plan.neuralMonthlyCallLimit;
  if (limit === null) return null;
  return Math.max(0, limit - getCallsUsedThisMonth(category));
};

export const consumeCall = (category: CallCategory = 'neural') => {
  const usage = readUsage();
  const updated = {
    month: getUsageMonthKey(),
    neuralCallsUsed: usage.neuralCallsUsed + (category === 'neural' ? 1 : 0),
    coachingCallsUsed: usage.coachingCallsUsed + (category === 'coaching' ? 1 : 0),
  };
  writeUsage(updated);
};
