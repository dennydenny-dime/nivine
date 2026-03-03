import { getApp, getApps, initializeApp } from 'firebase/app';
import { doc, getDoc, getFirestore, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { normalizeTier, SubscriptionTier } from './subscription';

const firebaseConfig = {
  apiKey: 'AIzaSyCjY-ezOaccYVysb6NGaOuPyz_OluIgbvM',
  authDomain: 'node-ai-d0015.firebaseapp.com',
  projectId: 'node-ai-d0015',
  storageBucket: 'node-ai-d0015.firebasestorage.app',
  messagingSenderId: '986509381276',
  appId: '1:986509381276:web:a0f790b186078bf1d82759'
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const SUBSCRIPTIONS_COLLECTION = 'subscriptions';
const SUBSCRIPTIONS_BY_UID_COLLECTION = 'subscriptionsByUid';

const normalizeEmail = (email?: string | null): string | null => {
  const normalized = (email || '').trim().toLowerCase();
  return normalized || null;
};

export const persistSubscriptionTierForEmail = async (email: string, tier: SubscriptionTier) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;

  await setDoc(
    doc(db, SUBSCRIPTIONS_COLLECTION, normalizedEmail),
    {
      email: normalizedEmail,
      tier: normalizeTier(tier),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export const persistSubscriptionTierForUser = async (
  user: { email?: string | null; id?: string | null },
  tier: SubscriptionTier,
) => {
  const normalizedTier = normalizeTier(tier);
  const writes: Promise<unknown>[] = [];

  const normalizedEmail = normalizeEmail(user.email);
  if (normalizedEmail) {
    writes.push(
      setDoc(
        doc(db, SUBSCRIPTIONS_COLLECTION, normalizedEmail),
        {
          email: normalizedEmail,
          tier: normalizedTier,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
    );
  }

  const normalizedUserId = (user.id || '').trim();
  if (normalizedUserId) {
    writes.push(
      setDoc(
        doc(db, SUBSCRIPTIONS_BY_UID_COLLECTION, normalizedUserId),
        {
          userId: normalizedUserId,
          tier: normalizedTier,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
    );
  }

  if (writes.length === 0) return;
  await Promise.all(writes);
};

export const fetchSubscriptionTierForUser = async (user: { email?: string | null; id?: string | null }) => {
  const normalizedEmail = normalizeEmail(user.email);
  const normalizedUserId = (user.id || '').trim();
  const reads: Promise<SubscriptionTier | null>[] = [];

  if (normalizedEmail) {
    reads.push(
      getDoc(doc(db, SUBSCRIPTIONS_COLLECTION, normalizedEmail))
        .then((snapshot) => {
          const data = snapshot.data();
          if (!data || typeof data.tier !== 'string') return null;
          return normalizeTier(data.tier);
        })
        .catch(() => null),
    );
  }

  if (normalizedUserId) {
    reads.push(
      getDoc(doc(db, SUBSCRIPTIONS_BY_UID_COLLECTION, normalizedUserId))
        .then((snapshot) => {
          const data = snapshot.data();
          if (!data || typeof data.tier !== 'string') return null;
          return normalizeTier(data.tier);
        })
        .catch(() => null),
    );
  }

  if (reads.length === 0) return null;

  const resolvedTiers = await Promise.all(reads);
  if (resolvedTiers.includes('team')) return 'team';
  if (resolvedTiers.includes('elite')) return 'elite';
  if (resolvedTiers.includes('premium')) return 'premium';

  return null;
};

export const subscribeToSubscriptionTierForEmail = (
  email: string,
  onTierChange: (tier: SubscriptionTier) => void,
) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return () => {};
  }

  return onSnapshot(
    doc(db, SUBSCRIPTIONS_COLLECTION, normalizedEmail),
    (snapshot) => {
      const data = snapshot.data();
      if (!data || typeof data.tier !== 'string') {
        return;
      }

      onTierChange(normalizeTier(data.tier));
    },
    () => {
      // Ignore sync errors and keep local fallback behavior.
    },
  );
};
