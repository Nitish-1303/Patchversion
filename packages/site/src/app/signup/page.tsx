'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Reveal } from '../components/Experience';
import { BrandIcon } from '../components/BrandIcons';

export default function SignupPage() {
  const router = useRouter();
  const [teamName, setTeamName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          tenantName: teamName,
          email,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed. Please try again.');
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
        <span className="eyebrow-chip">JOIN TRYPATCHBAY</span>
        <h1>Create an account</h1>
        <p>Set up an isolated workspace to detect breaking API changes, map repository dependencies, and generate verified PRs.</p>

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

        <form onSubmit={handleSignup} className="contact-form" style={{ marginTop: '20px' }}>
          <div>
            <label htmlFor="signup-team">Organization / Team name</label>
            <input
              id="signup-team"
              type="text"
              required
              placeholder="Acme Engineering"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              disabled={loading}
              style={{ marginTop: '6px' }}
            />
          </div>

          <div style={{ marginTop: '8px' }}>
            <label htmlFor="signup-email">Work email address</label>
            <input
              id="signup-email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@acme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              style={{ marginTop: '6px' }}
            />
          </div>

          <div style={{ marginTop: '8px' }}>
            <label htmlFor="signup-password">Password (minimum 8 characters)</label>
            <input
              id="signup-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
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
            {loading ? 'Creating Workspace...' : 'Create Account & Workspace'}
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

        <Link
          href="/api/github/onboarding"
          className="pill-button pill-button-dark social-auth-btn"
          style={{ width: '100%', textDecoration: 'none', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}
        >
          <BrandIcon name="github" size={18} />
          <span>Continue with GitHub App</span>
        </Link>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--body)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--navy)', fontWeight: 650, textDecoration: 'underline' }}>
            Sign in
          </Link>
        </div>

        <p className="form-note" style={{ marginTop: '16px', textAlign: 'center' }}>
          Repository permissions are not implemented for untrusted customer repositories.
        </p>
      </Reveal>
    </section>
  );
}
