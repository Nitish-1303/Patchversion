import { WorkflowTabs } from '../components/Experience';
import { FeatureGrid, NavyBand, PageHeading, SplitSection } from '../components/PageSections';

export default function HowItWorksPage() {
  return <>
    <section className="subpage-hero"><div className="content-width"><PageHeading eyebrow="HOW IT WORKS" title="Follow the proof, one step at a time." description="A four-part workflow shown on a local bundled fixture. Provider watching, sandboxed execution and pull request delivery are in development." /></div></section>
    <section className="section-block content-width"><WorkflowTabs /></section>
    <FeatureGrid eyebrow="THE CURRENT BOUNDARY" title="A working fixture, an unfinished product." description="Here is what the existing local prototype can demonstrate and what remains in development." cards={[
      { title: 'Recorded change', body: 'A bundled mock API migration provides a repeatable change to inspect.' },
      { title: 'Local analysis', body: 'The sample project is mapped locally. Live repository watching is not available.' },
      { title: 'Fixture proof', body: 'The bundled tests can be rerun against the proposed fixture patch. Sandboxing is not implemented.' },
    ]} />
    <SplitSection eyebrow="A HUMAN REVIEW STAYS CENTRAL" title="Evidence is there to support a decision." body="The intended product prepares a change for a person to inspect. The current local prototype does not open a pull request or make changes in a user's repository." caption="Review-first interface concept" lines={['Change context visible', 'Proposed diff inspectable', 'Human review remains required']} />
    <NavyBand title="Account-backed access is still in development." body="Authentication, repository authorization and persisted workspace data are not available. The dashboard route shows this limitation without loading sample account data." cta="Read getting started" href="/docs/getting-started" />
  </>;
}
