import { Reveal } from '../components/Experience';
import { BrandIcon } from '../components/BrandIcons';

export default function LoginPage() {
  return (
    <section className="login-card">
      <Reveal>
        <span className="eyebrow-chip">SIGN-IN UNAVAILABLE</span>
        <h1>Sign in</h1>
        <p>Authentication and account-backed workspaces are not implemented. This page does not enable authentication.</p>
        <button className="pill-button pill-button-dark unavailable social-auth-btn" disabled>
          <BrandIcon name="github" size={18} />
          <span>Sign in with GitHub (in development)</span>
        </button>
        <p className="form-note">No account or repository access will be created.</p>
      </Reveal>
    </section>
  );
}
