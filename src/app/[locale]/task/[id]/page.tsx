'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Header from '@/components/Header';
import AuthForm from '@/components/auth/AuthForm';
import TaskCard from '@/components/task/TaskCard';
import { cityName } from '@/lib/geo/cities';
import { categoryName } from '@/lib/tasks/categories';
import type { Bid, Task } from '@/lib/db/types';

interface BidWithMaster {
  bid: Bid;
  master: {
    masterId: string;
    name: string;
    specializations: string[];
    experienceYears: number | null;
    bio: string | null;
    rating: number;
    reviewsCount: number;
    completedTasks: number;
  } | null;
}

interface TaskView {
  task: Task;
  bids: BidWithMaster[];
  bestMatchId: string | null;
  selected: { whatsappUrl: string; master: BidWithMaster['master'] } | null;
}

/** /task/[id] — client's task: bids, best match, select → WhatsApp handoff */
export default function TaskPage() {
  const params = useParams<{ id: string }>();
  const locale = useLocale() as 'he' | 'ru' | 'en';
  const t = useTranslations('taskPage');

  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'auth' }
    | { status: 'error' }
    | { status: 'ok'; view: TaskView }
  >({ status: 'loading' });
  const [selecting, setSelecting] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/tasks/${params.id}`);
    if (res.status === 401) return setState({ status: 'auth' });
    if (!res.ok) return setState({ status: 'error' });
    const data = await res.json();
    setState({ status: 'ok', view: data });
  }

  useEffect(() => {
    load();
  }, [params.id]);

  async function select(bidId: string) {
    if (selecting) return;
    setSelecting(bidId);
    try {
      const res = await fetch(`/api/tasks/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidId }),
      });
      if (res.ok) await load();
    } finally {
      setSelecting(null);
    }
  }

  if (state.status === 'auth') {
    return (
      <>
        <Header />
        <main className="px-4 py-16">
          <AuthForm onAuthed={load} />
        </main>
      </>
    );
  }

  if (state.status !== 'ok') {
    return (
      <>
        <Header />
        <main className="px-4 py-16 text-center text-neutral-500">…</main>
      </>
    );
  }

  const { task, bids, bestMatchId, selected } = state.view;
  const draftForCard = {
    language: task.language,
    subtasks: task.subtasks,
    area_sqm: task.areaSqm,
    budget_ils: { min: task.budgetMin, max: task.budgetMax },
    timeline: task.timeline,
    city: task.cityId,
    cityId: task.cityId,
    work_details: task.workDetails,
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        {/* Task card + status */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{cityName(task.cityId, locale)}</h1>
          <span className="rounded-full bg-tuki-100 px-3 py-1 text-sm font-medium text-tuki-700">
            {t(`status_${task.status}` as any)}
          </span>
        </div>
        <TaskCard draft={draftForCard as any} />

        {/* Selected handoff */}
        {selected && task.status === 'assigned' && (
          <div className="rounded-2xl border-2 border-green-500 bg-green-50 p-6 text-center dark:bg-green-900/20">
            <h2 className="text-lg font-bold">{t('assignedTitle')}</h2>
            {selected.whatsappUrl && (
              <a
                href={selected.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block rounded-xl bg-green-600 px-8 py-3.5 text-lg font-semibold text-white shadow-lg transition hover:bg-green-700"
              >
                💬 {t('openWhatsapp')}
              </a>
            )}
          </div>
        )}

        {/* Bids */}
        {task.status === 'published' && (
          <>
            <h2 className="text-lg font-bold">
              {t('bidsTitle')}{' '}
              <span className="text-neutral-400">({t('bidCount', { count: bids.length })})</span>
            </h2>
            {bids.length === 0 && (
              <p className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500 dark:border-neutral-700">
                {t('noBids')}
              </p>
            )}
            <div className="space-y-4">
              {bids.map(({ bid, master }) => (
                <div
                  key={bid.id}
                  className={`rounded-2xl border bg-white p-5 shadow-sm dark:bg-neutral-900 ${
                    bid.id === bestMatchId ? 'border-tuki-400 ring-2 ring-tuki-200 dark:ring-tuki-900' : 'border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  {bid.id === bestMatchId && (
                    <p className="mb-2 text-sm font-bold text-tuki-600">{t('bestMatch')}</p>
                  )}
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span className="text-lg font-bold">{master?.name ?? '—'}</span>
                    {master && master.rating > 0 && (
                      <span className="text-sm text-amber-500">
                        ★ {master.rating.toFixed(1)} ({master.reviewsCount})
                      </span>
                    )}
                    {master?.experienceYears != null && (
                      <span className="text-sm text-neutral-400">
                        {master.experienceYears}{' '}
                        {locale === 'he' ? 'שנים' : locale === 'ru' ? 'лет' : 'yrs'}
                      </span>
                    )}
                  </div>

                  {master?.specializations?.length ? (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {master.specializations.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs dark:bg-neutral-800"
                        >
                          {categoryName(s, locale)}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mb-3 flex flex-wrap gap-4 text-sm">
                    {bid.price != null && (
                      <span className="font-bold text-tuki-600">₪ {bid.price}</span>
                    )}
                    {bid.timeline && <span className="text-neutral-500">📅 {bid.timeline}</span>}
                  </div>

                  {bid.message && (
                    <p className="mb-4 rounded-xl bg-neutral-50 p-3 text-sm leading-relaxed text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                      {bid.message}
                    </p>
                  )}

                  <button
                    onClick={() => select(bid.id)}
                    disabled={selecting !== null}
                    className="rounded-xl bg-tuki-500 px-6 py-2.5 font-semibold text-white transition hover:bg-tuki-600 disabled:opacity-40"
                  >
                    {selecting === bid.id ? '…' : t('select')}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
