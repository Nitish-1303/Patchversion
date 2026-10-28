import { Reveal } from '../components/Experience';

export default function LoginPage() {
  return <section className="login-card"><Reveal><span className="eyebrow-chip">SIGN-IN UNAVAILABLE</span><h1>Sign in</h1><p>Authentication and account-backed workspaces are not implemented. This page does not enable authentication.</p><button className="pill-button pill-button-dark unavailable" disabled>Sign in is in development</button><p className="form-note">No account or repository access will be created.</p></Reveal></section>;
}
