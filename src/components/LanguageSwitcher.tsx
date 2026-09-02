'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { locales, type Locale } from '@/i18n/routing';

/** Minimal pill switcher: עב / Рус / En */
export default function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  const SHORT: Record<Locale, string> = { he: 'עב', ru: 'Рус', en: 'En' };

  return (
    <div className="flex items-center gap-0.5 rounded-full bg-secondary-container p-0.5 text-xs font-medium">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => router.replace(pathname, { locale: l })}
          className={`rounded-full px-2.5 py-1 transition ${
            l === locale ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
          }`}
        >
          {SHORT[l]}
        </button>
      ))}
    </div>
  );
}
