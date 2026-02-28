import { User } from '../types';

const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBM2kuREX9zFgw9TAOT40X1vJFqfWgmrLQ',
  authDomain: 'node-ai-d2b11.firebaseapp.com',
  projectId: 'node-ai-d2b11',
  storageBucket: 'node-ai-d2b11.firebasestorage.app',
  messagingSenderId: '202712240788',
  appId: '1:202712240788:web:c71103b5a5498c47279a81',
  measurementId: 'G-10BPF6SV9C'
};

const SESSION_KEY = 'tm_firebase_session';

interface FirebaseAuthUser {
  localId: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
}

export interface FirebaseSession {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  user: FirebaseAuthUser;
}

const buildFallbackAvatar = (firebaseUser: FirebaseAuthUser) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.email || firebaseUser.localId}`;

export const mapFirebaseUser = (firebaseUser: FirebaseAuthUser): User => ({
  id: firebaseUser.localId,
  email: firebaseUser.email || '',
  name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
  avatar: firebaseUser.photoUrl || buildFallbackAvatar(firebaseUser)
});

const parseAuthError = (payload: { error?: { message?: string } }) => {
  const code = payload.error?.message;
  if (!code) return 'Authentication failed.';

  if (code.includes('EMAIL_EXISTS')) return 'This email is already registered. Please sign in.';
  if (code.includes('INVALID_LOGIN_CREDENTIALS') || code.includes('INVALID_PASSWORD') || code.includes('EMAIL_NOT_FOUND')) return 'Invalid email or password.';
  if (code.includes('WEAK_PASSWORD')) return 'Password must be at least 6 characters.';

  return code.replace(/_/g, ' ').toLowerCase();
};

const authRequest = async <T>(path: string, body: Record<string, unknown>) => {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/${path}?key=${FIREBASE_CONFIG.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(parseAuthError(data));
  }

  return data as T;
};

export const saveSession = (session: FirebaseSession) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const getStoredSession = (): FirebaseSession | null => {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as FirebaseSession;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
};

export const clearStoredSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const signUpWithEmail = async (email: string, password: string, fullName: string) => {
  const created = await authRequest<{
    localId: string;
    email: string;
    idToken: string;
    refreshToken: string;
    expiresIn: string;
  }>('accounts:signUp', {
    email,
    password,
    returnSecureToken: true
  });

  const updated = await authRequest<{
    localId: string;
    email?: string;
    displayName?: string;
    photoUrl?: string;
    idToken: string;
    refreshToken: string;
    expiresIn: string;
  }>('accounts:update', {
    idToken: created.idToken,
    displayName: fullName,
    returnSecureToken: true
  });

  return {
    idToken: updated.idToken,
    refreshToken: updated.refreshToken,
    expiresIn: updated.expiresIn,
    user: {
      localId: updated.localId,
      email: updated.email,
      displayName: updated.displayName,
      photoUrl: updated.photoUrl
    }
  } satisfies FirebaseSession;
};

export const signInWithEmail = async (email: string, password: string) => {
  const data = await authRequest<{
    localId: string;
    email?: string;
    displayName?: string;
    photoUrl?: string;
    idToken: string;
    refreshToken: string;
    expiresIn: string;
  }>('accounts:signInWithPassword', {
    email,
    password,
    returnSecureToken: true
  });

  return {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn,
    user: {
      localId: data.localId,
      email: data.email,
      displayName: data.displayName,
      photoUrl: data.photoUrl
    }
  } satisfies FirebaseSession;
};

export const fetchUserWithIdToken = async (idToken: string) => {
  const data = await authRequest<{ users?: FirebaseAuthUser[] }>('accounts:lookup', { idToken });
  const [user] = data.users || [];

  if (!user) {
    throw new Error('Unable to fetch Firebase user profile.');
  }

  return user;
};

export const signOutSession = async () => {
  // Firebase sign-out for this app is local-session based.
  return Promise.resolve();
};
