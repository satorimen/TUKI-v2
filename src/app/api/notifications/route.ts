import { NextResponse } from 'next/server';
import { getSessionProfileId } from '@/lib/auth/session';
import { listNotifications, markAllRead } from '@/lib/notifications/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/notifications — current user's in-app notifications */
export async function GET() {
  const profileId = await getSessionProfileId();
  if (!profileId) return NextResponse.json({ notifications: [] });
  return NextResponse.json({ notifications: listNotifications(profileId) });
}

/** POST /api/notifications — mark all read */
export async function POST() {
  const profileId = await getSessionProfileId();
  if (profileId) markAllRead(profileId);
  return NextResponse.json({ ok: true });
}
