'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

/**
 * Email + 6-digit code login.
 * Step 1: email → POST /api/auth/request-code (returns devCode in memory mode)
 * Step 2: code → POST /api/auth/verify → session cookie
 */
export default function AuthForm({ onAuthed }: { onAuthed?: () => void }) {
  const locale = useLocale();
  const t = useTranslations('auth');

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestCode() {
    if (!email.includes('@') || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDevCode(data.devCode ?? null);
      if (data.devCode) setCode(data.devCode);
      setStep('code');
    } catch {
      setError(t('invalidCode'));
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    if (code.length !== 6 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onAuthed?.();
    } catch {
      setError(t('invalidCode'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <h1 className="mb-1 text-xl font-bold">{t('title')}</h1>
      <p className="mb-5 text-sm text-neutral-500">{t('subtitle')}</p>

      {step === 'email' ? (
        <>
          <label className="mb-1 block text-sm font-medium">{t('emailLabel')}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && requestCode()}
            placeholder="you@example.com"
            dir="ltr"
            className="mb-4 w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2.5 outline-none focus:border-tuki-500 dark:border-neutral-600"
          />
          <button
            onClick={requestCode}
            disabled={loading || !email.includes('@')}
            className="w-full rounded-xl bg-tuki-500 py-3 font-semibold text-white transition hover:bg-tuki-600 disabled:opacity-40"
          >
            {t('requestCode')}
          </button>
        </>
      ) : (
        <>
          <label className="mb-1 block text-sm font-medium">{t('codeLabel')}</label>
          <input
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && verify()}
            dir="ltr"
            className="w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2.5 text-center text-2xl tracking-[0.5em] outline-none focus:border-tuki-500 dark:border-neutral-600"
          />
          {devCode && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-center text-sm text-amber-700 dark:bg-amber-900/30">
              {t('devCodeHint', { code: devCode })}
            </p>
          )}
          <button
            onClick={verify}
            disabled={loading || code.length !== 6}
            className="mt-4 w-full rounded-xl bg-tuki-500 py-3 font-semibold text-white transition hover:bg-tuki-600 disabled:opacity-40"
          >
            {t('verify')}
          </button>
        </>
      )}

      {error && <p className="mt-3 text-center text-sm text-red-500">{error}</p>}
    </div>
  );
}
