const ADMIN_EMAILS = new Set([
  'aryancode192@gmail.com',
  'work.of.god02@gmail.com',
  'admin@gmail.com',
  'shutterbomb135@gmail.com',
  'deepti.baghel912@gmail.com',
]);

const FULL_ACCESS_EMAILS = new Set([
  'shutterbomb135@gmail.com',
  'prathamesh4402@gmail.com',
]);

const ADMIN_UIDS = new Set(
  (import.meta.env.VITE_ADMIN_UIDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);

export type SubscriptionTier = 'free' | 'premium' | 'elite' | 'team';

export type PlanAccess = {
  tier: SubscriptionTier;
  neuralMonthlyCallLimit: number | null;
  neuralMaxMinutesPerCall: number | null;
  coachingMonthlyCallLimit: number | null;
  coachingMaxMinutesPerCall: number | null;
  coachingResetHours: number | null;
  quizzesEnabled: boolean;
  leaderboardEnabled: boolean;
  customCoachEnabled: boolean;
  allNeuralModulesEnabled: boolean;
  unlimitedCustomCoaches: boolean;
};

export type CallCategory = 'neural' | 'coaching';

const PLAN_ACCESS: Record<SubscriptionTier, PlanAccess> = {
  free: {
    tier: 'free',
    neuralMonthlyCallLimit: 6,
    neuralMaxMinutesPerCall: 5,
    coachingMonthlyCallLimit: 1,
    coachingMaxMinutesPerCall: 7,
    coachingResetHours: 24,
    quizzesEnabled: true,
    leaderboardEnabled: true,
    customCoachEnabled: true,
    allNeuralModulesEnabled: false,
    unlimitedCustomCoaches: false,
  },
  premium: {
    tier: 'premium',
    neuralMonthlyCallLimit: 4,
    neuralMaxMinutesPerCall: 25,
    coachingMonthlyCallLimit: 4,
    coachingMaxMinutesPerCall: 25,
    coachingResetHours: null,
    quizzesEnabled: true,
    leaderboardEnabled: true,
    customCoachEnabled: true,
    allNeuralModulesEnabled: true,
    unlimitedCustomCoaches: false,
  },
  elite: {
    tier: 'elite',
    neuralMonthlyCallLimit: 8,
    neuralMaxMinutesPerCall: 25,
    coachingMonthlyCallLimit: 8,
    coachingMaxMinutesPerCall: 25,
    coachingResetHours: null,
    quizzesEnabled: true,
    leaderboardEnabled: true,
    customCoachEnabled: true,
    allNeuralModulesEnabled: true,
    unlimitedCustomCoaches: false,
  },
  team: {
    tier: 'team',
    neuralMonthlyCallLimit: null,
    neuralMaxMinutesPerCall: null,
    coachingMonthlyCallLimit: null,
    coachingMaxMinutesPerCall: 15,
    coachingResetHours: null,
    quizzesEnabled: true,
    leaderboardEnabled: true,
    customCoachEnabled: true,
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

export const isAdminUid = (uid?: string | null): boolean => {
  if (!uid) return false;
  return ADMIN_UIDS.has(uid.trim());
};

export const isAdminUser = (user?: { email?: string | null; id?: string | null } | null): boolean => {
  if (!user) return false;
  return isAdminEmail(user.email) || isAdminUid(user.id);
};

export const hasFullAccessByEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return FULL_ACCESS_EMAILS.has(email.trim().toLowerCase());
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
  coachingLastUsedAt: string | null;
};

const readUsage = (): UsagePayload => {
  const defaultUsage = { month: getUsageMonthKey(), neuralCallsUsed: 0, coachingCallsUsed: 0, coachingLastUsedAt: null };

  try {
    const raw = localStorage.getItem(CALL_USAGE_KEY);
    if (!raw) return defaultUsage;

    const parsed = JSON.parse(raw) as Partial<UsagePayload>;
    if (
      !parsed ||
      typeof parsed.neuralCallsUsed !== 'number' ||
      typeof parsed.coachingCallsUsed !== 'number' ||
      typeof parsed.month !== 'string'
    ) {
      return defaultUsage;
    }

    const coachingLastUsedAt = typeof parsed.coachingLastUsedAt === 'string' ? parsed.coachingLastUsedAt : null;

    if (parsed.month !== getUsageMonthKey()) {
      return {
        ...defaultUsage,
        coachingLastUsedAt,
      };
    }

    return {
      month: parsed.month,
      neuralCallsUsed: parsed.neuralCallsUsed,
      coachingCallsUsed: parsed.coachingCallsUsed,
      coachingLastUsedAt,
    };
  } catch {
    return defaultUsage;
  }
};

const writeUsage = (usage: UsagePayload) => {
  localStorage.setItem(CALL_USAGE_KEY, JSON.stringify(usage));
};

const getHoursUntilCoachingReset = (lastUsedAt: string | null, resetHours: number): number => {
  if (!lastUsedAt) return 0;

  const lastUsedTime = new Date(lastUsedAt).getTime();
  if (Number.isNaN(lastUsedTime)) return 0;

  const resetTime = lastUsedTime + resetHours * 60 * 60 * 1000;
  const remainingMs = resetTime - Date.now();
  return remainingMs > 0 ? remainingMs / (60 * 60 * 1000) : 0;
};

export const getCallsUsedThisMonth = (category: CallCategory = 'neural'): number => {
  const usage = readUsage();
  return category === 'coaching' ? usage.coachingCallsUsed : usage.neuralCallsUsed;
};

export const getRemainingCalls = (tier: SubscriptionTier, category: CallCategory = 'neural'): number | null => {
  const plan = getPlanAccess(tier);
  const limit = category === 'coaching' ? plan.coachingMonthlyCallLimit : plan.neuralMonthlyCallLimit;
  if (limit === null) return null;

  if (category === 'coaching' && plan.coachingResetHours) {
    const usage = readUsage();
    const hoursUntilReset = getHoursUntilCoachingReset(usage.coachingLastUsedAt, plan.coachingResetHours);
    return hoursUntilReset > 0 ? 0 : limit;
  }

  return Math.max(0, limit - getCallsUsedThisMonth(category));
};

export const getCoachingResetHoursRemaining = (tier: SubscriptionTier): number => {
  const plan = getPlanAccess(tier);
  if (!plan.coachingResetHours) return 0;
  const usage = readUsage();
  return getHoursUntilCoachingReset(usage.coachingLastUsedAt, plan.coachingResetHours);
};

export const consumeCall = (category: CallCategory = 'neural') => {
  const usage = readUsage();
  const updated = {
    month: getUsageMonthKey(),
    neuralCallsUsed: usage.neuralCallsUsed + (category === 'neural' ? 1 : 0),
    coachingCallsUsed: usage.coachingCallsUsed + (category === 'coaching' ? 1 : 0),
    coachingLastUsedAt: category === 'coaching' ? new Date().toISOString() : usage.coachingLastUsedAt,
  };
  writeUsage(updated);
};
