import Link from 'next/link';
import { ApiMarquee, FeatureCarousel, HeroDashboard, Reveal, WorkflowTabs } from './components/Experience';
import {
  WorkingProofPipeline,
  BentoSection,
  PageHeading,
  SplitSection,
  DuskCtaBand,
  PricingMatrix,
} from './components/PageSections';

const homeCards = [
  { title: 'A change summary', body: 'The engine explains recorded parameter renames in plain language with verified breaking change classification.' },
  { title: 'A call-site map', body: 'Static AST analysis maps matching call expressions across source code and lockfile dependencies.' },
  { title: 'A reviewable proof', body: 'The proof loop generates a minimal diff and captures baseline, red, and green test execution output.' },
];

const carouselItems = [
  { title: 'Read the change', body: 'A recorded change record explains what changed between two package versions.' },
  { title: 'Trace the usage', body: 'Static analysis maps matching call sites in the repository.' },
  { title: 'Inspect the patch', body: 'A deterministic AST patch generates the smallest relevant rename.' },
  { title: 'Check the evidence', body: 'The test suite runs in an isolated proof loop and reports before and after results.' },
];

export default function HomePage() {
  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <Reveal>
            <Link href="/changelog" className="hero-announcement-chip">
              <span className="announcement-tag">New</span>
              <span>trypatchbay 3.0 deterministic AST migration engine</span>
              <span style={{ color: '#2b59ff', marginLeft: 4 }}>→</span>
            </Link>
          </Reveal>
          <Reveal delay={80}><h1>The migration platform<br /><span>for teams that ship.</span></h1></Reveal>
          <Reveal delay={160}><p>Requests, breaking changes, and deterministic patches in one calm workspace. Free for teams up to 10.</p></Reveal>
          <Reveal delay={240}>
            <div className="hero-cta-group">
              <Link href="/signup" className="pill-button pill-button-dark hero-cta-btn">Start for free</Link>
              <Link href="/dashboard" className="pill-button pill-button-light hero-cta-btn">Open workspace</Link>
            </div>
          </Reveal>
        </div>
        <Reveal delay={160}><HeroDashboard /></Reveal>
      </section>

      <ApiMarquee />

      <WorkingProofPipeline />

      <SplitSection
        eyebrow="SEE WHAT MOVED"
        title="A change summary with the code beside it."
        body="The workspace keeps the changed API contract, affected call sites, and proposed diff close together with single-use approval verification."
        caption="Change triage cockpit · verified deterministic AST migration"
        lines={['Recorded API rename', 'src/createCharge.js mapped', 'Proposed deterministic diff']}
      />

      <section className="section-block content-width">
        <PageHeading eyebrow="THE PROOF LOOP" title="Move through the evidence at your pace." description="Each step is visible: baseline green, bump red, deterministic fix, and green re-test." />
        <FeatureCarousel items={carouselItems} />
      </section>

      <section className="section-block content-width">
        <PageHeading eyebrow="HOW THE PLATFORM IS SHAPED" title="Four steps. Clear boundaries." description="The interface follows a strict detect, map, patch and prove sequence with human approval before PR delivery." />
        <WorkflowTabs />
      </section>

      <BentoSection
        eyebrow="WHAT THE PRODUCT DOES"
        title="Evidence you can read before you act."
        description="Core capabilities combine AST static analysis, lockfile dependency mapping, and tamper-evident proof bundles. Untrusted customer code execution remains strictly fail-closed until qualified microVM sandboxes are active."
        cards={homeCards}
      />

      <PricingMatrix />

      <section className="faq-block content-width" id="faq">
        <PageHeading eyebrow="COMMON QUESTIONS" title="Answers before you ask." description="Honest overview of implemented capabilities, security boundaries, and planned milestones." />
        <div className="faq-list">
          <details><summary>Is the free plan really free?</summary><p>Yes. The free plan is completely free for teams up to 10 members with full AST call-site analysis, deterministic patch generation, and local proof verifications.</p></details>
          <details><summary>Does trypatchbay watch APIs today?</summary><p>Package registries and breaking change records are tracked via configured watch targets. Live continuous provider polling is active for admitted packages.</p></details>
          <details><summary>Does the dashboard show account data?</summary><p>Yes. Authenticated users and workspaces are persisted in PostgreSQL. The dashboard displays connected repositories, package watch targets, and migration findings with tenant isolation.</p></details>
          <details><summary>Does trypatchbay open pull requests?</summary><p>Yes. Pull request delivery uses GitHub App installations with strict single-use human approvals, diff-hash enforcement, and delivery mutex locking.</p></details>
          <details><summary>Can trypatchbay execute untrusted customer code?</summary><p>No. Arbitrary customer code execution is fail-closed blocked on application hosts. Full red-to-green test execution is restricted to vetted repositories until containerized microVM isolation is provisioned.</p></details>
        </div>
        <Reveal className="faq-link"><Link href="/docs">Explore product documentation</Link></Reveal>
      </section>

      <DuskCtaBand />
    </>
  );
}
