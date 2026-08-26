import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // private/authenticated areas
        disallow: ['/api/', '/admin'],
      },
    ],
  };
}
