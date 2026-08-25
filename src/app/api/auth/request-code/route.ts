import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { issueCode, deliverCode } from '@/lib/auth/codes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[\w.+-]+@[\w-]+\.[\w.]+$/;

/**
 * POST /api/auth/request-code  { email }
 * Issues a 6-digit verification code. In memory (dev) mode the code is
 * returned in the response so the demo flow works without an email provider.
 */
export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string };
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }

    const { kind } = getDb();
    const code = issueCode(email);
    deliverCode(email, code, kind);

    return NextResponse.json({
      ok: true,
      // dev convenience only — never exposed in production email mode
      ...(kind === 'memory' ? { devCode: code } : {}),
    });
  } catch (error) {
    console.error('[POST /api/auth/request-code]', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
