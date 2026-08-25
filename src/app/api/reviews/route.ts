import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionProfileId } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CRITERIA = [
  'scoreQuality',
  'scoreBudget',
  'scorePunctuality',
  'scoreCleanliness',
  'scoreCommunication',
] as const;

/**
 * POST /api/reviews — the task client reviews the selected master.
 * Body: { taskId, scoreQuality..scoreCommunication (1-5), text? }
 */
export async function POST(request: Request) {
  try {
    const profileId = await getSessionProfileId();
    if (!profileId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const body = await request.json();

    // validate scores
    const scores: Record<string, number> = {};
    for (const key of CRITERIA) {
      const v = body[key];
      if (typeof v !== 'number' || v < 1 || v > 5 || !Number.isInteger(v)) {
        return NextResponse.json({ error: `invalid_${key}` }, { status: 400 });
      }
      scores[key] = v;
    }

    const { db } = getDb();
    const task = await db.getTask(body.taskId);
    if (!task) return NextResponse.json({ error: 'task_not_found' }, { status: 404 });
    if (task.clientId !== profileId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    if (task.status !== 'assigned' && task.status !== 'completed') {
      return NextResponse.json({ error: 'task_not_assigned' }, { status: 409 });
    }
    if (!task.selectedBidId) {
      return NextResponse.json({ error: 'no_selected_bid' }, { status: 409 });
    }

    // one review per task (unique constraint in SQL; explicit check for memory)
    const bids = await db.listBidsByTask(task.id);
    const selectedBid = bids.find((b) => b.id === task.selectedBidId);
    if (!selectedBid) return NextResponse.json({ error: 'no_selected_bid' }, { status: 409 });

    const existingReviews = await db.listReviewsByMaster(selectedBid.masterId);
    if (existingReviews.some((r) => r.taskId === task.id)) {
      return NextResponse.json({ error: 'duplicate_review' }, { status: 409 });
    }

    let review;
    try {
      review = await db.createReview({
        taskId: task.id,
        masterId: selectedBid.masterId,
        clientId: task.clientId,
        scoreQuality: scores.scoreQuality,
        scoreBudget: scores.scoreBudget,
        scorePunctuality: scores.scorePunctuality,
        scoreCleanliness: scores.scoreCleanliness,
        scoreCommunication: scores.scoreCommunication,
        text: typeof body.text === 'string' ? body.text.slice(0, 2000) : null,
      });
    } catch (e) {
      return NextResponse.json({ error: 'duplicate_review' }, { status: 409 });
    }

    // auto-complete the task if still assigned (review implies the work is done)
    if (task.status === 'assigned') {
      await db.updateTaskStatus(task.id, 'completed');
    }

    // updated master rating for the response
    const master = await db.getMaster(selectedBid.masterId);
    return NextResponse.json({ review, masterRating: master?.rating ?? null });
  } catch (error) {
    console.error('[POST /api/reviews]', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
