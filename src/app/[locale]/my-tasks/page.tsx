'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Header from '@/components/Header';
import AuthForm from '@/components/auth/AuthForm';
import { cityName } from '@/lib/geo/cities';
import type { Task } from '@/lib/db/types';

/** /my-tasks — the client's own requests */
export default function MyTasksPage() {
  const locale = useLocale() as 'he' | 'ru' | 'en';
  const t = useTranslations('taskPage');
  const tn = useTranslations('nav');

  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'auth' }
    | { status: 'ok'; tasks: Task[] }
  >({ status: 'loading' });

  async function load() {
    const res = await fetch('/api/tasks');
    if (res.status === 401) return setState({ status: 'auth' });
    const data = await res.json();
    setState({ status: 'ok', tasks: data.tasks });
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('myTasksTitle')}</h1>
          <Link
            href="/new-task"
            className="rounded-xl bg-tuki-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-tuki-600"
          >
            + {t('newTask')}
          </Link>
        </div>

        {state.status === 'loading' && <p className="text-neutral-400">…</p>}
        {state.status === 'auth' && <AuthForm onAuthed={load} />}

        {state.status === 'ok' && state.tasks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center text-neutral-500 dark:border-neutral-700">
            {t('myTasksEmpty')}
          </div>
        )}

        {state.status === 'ok' &&
          state.tasks.map((task) => (
            <Link
              key={task.id}
              href={`/task/${task.id}`}
              className="block rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-tuki-400 dark:border-neutral-700 dark:bg-neutral-900"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {task.subtasks[0]?.title ?? '—'}
                    {task.subtasks.length > 1 && ` +${task.subtasks.length - 1}`}
                  </p>
                  <p className="text-sm text-neutral-500">
                    📍 {cityName(task.cityId, locale)}
                    {task.budgetMax != null && ` · ≤ ${task.budgetMax} ₪`}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-tuki-100 px-3 py-1 text-xs font-medium text-tuki-700">
                  {t(`status_${task.status}` as any)}
                </span>
              </div>
            </Link>
          ))}
      </main>
    </>
  );
}
