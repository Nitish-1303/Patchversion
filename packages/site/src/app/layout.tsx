import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './fonts/fallbacks.css';
import './globals.css';
import Chrome from './Chrome';
import SmoothScroll from './components/SmoothScroll';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const manrope = localFont({
  src: [
    { path: './fonts/Manrope-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/Manrope-normal.woff2', weight: '600', style: 'normal' },
    { path: './fonts/Manrope-normal.woff2', weight: '700', style: 'normal' },
    { path: './fonts/Manrope-normal.woff2', weight: '800', style: 'normal' },
  ],
  style: 'normal',
  display: 'swap',
  fallback: ['Manrope Fallback'],
  declarations: [{ prop: 'unicode-range', value: 'u+0460-052f,u+1c80-1c8a,u+20b4,u+2de0-2dff,u+a640-a69f,u+fe2e-fe2f,u+0301,u+0400-045f,u+0490-0491,u+04b0-04b1,u+2116,u+0370-0377,u+037a-037f,u+0384-038a,u+038c,u+038e-03a1,u+03a3-03ff,u+0102-0103,u+0110-0111,u+0128-0129,u+0168-0169,u+01a0-01a1,u+01af-01b0,u+0300-0301,u+0303-0304,u+0308-0309,u+0323,u+0329,u+1ea0-1ef9,u+20ab,u+0100-02ba,u+02bd-02c5,u+02c7-02cc,u+02ce-02d7,u+02dd-02ff,u+0304,u+0308,u+0329,u+1d00-1dbf,u+1e00-1e9f,u+1ef2-1eff,u+2020,u+20a0-20ab,u+20ad-20c4,u+2113,u+2c60-2c7f,u+a720-a7ff,u+00??,u+0131,u+0152-0153,u+02bb-02bc,u+02c6,u+02da,u+02dc,u+0304,u+0308,u+0329,u+2000-206f,u+20ac,u+2122,u+2191,u+2193,u+2212,u+2215,u+feff,u+fffd' }],
  adjustFontFallback: false,
  variable: '--font-display',
});

const inter = localFont({
  src: [
    { path: './fonts/Inter-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/Inter-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/Inter-normal.woff2', weight: '600', style: 'normal' },
  ],
  style: 'normal',
  display: 'swap',
  fallback: ['Inter Fallback'],
  declarations: [{ prop: 'unicode-range', value: 'u+0460-052f,u+1c80-1c8a,u+20b4,u+2de0-2dff,u+a640-a69f,u+fe2e-fe2f,u+0301,u+0400-045f,u+0490-0491,u+04b0-04b1,u+2116,u+1f??,u+0370-0377,u+037a-037f,u+0384-038a,u+038c,u+038e-03a1,u+03a3-03ff,u+0102-0103,u+0110-0111,u+0128-0129,u+0168-0169,u+01a0-01a1,u+01af-01b0,u+0300-0301,u+0303-0304,u+0308-0309,u+0323,u+0329,u+1ea0-1ef9,u+20ab,u+0100-02ba,u+02bd-02c5,u+02c7-02cc,u+02ce-02d7,u+02dd-02ff,u+0304,u+0308,u+0329,u+1d00-1dbf,u+1e00-1e9f,u+1ef2-1eff,u+2020,u+20a0-20ab,u+20ad-20c4,u+2113,u+2c60-2c7f,u+a720-a7ff,u+00??,u+0131,u+0152-0153,u+02bb-02bc,u+02c6,u+02da,u+02dc,u+0304,u+0308,u+0329,u+2000-206f,u+20ac,u+2122,u+2191,u+2193,u+2212,u+2215,u+feff,u+fffd' }],
  adjustFontFallback: false,
  variable: '--font-body',
});

const DESCRIPTION =
  'Early-stage prototype. A local proof loop applies a rename fix for a recorded API change and reruns tests on a bundled fixture. Live watching and pull-request delivery are in development.';

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
