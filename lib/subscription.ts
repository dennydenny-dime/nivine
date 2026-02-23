export type SubscriptionPlan = 'free' | 'premium' | 'elite';

export interface PlanConfig {
  id: SubscriptionPlan;
  label: string;
  priceLabel: string;
  callsLimit: number;
  maxMinutesPerCall: number;
  canUseCustomCoach: boolean;
  canUseQuizzes: boolean;
  canUseMentalTrainingModule: boolean;
}

export interface UsageSnapshot {
  periodKey: string;
  callsUsed: number;
}

export const PLAN_CONFIGS: Record<SubscriptionPlan, PlanConfig> = {
  free: {
    id: 'free',
    label: 'Free',
    priceLabel: '$0',
    callsLimit: 6,
    maxMinutesPerCall: 3,
    canUseCustomCoach: false,
    canUseQuizzes: false,
    canUseMentalTrainingModule: false,
  },
  premium: {
    id: 'premium',
    label: 'Premium',
    priceLabel: '$20',
    callsLimit: 30,
    maxMinutesPerCall: 10,
    canUseCustomCoach: true,
    canUseQuizzes: true,
    canUseMentalTrainingModule: false,
  },
  elite: {
    id: 'elite',
    label: 'Elite',
    priceLabel: '$25',
    callsLimit: 30,
    maxMinutesPerCall: 10,
    canUseCustomCoach: true,
    canUseQuizzes: true,
    canUseMentalTrainingModule: true,
  },
};

const getPeriodKey = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
};

const usageKeyForUser = (userId: string) => `tm_plan_usage_${userId}`;
const planKeyForUser = (userId: string) => `tm_plan_selection_${userId}`;

export const getStoredPlan = (userId: string): SubscriptionPlan => {
  const raw = localStorage.getItem(planKeyForUser(userId));
  if (raw === 'premium' || raw === 'elite' || raw === 'free') return raw;
  return 'free';
};

export const setStoredPlan = (userId: string, plan: SubscriptionPlan) => {
  localStorage.setItem(planKeyForUser(userId), plan);
};

export const getUsageSnapshot = (userId: string): UsageSnapshot => {
  const periodKey = getPeriodKey();
  const raw = localStorage.getItem(usageKeyForUser(userId));
  if (!raw) {
    return { periodKey, callsUsed: 0 };
  }

  try {
    const parsed = JSON.parse(raw) as UsageSnapshot;
    if (parsed.periodKey !== periodKey) {
      return { periodKey, callsUsed: 0 };
    }
    return { periodKey, callsUsed: Math.max(0, parsed.callsUsed || 0) };
  } catch {
    return { periodKey, callsUsed: 0 };
  }
};

export const consumeCall = (userId: string): UsageSnapshot => {
  const current = getUsageSnapshot(userId);
  const next: UsageSnapshot = {
    periodKey: current.periodKey,
    callsUsed: current.callsUsed + 1,
  };
  localStorage.setItem(usageKeyForUser(userId), JSON.stringify(next));
  return next;
};
