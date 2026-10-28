import { Reveal } from '../../components/Experience';

export default function SecurityPage() {
  return <section className="plain-page"><article className="prose"><Reveal><span className="eyebrow-chip">DOCUMENTATION · SECURITY</span><h1>Security and execution.</h1><p>This page describes the current prototype boundary. It is not a security certification or a claim that hosted repository execution is available.</p></Reveal>
    <Reveal delay={80}><h2>Current prototype</h2><ul><li>The demo site has no repository connection or sign-in flow.</li><li>The dashboard route displays an unavailable state and loads no account, repository, fixture, activity, or pull request data.</li><li>The local proof command runs fixture code (bundled fixture trees only) in the local development environment; it is not sandboxed.</li><li>The prototype does not open or submit pull requests.</li></ul></Reveal>
    <Reveal delay={160}><h2>In development</h2><p>Repository access, sandboxed runs and pull request delivery are in development. They are not enabled by configuration or environment variables.</p></Reveal>
    <Reveal delay={240}><h2>Before connecting repositories</h2><p>There is no repository installation to authorize today. Permission scopes, isolation boundaries, retention behavior and incident handling must be documented before a hosted connection is offered.</p></Reveal>
  </article></section>;
}
