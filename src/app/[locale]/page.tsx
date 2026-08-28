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
      <main className="px-5 pb-6">
        {/* Hero */}
        <section className="pt-8">
          <p className="mb-2 text-sm font-medium text-tuki-500">{t('freeForever')}</p>
          <h1 className="text-[2rem] font-bold leading-tight">{t('heroTitle')}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-neutral-400">
            {t('heroSubtitle')}
          </p>
        </section>

        {/* CTA card */}
        <Link
          href="/new-task"
          className="mt-8 block rounded-3xl bg-gradient-to-br from-tuki-500 to-tuki-600 p-6 shadow-xl shadow-tuki-500/20 transition active:scale-[0.98]"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-3xl">
            🗣
          </div>
          <p className="text-lg font-bold text-white">{t('ctaButton')}</p>
          <p className="mt-1 text-sm text-white/70">עברית · Русский · English</p>
        </Link>

        {/* How it works — compact rows */}
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {t('howItWorksTitle')}
          </h2>
          <div className="space-y-2.5">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className="flex items-center gap-4 rounded-2xl bg-[#1c1c1c] p-4"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tuki-500/15 text-sm font-bold text-tuki-500">
                  {step}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {t(`step${step}Title` as any)}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
                    {t(`step${step}Text` as any)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* For masters */}
        <Link
          href="/master"
          className="mt-6 block rounded-2xl border border-neutral-800 p-4 transition active:scale-[0.98]"
        >
          <p className="font-semibold">
            👷 {t('forMastersTitle')}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">{t('forMastersText')}</p>
        </Link>
      </main>
    </>
  );
}
