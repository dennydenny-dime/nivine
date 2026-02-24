const ADMIN_EMAILS = new Set([
  'aryancode192@gmail.com',
  'work.of.god02@gmail.com',
  'admin@gmail.com',
]);

const PAID_TIERS = new Set(['premium', 'elite', 'team']);

export const isAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.trim().toLowerCase());
};

export const hasPaidSubscription = (): boolean => {
  try {
    const tier = (localStorage.getItem('tm_subscription_tier') || '').trim().toLowerCase();
    return PAID_TIERS.has(tier);
  } catch {
    return false;
  }
};

export const setSubscriptionTier = (tier: string) => {
  localStorage.setItem('tm_subscription_tier', tier.trim().toLowerCase());
};
