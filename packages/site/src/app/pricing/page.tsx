import { Reveal } from '../components/Experience';
import { DuskCtaBand, NavyBand, PageHeading, PricingMatrix } from '../components/PageSections';

export default function PricingPage() {
  return (
    <>
      <section className="subpage-hero">
        <div className="content-width">
          <PageHeading
            eyebrow="PRICING & COMMERCIAL MODEL"
            title="Simple, repository-based pricing."
            description="Honest pricing hypotheses. TryPatchBay charges per repository, not per developer seat, because dependency breaking changes and AST patches are repository-scoped."
          />
        </div>
      </section>

      <PricingMatrix />

      <section className="section-block content-width">
        <PageHeading
          eyebrow="COMMERCIAL DISCLOSURE"
          title="How TryPatchBay plans to make money."
          description="A direct overview of our monetization strategy, unit economics, and honest early-stage status for early evaluation."
        />

        <div className="feature-grid" style={{ marginTop: '40px' }}>
          <Reveal delay={0}>
            <div className="feature-card">
              <span className="small-label">UNIT ECONOMICS</span>
              <h3>Why Per-Repository?</h3>
              <p>
                Seat-based developer tools create friction; teams restrict licenses to save budget, blinding engineers to upstream breaking changes. By pricing per repository ($49/mo), costs align naturally with codebase complexity, lockfile size, and runner sandbox hours.
              </p>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="feature-card">
              <span className="small-label">CURRENT STATUS</span>
              <h3>$0 Revenue & 0 Paying Customers</h3>
              <p>
                TryPatchBay has 0 paying customers and $0 revenue today. The prototype demonstrates AST static analysis, call-site mapping, and deterministic patch generation on bundled fixtures only. Our $49/mo and $299/mo tiers are hypotheses to be validated through customer pilots.
              </p>
            </div>
          </Reveal>

          <Reveal delay={160}>
            <div className="feature-card">
              <span className="small-label">SECURITY BOUNDARY</span>
              <h3>Fail-Closed Runner Execution</h3>
              <p>
                Local fixture runs execute safely in the developer preview. Executing untrusted customer test suites in production requires qualified microVM sandboxes. Paid hosted plans will activate once containerized runner infrastructure is online.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section-block content-width" style={{ paddingTop: 0 }}>
        <div className="split-art-card" style={{ maxWidth: 840, margin: '0 auto', textAlign: 'left' }}>
          <span className="small-label" style={{ color: '#2b59ff' }}>PLANNED TIERS AT A GLANCE</span>
          <h3 style={{ fontSize: '22px', fontWeight: 700, margin: '10px 0 16px', color: 'var(--navy-deep)' }}>
            The 3 Commercial Tiers
          </h3>
          <div className="mini-flow">
            <div className="mini-flow-row">
              <span className="mini-flow-number">01</span>
              <div>
                <strong>Individual & Small Team Tier ($49/mo per repository):</strong> Up to 50 verified migration runs per month, automated breaking change discovery, AST call-site mapping, and single-use human PR approvals.
              </div>
            </div>
            <div className="mini-flow-row">
              <span className="mini-flow-number">02</span>
              <div>
                <strong>Organization Tier ($299/mo for unlimited repositories):</strong> Custom internal API migration rules, multi-member RBAC governance, priority runner execution, and tamper-evident proof audit trails.
              </div>
            </div>
            <div className="mini-flow-row">
              <span className="mini-flow-number">03</span>
              <div>
                <strong>Enterprise Contracts (Annual contracts, starting ~$15,000/yr):</strong> Dedicated microVM sandboxing runners, private npm / internal artifact registry support, custom SSO/SAML, and SOC 2 compliance readiness.
              </div>
            </div>
          </div>
          <p className="art-caption">
            * All prices reflect initial pricing hypotheses for customer pilots.
          </p>
        </div>
      </section>

      <section className="faq-block content-width" id="pricing-faq">
        <PageHeading
          eyebrow="COMMERCIAL FAQ"
          title="Frequently asked questions."
          description="Clear answers about billing, access, and our roadmap."
        />
        <div className="faq-list">
          <details>
            <summary>Can I use TryPatchBay for free today?</summary>
            <p>
              Yes. The local developer preview is completely free. You can run deterministic AST call-site scans, inspect diffs, and review isolated test proofs using bundled fixtures.
            </p>
          </details>
          <details>
            <summary>Are paid plans active right now?</summary>
            <p>
              No. No credit card billing or checkout flow is connected to this application. We are actively conducting developer interviews and pilot evaluations during early access.
            </p>
          </details>
          <details>
            <summary>What is counted as a &quot;verified migration run&quot;?</summary>
            <p>
              A migration run occurs when an upstream breaking change is identified, call sites are mapped via AST, a deterministic patch is synthesized, and the test suite executes from baseline red to passing green in an isolated proof loop.
            </p>
          </details>
          <details>
            <summary>How can I join the private pilot?</summary>
            <p>
              Early access partners can request sandbox evaluation by contacting us. We work directly with pilot teams to configure admitted package targets and custom migration rules.
            </p>
          </details>
        </div>
      </section>

      <NavyBand
        title="The product is not for sale yet."
        body="Paid access will be announced after core runner infrastructure is ready. No payment flow is connected."
        cta="Read the changelog"
        href="/changelog"
      />

      <DuskCtaBand
        title="Ready to test deterministic migrations?"
        subtitle="Start with our free local preview or request custom enterprise pilot evaluation."
      />
    </>
  );
}
