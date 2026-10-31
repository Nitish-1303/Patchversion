import Link from 'next/link';
import { ApiMarquee, FeatureCarousel, HeroDashboard, Reveal, WorkflowTabs } from './components/Experience';
import { FeatureGrid, BentoSection, NavyBand, PageHeading, SplitSection } from './components/PageSections';

const homeCards = [
  { title: 'A change summary', body: 'The bundled example explains a recorded parameter rename in plain language with verified breaking change classification.' },
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
          <Reveal><span className="eyebrow-chip">API changes, made reviewable</span></Reveal>
          <Reveal delay={80}><h1>API changes.<br /><span>Proof in view.</span></h1></Reveal>
          <Reveal delay={160}><p>trypatchbay is a dependency migration platform for tracing breaking changes through code, generating deterministic patches, and verifying fixes.</p></Reveal>
          <Reveal delay={240}>
            <div className="hero-cta-group">
              <Link href="/signup" className="pill-button pill-button-dark hero-cta-btn">Start free scan</Link>
              <Link href="/dashboard" className="pill-button pill-button-light hero-cta-btn">View live demo</Link>
            </div>
          </Reveal>
        </div>
        <Reveal delay={160}><HeroDashboard /></Reveal>
      </section>

      <ApiMarquee />

      <FeatureGrid
        eyebrow="A SMALL, REVIEWABLE LOOP"
        title="From recorded change to local proof."
        description="The platform demonstrates automated breaking change discovery, AST call-site mapping, deterministic patches, and fail-closed GitHub delivery."
        cards={[
          { title: 'Notice the break', body: 'Detect breaking changes across upstream package versions and lockfile entries.' },
          { title: 'Find the usage', body: 'Map call sites with AST analysis to identify affected code paths.' },
          { title: 'Check the patch', body: 'Review minimal deterministic diffs alongside verified test output.' },
        ]}
      />

      <SplitSection
        eyebrow="SEE WHAT MOVED"
        title="A change summary with the code beside it."
        body="The workspace keeps the changed API contract, affected call sites, and proposed diff close together with single-use approval verification."
        caption="Illustrative layout · verified deterministic AST migration"
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

      <NavyBand
        eyebrow="DEPENDENCY MIGRATION"
        title="A calmer way to inspect an API change."
        body="TryPatchBay provides automated dependency migration with AST call-site analysis and deterministic patches. Workspaces and watch targets are securely persisted in PostgreSQL with tenant isolation."
        cta="Read how it works"
        href="/how-it-works"
      />

      <BentoSection
        eyebrow="WHAT THE PRODUCT DOES"
        title="Evidence you can read before you act."
        description="Core capabilities combine AST static analysis, lockfile dependency mapping, and tamper-evident proof bundles. Untrusted customer code execution remains strictly fail-closed until qualified microVM sandboxes are active."
        cards={homeCards}
      />

      <section className="faq-block content-width" id="faq">
        <PageHeading eyebrow="COMMON QUESTIONS" title="A few useful details." description="Honest overview of implemented capabilities, security boundaries, and planned milestones." />
        <div className="faq-list">
          <details><summary>Does trypatchbay watch APIs today?</summary><p>Package registries and breaking change records are tracked via configured watch targets. Live continuous provider polling is active for admitted packages.</p></details>
          <details><summary>Does the dashboard show account data?</summary><p>Yes. Authenticated users and workspaces are persisted in PostgreSQL. The dashboard displays connected repositories, package watch targets, and migration findings with tenant isolation.</p></details>
          <details><summary>Does trypatchbay open pull requests?</summary><p>Yes. Pull request delivery uses GitHub App installations with strict single-use human approvals, diff-hash enforcement, and delivery mutex locking.</p></details>
          <details><summary>Can trypatchbay execute untrusted customer code?</summary><p>No. Arbitrary customer code execution is fail-closed blocked on application hosts. Full red-to-green test execution is restricted to vetted repositories until containerized microVM isolation is provisioned.</p></details>
        </div>
        <Reveal className="faq-link"><Link href="/docs">Read the prototype docs</Link></Reveal>
      </section>
    </>
  );
}
