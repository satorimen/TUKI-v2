import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionProfileId } from '@/lib/auth/session';
import { pushNotification } from '@/lib/notifications/store';
import { categoryName } from '@/lib/tasks/categories';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Cap simultaneous pending bids per master (anti-spam, PRD FR-2.5) */
const MAX_PENDING_BIDS = 10;

/**
 * POST /api/bids — master responds to a task.
 * Body: { taskId, price?, timeline?, message }
 */
export async function POST(request: Request) {
  try {
    const profileId = await getSessionProfileId();
    if (!profileId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { taskId, price, timeline, message } = (await request.json()) as {
      taskId?: string;
      price?: number;
      timeline?: string;
      message?: string;
    };
    if (!taskId) return NextResponse.json({ error: 'task_id_required' }, { status: 400 });
    if (price == null && !message) {
      return NextResponse.json({ error: 'price_or_message_required' }, { status: 400 });
    }

    const { db } = getDb();
    const master = await db.getMasterByUserId(profileId);
    if (!master) return NextResponse.json({ error: 'master_profile_required' }, { status: 403 });

    const task = await db.getTask(taskId);
    if (!task) return NextResponse.json({ error: 'task_not_found' }, { status: 404 });
    if (task.status !== 'published') {
      return NextResponse.json({ error: 'task_not_published' }, { status: 409 });
    }

    // anti-spam: limit pending bids
    const myBids = await db.listBidsByMaster(master.id);
    if (myBids.filter((b) => b.status === 'pending').length >= MAX_PENDING_BIDS) {
      return NextResponse.json({ error: 'too_many_pending_bids' }, { status: 429 });
    }

    // duplicate bid guard (one bid per master per task)
    if (myBids.some((b) => b.taskId === taskId)) {
      return NextResponse.json({ error: 'duplicate_bid' }, { status: 409 });
    }

    const bid = await db.createBid({
      taskId,
      masterId: master.id,
      price: typeof price === 'number' && price >= 0 ? Math.round(price) : null,
      timeline: timeline?.slice(0, 200) ?? null,
      message: message?.slice(0, 2000) ?? null,
    });

    // notify the task client (text in the task's language)
    const bidText =
      task.language === 'he'
        ? `הצעה חדשה של ${categoryName(task.categories[0], 'he')} 💬`
        : task.language === 'ru'
          ? `Новый отклик: ${categoryName(task.categories[0], 'ru')} 💬`
          : `New bid: ${categoryName(task.categories[0], 'en')} 💬`;
    pushNotification({
      userId: task.clientId,
      type: 'new_bid',
      taskId,
      text: bidText,
      link: `/task/${taskId}`,
    });

    return NextResponse.json({ bid });
  } catch (error) {
    console.error('[POST /api/bids]', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
