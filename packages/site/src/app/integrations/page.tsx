import { ApiMarquee, Reveal } from '../components/Experience';
import { FeatureGrid, NavyBand, PageHeading, SimpleCallout } from '../components/PageSections';

const examples = ['Stripe', 'OpenAI', 'Twilio', 'Shopify', 'GitHub', 'PostgreSQL'];

export default function IntegrationsPage() {
  return <>
    <section className="subpage-hero"><div className="content-width"><PageHeading eyebrow="INTEGRATIONS" title="APIs it can watch, eventually." description="These names are examples of APIs the product could cover in the future. No providers are connected, watched or endorsed by trypatchbay today." /></div></section>
    <ApiMarquee />
    <section className="section-block content-width"><PageHeading eyebrow="EXAMPLES ONLY" title="Names, not integrations." description="There are no live provider connections in this prototype. The examples below show the scope the product is designed to address." /><div className="feature-grid integration-list">{examples.slice(0, 3).map((name, index) => <Reveal key={name} delay={index * 80}><article className="feature-card"><span className="small-label">API IT COULD WATCH · EXAMPLE</span><h3>{name}</h3><p>Example provider name only. Integration and change watching are in development.</p></article></Reveal>)}</div><div className="feature-grid integration-list integration-list-lower">{examples.slice(3).map((name, index) => <Reveal key={name} delay={index * 80}><article className="feature-card"><span className="small-label">API IT COULD WATCH · EXAMPLE</span><h3>{name}</h3><p>Example provider name only. Integration and change watching are in development.</p></article></Reveal>)}</div></section>
    <FeatureGrid eyebrow="WHAT AN INTEGRATION WOULD NEED" title="Useful context before a change reaches code." description="The intended workflow starts from provider release information and matches it to dependency and API usage. None of these sources are connected yet." cards={[
      { title: 'Release context', body: 'Provider changelogs and version changes would establish what changed.' },
      { title: 'Code references', body: 'A repository map would connect an API change to potential call sites.' },
      { title: 'Review evidence', body: 'A proposed patch and test output would help a maintainer evaluate the change.' },
    ]} />
    <NavyBand title="No account connection is available." body="The integration surface is still a product direction. No account, provider, or repository data is connected." cta="Read how it works" href="/how-it-works" />
    <SimpleCallout title="Have a provider in mind?" body="Share feedback about which API changes are hardest to keep up with. Contact is a prototype page and does not send a message yet." href="/contact" label="Contact" />
  </>;
}
