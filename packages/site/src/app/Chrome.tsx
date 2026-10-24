'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { EASE, DURATION, STAGGER } from './components/motion';
import { usePathname } from 'next/navigation';

function Logo({ dark }: { dark: boolean }) {
  return (
    <a href="/" className="flex items-center gap-2.5 shrink-0">
      <img
        src={dark ? '/patchbay-lockup-navy.svg' : '/patchbay-lockup-on-navy.svg'}
        alt="PatchBay"
        className="h-8 w-auto rounded-md"
      />
    </a>
  );
}

const NAV_LINKS = [
  { label: 'Product', href: '/product' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Security', href: '/docs/security' },
  { label: 'FAQ', href: '/#faq' },
];

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === '/';

  useEffect(() => {
    const onScroll = () => {
      const hero = document.querySelector('main > div > section');
      const boundary = isHome && hero ? hero.getBoundingClientRect().bottom : 0;
      setScrolled(isHome ? boundary <= 70 : true);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  // On the homepage the nav floats over the hero image until scrolled.
  const floating = isHome && !scrolled && !menuOpen;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          floating
            ? 'bg-transparent border-b border-transparent'
            : 'bg-background/80 backdrop-blur-md border-b border-rule'
        }`}
      >
        <nav className="max-w-content mx-auto gutter h-[69px] flex items-center justify-between">
          <Logo dark={!floating} />
          <div className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                className={`px-3.5 py-2 text-[15px] rounded-full transition-colors ${
                  floating
                    ? 'text-white/85 hover:text-white'
                    : 'text-text-secondary hover:text-ink'
                } ${pathname === link.href ? 'font-semibold' : 'font-normal'}`}
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/contact"
              className={`pill-primary whitespace-nowrap !px-4 !py-2.5 ${
                floating ? '!bg-white !text-navy hover:!bg-pale' : ''
              }`}
            >
              Contact us
            </a>
            <button
              className={`lg:hidden p-2 transition-colors ${
                floating ? 'text-white' : 'text-text-secondary hover:text-ink'
              }`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? (
                <X size={20} strokeWidth={2} aria-hidden="true" />
              ) : (
                <Menu size={20} strokeWidth={2} aria-hidden="true" />
              )}
            </button>
          </div>
        </nav>
        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: reduceMotion ? 0 : DURATION.base, ease: EASE }}
              className="lg:hidden bg-background border-t border-rule gutter py-4"
            >
              {[...NAV_LINKS, { label: 'Contact us', href: '/contact' }].map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: reduceMotion ? 0 : DURATION.base,
                    ease: EASE,
                    delay: reduceMotion ? 0 : i * STAGGER,
                  }}
                >
                  <a
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2.5 text-[15px] text-text-secondary hover:text-ink hover:bg-accent-light rounded-lg transition-colors"
                  >
                    {link.label}
                  </a>
                </motion.div>
              ))}
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
      {/* Spacer keeps non-homepage content clear of the fixed nav; the homepage hero slides under it */}
      {!isHome && <div className="h-[69px]" />}
    </>
  );
}

function Footer() {
  return (
    <footer className="border-t border-rule bg-background">
      <div className="max-w-content mx-auto gutter py-16 lg:py-20">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10">
          <div className="col-span-2">
            <Logo dark />
            <p className="mt-4 text-[15px] leading-6 text-text-secondary italic">
              Your APIs change. Your code keeps up.
            </p>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              The maintenance layer between API providers and the applications that depend on them.
            </p>
          </div>
          <div>
            <h4 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink mb-4">Product</h4>
            <ul className="space-y-2.5 text-sm text-text-secondary">
              <li><a href="/product" className="hover:text-ink">Overview</a></li>
              <li><a href="/product#monitoring" className="hover:text-ink">API Monitoring</a></li>
              <li><a href="/product#impact" className="hover:text-ink">Impact Analysis</a></li>
              <li><a href="/product#remediation" className="hover:text-ink">AI Remediation</a></li>
              <li><a href="/integrations" className="hover:text-ink">Integrations</a></li>
              <li><a href="/pricing" className="hover:text-ink">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink mb-4">Developers</h4>
            <ul className="space-y-2.5 text-sm text-text-secondary">
              <li><a href="/docs" className="hover:text-ink">Documentation</a></li>
              <li><a href="/docs/getting-started" className="hover:text-ink">Getting Started</a></li>
              <li><a href="/changelog" className="hover:text-ink">Changelog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink mb-4">Company</h4>
            <ul className="space-y-2.5 text-sm text-text-secondary">
              <li><a href="/about" className="hover:text-ink">About</a></li>
              <li><a href="/contact" className="hover:text-ink">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink mb-4">Legal</h4>
            <ul className="space-y-2.5 text-sm text-text-secondary">
              <li><a href="/docs/security" className="hover:text-ink">Security</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-rule mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-text-tertiary">&copy; 2026 PatchBay. All rights reserved.</p>
          <p className="text-sm text-text-tertiary">In active development.</p>
        </div>
      </div>
    </footer>
  );
}

export default function Chrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <noscript><nav aria-label="Navigation without JavaScript" className="gutter pt-20 pb-4 flex flex-wrap gap-4">{NAV_LINKS.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}</nav></noscript><main>{children}</main>
      <Footer />
    </>
  );
}
