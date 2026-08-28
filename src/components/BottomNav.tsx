'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

/** Mobile app bottom tab bar: home / [+ new] / my tasks / masters */
export default function BottomNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const tabs = [
    { href: '/', icon: '🏠', label: t('home'), active: pathname === '/' },
    { href: '/master/feed', icon: '👷', label: t('forMasters'), active: pathname.startsWith('/master') },
    { href: '/my-tasks', icon: '📋', label: t('myTasks'), active: pathname.startsWith('/my-tasks') },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-800/80 bg-[#141414]/95 backdrop-blur-md">
      <div
        className="relative mx-auto flex max-w-md items-end justify-around px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2"
      >
        {/* Home tab */}
        <TabLink {...tabs[0]} />

        {/* Center FAB: new task */}
        <Link
          href="/new-task"
          aria-label={t('newTask')}
          className={`-mt-6 flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl font-light transition active:scale-90 ${
            pathname.startsWith('/new-task')
              ? 'bg-neutral-200 text-neutral-900'
              : 'bg-tuki-500 text-white'
          }`}
        >
          +
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
    <Link
      href={href as any}
      className={`flex w-16 flex-col items-center gap-0.5 rounded-xl py-1 text-[10px] leading-tight transition ${
        active ? 'text-tuki-400' : 'text-neutral-500'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}
