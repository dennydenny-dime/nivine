import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const getPrivateKey = () => {
  const raw = process.env.FIREBASE_PRIVATE_KEY;
  if (!raw) return undefined;
  return raw.replace(/\\n/g, '\n');
};

export const hasFirebaseAdminConfig = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  return Boolean(projectId && clientEmail && privateKey);
};

const initializeAdmin = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.');
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
};

export const getAdminDb = () => {
  const app = initializeAdmin();
  return getFirestore(app);
};

export const getAdminDbOrNull = () => {
  if (!hasFirebaseAdminConfig()) {
    return null;
  }

  return getAdminDb();
};
