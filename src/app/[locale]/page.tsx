import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import Header from '@/components/Header';
import type { Locale } from '@/i18n/routing';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('home');

  return (
    <>
      <Header />
      <main className="flex min-h-[80dvh] flex-col px-6 pt-14">
        <h1 className="text-[1.75rem] font-bold leading-snug">{t('heroTitle')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{t('heroSubtitle')}</p>

        {/* Primary action */}
        <div className="mt-auto pb-6 pt-10">
          <Link
            href="/new-task"
            className="block w-full rounded-2xl bg-primary py-4 text-center font-semibold text-white transition active:scale-[0.98]"
          >
            {t('ctaButton')}
          </Link>
          <p className="mt-3 text-center text-xs text-on-surface-variant/70">{t('freeForever')}</p>
        </div>

        {/* How it works — three short muted lines */}
        <div className="space-y-3 border-t border-outline-variant pb-6 pt-5">
          {[1, 2, 3].map((step) => (
            <p key={step} className="flex items-baseline gap-3 text-sm text-on-surface-variant">
              <span className="font-mono text-xs text-on-surface-variant/70">0{step}</span>
              {t(`step${step}Title` as any).replace(/^\d+\.\s*/, '')}
            </p>
          ))}
        </div>

        <Link
          href="/master"
          className="pb-8 text-center text-xs text-on-surface-variant/70 underline underline-offset-4"
        >
          {t('forMastersTitle')} →
        </Link>
      </main>
    </>
  );
}
