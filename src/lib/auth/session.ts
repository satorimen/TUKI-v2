import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

/**
 * Cookie session helpers.
 *
 * MVP auth: email + verification code. The code is generated per request
 * and stored by the caller (memory db or Supabase). On verify we issue a
 * signed httpOnly cookie: `tuki_session=<profileId>.<hmac>`.
 *
 * With Supabase Auth connected later, this layer stays — it maps 1:1 to
 * Supabase sessions (profileId ↔ auth.users.id).
 */

const COOKIE_NAME = 'tuki_session';
const SESSION_TTL_DAYS = 30;

function secret(): string {
  // AUTH_SECRET in production; stable dev fallback so sessions survive restarts
  return process.env.AUTH_SECRET || 'tuki-dev-secret-do-not-use-in-prod';
}

function sign(profileId: string): string {
  return createHmac('sha256', secret()).update(profileId).digest('base64url');
}

export function createSessionToken(profileId: string): string {
  return `${profileId}.${sign(profileId)}`;
}

export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const idx = token.lastIndexOf('.');
  if (idx <= 0) return null;
  const profileId = token.slice(0, idx);
  const signature = token.slice(idx + 1);
  const expected = sign(profileId);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return profileId;
}

export async function getSessionProfileId(): Promise<string | null> {
  const store = await cookies();
  return verifySessionToken(store.get(COOKIE_NAME)?.value);
}

export async function setSessionCookie(profileId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, createSessionToken(profileId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
    path: '/',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Normalize an Israeli phone number to wa.me format (9725XXXXXXXX) */
export function normalizeWhatsapp(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0')) return '972' + digits.slice(1);
  if (digits.length === 9 && digits.startsWith('5')) return '972' + digits; // 5XXXXXXXX
  if (digits.length === 10 && digits.startsWith('05')) return '972' + digits.slice(1);
  return null;
}
