'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import Header from '@/components/Header';
import AuthForm from '@/components/auth/AuthForm';
import type { Profile } from '@/lib/db/types';

/** /account — visible auth entry: login/register or profile + logout */
export default function AccountPage() {
  const locale = useLocale();
  const t = useTranslations('account');
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load() {
    const me = await fetch('/api/auth/me').then((r) => r.json());
    setProfile(me.profile ?? null);
    if (me.profile) {
      setFullName(me.profile.fullName ?? '');
      setWhatsapp(me.profile.whatsappNumber ? `+${me.profile.whatsappNumber}` : '');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName || undefined, whatsapp: whatsapp || undefined }),
      });
      if (res.ok) {
        setSaved(true);
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setProfile(null);
    router.push('/');
  }

  /* ── not signed in ─────────────────────────────────────── */
  if (profile === null) {
    return (
      <>
        <Header />
        <main className="px-5 py-10">
          <h1 className="mb-1 text-xl font-bold">{t('title')}</h1>
          <p className="mb-6 text-sm text-neutral-500">{t('loginSubtitle')}</p>
          <AuthForm onAuthed={load} />
        </main>
      </>
    );
  }

  if (profile === undefined) {
    return (
      <>
        <Header />
        <main className="px-5 py-10 text-neutral-500">…</main>
      </>
    );
  }

  /* ── signed in ─────────────────────────────────────────── */
  return (
    <>
      <Header />
      <main className="px-5 py-8">
        <h1 className="text-xl font-bold">{t('title')}</h1>

        <section className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              {t('name')}
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="—"
              className="w-full rounded-2xl bg-[#161616] px-4 py-3.5 text-[15px] outline-none ring-tuki-500/50 focus:ring-2"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              {t('whatsapp')}
            </label>
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="050-1234567"
              dir="ltr"
              className="w-full rounded-2xl bg-[#161616] px-4 py-3.5 text-[15px] outline-none ring-tuki-500/50 placeholder:text-neutral-600 focus:ring-2"
            />
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-2xl bg-tuki-500 py-3.5 font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
          >
            {saved ? `✓ ${t('saved')}` : t('save')}
          </button>
        </section>

        {profile.role === 'master' && (
          <Link
            href="/master"
            className="mt-6 block rounded-2xl border border-neutral-800 px-4 py-3.5 text-sm font-medium"
          >
            👷 {t('masterCabinet')} →
          </Link>
        )}

        <button
          onClick={logout}
          className="mt-10 w-full rounded-2xl border border-neutral-800 py-3.5 text-sm font-medium text-neutral-400 transition active:scale-[0.98]"
        >
          {t('logout')}
        </button>

        <p className="mt-3 text-center font-mono text-[11px] text-neutral-600">
          {profile.email}
        </p>
      </main>
    </>
  );
}
