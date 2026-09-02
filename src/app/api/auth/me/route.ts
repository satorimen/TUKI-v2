import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionProfileId, normalizeWhatsapp } from '@/lib/auth/session';

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

/**
 * PUT /api/auth/me — update own profile { fullName?, whatsapp? }
 */
export async function PUT(request: Request) {
  try {
    const profileId = await getSessionProfileId();
    if (!profileId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const body = (await request.json()) as { fullName?: string; whatsapp?: string };

    const patch: Record<string, string | null> = {};
    if (typeof body.fullName === 'string') patch.fullName = body.fullName.slice(0, 100);
    if (typeof body.whatsapp === 'string' && body.whatsapp) {
      const normalized = normalizeWhatsapp(body.whatsapp);
      if (!normalized) return NextResponse.json({ error: 'invalid_whatsapp' }, { status: 400 });
      patch.whatsappNumber = normalized;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 });
    }

    const { db } = getDb();
    const profile = await db.updateProfile(profileId, patch);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('[PUT /api/auth/me]', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
