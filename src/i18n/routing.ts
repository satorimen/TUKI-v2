import { defineRouting } from 'next-intl/routing';

export const locales = ['he', 'ru', 'en'] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: 'he',
  localePrefix: 'as-needed',
});

/** Hebrew is RTL, Russian and English are LTR */
export function getDirection(locale: string): 'rtl' | 'ltr' {
  return locale === 'he' ? 'rtl' : 'ltr';
}
