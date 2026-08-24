import { getTranslations, setRequestLocale } from 'next-intl/server';
import Header from '@/components/Header';
import type { Locale } from '@/i18n/routing';

export default async function NewTaskPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale as Locale);
  const t = await getTranslations('nav');

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-dashed border-neutral-300 p-12 dark:border-neutral-700">
          <p className="text-lg font-medium text-neutral-500">
            🚧 {t('newTask')} — M2
          </p>
        </div>
      </main>
    </>
  );
}
