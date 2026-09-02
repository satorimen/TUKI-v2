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
  myReview: {
    scoreQuality: number;
    scoreBudget: number;
    scorePunctuality: number;
    scoreCleanliness: number;
    scoreCommunication: number;
    text: string | null;
  } | null;
}

/** /task/[id] — client's task: bids, best match, select → WhatsApp handoff */
export default function TaskPage() {
  const params = useParams<{ id: string }>();
  const locale = useLocale() as 'he' | 'ru' | 'en';
  const t = useTranslations('taskPage');
  const ta = useTranslations('taskActions');

  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'auth' }
    | { status: 'error' }
    | { status: 'ok'; view: TaskView }
  >({ status: 'loading' });
  const [selecting, setSelecting] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [reviewText, setReviewText] = useState('');
  const [sendingReview, setSendingReview] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);

  async function cancelTask() {
    await fetch(`/api/tasks/${params.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    });
    await load();
  }

  async function markDone() {
    await fetch(`/api/tasks/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete' }),
    });
    await load();
  }

  async function submitReview() {
    const keys = [
      'scoreQuality',
      'scoreBudget',
      'scorePunctuality',
      'scoreCleanliness',
      'scoreCommunication',
    ];
    if (keys.some((k) => !scores[k]) || sendingReview) return;
    setSendingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: params.id, ...scores, text: reviewText || undefined }),
      });
      if (res.ok) {
        setReviewSent(true);
        await load();
      }
    } finally {
      setSendingReview(false);
    }
  }

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
        <main className="px-4 py-16 text-center text-on-surface-variant">…</main>
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
          <span className="rounded-full bg-primary-container px-3 py-1 text-sm font-medium text-on-primary-container">
            {t(`status_${task.status}` as any)}
          </span>
        </div>
        <TaskCard draft={draftForCard as any} />

        {/* Selected handoff */}
        {selected && (task.status === 'assigned' || task.status === 'completed') && (
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
            {task.status === 'assigned' && (
              <button
                onClick={markDone}
                className="mt-3 block w-full rounded-xl border-2 border-green-600 py-2.5 font-medium text-green-700 transition hover:bg-green-100 dark:text-green-400"
              >
                {t('markDone')}
              </button>
            )}
          </div>
        )}

        {/* Review form (assigned/completed, not yet reviewed) */}
        {(task.status === 'assigned' || task.status === 'completed') &&
          !state.view.myReview &&
          !reviewSent && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-outline-variant dark:bg-neutral-900">
              <h2 className="mb-4 font-bold">{t('reviewTitle')}</h2>
              <div className="space-y-3">
                {(
                  [
                    ['scoreQuality', 'quality'],
                    ['scoreBudget', 'budgetScore'],
                    ['scorePunctuality', 'punctuality'],
                    ['scoreCleanliness', 'cleanliness'],
                    ['scoreCommunication', 'communication'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium">{t(label)}</span>
                    <div className="flex gap-1" dir="ltr">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setScores((s) => ({ ...s, [key]: star }))}
                          className={`text-2xl transition ${
                            (scores[key] ?? 0) >= star ? 'opacity-100' : 'opacity-25 hover:opacity-60'
                          }`}
                          aria-label={`${label} ${star}`}
                        >
                          ⭐
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder={t('reviewText')}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-outline bg-transparent px-3 py-2 dark:border-outline"
                />
                <button
                  onClick={submitReview}
                  disabled={sendingReview || Object.keys(scores).length < 5}
                  className="w-full rounded-full bg-primary py-3 font-semibold text-white transition hover:bg-primary/90 disabled:opacity-40"
                >
                  {t('submitReview')}
                </button>
              </div>
            </div>
          )}

        {/* Review submitted */}
        {(state.view.myReview || reviewSent) && (
          <div className="rounded-2xl border border-green-300 bg-green-50 p-5 text-center font-medium text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
            {t('reviewThanks')}
            {state.view.myReview?.text && (
              <p className="mt-2 text-sm font-normal text-on-surface-variant/70 dark:text-on-surface-variant">
                «{state.view.myReview.text}»
              </p>
            )}
          </div>
        )}

        {/* Bids */}
        {task.status === 'published' && (
          <>
            <h2 className="text-lg font-bold">
              {t('bidsTitle')}{' '}
              <span className="text-on-surface-variant">({t('bidCount', { count: bids.length })})</span>
            </h2>
            {bids.length === 0 && (
              <p className="rounded-2xl border border-dashed border-outline p-8 text-center text-on-surface-variant dark:border-outline-variant">
                {t('noBids')}
              </p>
            )}
            <div className="space-y-4">
              {bids.map(({ bid, master }) => (
                <div
                  key={bid.id}
                  className={`rounded-2xl border bg-white p-5 shadow-sm dark:bg-neutral-900 ${
                    bid.id === bestMatchId ? 'border-primary ring-2 ring-primary/40' : 'border-outline-variant'
                  }`}
                >
                  {bid.id === bestMatchId && (
                    <p className="mb-2 text-sm font-bold text-primary">{t('bestMatch')}</p>
                  )}
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span className="text-lg font-bold">{master?.name ?? '—'}</span>
                    {master && master.rating > 0 && (
                      <span className="text-sm text-amber-500">
                        ★ {master.rating.toFixed(1)} ({master.reviewsCount})
                      </span>
                    )}
                    {master?.experienceYears != null && (
                      <span className="text-sm text-on-surface-variant">
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
                          className="rounded-full bg-secondary-container px-2.5 py-0.5 text-xs dark:bg-secondary-container"
                        >
                          {categoryName(s, locale)}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mb-3 flex flex-wrap gap-4 text-sm">
                    {bid.price != null && (
                      <span className="font-bold text-primary">₪ {bid.price}</span>
                    )}
                    {bid.timeline && <span className="text-on-surface-variant">📅 {bid.timeline}</span>}
                  </div>

                  {bid.message && (
                    <p className="mb-4 rounded-xl bg-surface-container p-3 text-sm leading-relaxed text-on-surface-variant/70 dark:bg-secondary-container dark:text-on-surface-variant">
                      {bid.message}
                    </p>
                  )}

                  <button
                    onClick={() => select(bid.id)}
                    disabled={selecting !== null}
                    className="rounded-full bg-primary px-6 py-2.5 font-semibold text-white transition hover:bg-primary/90 disabled:opacity-40"
                  >
                    {selecting === bid.id ? '…' : t('select')}
                  </button>
                </div>
              ))}
            </div>

            {/* Cancel task */}
            <button
              onClick={() => {
                if (confirm(ta('cancelConfirm'))) cancelTask();
              }}
              className="mt-6 w-full rounded-xl border border-outline-variant py-3 text-sm font-medium text-on-surface-variant transition active:scale-[0.98]"
            >
              {ta('cancel')}
            </button>
          </>
        )}
      </main>
    </>
  );
}
