'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import TaskCard from '@/components/task/TaskCard';
import AuthForm from '@/components/auth/AuthForm';
import { CITIES, cityName } from '@/lib/geo/cities';
import { CLUSTERS } from '@/lib/geo/clusters';
import type { ChatMessage, ParseResult, TaskDraft, Language } from '@/lib/ai/types';

interface UiMessage extends ChatMessage {
  id: number;
  kind?: 'summary' | 'question' | 'greeting' | 'card';
}

/** /new-task — messenger-style AI chat (mobile app look) */
export default function NewTaskPage() {
  const locale = useLocale() as Language;
  const t = useTranslations('task');
  const tc = useTranslations('chat');
  const tn = useTranslations('nav');

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
  const bottomRef = useRef<HTMLDivElement>(null);

  const canPublish = useMemo(
    () => Boolean(draft?.cityId && (draft.budget_ils.min != null || draft.budget_ils.max != null)),
    [draft]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send() {
    const message = input.trim();
    if (!message || loading) return;

    const history: ChatMessage[] = messages
      .filter((m) => m.kind !== 'greeting' && m.kind !== 'card')
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

  const citiesByCluster = useMemo(
    () =>
      Object.values(CLUSTERS).map((cluster) => ({
        cluster,
        cities: CITIES.filter((c) => c.cluster === cluster.id),
      })),
    []
  );

  /* ── Published: success screen ─────────────────────────── */
  if (published) {
    return (
      <main className="flex min-h-[80dvh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/15 text-4xl">
          ✅
        </div>
        <h1 className="text-xl font-bold">{tc('publishSuccess')}</h1>
        <p className="mt-2 font-mono text-xs text-neutral-600">{published}</p>
        {draft && (
          <div className="mt-6 w-full text-start">
            <TaskCard draft={draft} />
          </div>
        )}
        <Link
          href="/my-tasks"
          className="mt-6 w-full rounded-2xl bg-tuki-500 py-3.5 font-semibold text-white transition active:scale-[0.98]"
        >
          {tn('myTasks')} ←
        </Link>
      </main>
    );
  }

  const showCard = draft && draft.subtasks.length > 0;

  /* ── Chat ──────────────────────────────────────────────── */
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Assistant header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-800/70 bg-[#0d0d0d]/95 px-4 py-3 backdrop-blur-md">
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-tuki-400 to-tuki-600 text-lg">
            🤖
          </div>
          <span className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full border-2 border-[#0d0d0d] bg-green-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{tc('assistantName')}</p>
          <p className="text-[11px] text-green-500">online</p>
        </div>
        {provider === 'mock' && (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-medium text-amber-500">
            {tc('mockBadge')}
          </span>
        )}
      </header>

      {/* Messages */}
      <main className="flex-1 space-y-2.5 px-4 py-5">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 text-[15px] leading-relaxed ${
                m.role === 'user'
                  ? 'rounded-2xl rounded-br-md bg-tuki-500 text-white'
                  : 'rounded-2xl rounded-bl-md bg-[#1c1c1c] text-neutral-100'
              }`}
            >
              {m.kind === 'question' && <span className="me-1">❓</span>}
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-2xl rounded-bl-md bg-[#1c1c1c] px-4 py-3.5">
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Task card in flow */}
        {showCard && !loading && (
          <div className="space-y-3 pt-2">
            <TaskCard draft={draft!} />

            {/* City picker */}
            <div className="rounded-2xl bg-[#1c1c1c] p-4">
              <label htmlFor="city" className="mb-2 block text-xs font-medium text-neutral-500">
                📍 {t('city')}
              </label>
              <select
                id="city"
                value={draft!.cityId ?? ''}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, cityId: e.target.value || null } : d))
                }
                className="w-full rounded-xl bg-neutral-800 px-3 py-2.5 text-sm outline-none"
              >
                <option value="">—</option>
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

            {needAuth ? (
              <div className="space-y-2">
                <p className="text-center text-xs text-neutral-500">{tc('loginToPublish')}</p>
                <AuthForm onAuthed={publishNow} />
              </div>
            ) : (
              <button
                onClick={onPublish}
                disabled={!canPublish || publishing}
                className="w-full rounded-2xl bg-tuki-500 py-3.5 font-semibold text-white shadow-lg shadow-tuki-500/25 transition active:scale-[0.98] disabled:opacity-40"
              >
                {t('publish')} 🚀
              </button>
            )}
            {!canPublish && !needAuth && (
              <p className="text-center text-xs text-neutral-600">{tc('needCityBudget')}</p>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      {/* Input bar */}
      <div className="sticky bottom-24 px-4">
        <div className="flex items-center gap-2 rounded-full border border-neutral-800 bg-[#161616] p-1.5 pl-4 shadow-xl">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={t('chatPlaceholder')}
            disabled={loading}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-600"
          />
          <button
            onClick={send}
            disabled={loading || input.trim().length === 0}
            aria-label={t('send')}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg transition active:scale-90 ${
              input.trim().length > 0 && !loading
                ? 'bg-tuki-500 text-white'
                : 'bg-neutral-800 text-neutral-600'
            }`}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
