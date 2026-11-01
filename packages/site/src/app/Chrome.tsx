'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { SocialButtons } from './components/SocialIcons';

const LINKS = [
  { href: '/product', label: 'Product' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/integrations', label: 'Integrations' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
];

function Wordmark() {
  return (
    <Link href="/" className="wordmark" aria-label="trypatchbay home">
      <span className="brand-dot" aria-hidden="true" />
      <span className="brand-name">trypatchbay</span>
      <span className="badge badge-light" style={{ marginLeft: '8px', fontSize: '10px' }}>
        PROTOTYPE
      </span>
    </Link>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success'>('idle');

  return (
    <form
      className="newsletter-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (email) setStatus('success');
      }}
    >
      <input
        type="email"
        placeholder="you@company.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        aria-label="Email for occasional updates"
        required
      />
      <button type="submit" className="pill-button pill-button-dark">
        Follow updates
      </button>
      <span className="form-note" aria-live="polite">
        {status === 'success' ? 'Recorded locally · not connected to a mailing list' : 'No spam. Occasional build notes only.'}
      </span>
    </form>
  );
}

export default function Chrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
        <nav className="nav-container content-width" aria-label="Main navigation">
          <Wordmark />
          <div className="nav-links">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined} onClick={closeMenu}>
                {link.label}
              </Link>
            ))}
          </div>
          <div className="nav-actions">
            <Link href="/login" className="nav-signin-link" onClick={closeMenu}>
              Sign in
            </Link>
            <Link href="/signup" className="pill-button pill-button-dark nav-cta" onClick={closeMenu}>
              Start for free
            </Link>
          </div>
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
      <main id="main-content">{children}</main>
      <Footer />
    </>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top content-width">
        <div className="footer-intro">
          <Wordmark />
          <p className="footer-tagline">The migration platform for teams that ship.</p>
          <p className="footer-small">Requests, breaking changes, and deterministic patches in one calm workspace.</p>
          <div className="footer-status-row">
            <span className="footer-status-pill">
              <span className="status-live-dot" />
              All systems normal
            </span>
          </div>
          <SocialButtons
            className="footer-social-row"
            platforms={['x', 'discord', 'linkedin', 'slack', 'youtube']}
          />
        </div>
        <div className="footer-newsletter">
          <h2>Notes from the build</h2>
          <p>Occasional updates as the prototype takes shape.</p>
          <NewsletterForm />
        </div>
      </div>
      <div className="footer-links content-width">
        <div>
          <h3>Product</h3>
          <Link href="/product">Overview</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/integrations">Integrations</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/changelog">Changelog</Link>
          <span style={{ display: 'none' }}>API Monitoring (planned)</span>
          <span style={{ display: 'none' }}>Impact Analysis (prototype)</span>
          <span style={{ display: 'none' }}>AI Remediation (planned)</span>
        </div>
        <div>
          <h3>Company</h3>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/docs/security">Security</Link>
          <Link href="/competitors">Alternatives</Link>
        </div>
        <div>
          <h3>Docs</h3>
          <Link href="/docs">Documentation</Link>
          <Link href="/docs/getting-started">Getting started</Link>
          <Link href="/docs/concepts">Concepts</Link>
          <Link href="/login">Sign in preview</Link>
        </div>
        <div>
          <h3>Community</h3>
          <a href="https://x.com/trypatchbay" target="_blank" rel="noopener noreferrer">X (Twitter)</a>
          <a href="https://discord.gg/trypatchbay" target="_blank" rel="noopener noreferrer">Discord</a>
          <a href="https://linkedin.com/company/trypatchbay" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a href="https://join.slack.com/t/trypatchbay" target="_blank" rel="noopener noreferrer">Slack</a>
          <a href="https://youtube.com/@trypatchbay" target="_blank" rel="noopener noreferrer">YouTube</a>
        </div>
      </div>
      <div className="footer-bottom content-width">
        <span>© 2026 trypatchbay. All rights reserved.</span>
        <SocialButtons
          size={14}
          platforms={['x', 'discord', 'linkedin', 'slack', 'youtube']}
          className="footer-bottom-social"
        />
        <span className="footer-made-for">Made for teams that ship</span>
      </div>
    </footer>
  );
}
