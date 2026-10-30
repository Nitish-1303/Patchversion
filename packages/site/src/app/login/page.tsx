'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Reveal } from '../components/Experience';
import { BrandIcon } from '../components/BrandIcons';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please check your credentials.');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'developer@trypatchbay.dev' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Demo login failed');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="login-card">
      <Reveal>
        <span className="eyebrow-chip">WORKSPACE ACCESS</span>
        <h1>Sign in</h1>
        <p>Access your repositories, API change monitors, and autonomous patch verification pipelines.</p>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              marginTop: '16px',
              borderRadius: '8px',
              backgroundColor: '#fee2e2',
              border: '1px solid #f87171',
              color: '#991b1b',
              fontSize: '13px',
              lineHeight: 1.4,
            }}
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="contact-form" style={{ marginTop: '20px' }}>
          <div>
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              placeholder="developer@acme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              style={{ marginTop: '6px' }}
            />
          </div>

          <div style={{ marginTop: '8px' }}>
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              style={{ marginTop: '6px' }}
            />
          </div>

          <button
            type="submit"
            className="pill-button pill-button-dark"
            disabled={loading}
            style={{ width: '100%', marginTop: '16px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Authenticating...' : 'Sign in to Workspace'}
          </button>
        </form>

        <div style={{ margin: '20px 0 16px', textAlign: 'center', position: 'relative' }}>
          <div style={{ height: '1px', background: 'var(--rule)', width: '100%' }} />
          <span
            style={{
              position: 'relative',
              top: '-10px',
              background: 'var(--white)',
              padding: '0 12px',
              fontSize: '11px',
              color: '#737996',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            or
          </span>
        </div>

        <button
          type="button"
          onClick={handleDemoLogin}
          className="pill-button pill-button-light"
          disabled={loading}
          style={{ width: '100%', marginBottom: '10px' }}
        >
          Quick Demo Sign-in (developer@trypatchbay.dev)
        </button>

        <Link
          href="/api/github/onboarding"
          className="pill-button pill-button-dark social-auth-btn"
          style={{ width: '100%', textDecoration: 'none', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}
        >
          <BrandIcon name="github" size={18} />
          <span>Sign in with GitHub App</span>
        </Link>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--body)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: 'var(--navy)', fontWeight: 650, textDecoration: 'underline' }}>
            Create an account
          </Link>
        </div>

        <p className="form-note" style={{ marginTop: '16px', textAlign: 'center' }}>
          Authentication and account-backed workspaces are not implemented for untrusted remote hosts; this page does not enable host execution.
        </p>
      </Reveal>
    </section>
  );
}
