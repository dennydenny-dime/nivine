import crypto from 'crypto';

type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string | undefined };
  query?: Record<string, unknown>;
  body?: unknown;
};

type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => unknown; end: (body?: unknown) => unknown };
};

type RateLimitEntry = { count: number; resetAt: number };

const rateLimitStore = new Map<string, RateLimitEntry>();
const ALLOWED_ORIGIN_ENV_KEYS = ['ALLOWED_APP_ORIGINS', 'APP_ORIGIN', 'PUBLIC_APP_ORIGIN'];
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const readHeader = (req: ApiRequest, headerName: string): string | undefined => {
  const raw = req.headers?.[headerName] ?? req.headers?.[headerName.toLowerCase()];
  if (Array.isArray(raw)) return raw[0];
  return typeof raw === 'string' ? raw : undefined;
};

const getAllowedOrigins = (): Set<string> => {
  const configured = ALLOWED_ORIGIN_ENV_KEYS
    .flatMap((key) => (process.env[key] || '').split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]);
};

export const applySecurityHeaders = (res: ApiResponse) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), payment=(), usb=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'no-store');
};

export const applyCors = (req: ApiRequest, res: ApiResponse, methods: string[]) => {
  applySecurityHeaders(res);

  const origin = readHeader(req, 'origin');
  const allowedOrigins = getAllowedOrigins();
  const isAllowedOrigin = !origin || allowedOrigins.has(origin);

  if (origin && isAllowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Subscription-Admin-Secret, X-Razorpay-Signature');

  return isAllowedOrigin;
};

export const rejectDisallowedOrigin = (req: ApiRequest, res: ApiResponse, methods: string[]) => {
  const allowed = applyCors(req, res, methods);
  if (!allowed) {
    res.status(403).json({ error: 'Origin not allowed.' });
    return true;
  }
  return false;
};

export const ensureJsonRequest = (req: ApiRequest, res: ApiResponse) => {
  const contentType = readHeader(req, 'content-type');
  if (!contentType || !contentType.toLowerCase().includes('application/json')) {
    res.status(415).json({ error: 'Content-Type must be application/json.' });
    return false;
  }
  return true;
};

export const rejectOversizedJsonBody = (req: ApiRequest, res: ApiResponse, maxChars: number) => {
  const bodyText = JSON.stringify(req.body ?? '');
  if (bodyText.length > maxChars) {
    res.status(413).json({ error: 'Request body too large.' });
    return true;
  }
  return false;
};

export const takeRateLimit = (req: ApiRequest, keyPrefix: string, maxRequests: number, windowMs: number) => {
  const forwardedFor = readHeader(req, 'x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const key = `${keyPrefix}:${ip}`;
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
  }

  current.count += 1;
  rateLimitStore.set(key, current);
  return { allowed: true, remaining: Math.max(0, maxRequests - current.count) };
};

export const safeCompare = (expected: string, actual: string) => {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
};
