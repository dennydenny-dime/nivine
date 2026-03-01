import { initializeApp } from 'firebase/app';
import {
  User as FirebaseSdkUser,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { User } from '../types';

const firebaseConfig = {
  apiKey: 'AIzaSyCjY-ezOaccYVysb6NGaOuPyz_OluIgbvM',
  authDomain: 'node-ai-d0015.firebaseapp.com',
  projectId: 'node-ai-d0015',
  storageBucket: 'node-ai-d0015.firebasestorage.app',
  messagingSenderId: '986509381276',
  appId: '1:986509381276:web:a0f790b186078bf1d82759'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const buildFallbackAvatar = (firebaseUser: FirebaseSdkUser) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.email || firebaseUser.uid}`;

export const mapFirebaseUser = (firebaseUser: FirebaseSdkUser): User => ({
  id: firebaseUser.uid,
  email: firebaseUser.email || '',
  name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
  avatar: firebaseUser.photoURL || buildFallbackAvatar(firebaseUser)
});

export interface FirebaseSession {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  user: FirebaseSdkUser;
}

export const saveSession = (_session: FirebaseSession) => {
  // Firebase JS SDK persists auth state automatically in local storage.
};

export const getStoredSession = (): FirebaseSession | null => {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;

  return {
    idToken: '',
    refreshToken: firebaseUser.refreshToken,
    expiresIn: '',
    user: firebaseUser
  };
};

export const clearStoredSession = () => {
  // Keeping this function for compatibility with existing app logout flow.
};

export const signUpWithEmail = async (email: string, password: string, fullName: string): Promise<FirebaseSession> => {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: fullName });
    const idToken = await credential.user.getIdToken();

    return {
      idToken,
      refreshToken: credential.user.refreshToken,
      expiresIn: '',
      user: credential.user
    };
  } catch (error) {
    throw new Error(getFriendlyAuthError(error));
  }
};

export const signInWithEmail = async (email: string, password: string): Promise<FirebaseSession> => {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await credential.user.getIdToken();

    return {
      idToken,
      refreshToken: credential.user.refreshToken,
      expiresIn: '',
      user: credential.user
    };
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

export const signOutSession = async () => {
  await signOut(auth);
};

export const subscribeToAuthChanges = (callback: (user: FirebaseSdkUser | null) => void) =>
  onAuthStateChanged(auth, callback);

const getFriendlyAuthError = (error: unknown) => {
  if (!(error instanceof Error)) return 'Authentication failed.';

  if (error.message.includes('auth/email-already-in-use')) return 'This email is already registered. Please sign in.';
  if (error.message.includes('auth/invalid-credential')) return 'Invalid email or password.';
  if (error.message.includes('auth/invalid-email')) return 'Please enter a valid email address.';
  if (error.message.includes('auth/weak-password')) return 'Password must be at least 6 characters.';
  if (error.message.includes('auth/too-many-requests')) return 'Too many attempts. Please wait a moment and try again.';

  return 'Authentication failed. Please try again.';
};
