import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { checkCode } from '@/lib/auth/codes';
import { setSessionCookie } from '@/lib/auth/session';
import { supabaseAuthClient } from '@/lib/auth/supabase-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/verify  { email, code, locale?, role? }
 *
 * Supabase mode: verify the OTP with Supabase Auth. The auth user (and its
 * profile row, via the handle_new_user trigger) already exist. We then mint
 * the app's own session cookie keyed by profile.id (= auth.users.id).
 *
 * Memory mode: verify the in-memory code and create the profile.
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

    const { db, kind } = getDb();
    const normEmail = email.toLowerCase().trim();

    if (kind === 'supabase') {
      const auth = supabaseAuthClient();
      if (!auth) {
        return NextResponse.json({ error: 'auth_unavailable' }, { status: 500 });
      }

      const { data, error } = await auth.auth.verifyOtp({
        email: normEmail,
        token: code.trim(),
        type: 'email',
      });
      if (error || !data.user) {
        return NextResponse.json({ error: 'invalid_code' }, { status: 401 });
      }

      // profile is created by the handle_new_user trigger (id = auth user id)
      let profile =
        (await db.getProfile(data.user.id)) ?? (await db.getProfileByEmail(normEmail));
      if (!profile) {
        return NextResponse.json({ error: 'profile_not_found' }, { status: 500 });
      }

      // first-login role selection: only upgrade a default client to master
      if (role === 'master' && profile.role === 'client') {
        profile = await db.updateProfile(profile.id, { role: 'master' });
      }

      await setSessionCookie(profile.id);
      return NextResponse.json({ ok: true, profile });
    }

    // memory / dev fallback
    if (!checkCode(email, code)) {
      return NextResponse.json({ error: 'invalid_code' }, { status: 401 });
    }
    const profile = await db.createProfile({
      email: normEmail,
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
