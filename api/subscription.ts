import { ensureJsonRequest, rejectDisallowedOrigin, rejectOversizedJsonBody, safeCompare, takeRateLimit } from '../lib/server/security.js';

type SubscriptionTier = 'free' | 'premium' | 'elite' | 'team';

type FirestoreType = typeof import('./_firebaseAdmin.ts').firestore;

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

const hasFirebaseEnv = () => {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID
      && process.env.FIREBASE_CLIENT_EMAIL
      && process.env.FIREBASE_PRIVATE_KEY,
  );
};

const getFirestore = async (): Promise<FirestoreType> => {
  const { firestore } = await import('./_firebaseAdmin.ts');
  return firestore;
};

const getTierForUser = async (payload: { email?: string | null; id?: string | null }): Promise<SubscriptionTier> => {
  const db = await getFirestore();
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
  const db = await getFirestore();
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
  try {
    if (rejectDisallowedOrigin(req, res, ['POST', 'OPTIONS'])) return;
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
    if (!ensureJsonRequest(req, res) || rejectOversizedJsonBody(req, res, 5_000)) return;

    const rateLimit = takeRateLimit(req, 'subscription', 60, 60_000);
    if (!rateLimit.allowed) {
      res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds || 60));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    const action = req.body?.action || 'get';
    if (action !== 'get' && action !== 'set') {
      return res.status(400).json({ error: 'Invalid action.' });
    }

    if (!hasFirebaseEnv()) {
      return res.status(200).json({ tier: 'free' });
    }

    if (action === 'set') {
      const adminSecret = process.env.SUBSCRIPTION_ADMIN_SECRET;
      const presentedSecret = typeof req.headers['x-subscription-admin-secret'] === 'string' ? req.headers['x-subscription-admin-secret'] : '';
      if (!adminSecret || !presentedSecret || !safeCompare(adminSecret, presentedSecret)) {
        return res.status(401).json({ error: 'Unauthorized set attempt.' });
      }

      const result = await setTierForUser(req.body || {});
      return res.status(200).json(result);
    }

    const tier = await getTierForUser(req.body || {});
    return res.status(200).json({ tier });
  } catch (error: any) {
    console.error('Subscription API error:', error?.message || error);
    return res.status(500).json({ error: error?.message || 'Unable to resolve subscription tier.' });
  }
}
