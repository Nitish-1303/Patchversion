import { Reveal } from '../components/Experience';
import { NavyBand, PageHeading } from '../components/PageSections';

export default function PricingPage() {
  return <>
    <section className="subpage-hero"><div className="content-width"><PageHeading eyebrow="PRICING" title="Paid plans only." description="trypatchbay will not have a free plan. Paid plan details and billing are not available while the product is in development." /></div></section>
    <section className="section-block content-width pricing-section">
      <Reveal><article className="pricing-card"><span className="small-label">PLANNED COMMERCIAL MODEL</span><h2>Paid plans</h2><p className="pricing-lead">No free plan</p><p>Pricing, plan limits and billing terms have not been set. The product is not available to purchase.</p><div className="pricing-rule" /><ul><li>Live repository watching: in development</li><li>Sandboxed runs: in development</li><li>Pull request delivery: in development</li><li>Local proof on bundled fixtures only: prototype</li></ul><span className="pill-button pill-button-dark unavailable" aria-disabled="true">Not available yet</span></article></Reveal>
      <div className="pricing-notes"><Reveal><h2>What the prototype includes</h2><p>The bundled sample demonstrates an API rename, local call-site mapping, a fixture patch and a test rerun. Those local capabilities do not represent a hosted plan or a customer service.</p></Reveal><Reveal delay={80}><h2>When pricing is ready</h2><p>Plan names, prices and billing terms will be published before paid access is offered. There is no free tier planned.</p></Reveal></div>
    </section>
    <NavyBand title="The product is not for sale yet." body="Paid access will be announced after the core product capabilities are ready. No billing flow is connected." cta="Read the changelog" href="/changelog" />
  </>;
}
