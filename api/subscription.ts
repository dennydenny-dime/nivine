import { getAdminDb } from './_firebaseAdmin';

type SubscriptionTier = 'free' | 'premium' | 'elite' | 'team';

const PRIVILEGED_TEAM_EMAILS = new Set(['shutterbomb135@gmail.com']);
const PRIVILEGED_PREMIUM_EMAILS = new Set([
  'rupagudur2301@gmail.com',
  'prathamesh4402@gmail.com',
]);

const normalizeTier = (tier?: string | null): SubscriptionTier => {
  const normalized = (tier || '').trim().toLowerCase();
  if (normalized === 'premium' || normalized === 'elite' || normalized === 'team') return normalized;
  return 'free';
};

const normalizeEmail = (email?: string | null): string | null => {
  const normalized = (email || '').trim().toLowerCase();
  return normalized || null;
};

const getTierForUser = async (payload: { email?: string | null; id?: string | null }): Promise<SubscriptionTier> => {
  const db = getAdminDb();
  const email = normalizeEmail(payload.email);
  const userId = (payload.id || '').trim();

  if (email && PRIVILEGED_TEAM_EMAILS.has(email)) {
    return 'team';
  }

  if (email && PRIVILEGED_PREMIUM_EMAILS.has(email)) {
    return 'premium';
  }

  const checks: Promise<SubscriptionTier>[] = [];

  if (email) {
    checks.push(
      db.collection('subscriptions').doc(email).get().then((snap) => normalizeTier((snap.data() as { tier?: string } | undefined)?.tier)),
    );
  }

  if (userId) {
    checks.push(
      db.collection('subscriptionsByUid').doc(userId).get().then((snap) => normalizeTier((snap.data() as { tier?: string } | undefined)?.tier)),
    );
  }

  if (checks.length === 0) return 'free';

  const tiers = await Promise.all(checks);
  if (tiers.includes('team')) return 'team';
  if (tiers.includes('elite')) return 'elite';
  if (tiers.includes('premium')) return 'premium';
  return 'free';
};

const setTierForUser = async (payload: { email?: string | null; id?: string | null; tier?: string | null }) => {
  const db = getAdminDb();
  const tier = normalizeTier(payload.tier);
  const email = normalizeEmail(payload.email);
  const userId = (payload.id || '').trim();

  const writes: Promise<unknown>[] = [];

  if (email) {
    writes.push(
      db.collection('subscriptions').doc(email).set(
        {
          email,
          tier,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      ),
    );
  }

  if (userId) {
    writes.push(
      db.collection('subscriptionsByUid').doc(userId).set(
        {
          userId,
          tier,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      ),
    );
  }

  await Promise.all(writes);
  return { tier };
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  try {
    const action = req.body?.action || 'get';

    if (action === 'set') {
      const adminSecret = process.env.SUBSCRIPTION_ADMIN_SECRET;
      if (!adminSecret || req.headers['x-subscription-admin-secret'] !== adminSecret) {
        return res.status(401).json({ error: 'Unauthorized set attempt.' });
      }

      const result = await setTierForUser(req.body || {});
      return res.status(200).json(result);
    }

    const tier = await getTierForUser(req.body || {});
    return res.status(200).json({ tier });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unable to resolve subscription tier.' });
  }
}
