'use client';

import { usePathname } from 'next/navigation';

function Logo() {
  return (
    <a href="/" className="flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="28" height="28" rx="6" fill="#4F46E5"/>
        <path d="M8 14h4l2-4 2 8 2-4h4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="font-display text-lg font-semibold tracking-tight">Patchversion</span>
    </a>
  );
}

function Header() {
  return (
    <header className="rule-b bg-background/95 backdrop-blur-sm sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Logo />
        <div className="hidden lg:flex items-center gap-1">
          <NavDropdown label="Product" items={[
            { label: 'API Monitoring', href: '/product#monitoring' },
            { label: 'Change Intelligence', href: '/product#intelligence' },
            { label: 'Impact Analysis', href: '/product#impact' },
            { label: 'AI Remediation', href: '/product#remediation' },
          ]} />
          <a href="/integrations" className="px-3 py-2 text-sm text-text-secondary hover:text-ink rounded-md transition-colors">Integrations</a>
          <a href="/how-it-works" className="px-3 py-2 text-sm text-text-secondary hover:text-ink rounded-md transition-colors">How It Works</a>
          <NavDropdown label="Developers" items={[
            { label: 'Documentation', href: '/docs' },
            { label: 'Quickstart', href: '/docs/quickstart' },
            { label: 'API Reference', href: '/api-reference' },
            { label: 'Changelog', href: '/changelog' },
          ]} />
          <a href="/pricing" className="px-3 py-2 text-sm text-text-secondary hover:text-ink rounded-md transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <a href="/docs" className="hidden sm:inline-block px-3 py-2 text-sm text-text-secondary hover:text-ink transition-colors">Documentation</a>
          <a href="/login" className="px-3 py-2 text-sm text-text-secondary hover:text-ink transition-colors">Sign In</a>
          <a href="/signup" className="btn-primary">Get Started</a>
        </div>
      </nav>
    </header>
  );
}

function NavDropdown({ label, items }: { label: string; items: { label: string; href: string }[] }) {
  return (
    <div className="relative group">
      <button className="px-3 py-2 text-sm text-text-secondary hover:text-ink rounded-md transition-colors flex items-center gap-1">
        {label}
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className="absolute left-0 top-full pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
        <div className="bg-surface border border-rule rounded-lg shadow-lg py-1 min-w-[200px]">
          {items.map(item => (
            <a key={item.href} href={item.href} className="block px-4 py-2 text-sm text-text-secondary hover:text-ink hover:bg-accent-light transition-colors">
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="rule-t mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          <div className="col-span-2">
            <Logo />
            <p className="mt-3 text-sm text-text-secondary italic">Your APIs change. Your code adapts.</p>
            <p className="mt-2 text-sm text-text-secondary">
              Automated maintenance layer between API providers and the applications that depend on them.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li><a href="/product" className="hover:text-ink">Overview</a></li>
              <li><a href="/product#monitoring" className="hover:text-ink">API Monitoring</a></li>
              <li><a href="/product#intelligence" className="hover:text-ink">Change Intelligence</a></li>
              <li><a href="/product#impact" className="hover:text-ink">Impact Analysis</a></li>
              <li><a href="/product#remediation" className="hover:text-ink">AI Remediation</a></li>
              <li><a href="/integrations" className="hover:text-ink">Integrations</a></li>
              <li><a href="/pricing" className="hover:text-ink">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Developers</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li><a href="/docs" className="hover:text-ink">Documentation</a></li>
              <li><a href="/docs/quickstart" className="hover:text-ink">Quickstart</a></li>
              <li><a href="/api-reference" className="hover:text-ink">API Reference</a></li>
              <li><a href="/changelog" className="hover:text-ink">Changelog</a></li>
              <li><a href="https://github.com/PatchBay-HQ" className="hover:text-ink">GitHub</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li><a href="/company" className="hover:text-ink">About</a></li>
              <li><a href="/company#contact" className="hover:text-ink">Contact</a></li>
              <li><a href="/company#blog" className="hover:text-ink">Blog</a></li>
              <li><a href="/company#careers" className="hover:text-ink">Careers</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li><a href="/security" className="hover:text-ink">Security</a></li>
              <li><a href="/security#privacy" className="hover:text-ink">Privacy Policy</a></li>
              <li><a href="/security#terms" className="hover:text-ink">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="rule-t mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-text-tertiary">&copy; 2026 Patchversion. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/') {
    // Split Sunset homepage renders its own header and footer.
    return <>{children}</>;
  }
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
