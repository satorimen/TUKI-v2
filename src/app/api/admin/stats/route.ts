import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionProfileId } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Emails allowed to see the admin dashboard. Comma-separated in env. */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || 'admin@tuki.local')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** GET /api/admin/stats — funnel + platform metrics for the admin dashboard */
export async function GET() {
  try {
    const profileId = await getSessionProfileId();
    if (!profileId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { db } = getDb();
    const profile = await db.getProfile(profileId);
    if (!profile?.email || !adminEmails().includes(profile.email.toLowerCase())) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const stats = await db.getStats();
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('[GET /api/admin/stats]', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
