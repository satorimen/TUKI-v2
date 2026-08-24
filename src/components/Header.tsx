'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Header() {
  const t = useTranslations('nav');
  const common = useTranslations('common');

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-tuki-600">
          🛠 {common('appName')}
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium sm:flex">
          <Link href="/" className="text-neutral-600 hover:text-tuki-600 dark:text-neutral-300">
            {t('home')}
          </Link>
          <Link href="/new-task" className="text-neutral-600 hover:text-tuki-600 dark:text-neutral-300">
            {t('newTask')}
          </Link>
          <Link href="/master" className="text-neutral-600 hover:text-tuki-600 dark:text-neutral-300">
            {t('forMasters')}
          </Link>
        </nav>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
