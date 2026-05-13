const normalizeUrl = (value: string) => value.trim().replace(/\/$/, '');

const stripSocketPath = (value: string) => value.replace(/\/(ws|socket\.io)\/?$/i, '');

export const API_URL = normalizeUrl(import.meta.env.VITE_API_URL || 'https://niviine.onrender.com');

export const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH || '/socket.io';

export const SOCKET_URL = normalizeUrl(stripSocketPath(import.meta.env.VITE_SOCKET_URL || API_URL));

export const BACKEND_API_URL = normalizeUrl(
  import.meta.env.VITE_BACKEND_API_URL ||
  `${API_URL}/api`,
);
