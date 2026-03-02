import { getApp, getApps, initializeApp } from 'firebase/app';
import { doc, getFirestore, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
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
