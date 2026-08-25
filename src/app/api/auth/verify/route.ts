import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { checkCode } from '@/lib/auth/codes';
import { setSessionCookie } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/verify  { email, code, locale?, role? }
 * Verifies the code, creates the profile on first login, sets session cookie.
 */
export async function POST(request: Request) {
  try {
    const { email, code, locale, role } = (await request.json()) as {
      email?: string;
      code?: string;
      locale?: string;
      role?: 'client' | 'master';
    };

    if (!email || !code) {
      return NextResponse.json({ error: 'email_and_code_required' }, { status: 400 });
    }
    if (!checkCode(email, code)) {
      return NextResponse.json({ error: 'invalid_code' }, { status: 401 });
    }

    const { db } = getDb();
    const profile = await db.createProfile({
      email,
      locale: locale ?? 'he',
      role: role === 'master' ? 'master' : 'client',
    });

    await setSessionCookie(profile.id);
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    console.error('[POST /api/auth/verify]', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
