import type { Metadata } from 'next';
import { Manrope, Inter } from 'next/font/google';
import './globals.css';
import Chrome from './Chrome';
import SmoothScroll from './components/SmoothScroll';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
});

const DESCRIPTION =
  'Detects third-party API changes, finds affected code in your repositories, and prepares tested fixes your team can review.';

export const metadata: Metadata = {
  metadataBase: new URL('https://trypatchbay.vercel.app'),
  title: 'PatchBay - Your APIs change. Your code keeps up.',
  description: DESCRIPTION,
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    title: 'PatchBay - Your APIs change. Your code keeps up.',
    description: DESCRIPTION,
    url: 'https://trypatchbay.vercel.app',
    siteName: 'PatchBay',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'PatchBay - Your APIs change. Your code keeps up.',
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable}`}>
      <body>
        <noscript><style>{`.reveal { opacity: 1 !important; transform: none !important; }`}</style></noscript>
        <SmoothScroll>
          <Chrome>{children}</Chrome>
        </SmoothScroll>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
