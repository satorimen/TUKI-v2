'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

/**
 * M3 Navigation bar (https://m3.material.io/components/navigation-bar):
 * pill-shaped active indicator (secondary-container) behind the icon,
 * central FAB as the primary action.
 */
export default function BottomNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const tabs = [
    { href: '/', icon: '🏠', label: t('home'), active: pathname === '/' },
    { href: '/master/feed', icon: '👷', label: t('forMasters'), active: pathname.startsWith('/master') },
    { href: '/my-tasks', icon: '📋', label: t('myTasks'), active: pathname.startsWith('/my-tasks') },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 bg-surface-container">
      <div className="relative mx-auto flex max-w-md items-end justify-around px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-3">
        <TabLink {...tabs[0]} />

        {/* M3 FAB: 56dp, 16dp radius */}
        <Link
          href="/new-task"
          aria-label={t('newTask')}
          className="-mt-7 flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary text-3xl font-light text-on-primary shadow-lg shadow-black/30 transition active:scale-90"
        >
          <span className="-mt-1">+</span>
        </Link>

        <TabLink {...tabs[1]} />
        <TabLink {...tabs[2]} />
      </div>
    </nav>
  );
}

function TabLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link href={href as any} className="flex w-[4.5rem] flex-col items-center gap-1 py-1">
      {/* M3 pill indicator: 64x32dp, secondary-container when active */}
      <span
        className={`flex h-8 w-16 items-center justify-center rounded-full text-xl transition-colors ${
          active ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'
        }`}
      >
        {icon}
      </span>
      <span
        className={`max-w-full truncate text-[11px] leading-none ${
          active ? 'font-semibold text-on-surface' : 'text-on-surface-variant'
        }`}
      >
        {label}
      </span>
    </Link>
  );
}
