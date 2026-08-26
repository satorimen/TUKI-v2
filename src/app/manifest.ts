import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TUKI — תיקונים ושיפוצים',
    short_name: 'TUKI',
    description:
      'מתארים את העבודה במילים שלכם — בעלי מקצוע מקומיים חוזרים עם הצעות מחיר. חינם ללקוחות.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#f97316',
    lang: 'he',
    dir: 'rtl',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
