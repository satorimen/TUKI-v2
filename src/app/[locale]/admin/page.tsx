'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Header from '@/components/Header';
import AuthForm from '@/components/auth/AuthForm';

interface Stats {
  users: number;
  masters: number;
  tasksByStatus: Record<string, number>;
  bids: number;
  reviews: number;
  topMasters: { id: string; name: string; rating: number; reviewsCount: number; completedTasks: number }[];
}

/** /admin — platform dashboard: funnel + top masters (ADMIN_EMAILS access) */
export default function AdminPage() {
  const t = useTranslations('admin');
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'auth' }
    | { status: 'ok'; stats: Stats }
  >({ status: 'loading' });

  async function load() {
    const res = await fetch('/api/admin/stats');
    if (res.status === 401) return setState({ status: 'auth' });
    if (res.status === 403) return setState({ status: 'auth' }); // not an admin email
    const data = await res.json();
    setState({ status: 'ok', stats: data.stats });
  }

  useEffect(() => {
    load();
  }, []);

  const published = state.status === 'ok' ? (state.stats.tasksByStatus.published ?? 0) : 0;
  const assigned = state.status === 'ok' ? (state.stats.tasksByStatus.assigned ?? 0) : 0;
  const completed = state.status === 'ok' ? (state.stats.tasksByStatus.completed ?? 0) : 0;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        {state.status === 'loading' && <p className="text-on-surface-variant">…</p>}

        {state.status === 'auth' && (
          <div className="space-y-4 py-8">
            <p className="text-center text-on-surface-variant">{t('loginAsAdmin')}</p>
            <AuthForm onAuthed={load} />
          </div>
        )}

        {state.status === 'ok' && (
          <>
            <h1 className="text-2xl font-bold">{t('title')}</h1>

            {/* Funnel */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: t('published'), value: published, color: 'bg-primary' },
                { label: t('assigned'), value: assigned, color: 'bg-amber-500' },
                { label: t('completed'), value: completed, color: 'bg-green-600' },
              ].map(({ label, value, color }) => {
                const max = Math.max(published, assigned, completed, 1);
                return (
                  <div
                    key={label}
                    className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-outline-variant dark:bg-neutral-900"
                  >
                    <p className="text-3xl font-bold">{value}</p>
                    <p className="mb-2 text-sm text-on-surface-variant">{label}</p>
                    <div className="h-1.5 rounded-full bg-secondary-container dark:bg-secondary-container">
                      <div
                        className={`h-1.5 rounded-full ${color}`}
                        style={{ width: `${(value / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                [t('users'), state.stats.users],
                [t('masters'), state.stats.masters],
                [t('bids'), state.stats.bids],
                [t('reviews'), state.stats.reviews],
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  className="rounded-2xl border border-neutral-200 bg-white p-4 text-center dark:border-outline-variant dark:bg-neutral-900"
                >
                  <p className="text-2xl font-bold">{value as number}</p>
                  <p className="text-sm text-on-surface-variant">{label as string}</p>
                </div>
              ))}
            </div>

            {/* Top masters */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-outline-variant dark:bg-neutral-900">
              <h2 className="mb-3 font-bold">{t('topMasters')}</h2>
              <table className="w-full text-sm">
                <tbody>
                  {state.stats.topMasters.map((m, i) => (
                    <tr key={m.id} className="border-t border-neutral-100 dark:border-outline-variant">
                      <td className="py-2 pe-2 text-on-surface-variant">{i + 1}</td>
                      <td className="py-2 font-medium">{m.name}</td>
                      <td className="py-2 text-amber-500">★ {m.rating.toFixed(1)}</td>
                      <td className="py-2 text-on-surface-variant">{m.reviewsCount} 💬</td>
                      <td className="py-2 text-on-surface-variant">{m.completedTasks} ✅</td>
                    </tr>
                  ))}
                  {state.stats.topMasters.length === 0 && (
                    <tr>
                      <td className="py-4 text-center text-on-surface-variant">—</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </>
  );
}
