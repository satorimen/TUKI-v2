'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Header from '@/components/Header';
import AuthForm from '@/components/auth/AuthForm';
import { cityName } from '@/lib/geo/cities';
import type { Task } from '@/lib/db/types';

type Filter = 'all' | 'published' | 'assigned' | 'completed';

/** /my-tasks — client's requests with status filter tabs and counters */
export default function MyTasksPage() {
  const locale = useLocale() as 'he' | 'ru' | 'en';
  const t = useTranslations('taskPage');
  const tf = useTranslations('myTasksFilters');
  const ta = useTranslations('taskActions');

  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'auth' }
    | { status: 'ok'; tasks: Task[] }
  >({ status: 'loading' });
  const [filter, setFilter] = useState<Filter>('all');

  async function load() {
    const res = await fetch('/api/tasks');
    if (res.status === 401) return setState({ status: 'auth' });
    const data = await res.json();
    setState({ status: 'ok', tasks: data.tasks });
  }

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, published: 0, assigned: 0, completed: 0 };
    if (state.status !== 'ok') return c;
    for (const task of state.tasks) {
      c.all++;
      if (task.status === 'published') c.published++;
      if (task.status === 'assigned') c.assigned++;
      if (task.status === 'completed') c.completed++;
    }
    return c;
  }, [state]);

  const tasks = useMemo(() => {
    if (state.status !== 'ok') return [];
    if (filter === 'all') return state.tasks;
    return state.tasks.filter((t) => t.status === filter);
  }, [state, filter]);

  if (state.status === 'auth') {
    return (
      <>
        <Header />
        <main className="px-5 py-10">
          <AuthForm onAuthed={load} />
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="px-5 pb-8 pt-6">
        <h1 className="text-xl font-bold">{t('myTasksTitle')}</h1>

        {/* Filter tabs with counters (tracking widgets) */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {(['all', 'published', 'assigned', 'completed'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition active:scale-95 ${
                filter === f
                  ? 'bg-tuki-500 text-white'
                  : 'bg-[#1c1c1c] text-neutral-400'
              }`}
            >
              {tf(f)}
              {counts[f] > 0 && (
                <span
                  className={`rounded-full px-1.5 text-[11px] ${
                    filter === f ? 'bg-white/20' : 'bg-neutral-700 text-neutral-300'
                  }`}
                >
                  {counts[f]}
                </span>
              )}
            </button>
          ))}
        </div>

        {state.status === 'loading' && <p className="mt-8 text-neutral-500">…</p>}

        {state.status === 'ok' && tasks.length === 0 && (
          <div className="mt-8 rounded-2xl bg-[#1c1c1c] p-8 text-center">
            <p className="text-sm text-neutral-500">{t('myTasksEmpty')}</p>
            <Link
              href="/new-task"
              className="mt-4 inline-block rounded-xl bg-tuki-500 px-6 py-2.5 text-sm font-semibold text-white"
            >
              + {t('newTask')}
            </Link>
          </div>
        )}

        <div className="mt-4 space-y-2.5">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/task/${task.id}` as any}
              className="block rounded-2xl bg-[#1c1c1c] p-4 transition active:scale-[0.98]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {task.subtasks[0]?.title ?? '—'}
                    {task.subtasks.length > 1 && (
                      <span className="text-neutral-500"> +{task.subtasks.length - 1}</span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    📍 {cityName(task.cityId, locale)}
                    {task.budgetMax != null && ` · ≤ ${task.budgetMax} ₪`}
                    {task.status === 'published' && task.selectedBidId === null && (
                      <span className="text-tuki-500"> · {ta('bids')}: —</span>
                    )}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    task.status === 'published'
                      ? 'bg-tuki-500/15 text-tuki-400'
                      : task.status === 'assigned'
                        ? 'bg-amber-500/15 text-amber-500'
                        : task.status === 'completed'
                          ? 'bg-green-500/15 text-green-400'
                          : 'bg-neutral-800 text-neutral-500'
                  }`}
                >
                  {t(`status_${task.status}` as any)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
