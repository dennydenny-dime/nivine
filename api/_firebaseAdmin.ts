import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const getFirebaseAdminConfig = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  return { projectId, clientEmail, privateKey };
};

export const hasFirebaseAdminConfig = () => {
  const { projectId, clientEmail, privateKey } = getFirebaseAdminConfig();
  return Boolean(projectId && clientEmail && privateKey);
};

export const getAdminApp = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const { projectId, clientEmail, privateKey } = getFirebaseAdminConfig();

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

export const getAdminDb = () => getFirestore(getAdminApp());

export const getAdminDbOrNull = () => {
  if (!hasFirebaseAdminConfig()) {
    return null;
  }

  return getAdminDb();
};

export const adminApp = getAdminApp();
export const firestore = getAdminDb();
