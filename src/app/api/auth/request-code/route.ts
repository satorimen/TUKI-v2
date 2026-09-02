import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { issueCode, deliverCode } from '@/lib/auth/codes';
import { supabaseAuthClient } from '@/lib/auth/supabase-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[\w.+-]+@[\w-]+\.[\w.]+$/;

/**
 * POST /api/auth/request-code  { email, locale? }
 *
 * Supabase mode: Supabase Auth emails a 6-digit OTP (signInWithOtp).
 * Memory mode (no Supabase env): 6-digit code returned in the response so the
 * demo flow works without an email provider.
 */
export async function POST(request: Request) {
  try {
    const { email, locale } = (await request.json()) as {
      email?: string;
      locale?: string;
    };
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }

    const { kind } = getDb();

    if (kind === 'supabase') {
      const auth = supabaseAuthClient();
      if (!auth) {
        return NextResponse.json({ error: 'auth_unavailable' }, { status: 500 });
      }
      const { error } = await auth.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          shouldCreateUser: true,
          data: { locale: locale ?? 'he' },
        },
      });
      if (error) {
        // Log the full error so email delivery failures are diagnosable.
        // Common cause: custom SMTP (e.g. Resend) with an unverified sender
        // domain -> upstream 500 "domain is not verified".
        console.error('[request-code] supabase signInWithOtp failed:', {
          message: error.message,
          status: error.status,
          name: error.name,
          code: (error as { code?: string }).code,
        });
        // 429 = Supabase email rate limit (built-in SMTP is heavily throttled)
        const status = error.status === 429 ? 429 : 502;
        return NextResponse.json(
          { error: status === 429 ? 'rate_limited' : 'send_failed' },
          { status }
        );
      }
      return NextResponse.json({ ok: true });
    }

    // memory / dev fallback
    const code = issueCode(email);
    deliverCode(email, code, kind);
    return NextResponse.json({ ok: true, devCode: code });
  } catch (error) {
    console.error('[POST /api/auth/request-code]', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
