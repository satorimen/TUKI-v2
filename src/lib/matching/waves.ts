import type { DbRepository } from '@/lib/db/repository';
import type { Task } from '@/lib/db/types';
import { matchMastersForTask } from './matcher';
import { cityName } from '@/lib/geo/cities';
import { categoryName } from '@/lib/tasks/categories';
import { pushNotification } from '@/lib/notifications/store';

/**
 * Wave dispatch (PRD §10.3 — "распределение волнами").
 *
 * A published task is NOT broadcast to everyone at once. Instead we take a
 * priority-ordered snapshot of matched masters at publish time and invite them
 * in waves of WAVE_SIZE. Each subsequent wave opens lazily after
 * WAVE_INTERVAL_MS has passed without the task being assigned — advanced on
 * demand whenever any master loads their feed (no cron required, works on any
 * hosting tier).
 *
 * A master only sees a task once their wave is open (see matcher.feedForMaster).
 */

export const WAVE_SIZE = 5;
export const WAVE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes between waves

function newTaskText(task: Task): string {
  const city = cityName(task.cityId, task.language);
  const work = task.categories[0] ? categoryName(task.categories[0], task.language) : '';
  const sep = work && city ? ' · ' : '';
  return task.language === 'he'
    ? `בקשה חדשה: ${work}${sep}${city}`
    : task.language === 'ru'
      ? `Новая заявка: ${work}${sep}${city}`
      : `New request: ${work}${sep}${city}`;
}

/** Notify a set of masters (given by master id) about a task. */
async function notifyMasters(db: DbRepository, task: Task, masterIds: string[]): Promise<void> {
  if (masterIds.length === 0) return;
  const text = newTaskText(task);
  for (const masterId of masterIds) {
    const master = await db.getMaster(masterId);
    if (!master) continue;
    pushNotification({
      userId: master.userId,
      type: 'new_task',
      taskId: task.id,
      text,
      link: `/master/feed?task=${task.id}`,
    });
  }
}

/**
 * Publish-time: snapshot matched masters in priority order and open the first wave.
 * Returns the updated task (with wave state) so the caller can respond with it.
 */
export async function initTaskWaves(db: DbRepository, task: Task): Promise<Task> {
  const allMasters = await db.findMasters({});
  const matchedMasterIds = matchMastersForTask(task, allMasters).masters.map((m) => m.id);
  const invitedCount = Math.min(WAVE_SIZE, matchedMasterIds.length);

  const updated =
    (await db.updateTaskWave(task.id, {
      matchedMasterIds,
      waveSize: WAVE_SIZE,
      invitedCount,
      waveLastAdvancedAt: new Date().toISOString(),
    })) ?? { ...task, matchedMasterIds, waveSize: WAVE_SIZE, invitedCount };

  await notifyMasters(db, updated, matchedMasterIds.slice(0, invitedCount));
  return updated;
}

/**
 * Lazy advancement: open the next wave for every still-open published task
 * whose current wave has aged past WAVE_INTERVAL_MS. Safe to call frequently
 * (e.g. on every master feed load) — it only mutates tasks that are due.
 */
export async function advanceDueWaves(db: DbRepository): Promise<void> {
  const tasks = await db.listPublishedTasks();
  const now = Date.now();

  for (const task of tasks) {
    const total = task.matchedMasterIds?.length ?? 0;
    if (total === 0) continue; // legacy / unmatched task — handled by feed fallback
    if (task.invitedCount >= total) continue; // everyone already invited

    const last = task.waveLastAdvancedAt ? Date.parse(task.waveLastAdvancedAt) : 0;
    if (now - last < WAVE_INTERVAL_MS) continue; // current wave still fresh

    const size = task.waveSize || WAVE_SIZE;
    const nextCount = Math.min(task.invitedCount + size, total);
    const newlyInvited = task.matchedMasterIds.slice(task.invitedCount, nextCount);

    const updated = await db.updateTaskWave(task.id, {
      invitedCount: nextCount,
      waveLastAdvancedAt: new Date().toISOString(),
    });
    if (updated) await notifyMasters(db, updated, newlyInvited);
  }
}
