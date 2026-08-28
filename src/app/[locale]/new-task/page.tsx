'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Header from '@/components/Header';
import AuthForm from '@/components/auth/AuthForm';
import { CITIES, cityName } from '@/lib/geo/cities';
import { CLUSTERS } from '@/lib/geo/clusters';
import { categoryName } from '@/lib/tasks/categories';
import type { ParseResult, TaskDraft, Language } from '@/lib/ai/types';

/**
 * /new-task — clean two-step form (no assistant concept).
 * Step 1: free-text description → AI parses it silently.
 * Step 2: pre-filled structured form (work types, city, budget, timeline)
 *         with missing fields completed by the user.
 */
export default function NewTaskPage() {
  const locale = useLocale() as Language;
  const tf = useTranslations('form');
  const t = useTranslations('task');
  const tc = useTranslations('chat');
  const tn = useTranslations('nav');

  const [step, setStep] = useState<'describe' | 'details'>('describe');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [timelineInput, setTimelineInput] = useState('');
  const [needAuth, setNeedAuth] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<string | null>(null);

  const citiesByCluster = useMemo(
    () =>
      Object.values(CLUSTERS).map((cluster) => ({
        cluster,
        cities: CITIES.filter((c) => c.cluster === cluster.id),
      })),
    []
  );

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

  /** Step 1 → AI parse (silent) → Step 2 */
  async function parse() {
    const message = text.trim();
    if (!message || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: [], draft: null, locale }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as ParseResult;
      setDraft(data.draft);
      setBudgetInput(data.draft.budget_ils.max != null ? String(data.draft.budget_ils.max) : '');
      setTimelineInput(data.draft.timeline ?? '');
      setStep('details');
    } catch {
      // graceful degradation: continue with a minimal draft, user fills the form
      setDraft({
        language: locale,
        subtasks: [{ category: 'other', title: message.slice(0, 80) }],
        area_sqm: null,
        budget_ils: { min: null, max: null },
        timeline: null,
        city: null,
        cityId: null,
        work_details: message.slice(0, 500),
      });
      setStep('details');
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
        body: JSON.stringify({ draft, cityId: draft.cityId, rawInput: text }),
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

  /* ── Published ─────────────────────────────────────────── */
  if (published) {
    return (
      <>
        <Header />
        <main className="flex min-h-[75dvh] flex-col items-center justify-center px-6 text-center">
          <span className="mb-4 text-4xl">✅</span>
          <h1 className="text-lg font-bold">{tc('publishSuccess')}</h1>
          <p className="mt-2 font-mono text-xs text-neutral-600">{published}</p>
          <Link
            href="/my-tasks"
            className="mt-8 w-full rounded-2xl bg-tuki-500 py-3.5 font-semibold text-white transition active:scale-[0.98]"
          >
            {tn('myTasks')}
          </Link>
        </main>
      </>
    );
  }

  /* ── Step 1: describe ──────────────────────────────────── */
  if (step === 'describe') {
    return (
      <>
        <Header />
        <main className="flex min-h-[80dvh] flex-col px-5 pt-8">
          <h1 className="text-2xl font-bold">{tf('step1')}</h1>
          <p className="mt-2 text-sm text-neutral-500">{tf('step1Hint')}</p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={tf('example')}
            rows={5}
            autoFocus
            className="mt-6 w-full resize-none rounded-2xl bg-[#161616] p-4 text-[15px] leading-relaxed outline-none ring-tuki-500/50 placeholder:text-neutral-600 focus:ring-2"
          />

          <div className="mt-auto pb-4 pt-6">
            <button
              onClick={parse}
              disabled={loading || text.trim().length === 0}
              className="w-full rounded-2xl bg-tuki-500 py-4 font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
            >
              {loading ? tf('sending') : `${tf('next')} →`}
            </button>
          </div>
        </main>
      </>
    );
  }

  /* ── Step 2: details ───────────────────────────────────── */
  return (
    <>
      <Header />
      <main className="px-5 pb-8 pt-6">
        <h1 className="text-xl font-bold">{tf('step2')}</h1>
        <button
          onClick={() => setStep('describe')}
          className="mt-1 text-xs text-neutral-500 underline underline-offset-4"
        >
          ← {tf('backToEdit')}
        </button>

        {/* Work types (parsed, read-only) */}
        <section className="mt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            {tf('workTypes')}
          </p>
          <div className="flex flex-wrap gap-2">
            {draft!.subtasks.map((s, i) => (
              <span
                key={i}
                className="rounded-full bg-[#1c1c1c] px-3.5 py-2 text-sm font-medium"
              >
                {s.title}
                <span className="ms-2 text-neutral-500">{categoryName(s.category, locale)}</span>
              </span>
            ))}
          </div>
          {draft!.area_sqm != null && (
            <p className="mt-2 text-sm text-neutral-500">
              {t('area')}: {draft!.area_sqm} m²
            </p>
          )}
        </section>

        {/* City */}
        <section className="mt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            📍 {t('city')}
          </p>
          <select
            value={draft!.cityId ?? ''}
            onChange={(e) => patchDraft({ cityId: e.target.value || null })}
            className="w-full rounded-2xl bg-[#161616] px-4 py-3.5 text-[15px] outline-none ring-tuki-500/50 focus:ring-2"
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
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            💰 {tf('budgetTo')}
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
            className="w-full rounded-2xl bg-[#161616] px-4 py-3.5 text-[15px] outline-none ring-tuki-500/50 placeholder:text-neutral-600 focus:ring-2"
          />
        </section>

        {/* Timeline */}
        <section className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            📅 {tf('when')}
          </p>
          <input
            value={timelineInput}
            onChange={(e) => {
              setTimelineInput(e.target.value);
              patchDraft({ timeline: e.target.value || null });
            }}
            placeholder={locale === 'he' ? 'בשבוע הבא' : locale === 'ru' ? 'на следующей неделе' : 'next week'}
            className="w-full rounded-2xl bg-[#161616] px-4 py-3.5 text-[15px] outline-none ring-tuki-500/50 placeholder:text-neutral-600 focus:ring-2"
          />
        </section>

        {/* Publish */}
        <div className="mt-8">
          {needAuth ? (
            <div className="space-y-2">
              <p className="text-center text-xs text-neutral-500">{tc('loginToPublish')}</p>
              <AuthForm onAuthed={publishNow} />
            </div>
          ) : (
            <button
              onClick={onPublish}
              disabled={!canPublish || publishing}
              className="w-full rounded-2xl bg-tuki-500 py-4 font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
            >
              {publishing ? tf('sending') : t('publish')}
            </button>
          )}
          {!canPublish && !needAuth && (
            <p className="mt-3 text-center text-xs text-neutral-600">{tc('needCityBudget')}</p>
          )}
        </div>
      </main>
    </>
  );
}
