import { User } from '../types';

const readEnvValue = (keys: string[]) => {
  for (const key of keys) {
    const value = import.meta.env[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
};

const RAW_SUPABASE_URL = readEnvValue([
  'VITE_SUPABASE_URL',
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'REACT_APP_SUPABASE_URL'
]);

const SUPABASE_ANON_KEY = readEnvValue([
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'REACT_APP_SUPABASE_ANON_KEY'
]);

const normalizeSupabaseUrl = (value?: string) => {
  if (!value) return value;

  // Accept project dashboard URLs and normalize to API URL format.
  const dashboardMatch = value.match(/supabase\.com\/dashboard\/project\/([a-z0-9-]+)/i);
  if (dashboardMatch?.[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // Accept plain project refs too.
  if (/^[a-z0-9-]+$/i.test(value)) {
    return `https://${value}.supabase.co`;
  }

  return value.replace(/\/$/, '');
};

const SUPABASE_URL = normalizeSupabaseUrl(RAW_SUPABASE_URL);
const SESSION_KEY = 'tm_supabase_session';

interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
  };
}

interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: SupabaseUser;
}

const buildHeaders = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL and SUPABASE_ANON_KEY) in your environment.');
  }

  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  };
};

const getAvatarForUser = (supabaseUser: SupabaseUser) => {
  return supabaseUser.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${supabaseUser.email || supabaseUser.id}`;
};

export const mapSupabaseUser = (supabaseUser: SupabaseUser): User => ({
  id: supabaseUser.id,
  email: supabaseUser.email || '',
  name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
  avatar: getAvatarForUser(supabaseUser)
});

export const saveSession = (session: SupabaseSession) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const getStoredSession = (): SupabaseSession | null => {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SupabaseSession;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
};

export const clearStoredSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

const throwIfErrorResponse = async (response: Response) => {
  if (response.ok) return;

  const data = await response.json().catch(() => null);
  throw new Error(data?.msg || data?.error_description || data?.error || 'Authentication request failed');
};

export const signInWithEmail = async (email: string, password: string) => {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ email, password })
  });

  await throwIfErrorResponse(response);
  return response.json() as Promise<SupabaseSession>;
};

export const signUpWithEmail = async (email: string, password: string, fullName: string) => {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      email,
      password,
      data: {
        full_name: fullName
      }
    })
  });

  await throwIfErrorResponse(response);
  return response.json() as Promise<SupabaseSession>;
};

export const fetchUserWithAccessToken = async (accessToken: string) => {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`
    }
  });

  await throwIfErrorResponse(response);
  return response.json() as Promise<SupabaseUser>;
};

export const signOutSession = async (accessToken: string) => {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`
    }
  });

  await throwIfErrorResponse(response);
};

export const getGoogleOAuthUrl = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL and SUPABASE_ANON_KEY) in your environment.');
  }

  const url = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
  url.searchParams.set('provider', 'google');
  url.searchParams.set('redirect_to', window.location.origin);
  url.searchParams.set('apikey', SUPABASE_ANON_KEY);
  return url.toString();
};

export const readSessionFromUrlHash = (): SupabaseSession | null => {
  if (!window.location.hash) return null;

  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const params = new URLSearchParams(hash);

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const expiresIn = params.get('expires_in');

  if (!accessToken || !refreshToken || !expiresIn) {
    return null;
  }

  const session: SupabaseSession = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: Number(expiresIn),
    token_type: params.get('token_type') || 'bearer',
    user: {
      id: params.get('provider_token') || `oauth-${Date.now()}`,
      email: params.get('email') || ''
    }
  };

  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
  return session;
};
