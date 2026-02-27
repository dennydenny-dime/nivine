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

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  const padded = padding ? normalized + '='.repeat(4 - padding) : normalized;
  return atob(padded);
};

const extractSupabaseUrlFromAnonKey = (anonKey?: string) => {
  if (!anonKey) return undefined;

  const tokenParts = anonKey.split('.');
  if (tokenParts.length < 2) return undefined;

  try {
    const payload = JSON.parse(decodeBase64Url(tokenParts[1]));
    if (typeof payload?.iss !== 'string') return undefined;

    const issuerUrl = new URL(payload.iss);
    return issuerUrl.origin;
  } catch {
    return undefined;
  }
};

const normalizeSupabaseUrl = (value?: string) => {
  if (!value) return value;

  const trimmedValue = value.trim();

  if (/^[a-z0-9-]+\.supabase\.co$/i.test(trimmedValue)) {
    return `https://${trimmedValue}`;
  }

  // Accept project dashboard URLs and normalize to API URL format.
  const dashboardMatch = trimmedValue.match(/supabase\.com\/dashboard\/project\/([a-z0-9-]+)/i);
  if (dashboardMatch?.[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // Accept plain project refs too.
  if (/^[a-z0-9-]+$/i.test(trimmedValue)) {
    return `https://${trimmedValue}.supabase.co`;
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    return parsedUrl.origin;
  } catch {
    return trimmedValue.replace(/\/$/, '');
  }
};

const extractProjectRef = (value?: string) => {
  if (!value) return undefined;

  try {
    const host = new URL(value).hostname;
    const match = host.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    return match?.[1]?.toLowerCase();
  } catch {
    return undefined;
  }
};

const getSupabaseUrl = () => {
  const normalizedEnvUrl = normalizeSupabaseUrl(RAW_SUPABASE_URL);
  const normalizedAnonKeyUrl = normalizeSupabaseUrl(extractSupabaseUrlFromAnonKey(SUPABASE_ANON_KEY));

  if (!normalizedEnvUrl) {
    return normalizedAnonKeyUrl;
  }

  if (!normalizedAnonKeyUrl) {
    return normalizedEnvUrl;
  }

  const envRef = extractProjectRef(normalizedEnvUrl);
  const anonKeyRef = extractProjectRef(normalizedAnonKeyUrl);

  // Prefer the URL encoded in the anon key if the two references disagree.
  // A mismatched project URL causes OAuth redirects to fail with Cloudflare/Supabase error pages.
  if (envRef && anonKeyRef && envRef !== anonKeyRef) {
    return normalizedAnonKeyUrl;
  }

  return normalizedEnvUrl;
};

const SUPABASE_URL = getSupabaseUrl();
const SESSION_KEY = 'tm_supabase_session';
const AUTH_RETRY_DELAYS_MS = [400, 1200];

const RETRYABLE_HTTP_STATUS = new Set([
  408,
  425,
  429,
  500,
  502,
  503,
  504,
  520,
  521,
  522,
  523,
  524,
  525,
  526,
  527
]);

interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
  };
}

export interface SupabaseSession {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
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

const buildFallbackAvatar = (supabaseUser: SupabaseUser) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${supabaseUser.email || supabaseUser.id}`;

const getAvatarForUser = (supabaseUser: SupabaseUser) => {
  const avatarUrl = supabaseUser.user_metadata?.avatar_url;

  if (!avatarUrl) {
    return buildFallbackAvatar(supabaseUser);
  }

  try {
    const parsedUrl = new URL(avatarUrl);
    const isGoogleHostedAvatar = parsedUrl.hostname.endsWith('googleusercontent.com');

    if (isGoogleHostedAvatar) {
      return buildFallbackAvatar(supabaseUser);
    }
  } catch {
    return buildFallbackAvatar(supabaseUser);
  }

  return avatarUrl;
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

  const bodyText = await response.text().catch(() => '');

  let parsedBody: { msg?: string; error_description?: string; error?: string } | null = null;
  if (bodyText) {
    try {
      parsedBody = JSON.parse(bodyText);
    } catch {
      parsedBody = null;
    }
  }

  const isSslHandshakeFailure = response.status === 525
    || /SSL handshake failed/i.test(bodyText)
    || /Error code\s*525/i.test(bodyText);

  if (isSslHandshakeFailure) {
    throw new Error('Login service is temporarily unavailable (SSL handshake failed). Please retry in a moment.');
  }

  throw new Error(parsedBody?.msg || parsedBody?.error_description || parsedBody?.error || 'Authentication request failed');
};

const wait = (ms: number) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const fetchAuthWithRetry = async (input: string, init: RequestInit) => {
  let response: Response | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= AUTH_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      response = await fetch(input, init);

      if (!RETRYABLE_HTTP_STATUS.has(response.status) || attempt === AUTH_RETRY_DELAYS_MS.length) {
        return response;
      }
    } catch (error) {
      lastError = error;
      if (attempt === AUTH_RETRY_DELAYS_MS.length) {
        throw error;
      }
    }

    await wait(AUTH_RETRY_DELAYS_MS[attempt]);
  }

  if (response) return response;
  throw lastError instanceof Error ? lastError : new Error('Authentication request failed');
};

export const signInWithEmail = async (email: string, password: string) => {
  const response = await fetchAuthWithRetry(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ email, password })
  });

  await throwIfErrorResponse(response);
  return response.json() as Promise<SupabaseSession>;
};

export const signUpWithEmail = async (email: string, password: string, fullName: string) => {
  const response = await fetchAuthWithRetry(`${SUPABASE_URL}/auth/v1/signup`, {
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
  const response = await fetchAuthWithRetry(`${SUPABASE_URL}/auth/v1/user`, {
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
  const response = await fetchAuthWithRetry(`${SUPABASE_URL}/auth/v1/logout`, {
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
  url.searchParams.set('redirect_to', `${window.location.origin}${window.location.pathname}`);
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
