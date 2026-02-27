import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();

const envFiles = ['.env.local', '.env'];

const envFromFile = {};
for (const file of envFiles) {
  const filePath = path.join(cwd, file);
  if (!fs.existsSync(filePath)) continue;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!(key in envFromFile)) {
      envFromFile[key] = value;
    }
  }
}

const getEnv = (...keys) => {
  for (const key of keys) {
    const value = process.env[key] ?? envFromFile[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
};

const normalizeSupabaseUrl = (value) => {
  if (!value) return undefined;
  const trimmed = value.trim();

  if (/^[a-z0-9-]+\.supabase\.co$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  const dashboardMatch = trimmed.match(/supabase\.com\/dashboard\/project\/([a-z0-9-]+)/i);
  if (dashboardMatch?.[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  if (/^[a-z0-9-]+$/i.test(trimmed)) {
    return `https://${trimmed}.supabase.co`;
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/$/, '');
  }
};

const url = normalizeSupabaseUrl(getEnv('VITE_SUPABASE_URL', 'SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'REACT_APP_SUPABASE_URL'));
const anonKey = getEnv('VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'REACT_APP_SUPABASE_ANON_KEY');

if (!url || !anonKey) {
  console.error('❌ Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local or environment.');
  process.exit(1);
}

const headers = {
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
  'Content-Type': 'application/json'
};

const printResult = (label, ok, detail) => {
  const icon = ok ? '✅' : '❌';
  console.log(`${icon} ${label}: ${detail}`);
};

const testSettings = async () => {
  const response = await fetch(`${url}/auth/v1/settings`, { headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`settings endpoint failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  const providers = Object.entries(data?.external || {})
    .filter(([, isEnabled]) => !!isEnabled)
    .map(([name]) => name);

  return {
    disableSignup: Boolean(data?.disable_signup),
    providers
  };
};

const testPasswordGrant = async () => {
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: `integration-check-${Date.now()}@example.com`,
      password: `WrongPassword!${Date.now()}`
    })
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }

  if (response.status === 400 || response.status === 401) {
    return parsed?.msg || parsed?.error_description || parsed?.error || 'Invalid credentials rejected (expected)';
  }

  throw new Error(`password grant check failed (${response.status}): ${text.slice(0, 200)}`);
};

try {
  const settings = await testSettings();
  printResult('Supabase reachable', true, `${url}/auth/v1/settings`);
  printResult('Email sign-up policy', true, settings.disableSignup ? 'Email sign-up disabled' : 'Email sign-up enabled');
  printResult('Enabled OAuth providers', true, settings.providers.length ? settings.providers.join(', ') : 'none');

  const passwordCheck = await testPasswordGrant();
  printResult('Custom email/password login endpoint', true, passwordCheck);

  console.log('✅ Supabase auth integration looks healthy from this environment.');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  printResult('Supabase auth integration', false, message);
  process.exit(1);
}
