import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionProfileId } from '@/lib/auth/session';
import { feedForMaster } from '@/lib/matching/matcher';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/master/feed — published tasks matching the signed-in master
 * (specializations × work clusters). Tasks the master already bid on
 * are returned with `hasBid: true` and excluded by default (?all=1 to include).
 */
export async function GET(request: Request) {
  try {
    const profileId = await getSessionProfileId();
    if (!profileId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { db } = getDb();
    const master = await db.getMasterByUserId(profileId);
    if (!master) return NextResponse.json({ error: 'master_profile_required' }, { status: 403 });

    const published = await db.listPublishedTasks();
    const feed = feedForMaster(master, published);

    const myBids = await db.listBidsByMaster(master.id);
    const bidTaskIds = new Set(myBids.map((b) => b.taskId));

    const includeBid = new URL(request.url).searchParams.get('all') === '1';
    const tasks = feed
      .filter((t) => includeBid || !bidTaskIds.has(t.id))
      .map((t) => ({ ...t, hasBid: bidTaskIds.has(t.id) }));

    return NextResponse.json({ tasks, master });
  } catch (error) {
    console.error('[GET /api/master/feed]', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
