import { initializeApp, getApp, getApps } from 'firebase/app';
import {
  Auth,
  GoogleAuthProvider,
  User as FirebaseSdkUser,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  createUserWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  inMemoryPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { User } from '../types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCjY-ezOaccYVysb6NGaOuPyz_OluIgbvM',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'node-ai-d0015.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'node-ai-d0015',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'node-ai-d0015.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '986509381276',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:986509381276:web:a0f790b186078bf1d82759',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};

const SESSION_STORAGE_KEY = 'tm_firebase_session';

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

const createAuth = (): Auth => {
  if (typeof window === 'undefined') {
    return getAuth(firebaseApp);
  }

  try {
    return initializeAuth(firebaseApp, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence],
      popupRedirectResolver: browserPopupRedirectResolver
    });
  } catch {
    return getAuth(firebaseApp);
  }
};

const auth = createAuth();
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

googleProvider.addScope('email');
googleProvider.addScope('profile');

let authPersistenceInitialization: Promise<void> | null = null;
let redirectResultInitialization: Promise<FirebaseSession | null> | null = null;

export interface FirebaseSession {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  user: FirebaseSdkUser;
}

const buildFallbackAvatar = (firebaseUser: FirebaseSdkUser) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.email || firebaseUser.uid}`;

const toSession = async (firebaseUser: FirebaseSdkUser): Promise<FirebaseSession> => {
  const tokenResult = await firebaseUser.getIdTokenResult();

  return {
    idToken: tokenResult.token,
    refreshToken: firebaseUser.refreshToken,
    expiresIn: tokenResult.expirationTime,
    user: firebaseUser
  };
};

const persistSessionSnapshot = (session: FirebaseSession | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      idToken: session.idToken,
      refreshToken: session.refreshToken,
      expiresIn: session.expiresIn,
      user: {
        uid: session.user.uid,
        email: session.user.email,
        displayName: session.user.displayName,
        photoURL: session.user.photoURL
      }
    })
  );
};

export const mapFirebaseUser = (firebaseUser: FirebaseSdkUser): User => ({
  id: firebaseUser.uid,
  email: firebaseUser.email || '',
  name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
  avatar: firebaseUser.photoURL || buildFallbackAvatar(firebaseUser)
});

export const initializeAuthPersistence = async () => {
  if (!authPersistenceInitialization) {
    authPersistenceInitialization = setPersistence(auth, browserLocalPersistence).catch((error) => {
      authPersistenceInitialization = null;
      throw error;
    });
  }

  await authPersistenceInitialization;
};

export const resolveRedirectAuthResult = async (): Promise<FirebaseSession | null> => {
  if (!redirectResultInitialization) {
    redirectResultInitialization = (async () => {
      await initializeAuthPersistence();
      const redirectCredential = await getRedirectResult(auth);
      if (!redirectCredential?.user) {
        return null;
      }

      const session = await toSession(redirectCredential.user);
      persistSessionSnapshot(session);
      return session;
    })().catch((error) => {
      redirectResultInitialization = null;
      throw new Error(getFriendlyAuthError(error));
    });
  }

  return redirectResultInitialization;
};

export const saveSession = (session: FirebaseSession) => {
  persistSessionSnapshot(session);
};

export const getStoredSession = (): FirebaseSession | null => {
  const firebaseUser = auth.currentUser;
  if (firebaseUser) {
    return {
      idToken: '',
      refreshToken: firebaseUser.refreshToken,
      expiresIn: '',
      user: firebaseUser
    };
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!rawSession) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawSession);
    return parsed as FirebaseSession;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
};

export const clearStoredSession = () => {
  persistSessionSnapshot(null);
};

export const signUpWithEmail = async (email: string, password: string, fullName: string): Promise<FirebaseSession> => {
  try {
    await initializeAuthPersistence();
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: fullName });
    await credential.user.reload();
    const session = await toSession(auth.currentUser ?? credential.user);
    saveSession(session);
    return session;
  } catch (error) {
    throw new Error(getFriendlyAuthError(error));
  }
};

export const signInWithEmail = async (email: string, password: string): Promise<FirebaseSession> => {
  try {
    await initializeAuthPersistence();
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const session = await toSession(credential.user);
    saveSession(session);
    return session;
  } catch (error) {
    throw new Error(getFriendlyAuthError(error));
  }
};

export const signInWithGoogle = async (): Promise<FirebaseSession | null> => {
  try {
    await initializeAuthPersistence();
    const credential = await signInWithPopup(auth, googleProvider);
    const session = await toSession(credential.user);
    saveSession(session);
    return session;
  } catch (error) {
    if (error instanceof FirebaseError && ['auth/popup-blocked', 'auth/cancelled-popup-request', 'auth/popup-closed-by-user'].includes(error.code)) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    throw new Error(getFriendlyAuthError(error));
  }
};

export const sendPasswordReset = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  } catch (error) {
    throw new Error(getFriendlyAuthError(error));
  }
};

export const fetchUserWithIdToken = async (_idToken: string): Promise<FirebaseSdkUser> => {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    throw new Error('Unable to fetch Firebase user profile.');
  }

  await firebaseUser.reload();
  return auth.currentUser ?? firebaseUser;
};

export const getFreshIdToken = async () => {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    throw new Error('You must be signed in to refresh your session.');
  }

  return firebaseUser.getIdToken(true);
};

export const signOutSession = async () => {
  await signOut(auth);
  clearStoredSession();
};

export const subscribeToAuthChanges = (callback: (user: FirebaseSdkUser | null) => void) =>
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      clearStoredSession();
      callback(null);
      return;
    }

    const session = await toSession(user);
    saveSession(session);
    callback(user);
  });

const getFriendlyAuthError = (error: unknown) => {
  if (error instanceof FirebaseError) {
    if (error.code === 'auth/email-already-in-use') return 'This email is already registered. Please sign in.';
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') return 'Invalid email or password.';
    if (error.code === 'auth/invalid-email') return 'Please enter a valid email address.';
    if (error.code === 'auth/weak-password') return 'Password must be at least 6 characters.';
    if (error.code === 'auth/too-many-requests') return 'Too many attempts. Please wait a moment and try again.';
    if (error.code === 'auth/popup-closed-by-user') return 'Google sign-in was cancelled before completion.';
    if (error.code === 'auth/popup-blocked') return 'Google sign-in popup was blocked. Please allow popups and try again.';
    if (error.code === 'auth/network-request-failed') return 'Network error while contacting Firebase. Please check your connection and try again.';
    if (error.code === 'auth/missing-email') return 'Please enter your email address to continue.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Authentication failed. Please try again.';
};

export const hasRealtimeDatabaseConfig = Boolean(firebaseConfig.databaseURL);
