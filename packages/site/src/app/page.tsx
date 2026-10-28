import Link from 'next/link';
import { ApiMarquee, FeatureCarousel, HeroDashboard, Reveal, UpdatesForm, WorkflowTabs } from './components/Experience';
import { FeatureGrid, NavyBand, PageHeading, SplitSection } from './components/PageSections';

const homeCards = [
  { title: 'A change summary', body: 'The bundled example explains a recorded parameter rename in plain language. Live changelog watching is in development.' },
  { title: 'A call-site map', body: 'The local sample shows which detectable code paths use the changed API shape. It does not scan connected repositories.' },
  { title: 'A reviewable proof', body: 'The fixture run includes a small diff and before/after test output. Sandboxed runs and PR delivery are in development.' },
];

const carouselItems = [
  { title: 'Read the change', body: 'A recorded fixture explains what changed between two example package versions.' },
  { title: 'Trace the usage', body: 'Local analysis maps matching call sites in the bundled sample repository.' },
  { title: 'Inspect the patch', body: 'A deterministic fixture patch demonstrates the smallest relevant rename.' },
  { title: 'Check the evidence', body: 'The sample test suite runs locally and reports its before and after results.' },
];

export default function HomePage() {
  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <Reveal><span className="eyebrow-chip">API changes, made reviewable</span></Reveal>
          <Reveal delay={80}><h1>API changes.<br /><span>Proof in view.</span></h1></Reveal>
          <Reveal delay={160}><p>trypatchbay is an early local prototype for tracing API changes through code and a testable patch.</p></Reveal>
          <Reveal delay={240}><UpdatesForm /></Reveal>
        </div>
        <Reveal delay={160}><HeroDashboard /></Reveal>
      </section>

      <ApiMarquee />

      <FeatureGrid
        eyebrow="A SMALL, REVIEWABLE LOOP"
        title="From recorded change to local proof."
        description="The prototype demonstrates this workflow on a bundled fixture. It does not watch live APIs or connect to repositories."
        cards={[
          { title: 'Notice the break', body: 'Start with a recorded change that alters an API call shape in the fixture.' },
          { title: 'Find the usage', body: 'Map the example call sites and make the affected code easy to inspect.' },
          { title: 'Check the patch', body: 'Review a minimal fix alongside the local fixture test output.' },
        ]}
      />

      <SplitSection
        eyebrow="SEE WHAT MOVED"
        title="A change summary with the code beside it."
        body="The sample view keeps the changed API shape, affected example call site and proposed diff close together. Repository watching and sandboxed runs are in development."
        caption="Illustrative layout · bundled fixture data only"
        lines={['Recorded API rename', 'src/createCharge.js mapped', 'Proposed local fixture diff']}
      />

      <section className="section-block content-width">
        <PageHeading eyebrow="THE LOCAL PROOF LOOP" title="Move through the evidence at your pace." description="Each step is visible. The current end-to-end run is limited to the bundled sample project." />
        <FeatureCarousel items={carouselItems} />
      </section>

      <section className="section-block content-width">
        <PageHeading eyebrow="HOW THE PROTOTYPE IS SHAPED" title="Four steps. Clear boundaries." description="The interface follows a simple detect, map, patch and prove sequence. Live watching and hosted execution are still being built." />
        <WorkflowTabs />
      </section>

      <NavyBand
        eyebrow="LOCAL FIXTURE PROOF"
        title="A calmer way to inspect an API change."
        body="The bundled fixture demonstrates one recorded migration locally. Account-backed dashboard access is unavailable while authentication and persistent storage are in development."
        cta="Read how it works"
        href="/how-it-works"
      />

      <FeatureGrid
        eyebrow="WHAT THE PRODUCT DOES"
        title="Evidence you can read before you act."
        description="These are product capabilities demonstrated by the local fixture or planned for later. Nothing is connected to a live repository today."
        cards={homeCards}
      />

      <section className="faq-block content-width" id="faq">
        <PageHeading eyebrow="COMMON QUESTIONS" title="A few useful details." description="The current prototype is intentionally small and local." />
        <div className="faq-list">
          <details><summary>Does trypatchbay watch APIs today?</summary><p>No. Live repository and provider watching is in development. The current proof loop starts from a bundled recorded fixture.</p></details>
          <details><summary>Does the dashboard show account data?</summary><p>No. Authentication and persistent application data are not implemented, so the dashboard route loads no repository, activity, or pull request data.</p></details>
          <details><summary>Does trypatchbay open pull requests?</summary><p>No. Pull request delivery and sandboxed runs are in development. The local prototype prepares proof artifacts for the bundled fixture.</p></details>
        </div>
        <Reveal className="faq-link"><Link href="/docs">Read the prototype docs</Link></Reveal>
      </section>
    </>
  );
}
