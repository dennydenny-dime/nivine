export const API_URL = (import.meta.env.VITE_API_URL || 'https://niviine.onrender.com').replace(/\/$/, '');

export const BACKEND_API_URL = (
  import.meta.env.VITE_BACKEND_API_URL ||
  `${API_URL}/api`
).replace(/\/$/, '');
