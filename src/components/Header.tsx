'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import NotificationBell from '@/components/NotificationBell';

/** M3 small top app bar: surface bg, title, trailing icons */
export default function Header() {
  const common = useTranslations('common');

  return (
    <header className="sticky top-0 z-10 bg-surface">
      <div className="flex h-16 items-center justify-between gap-2 px-4">
        <Link href="/" className="text-[22px] font-medium text-on-surface">
          <span className="me-2">🛠</span>
          {common('appName')}
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <LanguageSwitcher />
          <Link
            href="/account"
            aria-label={common('appName')}
            className="ms-1 flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container text-sm text-on-secondary-container transition active:scale-90"
          >
            👤
          </Link>
        </div>
      </div>
    </header>
  );
}
