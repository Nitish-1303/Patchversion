import type { MetadataRoute } from 'next';

const BASE_URL = 'https://trypatchbay.vercel.app';

const routes = [
  '',
  '/about',
  '/changelog',
  '/competitors',
  '/contact',
  '/docs',
  '/docs/concepts',
  '/docs/getting-started',
  '/docs/security',
  '/how-it-works',
  '/integrations',
  '/login',
  '/onboarding',
  '/pricing',
  '/product',
  '/signup',
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.7,
  }));
}
