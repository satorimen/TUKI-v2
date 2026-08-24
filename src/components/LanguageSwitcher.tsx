'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { locales, type Locale } from '@/i18n/routing';

const LOCALE_LABELS: Record<Locale, string> = {
  he: 'עברית',
  ru: 'Русский',
  en: 'English',
};

export default function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  return (
    <select
      aria-label="Language"
      value={locale}
      onChange={(e) => {
        const next = e.target.value as Locale;
        // Keep the current path, switch only the locale
        router.replace(pathname, { locale: next });
      }}
      className="rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-tuki-500 dark:border-neutral-700 dark:text-neutral-300"
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {LOCALE_LABELS[l]}
        </option>
      ))}
    </select>
  );
}
