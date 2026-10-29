import Link from 'next/link';
import { Reveal } from '../components/Experience';
import { BrandIcon } from '../components/BrandIcons';

export default function SignupPage() {
  return (
    <section className="login-card">
      <Reveal>
        <span className="eyebrow-chip">ACCOUNT PREVIEW</span>
        <h1>Create an account</h1>
        <p>Sign-up, billing and repository onboarding are not available yet, and repository permissions are not implemented. trypatchbay is an early local prototype.</p>
        <button className="pill-button pill-button-dark unavailable social-auth-btn" disabled style={{ marginBottom: '14px' }}>
          <BrandIcon name="github" size={18} />
          <span>Continue with GitHub (in development)</span>
        </button>
        <br />
        <Link className="pill-button pill-button-light" href="/docs/getting-started">Read getting started</Link>
        <p className="form-note">There is no free plan. Paid plans are planned; pricing is not published.</p>
      </Reveal>
    </section>
  );
}
