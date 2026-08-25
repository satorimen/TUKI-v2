'use client';

import { useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Header from '@/components/Header';
import TaskCard from '@/components/task/TaskCard';
import AuthForm from '@/components/auth/AuthForm';
import { CITIES, cityName } from '@/lib/geo/cities';
import { CLUSTERS } from '@/lib/geo/clusters';
import type { ChatMessage, ParseResult, TaskDraft, Language } from '@/lib/ai/types';

interface UiMessage extends ChatMessage {
  /** bubble id for react keys */
  id: number;
  kind?: 'summary' | 'question' | 'greeting';
}

export default function NewTaskPage() {
  const locale = useLocale() as Language;
  const t = useTranslations('task');
  const tc = useTranslations('chat');
  const tn = useTranslations('nav');
  const tCity = useTranslations('city');

  const [messages, setMessages] = useState<UiMessage[]>(() => [
    { id: 0, role: 'assistant', text: tc('greeting'), kind: 'greeting' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [published, setPublished] = useState<string | null>(null);
  const [provider, setProvider] = useState<'gemini' | 'mock' | null>(null);
  const [needAuth, setNeedAuth] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const idRef = useRef(1);

  const canPublish = useMemo(
    () => Boolean(draft?.cityId && (draft.budget_ils.min != null || draft.budget_ils.max != null)),
    [draft]
  );

  async function send() {
    const message = input.trim();
    if (!message || loading) return;

    const history: ChatMessage[] = messages
      .filter((m) => m.kind !== 'greeting')
      .map(({ role, text }) => ({ role, text }));

    setMessages((prev) => [...prev, { id: idRef.current++, role: 'user', text: message }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history, draft, locale }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ParseResult & { provider: 'gemini' | 'mock' };
      setProvider(data.provider);
      setDraft(data.draft);

      setMessages((prev) => {
        const next = [...prev];
        if (data.summary) {
          next.push({ id: idRef.current++, role: 'assistant', text: data.summary, kind: 'summary' });
        }
        for (const q of data.clarifyingQuestions) {
          next.push({ id: idRef.current++, role: 'assistant', text: q.question, kind: 'question' });
        }
        return next;
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: idRef.current++, role: 'assistant', text: tc('thinking'), kind: 'summary' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  /** Publish: requires session — shows inline auth if missing */
  async function onPublish() {
    if (!draft || !canPublish || publishing) return;
    setPublishing(true);
    try {
      const me = await fetch('/api/auth/me').then((r) => r.json());
      if (!me.profile) {
        setNeedAuth(true);
        setPublishing(false);
        return;
      }
      await publishNow();
    } catch {
      setPublishing(false);
    }
  }

  async function publishNow() {
    if (!draft) return;
    setPublishing(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft, cityId: draft.cityId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPublished(data.task.id);
      setNeedAuth(false);
    } finally {
      setPublishing(false);
    }
  }

  const citiesByCluster = useMemo(() => {
    return CLUSTERS
      ? Object.values(CLUSTERS).map((cluster) => ({
          cluster,
          cities: CITIES.filter((c) => c.cluster === cluster.id),
        }))
      : [];
  }, []);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-16">
        {published ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
              ✅
            </div>
            <h1 className="mb-3 text-2xl font-bold">{tc('publishSuccess')}</h1>
            <p className="mb-2 font-mono text-sm text-neutral-400">ID: {published}</p>
            {draft && (
              <div className="mx-auto mt-8 max-w-lg text-start">
                <TaskCard draft={draft} />
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 py-4">
              <h1 className="text-xl font-bold">{tn('newTask')}</h1>
              {provider === 'mock' && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                  {tc('mockBadge')}
                </span>
              )}
            </div>

            {/* Chat */}
            <div className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'rounded-ee-md bg-tuki-500 text-white'
                        : 'rounded-es-md bg-white shadow-sm dark:bg-neutral-800'
                    }`}
                  >
                    {m.kind === 'question' && (
                      <span className="me-1" aria-hidden>
                        ❓
                      </span>
                    )}
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-es-md bg-white px-4 py-2.5 text-sm text-neutral-400 shadow-sm dark:bg-neutral-800">
                    {tc('thinking')}
                  </div>
                </div>
              )}
            </div>

            {/* Draft card (appears once the AI understood anything) */}
            {draft && draft.subtasks.length > 0 && (
              <div className="mt-6 space-y-4">
                <TaskCard draft={draft} />

                {/* City editor */}
                <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
                  <label
                    htmlFor="city"
                    className="mb-2 block text-sm font-semibold uppercase tracking-wide text-neutral-500"
                  >
                    {t('city')}
                  </label>
                  <select
                    id="city"
                    value={draft.cityId ?? ''}
                    onChange={(e) =>
                      setDraft((d) => (d ? { ...d, cityId: e.target.value || null } : d))
                    }
                    className="w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-600"
                  >
                    <option value="">{tCity('placeholder')}</option>
                    {citiesByCluster.map(({ cluster, cities }) => (
                      <optgroup key={cluster.id} label={cluster.name[locale as 'he' | 'ru' | 'en']}>
                        {cities.map((city) => (
                          <option key={city.id} value={city.id}>
                            {cityName(city.id, locale)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Publish */}
                {needAuth ? (
                  <div className="space-y-3">
                    <p className="text-center text-sm text-neutral-500">{tc('loginToPublish')}</p>
                    <AuthForm onAuthed={publishNow} />
                  </div>
                ) : (
                  <button
                    onClick={onPublish}
                    disabled={!canPublish || publishing}
                    className="w-full rounded-xl bg-tuki-500 py-4 text-lg font-semibold text-white shadow-lg shadow-tuki-500/30 transition hover:bg-tuki-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t('publish')}
                  </button>
                )}
                {!canPublish && !needAuth && (
                  <p className="text-center text-sm text-neutral-500">{tc('needCityBudget')}</p>
                )}
              </div>
            )}

            {/* Input */}
            <div className="sticky bottom-4 mt-6">
              <div className="flex gap-2 rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder={t('chatPlaceholder')}
                  disabled={loading}
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 outline-none"
                />
                <button
                  onClick={send}
                  disabled={loading || input.trim().length === 0}
                  className="rounded-xl bg-tuki-500 px-5 py-2 font-medium text-white transition hover:bg-tuki-600 disabled:opacity-40"
                >
                  {t('send')}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
