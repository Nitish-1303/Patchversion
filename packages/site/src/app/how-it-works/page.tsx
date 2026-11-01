import { WorkflowTabs } from '../components/Experience';
import { FeatureGrid, NavyBand, PageHeading, SplitSection } from '../components/PageSections';

export default function HowItWorksPage() {
  return <>
    <section className="subpage-hero"><div className="content-width"><PageHeading eyebrow="HOW IT WORKS" title="Follow the proof, one step at a time." description="A four-part workflow shown on a verified AST migration pipeline. Upstream contracts, call-site mapping, deterministic patches, and fail-closed human review." /></div></section>
    <section className="section-block content-width"><WorkflowTabs /></section>
    <FeatureGrid eyebrow="THE VERIFIED BOUNDARY" title="Deterministic rules, fail-closed boundaries." description="Here is what trypatchbay executes today and how safety is preserved across every step." cards={[
      { title: 'Recorded change', body: 'A structured change record defines the upstream API contract delta with verified parameters.' },
      { title: 'AST call-site mapping', body: 'Static TypeScript and JavaScript AST traversal maps matching call expressions across the codebase.' },
      { title: 'Isolated test proof', body: 'The proof loop validates baseline green, bump red, and patch green in an isolated execution runner.' },
    ]} />
    <SplitSection eyebrow="A HUMAN REVIEW STAYS CENTRAL" title="Evidence is there to support a decision." body="trypatchbay structures breaking change triage into an inspectable review gate. The platform pairs upstream change records with matched AST call sites and deterministic diffs before an operator signs off on delivery." caption="Review-first interface · verified AST migration cockpit" lines={['Change record verified', 'AST call-site mapped', 'Operator sign-off gate']} />
    <NavyBand eyebrow="TECHNICAL BOUNDARIES" title="Automated AST renames with fail-closed execution." body="Arbitrary customer code execution is disabled on application hosts. Full red-to-green test loops run in isolated environments for qualified fixtures." cta="Explore getting started" href="/docs/getting-started" />
  </>;
}
