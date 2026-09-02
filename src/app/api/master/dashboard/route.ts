import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionProfileId } from '@/lib/auth/session';
import { cityName } from '@/lib/geo/cities';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/master/dashboard — master's personal cabinet data:
 * profile, stats and own bids enriched with task summaries.
 */
export async function GET() {
  try {
    const profileId = await getSessionProfileId();
    if (!profileId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { db } = getDb();
    const master = await db.getMasterByUserId(profileId);
    if (!master) return NextResponse.json({ error: 'master_profile_required' }, { status: 403 });
    const profile = await db.getProfile(profileId);

    const bids = await db.listBidsByMaster(master.id);
    const enriched = await Promise.all(
      bids.map(async (bid) => {
        const task = await db.getTask(bid.taskId);
        return {
          bid,
          task: task
            ? {
                id: task.id,
                status: task.status,
                cityId: task.cityId,
                city: cityName(task.cityId, 'he'),
                title: task.subtasks[0]?.title ?? '',
                budgetMax: task.budgetMax,
              }
            : null,
        };
      })
    );

    return NextResponse.json({ profile, master, bids: enriched });
  } catch (error) {
    console.error('[GET /api/master/dashboard]', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
