import { normalizeTier, SubscriptionTier } from './subscription';

type UserIdentity = { email?: string | null; id?: string | null };

const API_BASE = (import.meta.env.VITE_BACKEND_API_URL || '/api').replace(/\/$/, '');

const postSubscriptionAction = async (payload: Record<string, unknown>) => {
  const response = await fetch(`${API_BASE}/subscription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Subscription API failed (${response.status}).`);
  }

  return response.json();
};

export const fetchSubscriptionTierForUser = async (user: UserIdentity) => {
  const data = (await postSubscriptionAction({
    action: 'get',
    email: user.email,
    id: user.id,
  })) as { tier?: string };

  return normalizeTier(data.tier);
};

export const subscribeToSubscriptionTierForEmail = (email: string, onTierChange: (tier: SubscriptionTier) => void) => {
  if (!email) {
    return () => {};
  }

  let isUnmounted = false;
  let lastTier: SubscriptionTier | null = null;

  const sync = () => {
    fetchSubscriptionTierForUser({ email })
      .then((tier) => {
        if (isUnmounted) return;
        if (tier !== lastTier) {
          lastTier = tier;
          onTierChange(tier);
        }
      })
      .catch(() => {
        // Keep current UI state when polling fails.
      });
  };

  sync();
  const intervalId = window.setInterval(sync, 30_000);

  return () => {
    isUnmounted = true;
    window.clearInterval(intervalId);
  };
};
