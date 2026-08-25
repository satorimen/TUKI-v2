/**
 * Verification codes for email login (MVP).
 * In-memory store with 10-minute TTL; enough for login-by-email MVP.
 * With Supabase Auth connected, this is replaced by Supabase OTP.
 */

const TTL_MS = 10 * 60 * 1000;

const g = globalThis as unknown as { __tukiAuthCodes?: Map<string, { code: string; expires: number }> };

function store(): Map<string, { code: string; expires: number }> {
  if (!g.__tukiAuthCodes) g.__tukiAuthCodes = new Map();
  return g.__tukiAuthCodes;
}

const normEmail = (email: string) => email.toLowerCase().trim();

export function issueCode(email: string): string {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  store().set(normEmail(email), { code, expires: Date.now() + TTL_MS });
  return code;
}

export function checkCode(email: string, code: string): boolean {
  const entry = store().get(normEmail(email));
  if (!entry) return false;
  if (Date.now() > entry.expires) {
    store().delete(normEmail(email));
    return false;
  }
  const ok = entry.code === code.trim();
  if (ok) store().delete(normEmail(email));
  return ok;
}

/** Where to "send" the code. MVP: console log (memory mode) / Supabase email later. */
export function deliverCode(email: string, code: string, kind: 'memory' | 'supabase'): void {
  if (kind === 'memory') {
    // dev/demo: log to server console; UI also shows the code in dev mode
    console.log(`[auth] verification code for ${email}: ${code}`);
  } else {
    // TODO (M5): send via Resend email
    console.log(`[auth] verification code for ${email}: ${code}`);
  }
}
