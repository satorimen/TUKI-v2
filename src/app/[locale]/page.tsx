import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import Header from '@/components/Header';
import type { Locale } from '@/i18n/routing';

export default async function HomePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale as Locale);
  const t = await getTranslations('home');

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4">
        {/* Hero */}
        <section className="py-16 text-center sm:py-24">
          <p className="mb-3 inline-block rounded-full bg-tuki-100 px-4 py-1 text-sm font-medium text-tuki-700">
            {t('freeForever')}
          </p>
          <h1 className="mx-auto max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
            {t('heroTitle')}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
            {t('heroSubtitle')}
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/new-task"
              className="rounded-xl bg-tuki-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-tuki-500/30 transition hover:bg-tuki-600"
            >
              {t('ctaButton')} →
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="pb-16">
          <h2 className="mb-8 text-center text-2xl font-bold">{t('howItWorksTitle')}</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <h3 className="mb-2 font-semibold text-tuki-600">
                  {t(`step${step}Title` as any)}
                </h3>
                <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {t(`step${step}Text` as any)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* For masters */}
        <section className="mb-16 rounded-2xl bg-neutral-900 p-10 text-center text-white dark:bg-neutral-800">
          <h2 className="text-2xl font-bold">{t('forMastersTitle')}</h2>
          <p className="mx-auto mt-3 max-w-lg text-neutral-300">{t('forMastersText')}</p>
          <Link
            href="/master"
            className="mt-6 inline-block rounded-xl border-2 border-tuki-500 px-6 py-3 font-semibold text-tuki-400 transition hover:bg-tuki-500 hover:text-white"
          >
            {t('forMastersCta')}
          </Link>
        </section>
      </main>
    </>
  );
}
