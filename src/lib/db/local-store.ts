import type { TaskDraft } from '@/lib/ai/types';

/**
 * Client-side mock persistence for published tasks (localStorage).
 *
 * Temporary bridge until M3 (Supabase). The API is intentionally shaped like
 * a repository so swapping the implementation later is trivial:
 *   publishTask(draft) → returns id
 *   getMyTasks() → TaskRecord[]
 */

export interface TaskRecord {
  id: string;
  publishedAt: string;
  draft: TaskDraft;
}

const STORAGE_KEY = 'tuki.publishedTasks';

export function publishTask(draft: TaskDraft): string {
  if (typeof window === 'undefined') throw new Error('publishTask is client-only');
  const id = `t_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const record: TaskRecord = { id, publishedAt: new Date().toISOString(), draft };
  const tasks = getMyTasks();
  tasks.unshift(record);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  return id;
}

export function getMyTasks(): TaskRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TaskRecord[]) : [];
  } catch {
    return [];
  }
}
