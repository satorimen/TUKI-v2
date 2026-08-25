'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

interface Notification {
  id: string;
  text: string;
  link: string;
  read: boolean;
  createdAt: string;
}

/** Header bell: polls /api/notifications every 30s, dropdown on click */
export default function NotificationBell() {
  const t = useTranslations('notify');
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/api/notifications')
        .then((r) => r.json())
        .then((d) => alive && setItems(d.notifications ?? []))
        .catch(() => {});
    load();
    const timer = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const unread = items.filter((n) => !n.read).length;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await fetch('/api/notifications', { method: 'POST' });
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        aria-label={t('title')}
        className="relative rounded-lg p-1.5 text-xl transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full z-20 mt-2 w-72 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
          <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            {t('title')}
          </p>
          {items.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-neutral-400">{t('empty')}</p>
          )}
          <div className="max-h-72 overflow-y-auto">
            {items.map((n) => (
              <Link
                key={n.id}
                href={n.link as any}
                onClick={() => setOpen(false)}
                className={`block rounded-xl px-3 py-2.5 text-sm transition hover:bg-neutral-50 dark:hover:bg-neutral-800 ${
                  n.read ? 'text-neutral-500' : 'font-medium'
                }`}
              >
                {n.text}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
