'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import NotificationBell from '@/components/NotificationBell';

/** Minimal mobile-app top bar: logo + bell + language + account */
export default function Header() {
  const common = useTranslations('common');

  return (
    <header className="sticky top-0 z-10 bg-[#0d0d0d]/90 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2 px-5 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-tuki-500">
          <span className="text-xl">🛠</span>
          {common('appName')}
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <LanguageSwitcher />
          <Link
            href="/account"
            aria-label={common('appName')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-800 text-sm text-neutral-300 transition active:scale-90"
          >
            👤
          </Link>
        </div>
      </div>
    </header>
  );
}
