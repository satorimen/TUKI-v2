import { NextResponse } from 'next/server';
import { getDb, taskFromDraft } from '@/lib/db';
import { getSessionProfileId } from '@/lib/auth/session';
import { getCity } from '@/lib/geo/cities';
import type { TaskDraft } from '@/lib/ai/types';
import type { Language } from '@/lib/db/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/tasks — publish a task from an AI draft.
 * Body: { draft: TaskDraft, cityId?: string, rawInput?: string }
 * Requires session; auto-creates profile context (client role).
 */
export async function POST(request: Request) {
  try {
    const profileId = await getSessionProfileId();
    if (!profileId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      draft?: TaskDraft;
      cityId?: string;
      rawInput?: string;
    };
    const draft = body.draft;
    if (!draft || !Array.isArray(draft.subtasks) || draft.subtasks.length === 0) {
      return NextResponse.json({ error: 'draft_with_subtasks_required' }, { status: 400 });
    }

    const cityId = body.cityId || draft.cityId;
    if (!cityId || !getCity(cityId)) {
      return NextResponse.json({ error: 'valid_city_required' }, { status: 400 });
    }

    const { db } = getDb();
    const task = await db.createTask(
      taskFromDraft(profileId, draft, cityId, body.rawInput ?? draft.work_details ?? '')
    );

    return NextResponse.json({ task });
  } catch (error) {
    console.error('[POST /api/tasks]', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

/**
 * GET /api/tasks — list current user's tasks.
 */
export async function GET() {
  try {
    const profileId = await getSessionProfileId();
    if (!profileId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const { db } = getDb();
    const tasks = await db.listTasksByClient(profileId);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('[GET /api/tasks]', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
