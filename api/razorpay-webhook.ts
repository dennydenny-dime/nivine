import crypto from 'crypto';
import { getAdminDb } from './_firebaseAdmin';

type SubscriptionTier = 'free' | 'premium' | 'elite' | 'team';

const normalizeTier = (tier?: string | null): SubscriptionTier => {
  const normalized = (tier || '').trim().toLowerCase();
  if (normalized === 'premium' || normalized === 'elite' || normalized === 'team') return normalized;
  return 'free';
};

const normalizeEmail = (email?: string | null): string | null => {
  const normalized = (email || '').trim().toLowerCase();
  return normalized || null;
};

const verifySignature = (bodyText: string, signature: string | undefined) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = crypto.createHmac('sha256', secret).update(bodyText).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};

const upsertSubscription = async (payload: { email?: string | null; userId?: string | null; tier?: string | null; paymentId?: string | null }) => {
  const db = getAdminDb();
  const tier = normalizeTier(payload.tier);
  const email = normalizeEmail(payload.email);
  const userId = (payload.userId || '').trim();

  const writes: Promise<unknown>[] = [];

  if (email) {
    writes.push(
      db.collection('subscriptions').doc(email).set(
        {
          email,
          tier,
          lastPaymentId: payload.paymentId || null,
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
          lastPaymentId: payload.paymentId || null,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      ),
    );
  }

  if (writes.length > 0) await Promise.all(writes);
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const rawBody = JSON.stringify(req.body || {});
    const signature = req.headers['x-razorpay-signature'] as string | undefined;

    if (!verifySignature(rawBody, signature)) {
      return res.status(401).json({ error: 'Invalid webhook signature.' });
    }

    const event = req.body?.event;
    if (event !== 'payment.captured') {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const payment = req.body?.payload?.payment?.entity || {};
    const notes = payment?.notes || {};

    await upsertSubscription({
      email: typeof notes.userEmail === 'string' ? notes.userEmail : null,
      userId: typeof notes.userId === 'string' ? notes.userId : null,
      tier: typeof notes.planTier === 'string' ? notes.planTier : null,
      paymentId: typeof payment.id === 'string' ? payment.id : null,
    });

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Webhook processing failed.' });
  }
}
