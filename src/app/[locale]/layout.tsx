import type { Metadata } from 'next';
import { Rubik } from 'next/font/google';
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

export const metadata: Metadata = {
  title: 'TUKI — תיקונים ושיפוצים עם עוזר חכם',
  description:
    'מתארים את העבודה במילים שלכם — בעלי מקצוע מקומיים חוזרים עם הצעות מחיר. חינם ללקוחות.',
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
      </body>
    </html>
  );
}
