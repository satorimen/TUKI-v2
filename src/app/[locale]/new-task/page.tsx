'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Header from '@/components/Header';
import AuthForm from '@/components/auth/AuthForm';
import { CITIES, cityName } from '@/lib/geo/cities';
import { CLUSTERS } from '@/lib/geo/clusters';
import { categoryName } from '@/lib/tasks/categories';
import type { ChatMessage, ParseResult, TaskDraft, Language } from '@/lib/ai/types';

/**
 * /new-task — conversational task builder.
 * Phase 'chat':    the user describes the problem, the AI (Gemini via AI Gateway)
 *                  detects the work type and asks clarifying questions until the
 *                  essentials (work type + city + budget) are known.
 * Phase 'details': a pre-filled review card where the user confirms / fixes the
 *                  structured fields, then publishes → wave dispatch kicks in.
 */
export default function NewTaskPage() {
  const locale = useLocale() as Language;
  const tf = useTranslations('form');
  const t = useTranslations('task');
  const tc = useTranslations('chat');
  const tn = useTranslations('nav');

  const [phase, setPhase] = useState<'chat' | 'details'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [timelineInput, setTimelineInput] = useState('');
  const [needAuth, setNeedAuth] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const citiesByCluster = useMemo(
    () =>
      Object.values(CLUSTERS).map((cluster) => ({
        cluster,
        cities: CITIES.filter((c) => c.cluster === cluster.id),
      })),
    []
  );

  const draftHasWork = Boolean(draft && draft.subtasks.length > 0);

  const canPublish = useMemo(
    () =>
      Boolean(
        draft &&
          draft.subtasks.length > 0 &&
          draft.cityId &&
          (draft.budget_ils.max != null || draft.budget_ils.min != null)
      ),
    [draft]
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  /** Send one chat turn to the AI and merge the result into the draft. */
  async function send() {
    const message = input.trim();
    if (!message || loading) return;
    const history = messages;
    setMessages((m) => [...m, { role: 'user', text: message }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history, draft, locale }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as ParseResult;
      setDraft(data.draft);

      const assistantText =
        [data.summary, ...data.clarifyingQuestions.map((q) => q.question)]
          .filter(Boolean)
          .join('\n') || tc('gotIt');
      setMessages((m) => [...m, { role: 'assistant', text: assistantText }]);
    } catch {
      // graceful degradation: keep a minimal draft so the user can still continue
      setDraft(
        (d) =>
          d ?? {
            language: locale,
            subtasks: [{ category: 'other', title: message.slice(0, 80) }],
            area_sqm: null,
            budget_ils: { min: null, max: null },
            timeline: null,
            city: null,
            cityId: null,
            work_details: message.slice(0, 500),
          }
      );
      setMessages((m) => [...m, { role: 'assistant', text: tc('offlineNote') }]);
    } finally {
      setLoading(false);
    }
  }

  function goToDetails() {
    if (!draft) return;
    setBudgetInput(draft.budget_ils.max != null ? String(draft.budget_ils.max) : '');
    setTimelineInput(draft.timeline ?? '');
    setPhase('details');
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
      const rawInput = messages.find((m) => m.role === 'user')?.text ?? '';
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft, cityId: draft.cityId, rawInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPublished(data.task.id);
      setNeedAuth(false);
    } finally {
      setPublishing(false);
    }
  }

  function patchDraft(patch: Partial<TaskDraft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      e.preventDefault();
      send();
    }
  }

  /* ── Published ─────────────────────────────────────────── */
  if (published) {
    return (
      <>
        <Header />
        <main className="flex min-h-[75dvh] flex-col items-center justify-center px-6 text-center">
          <h1 className="text-lg font-bold">{tc('publishSuccess')}</h1>
          <p className="mt-2 text-sm text-on-surface-variant">{tc('publishSuccessHint')}</p>
          <p className="mt-2 font-mono text-xs text-on-surface-variant/70">{published}</p>
          <Link
            href="/my-tasks"
            className="mt-8 w-full rounded-full bg-primary py-3.5 font-semibold text-white transition active:scale-[0.98]"
          >
            {tn('myTasks')}
          </Link>
        </main>
      </>
    );
  }

  /* ── Phase: chat ───────────────────────────────────────── */
  if (phase === 'chat') {
    const empty = messages.length === 0;
    return (
      <>
        <Header />
        <main className="flex h-[calc(100dvh-8rem)] flex-col px-5 pt-6">
          <div>
            <h1 className="text-2xl font-bold text-balance">{tf('step1')}</h1>
            <p className="mt-2 text-sm text-on-surface-variant text-pretty">{tf('step1Hint')}</p>
          </div>

          <div ref={scrollRef} className="mt-4 flex-1 space-y-3 overflow-y-auto pb-2">
            {empty && (
              <p className="rounded-2xl bg-surface-container-low px-4 py-3 text-[15px] leading-relaxed text-on-surface-variant">
                {tc('assistantHello')}
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === 'user'
                    ? 'ms-auto max-w-[85%] whitespace-pre-line rounded-2xl bg-primary px-4 py-2.5 text-[15px] leading-relaxed text-white'
                    : 'me-auto max-w-[90%] whitespace-pre-line rounded-2xl bg-surface-container-low px-4 py-2.5 text-[15px] leading-relaxed'
                }
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="me-auto rounded-2xl bg-surface-container-low px-4 py-2.5 text-[15px] text-on-surface-variant">
                {tc('thinking')}
              </div>
            )}
          </div>

          {draftHasWork && (
            <button
              onClick={goToDetails}
              className="mb-2 w-full rounded-full border border-primary py-3 text-sm font-semibold text-primary transition active:scale-[0.98]"
            >
              {canPublish ? tc('reviewAndPublish') : tc('continueToDetails')}
            </button>
          )}

          <div className="flex items-end gap-2 pb-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={tf('example')}
              rows={1}
              autoFocus
              className="max-h-32 min-h-[52px] flex-1 resize-none rounded-2xl border border-outline bg-transparent px-4 py-3.5 text-[15px] leading-relaxed outline-none placeholder:text-on-surface-variant/70"
            />
            <button
              onClick={send}
              disabled={loading || input.trim().length === 0}
              className="h-[52px] shrink-0 rounded-full bg-primary px-5 font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
            >
              {tc('send')}
            </button>
          </div>
        </main>
      </>
    );
  }

  /* ── Phase: details (review) ───────────────────────────── */
  return (
    <>
      <Header />
      <main className="px-5 pb-8 pt-6">
        <h1 className="text-xl font-bold">{tf('step2')}</h1>
        <button
          onClick={() => setPhase('chat')}
          className="mt-1 text-xs text-on-surface-variant underline underline-offset-4"
        >
          ← {tc('backToChat')}
        </button>

        {/* Work types (parsed, read-only) */}
        <section className="mt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            {tf('workTypes')}
          </p>
          <div className="flex flex-wrap gap-2">
            {draft!.subtasks.map((s, i) => (
              <span
                key={i}
                className="rounded-full bg-surface-container-low px-3.5 py-2 text-sm font-medium"
              >
                {s.title}
                <span className="ms-2 text-on-surface-variant">{categoryName(s.category, locale)}</span>
              </span>
            ))}
          </div>
          {draft!.area_sqm != null && (
            <p className="mt-2 text-sm text-on-surface-variant">
              {t('area')}: {draft!.area_sqm} m²
            </p>
          )}
        </section>

        {/* City */}
        <section className="mt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            {t('city')}
          </p>
          <select
            value={draft!.cityId ?? ''}
            onChange={(e) => patchDraft({ cityId: e.target.value || null })}
            className="w-full rounded-xs border border-outline bg-transparent px-4 py-3.5 text-[15px] outline-none"
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
        </section>

        {/* Budget */}
        <section className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            {tf('budgetTo')}
          </p>
          <input
            inputMode="numeric"
            value={budgetInput}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 6);
              setBudgetInput(v);
              patchDraft({ budget_ils: { min: null, max: v ? parseInt(v, 10) : null } });
            }}
            dir="ltr"
            placeholder="1500"
            className="w-full rounded-xs border border-outline bg-transparent px-4 py-3.5 text-[15px] outline-none placeholder:text-on-surface-variant/70"
          />
        </section>

        {/* Timeline */}
        <section className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            {tf('when')}
          </p>
          <input
            value={timelineInput}
            onChange={(e) => {
              setTimelineInput(e.target.value);
              patchDraft({ timeline: e.target.value || null });
            }}
            placeholder={locale === 'he' ? 'בשבוע הבא' : locale === 'ru' ? 'на следующей неделе' : 'next week'}
            className="w-full rounded-xs border border-outline bg-transparent px-4 py-3.5 text-[15px] outline-none placeholder:text-on-surface-variant/70"
          />
        </section>

        {/* Publish */}
        <div className="mt-8">
          {needAuth ? (
            <div className="space-y-2">
              <p className="text-center text-xs text-on-surface-variant">{tc('loginToPublish')}</p>
              <AuthForm onAuthed={publishNow} />
            </div>
          ) : (
            <button
              onClick={onPublish}
              disabled={!canPublish || publishing}
              className="w-full rounded-full bg-primary py-4 font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
            >
              {publishing ? tf('sending') : t('publish')}
            </button>
          )}
          {!canPublish && !needAuth && (
            <p className="mt-3 text-center text-xs text-on-surface-variant/70">{tc('needCityBudget')}</p>
          )}
        </div>
      </main>
    </>
  );
}
