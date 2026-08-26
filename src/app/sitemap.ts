import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://tuki.vercel.app';
  const now = new Date();
  const pages = ['', '/new-task', '/master', '/auth'];
  const locales = ['he', 'ru', 'en'];

  return pages.flatMap((page) =>
    locales.map((locale) => ({
      url: locale === 'he' ? `${base}${page}` : `${base}/${locale}${page}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: page === '' ? 1 : 0.7,
    }))
  );
}
