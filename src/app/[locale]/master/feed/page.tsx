'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Header from '@/components/Header';
import AuthForm from '@/components/auth/AuthForm';
import { cityName } from '@/lib/geo/cities';
import { categoryName } from '@/lib/tasks/categories';
import type { Task } from '@/lib/db/types';

interface FeedTask extends Task {
  hasBid: boolean;
}

/** /master/feed — matching requests for the signed-in master */
export default function MasterFeedPage() {
  const locale = useLocale() as 'he' | 'ru' | 'en';
  const t = useTranslations('master');
  const tc = useTranslations('taskPage');

  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'auth' }
    | { status: 'no-profile' }
    | { status: 'ok'; tasks: FeedTask[] }
  >({ status: 'loading' });
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [timeline, setTimeline] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [justBid, setJustBid] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/master/feed');
    if (res.status === 401) return setState({ status: 'auth' });
    if (res.status === 403) return setState({ status: 'no-profile' });
    const data = await res.json();
    setState({ status: 'ok', tasks: data.tasks });
  }

  useEffect(() => {
    load();
  }, []);

  async function sendBid(taskId: string) {
    if (sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          price: price ? parseInt(price, 10) : undefined,
          timeline: timeline || undefined,
          message: message || undefined,
        }),
      });
      if (res.ok) {
        setJustBid(taskId);
        setRespondingTo(null);
        setPrice('');
        setTimeline('');
        setMessage('');
        await load();
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <h1 className="text-2xl font-bold">{t('feedTitle')}</h1>

        {state.status === 'loading' && <p className="text-on-surface-variant">…</p>}

        {state.status === 'auth' && <AuthForm onAuthed={load} />}

        {state.status === 'no-profile' && (
          <div className="rounded-2xl border border-dashed border-outline p-8 text-center dark:border-outline-variant">
            <p className="mb-4 text-on-surface-variant">{t('fillProfile')}</p>
            <Link href="/master" className="rounded-full bg-primary px-6 py-3 font-semibold text-white">
              →
            </Link>
          </div>
        )}

        {state.status === 'ok' && state.tasks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-outline p-10 text-center text-on-surface-variant dark:border-outline-variant">
            {t('feedEmpty')}
          </div>
        )}

        {state.status === 'ok' &&
          state.tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-outline-variant dark:bg-neutral-900"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
                <span>📍 {cityName(task.cityId, locale)}</span>
                {task.timeline && <span>📅 {task.timeline}</span>}
                {task.budgetMax != null && (
                  <span>
                    💰 {task.budgetMin ? `${task.budgetMin}–` : '≤ '}
                    {task.budgetMax} ₪
                  </span>
                )}
                {task.areaSqm && <span>📐 {task.areaSqm} מ״ר</span>}
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                {task.subtasks.map((s, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-secondary-container px-3 py-1 text-sm font-medium dark:bg-secondary-container"
                  >
                    {s.title}
                  </span>
                ))}
              </div>

              {task.workDetails && (
                <p className="mb-4 text-sm leading-relaxed text-on-surface-variant/70 dark:text-on-surface-variant">
                  {task.workDetails}
                </p>
              )}

              {justBid === task.id ? (
                <p className="font-medium text-green-600">✅ {t('bidSent')}</p>
              ) : respondingTo === task.id ? (
                <div className="space-y-3 rounded-xl bg-surface-container p-4 dark:bg-secondary-container">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      inputMode="numeric"
                      value={price}
                      onChange={(e) => setPrice(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder={t('yourPrice')}
                      dir="ltr"
                      className="rounded-lg border border-outline bg-transparent px-3 py-2 dark:border-outline"
                    />
                    <input
                      value={timeline}
                      onChange={(e) => setTimeline(e.target.value)}
                      placeholder={t('yourTimeline')}
                      className="rounded-lg border border-outline bg-transparent px-3 py-2 dark:border-outline"
                    />
                  </div>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('yourMessage')}
                    rows={2}
                    className="w-full resize-none rounded-lg border border-outline bg-transparent px-3 py-2 dark:border-outline"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => sendBid(task.id)}
                      disabled={sending || (!price && !message)}
                      className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white transition hover:bg-primary/90 disabled:opacity-40"
                    >
                      {t('sendBid')}
                    </button>
                    <button
                      onClick={() => setRespondingTo(null)}
                      className="rounded-full border border-outline px-5 py-2.5 dark:border-outline"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setRespondingTo(task.id)}
                  className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white transition hover:bg-primary/90"
                >
                  {t('respond')}
                </button>
              )}
            </div>
          ))}
      </main>
    </>
  );
}
