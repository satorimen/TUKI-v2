'use client';

import { useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import Header from '@/components/Header';
import AuthForm from '@/components/auth/AuthForm';

/** /auth — standalone sign-in page; redirects home when already signed in */
export default function AuthPage() {
  const locale = useLocale();
  const t = useTranslations('auth');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) router.push('/');
      })
      .catch(() => {});
  }, [router]);

  return (
    <>
      <Header />
      <main className="px-4 py-16">
        <AuthForm onAuthed={() => router.push(locale === 'he' ? '/master' : `/${locale}/master`)} />
      </main>
    </>
  );
}
