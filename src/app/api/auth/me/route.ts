import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionProfileId } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/me
 * → { profile, master } | { profile: null }
 */
export async function GET() {
  try {
    const profileId = await getSessionProfileId();
    if (!profileId) return NextResponse.json({ profile: null, master: null });

    const { db } = getDb();
    const profile = await db.getProfile(profileId);
    if (!profile) return NextResponse.json({ profile: null, master: null });

    const master = profile.role === 'master' ? await db.getMasterByUserId(profile.id) : null;
    return NextResponse.json({ profile, master });
  } catch (error) {
    console.error('[GET /api/auth/me]', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
