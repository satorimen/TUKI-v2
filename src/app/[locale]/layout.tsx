import type { Metadata } from 'next';
import { Rubik } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing, getDirection, type Locale } from '@/i18n/routing';
import '../globals.css';

// Rubik covers all three locales: Hebrew, Cyrillic (Russian) and Latin
const rubik = Rubik({
  subsets: ['hebrew', 'cyrillic', 'latin'],
  variable: '--font-heebo',
});

const META: Record<string, { title: string; description: string }> = {
  he: {
    title: 'TUKI — תיקונים ושיפוצים עם עוזר חכם',
    description:
      'מתארים את העבודה במילים שלכם — בעלי מקצוע מקומיים חוזרים עם הצעות מחיר. חינם ללקוחות, תמיד.',
  },
  ru: {
    title: 'TUKI — ремонт и стройка с умным ассистентом',
    description:
      'Опишите задачу своими словами — местные мастера пришлют предложения с ценами. Бесплатно для клиентов, навсегда.',
  },
  en: {
    title: 'TUKI — repairs & renovation with a smart assistant',
    description:
      'Describe the job in your own words — local pros reply with quotes. Free for customers, forever.',
  },
};

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const meta = META[locale] ?? META.he;
  return {
    ...meta,
    applicationName: 'TUKI',
    openGraph: { ...meta, type: 'website' },
  };
}

export const viewport = {
  themeColor: '#f97316',
  width: 'device-width',
  initialScale: 1,
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} dir={getDirection(locale)} className={rubik.variable}>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
