import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/'],
      },
      {
        userAgent: ['GPTBot', 'Claude-Web', 'PerplexityBot', 'Applebot', 'Google-Extended', 'CCBot'],
        allow: ['/', '/docs/', '/how-it-works/', '/product/', '/pricing/', '/changelog/', '/competitors/', '/llms.txt'],
        disallow: ['/api/', '/dashboard/'],
      },
    ],
    sitemap: 'https://trypatchbay.vercel.app/sitemap.xml',
  };
}
