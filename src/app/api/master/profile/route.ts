import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionProfileId, normalizeWhatsapp } from '@/lib/auth/session';
import { CITIES } from '@/lib/geo/cities';
import { CATEGORY_IDS } from '@/lib/tasks/categories';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/master/profile — create or update the master profile of the
 * current user. Body:
 * { specializations: string[], workCities: string[], experienceYears?, bio?,
 *   fullName?, whatsapp? }
 */
export async function POST(request: Request) {
  try {
    const profileId = await getSessionProfileId();
    if (!profileId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      specializations?: string[];
      workCities?: string[];
      experienceYears?: number;
      bio?: string;
      fullName?: string;
      whatsapp?: string;
      /** standalone toggle: just flip active status */
      isActive?: boolean;
    };

    // quick toggle mode — only isActive provided
    if (typeof body.isActive === 'boolean' && !body.specializations) {
      const { db } = getDb();
      const master = await db.getMasterByUserId(profileId);
      if (!master) return NextResponse.json({ error: 'master_profile_required' }, { status: 403 });
      const updated = await db.updateMaster(master.id, { isActive: body.isActive });
      return NextResponse.json({ master: updated });
    }

    // validation
    const specializations = (body.specializations ?? []).filter((s) =>
      (CATEGORY_IDS as readonly string[]).includes(s)
    );
    if (specializations.length === 0) {
      return NextResponse.json({ error: 'specializations_required' }, { status: 400 });
    }

    const cityIds = new Set(CITIES.map((c) => c.id));
    const workCities = (body.workCities ?? []).filter((c) => cityIds.has(c));
    if (workCities.length === 0) {
      return NextResponse.json({ error: 'work_cities_required' }, { status: 400 });
    }

    let whatsappNumber: string | null = null;
    if (body.whatsapp) {
      whatsappNumber = normalizeWhatsapp(body.whatsapp);
      if (!whatsappNumber) {
        return NextResponse.json({ error: 'invalid_whatsapp' }, { status: 400 });
      }
    }

    const { db } = getDb();

    // promote profile role + save contacts
    await db.updateProfile(profileId, {
      role: 'master',
      ...(body.fullName ? { fullName: body.fullName } : {}),
      ...(whatsappNumber ? { whatsappNumber } : {}),
    });

    const master = await db.createMaster(profileId, {
      specializations,
      workCities,
      experienceYears:
        typeof body.experienceYears === 'number' && body.experienceYears >= 0
          ? Math.min(body.experienceYears, 70)
          : undefined,
      bio: body.bio?.slice(0, 1000),
    });

    return NextResponse.json({ master });
  } catch (error) {
    console.error('[POST /api/master/profile]', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

/** GET /api/master/profile — current user's master profile (or null) */
export async function GET() {
  try {
    const profileId = await getSessionProfileId();
    if (!profileId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const { db } = getDb();
    const master = await db.getMasterByUserId(profileId);
    return NextResponse.json({ master });
  } catch (error) {
    console.error('[GET /api/master/profile]', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
