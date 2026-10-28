'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const LINKS = [
  { label: 'Product', href: '/product' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Integrations', href: '/integrations' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Docs', href: '/docs' },
];

function Wordmark({ onClick }: { onClick?: () => void } = {}) {
  return (
    <Link href="/" className="wordmark" aria-label="trypatchbay home" onClick={onClick}>
      <Image src="/favicon.svg" alt="" width={32} height={32} priority />
      <span>trypatchbay</span>
    </Link>
  );
}

function NewsletterForm() {
  const [message, setMessage] = useState('');
  return (
    <form
      className="newsletter-form"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage('Email updates are not connected in this prototype yet.');
      }}
    >
      <label className="sr-only" htmlFor="footer-email">Email address</label>
      <input id="footer-email" type="email" placeholder="Your email address" required />
      <button className="pill-button pill-button-light" type="submit">Get updates</button>
      <span className="form-note" aria-live="polite">{message || 'Email updates are in development.'}</span>
    </form>
  );
}

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScrolled(window.scrollY > 8));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
        <nav className="nav-wrap" aria-label="Main navigation">
          <Wordmark onClick={closeMenu} />
          <div className="nav-links">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined} onClick={closeMenu}>
                {link.label}
              </Link>
            ))}
          </div>
          <Link href="/contact" className="pill-button pill-button-dark nav-cta" onClick={closeMenu}>Talk to us</Link>
          <button
            className="menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>
        </nav>
        {menuOpen && (
          <div className="mobile-nav" id="mobile-nav">
            {LINKS.map((link) => <Link key={link.href} href={link.href} onClick={closeMenu}>{link.label}</Link>)}
            <Link href="/contact" onClick={closeMenu}>Talk to us</Link>
          </div>
        )}
      </header>
      <div className="nav-spacer" aria-hidden="true" />
    </>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top content-width">
        <div className="footer-intro">
          <Wordmark />
          <p>A local prototype for making API changes easier to understand.</p>
          <p className="footer-small">Repository watching, sandboxed runs and pull request delivery are in development.</p>
        </div>
        <div className="footer-newsletter">
          <h2>Notes from the build</h2>
          <p>Occasional updates as the prototype takes shape.</p>
          <NewsletterForm />
        </div>
      </div>
      <div className="footer-links content-width">
        <div><h3>Company</h3><Link href="/about">About</Link><Link href="/changelog">Changelog</Link><Link href="/contact">Contact</Link></div>
        <div><h3>Product</h3><Link href="/product">Overview</Link><Link href="/how-it-works">How it works</Link><Link href="/integrations">Integrations</Link><Link href="/pricing">Pricing</Link><span>API Monitoring (planned)</span><span>Impact Analysis (prototype)</span><span>AI Remediation (planned)</span></div>
        <div><h3>Docs</h3><Link href="/docs">Documentation</Link><Link href="/docs/getting-started">Getting started</Link><Link href="/docs/security">Security</Link><Link href="/login">Sign in preview</Link></div>
      </div>
      <div className="footer-bottom content-width">
        <span>© 2026 trypatchbay. All rights reserved.</span>
        <span>Early local prototype · no live repository connections</span>
      </div>
    </footer>
  );
}

export default function Chrome({ children }: { children: React.ReactNode }) {
  return <><Header /><main className="route-content">{children}</main><Footer /></>;
}
