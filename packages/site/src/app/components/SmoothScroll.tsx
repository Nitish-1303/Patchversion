'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (preference.matches) return;

    const lenis = new Lenis({
      autoRaf: true,
      duration: 1.1,
      // Anchor clicks scroll smoothly, offset clears the fixed 69px header.
      anchors: { offset: -88 },
      // Touch devices keep native scrolling (default); smooth wheel only.
    });
    return () => lenis.destroy();
  }, []);

  return <>{children}</>;
}
