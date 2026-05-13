const normalizeUrl = (value: string) => value.trim().replace(/\/$/, '');

export const API_URL = normalizeUrl(import.meta.env.VITE_API_URL || 'https://niviine.onrender.com');

export const SOCKET_URL = normalizeUrl(import.meta.env.VITE_SOCKET_URL || API_URL);

export const BACKEND_API_URL = normalizeUrl(
  import.meta.env.VITE_BACKEND_API_URL ||
  `${API_URL}/api`,
);
