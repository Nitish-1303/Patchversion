import type { Metadata } from 'next';
import { ArrowRight, Check, X, FolderGit2, FileDiff, FlaskConical, GitPullRequest, Store, Bot, FileJson, PackageOpen, Search, ShieldCheck } from 'lucide-react';
import Reveal from './components/Reveal';
import StageTabs from './components/StageTabs';
import FAQ from './components/FAQ';
import MigrationDemo from './components/MigrationDemo';
import BrandLogo from './components/BrandLogo';

/* ---------------------------------- mocks ---------------------------------- */

function DashboardMock() {
  return (
    <div className="rounded-[28px] bg-white border border-rule shadow-soft overflow-hidden">
      {/* window bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-rule bg-accent-light/60">
        <div className="flex gap-2">
          <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
          <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
          <span className="w-3 h-3 rounded-full bg-[#27CA40]" />
        </div>
        <span className="text-[13px] font-medium text-text-secondary">
          trypatchbay proof run &middot; mockpay 1.0.0 &rarr; 2.0.0
        </span>
        <span className="ml-auto badge-success">verified fixture run</span>
      </div>

      {/* stage stepper */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-6 lg:px-8 pt-6 text-[12px] font-semibold uppercase tracking-[0.12em]">
        {['Detect', 'Analyze', 'Patch', 'Test', 'Verify', 'Review'].map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 ${s === 'Verify' ? 'bg-navy text-white' : 'bg-accent-light text-navy/70'}`}>{s}</span>
            {i < 5 && <ArrowRight size={13} strokeWidth={2} className="text-rule-strong" aria-hidden="true" />}
          </span>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-4 p-6 lg:p-8">
        {/* break card */}
        <div className="lg:col-span-2 rounded-2xl border border-rule bg-background p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-error mb-2">Break detected</p>
          <p className="font-display font-semibold text-ink leading-snug mb-2">
            mockpay 2.0.0 renames <span className="font-mono text-[14px]">source</span> to <span className="font-mono text-[14px]">payment_method</span>
          </p>
          <p className="text-sm text-text-secondary leading-6">
            Calls still passing the old parameter throw after the upgrade: Missing required parameter: payment_method.
          </p>
          <div className="mt-4 pt-4 border-t border-rule space-y-2 font-mono text-[12px] text-text-secondary">
            <div className="flex justify-between"><span>src/createCharge.js</span><span className="text-error">:4</span></div>
            <div className="flex justify-between"><span>src/createCharge.js</span><span className="text-text-tertiary">:14 not affected</span></div>
          </div>
        </div>

        {/* verification card */}
        <div className="lg:col-span-2 rounded-2xl bg-navy-deep p-5 text-white">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/50 mb-2">Proof</p>
          <p className="font-display font-semibold leading-snug mb-4">Rerun of the repo&rsquo;s own test suite, before and after the patch</p>
          <div className="space-y-3 font-mono text-[13px]">
            <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              <span className="text-white/70">before patch</span>
              <span className="text-[#FF8A8A]">2 failing</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              <span className="text-white/70">after patch</span>
              <span className="text-[#7EE2A0]">3 / 3 passing</span>
            </div>
            <p className="text-white/40 text-[12px]">npm run prove &middot; exit code 0</p>
          </div>
        </div>

        {/* PR card */}
        <div className="lg:col-span-1 rounded-2xl border border-rule bg-background p-5 flex flex-col">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-text-tertiary mb-2">Pull request</p>
          <p className="font-display font-semibold text-ink leading-snug mb-3">Fix: mockpay 1.0.0 &rarr; 2.0.0</p>
          <ul className="space-y-2 text-[13px] text-text-secondary flex-1">
            <li className="flex gap-2 items-start"><Check size={15} strokeWidth={2} className="text-success shrink-0 mt-0.5" aria-hidden="true" />Full diff, 1 file</li>
            <li className="flex gap-2 items-start"><Check size={15} strokeWidth={2} className="text-success shrink-0 mt-0.5" aria-hidden="true" />Before/after test output</li>
            <li className="flex gap-2 items-start"><Check size={15} strokeWidth={2} className="text-success shrink-0 mt-0.5" aria-hidden="true" />Coverage honesty block</li>
          </ul>
          <p className="mt-4 text-[12px] text-text-tertiary">PR delivery in development</p>
        </div>
      </div>
    </div>
  );
}

function TerminalMock() {
  return (
    <div className="rounded-3xl bg-navy-deep overflow-hidden shadow-soft">
      <div className="flex items-center gap-2 px-5 py-3.5 bg-white/5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#27CA40]" />
        <span className="ml-2 text-[12px] font-mono text-white/40">verification run</span>
      </div>
      <div className="p-6 font-mono text-[13px] leading-7 overflow-x-auto">
        <div className="text-white/40">$ npm run prove</div>
        <div className="text-white/70">change: mockpay 1.0.0 &rarr; 2.0.0 &middot; fixtures/sample-repo</div>
        <div className="text-white/70">baseline (1.0.0): 3 passed, 0 failed</div>
        <div className="text-[#FF8A8A]"><X size={14} strokeWidth={2} className="inline" aria-hidden="true" /> bumped (2.0.0): 1 passed, 2 failed</div>
        <div className="text-[#FF8A8A]">&nbsp;&nbsp;Missing required parameter: payment_method</div>
        <div className="mt-3 text-white/70">fixing src/createCharge.js&hellip; rerunning suite&hellip;</div>
        <div className="text-[#7EE2A0]"><Check size={14} strokeWidth={2} className="inline" aria-hidden="true" /> after fix (2.0.0): 3 passed, 0 failed</div>
        <div className="text-white/40">PROOF VALID &middot; exit code 0</div>
      </div>
    </div>
  );
}

function ImpactMapMock() {
  return (
    <div className="rounded-3xl bg-white border border-rule shadow-card p-6">
      <p className="font-mono text-xs uppercase tracking-widest text-text-tertiary mb-4">Repository impact map</p>
      <div className="font-mono text-[13px] leading-8">
        <p className="text-text-tertiary">src/</p>
        <p className="pl-4 text-text-tertiary">app/</p>
        <p className="pl-8 text-text-secondary">page.tsx</p>
        <p className="pl-4 text-text-secondary">checkout/</p>
        <p className="pl-8 rounded-lg bg-error-bg text-error px-2 -mx-2 flex justify-between"><span>createSession.ts</span><span className="text-xs self-center font-semibold">affected :14</span></p>
        <p className="pl-8 rounded-lg bg-error-bg text-error px-2 -mx-2 flex justify-between"><span>retrySession.ts</span><span className="text-xs self-center font-semibold">affected :41</span></p>
        <p className="pl-4 text-text-tertiary">webhooks/</p>
        <p className="pl-8 text-text-secondary">handler.ts <span className="text-success text-xs font-semibold">clean</span></p>
      </div>
      <p className="mt-4 pt-4 border-t border-rule text-sm text-text-secondary">Illustrative call-site map. Paths and line numbers are examples.</p>
    </div>
  );
}

function DiffMock() {
  return (
    <div className="rounded-3xl bg-white border border-rule shadow-card overflow-hidden">
      <div className="flex flex-wrap gap-2 items-center justify-between px-6 py-4 border-b border-rule">
        <p className="font-mono text-[13px] text-text-secondary">src/createCharge.js</p>
        <span className="badge bg-accent-light text-navy">minimal diff</span>
      </div>
      <div className="bg-code-bg p-5 font-mono text-[12.5px] leading-6 overflow-x-auto">
        <p className="text-code-text/50">  3  async function createCharge(amount, currency, source) {'{'}</p>
        <p className="text-code-text/50">  4&nbsp;&nbsp;&nbsp;const charge = await mockpay.charges.create({'{'}</p>
        <p className="text-[#F08585] bg-[#F08585]/10 -mx-5 px-5">- 6&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;source: source,</p>
        <p className="text-[#8ADCB0] bg-[#8ADCB0]/10 -mx-5 px-5">+ 6&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;payment_method: source,</p>
        <p className="text-code-text/50">  7&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;description: &apos;Payment for order&apos;</p>
        <p className="text-code-text/50">  8&nbsp;&nbsp;&nbsp;{'}'});</p>
      </div>
      <p className="px-6 py-4 text-sm text-text-secondary border-t border-rule">Only the broken lines change. Nothing else in the file is touched.</p>
    </div>
  );
}

function TestRunMock() {
  return (
    <div className="rounded-3xl bg-navy-deep overflow-hidden shadow-soft">
      <div className="flex items-center gap-2 px-5 py-3.5 bg-white/5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#27CA40]" />
        <span className="ml-2 text-[12px] font-mono text-white/40">verified fixture run</span>
      </div>
      <div className="p-6 font-mono text-[13px] leading-7 overflow-x-auto">
        <div className="text-white/40">$ npm test</div>
        <div className="text-white/70">running 3 tests against patched code&hellip;</div>
        <div className="text-white/50">src/createCharge.test.js &middot; 3 tests</div>
        <div className="mt-2 text-[#7EE2A0]"><Check size={14} strokeWidth={2} className="inline" aria-hidden="true" /> 3/3 passing &middot; finished in 0.3s</div>
      </div>
    </div>
  );
}

function EvidenceMock() {
  return (
    <div className="rounded-3xl bg-white border border-rule shadow-card overflow-hidden">
      <div className="px-6 py-4 border-b border-rule flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center text-[13px] font-semibold">PB</span>
        <div>
          <p className="text-[14px] font-semibold text-ink">Fix: mockpay 1.0.0 &rarr; 2.0.0 (1 call site)</p>
          <p className="text-[12px] text-text-tertiary">trypatchbay &middot; evidence attached</p>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="rounded-xl bg-code-bg p-4 font-mono text-[12.5px] leading-6 overflow-x-auto">
          <div className="text-[#FF8A8A]">-  source: source,</div>
          <div className="text-[#7EE2A0]">+  payment_method: source,</div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div className="rounded-xl bg-error-bg px-4 py-3"><span className="font-semibold text-error">Before</span><br /><span className="text-text-secondary">2 tests failing</span></div>
          <div className="rounded-xl bg-success-bg px-4 py-3"><span className="font-semibold text-success">After</span><br /><span className="text-text-secondary">3/3 passing</span></div>
        </div>
        <p className="text-[13px] text-text-secondary">Call sites, the full diff and raw test output are prepared locally with PR text. GitHub PR delivery is planned.</p>
      </div>
    </div>
  );
}

/* ---------------------------------- page ---------------------------------- */

const STAGES = [
  { name: 'Detect', desc: 'A provider ships a change that breaks an API shape your code uses. Continuous watching is in development; detection runs today on recorded changes.', status: 'Proven locally' },
  { name: 'Analyze', desc: 'Static analysis lists the call sites it can see that touch the changed surface, down to the line. Coverage is partial: dynamic or indirect use can be missed.', status: 'Proven locally' },
  { name: 'Patch', desc: 'A minimal diff that changes only what the break requires.', status: 'Proven locally' },
  { name: 'Test', desc: 'The bundled fixture test suite runs against the rename-only patch in a local process with no isolation.', status: 'Proven locally' },
  { name: 'Verify', desc: 'Before and after outputs compared. Green, or no PR.', status: 'Proven locally' },
  { name: 'Review', desc: 'A pull request with the evidence attached. Today this is a local artifact only; nothing is opened on GitHub.', status: 'In development' },
];

type SourceEntry =
  | { kind: 'brand'; brand: 'stripe' | 'twilio' | 'npm'; name: string; note: string }
  | { kind: 'icon'; icon: 'store' | 'bot' | 'openapi'; name: string; note: string };

const SOURCES: SourceEntry[] = [
  { kind: 'brand', brand: 'stripe', name: 'Stripe', note: 'Versioned API with published upgrade guides. Live watching in development.' },
  { kind: 'icon', icon: 'store', name: 'Shopify', note: 'Quarterly API releases with forced version upgrades for apps.' },
  { kind: 'brand', brand: 'twilio', name: 'Twilio', note: 'Deprecation notices and helper-library majors.' },
  { kind: 'icon', icon: 'bot', name: 'OpenAI', note: 'Model deprecations and SDK breaking changes.' },
  { kind: 'brand', brand: 'npm', name: 'npm packages', note: 'Semver majors with breaking changelogs.' },
  { kind: 'icon', icon: 'openapi', name: 'OpenAPI specs', note: 'Spec diffs that flag removed fields and changed types.' },
];

export const metadata: Metadata = {
  alternates: { canonical: 'https://trypatchbay.vercel.app' },
};

export default function HomePage() {
  return (
    <div className="bg-background text-ink">

      {/* ------------------------------ HERO ------------------------------ */}
      <section className="relative min-h-[100svh] flex flex-col">
        <div className="absolute inset-0">
          <img src="/hero-sky.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-navy-deep/70 via-navy/55 to-navy-deep/75" />
        </div>
        <div className="relative flex-1 flex flex-col items-center justify-center text-center gutter pt-32 pb-56 lg:pb-64">
          <Reveal>
            <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium text-white/90">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7EE2A0] inline-block" />
              Proof loop verified locally &middot; fixture run, 3/3 tests
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-8 font-display font-bold text-white text-[clamp(2.6rem,6.5vw,4.3rem)] leading-[1.08] tracking-[-0.02em] max-w-4xl">
              Breaking changes.<br />Meet your match.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 text-lg leading-8 text-white/80 max-w-xl">
              An early-stage prototype for breaking SDK changes. Today a local proof loop maps call sites, applies a rename fix and reruns the tests on a bundled fixture. Live watching and pull-request delivery are in development.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
              <a href="#proof" className="pill-light">See the verified run</a>
              <a href="/how-it-works" className="pill-outline">How it works</a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* --------------------------- DASHBOARD MOCK ---------------------------- */}
      <section id="proof" className="relative z-10 -mt-44 lg:-mt-52 gutter">
        <Reveal className="max-w-content mx-auto">
          <DashboardMock />
          <p className="mt-4 text-center text-[13px] text-text-tertiary">
            Real output from the bundled end-to-end proof run (runs/latest/proof.json); the fixture dependency stands in for a live provider. Hosted dashboard in development.
          </p>
        </Reveal>
      </section>

      {/* --------------------------- WHY THIS EXISTS --------------------------- */}
      <section className="gutter py-28 lg:py-36">
        <div className="max-w-content mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto">
            <p className="eyebrow mb-4">Why this exists</p>
            <h2 className="font-display font-semibold text-[clamp(1.9rem,4vw,3rem)] leading-[1.15] tracking-[-0.01em]">
              Providers ship breaking changes on their schedule. The breakage lands on yours.
            </h2>
          </Reveal>
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            <Reveal delay={0} className="h-full">
              <div className="card h-full !p-8">
                <h3 className="font-display font-semibold text-lg mb-3">Forced upgrades are routine</h3>
                <p className="text-[15px] leading-7 text-text-secondary">
                  Shopify releases a new API version every quarter and stops supporting old ones on a fixed date. Stripe pins every account to a version and publishes breaking-change upgrade guides.
                </p>
              </div>
            </Reveal>
            <Reveal delay={100} className="h-full">
              <div className="card h-full !p-8">
                <h3 className="font-display font-semibold text-lg mb-3">Version bumps don&rsquo;t prove anything</h3>
                <p className="text-[15px] leading-7 text-text-secondary">
                  An update PR can trigger your CI, but the version bump alone is not proof that the migration works. A reviewer still needs the diff and test evidence.
                </p>
              </div>
            </Reveal>
            <Reveal delay={200} className="h-full">
              <div className="card h-full !p-8">
                <h3 className="font-display font-semibold text-lg mb-3">The cost lands in production</h3>
                <p className="text-[15px] leading-7 text-text-secondary">
                  Y Combinator&rsquo;s Request for Startups calls self-maintaining APIs an open problem: unnoticed external changes are a real source of downtime, and nobody owns the fix.
                </p>
              </div>
            </Reveal>
          </div>

          {/* Manual vs PatchBay */}
          <Reveal delay={150} className="mt-16">
            <div className="rounded-4xl border border-rule bg-white overflow-hidden">
              <div className="grid md:grid-cols-[1.1fr_1fr_1fr] text-sm">
                <div className="px-7 py-5 border-b border-rule font-display font-semibold text-ink">The same upgrade</div>
                <div className="px-7 py-5 border-b border-rule font-display font-semibold text-text-secondary">The manual way</div>
                <div className="px-7 py-5 border-b border-rule font-display font-semibold text-navy bg-accent-light/50">The trypatchbay way</div>
                {[
                  ['Understand what broke', 'Read the changelog and the migration guide, line by line.', 'The breaking change is detected and explained.'],
                  ['Find affected code', 'Grep the repo and hope the search terms catch every call site.', 'Call sites found by static analysis are listed. Dynamic or indirect use can be missed.'],
                  ['Update the implementation', 'Rewrite each call by hand, file by file.', 'A migration patch is proposed for review.'],
                  ['Prove it works', 'Run the tests, debug the failures, rerun until green.', 'Bundled fixture tests rerun before and after a rename-only patch, with local output.'],
                  ['Prepare the review', 'Write up the PR and summarize what changed and why it is safe.', 'PR text, the diff and test evidence are prepared locally. GitHub delivery is planned.'],
                ].map(([step, manual, pb]) => (
                  <div key={step} className="contents">
                    <div className="px-7 py-4 border-b border-rule font-medium text-ink">{step}</div>
                    <div className="px-7 py-4 border-b border-rule text-text-secondary">{manual}</div>
                    <div className="px-7 py-4 border-b border-rule text-navy bg-accent-light/50">{pb}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ----------------------------- SIX STAGES ----------------------------- */}
      <section className="gutter py-28 lg:py-36 bg-white border-y border-rule">
        <div className="max-w-content mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto">
            <p className="eyebrow mb-4">The loop</p>
            <h2 className="font-display font-semibold text-[clamp(1.9rem,4vw,3rem)] leading-[1.15] tracking-[-0.01em]">
              Six stages, one rule: proof before the PR
            </h2>
          </Reveal>
          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {STAGES.map((stage, i) => (
              <Reveal key={stage.name} delay={i * 60} className="h-full">
                <div className="h-full rounded-2xl border border-rule bg-background p-8 transition-shadow duration-200 hover:shadow-card">
                  <div className="flex items-center justify-between mb-5">
                    <span className="flex items-center gap-2"><span className="font-mono text-xs text-text-tertiary">0{i + 1}</span>{[PackageOpen, FolderGit2, FileDiff, FlaskConical, Check, GitPullRequest].map((Icon, index) => index === i ? <Icon key={index} size={20} strokeWidth={2} className="text-navy" aria-hidden="true" /> : null)}</span>
                    <span className={`badge ${stage.status === 'Proven locally' ? 'bg-success-bg text-success' : 'bg-accent-light text-text-secondary'}`}>
                      {stage.status}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-xl mb-2">{stage.name}</h3>
                  <p className="text-sm leading-6 text-text-secondary">{stage.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------- SCROLL-DRIVEN MIGRATION DEMO --------------------- */}
      <section className="gutter py-28 lg:py-36 bg-white border-y border-rule">
        <MigrationDemo />
      </section>

      {/* -------------------------- ALTERNATING ROWS -------------------------- */}
      <section className="gutter py-28 lg:py-36">
        <div className="max-w-content mx-auto space-y-28 lg:space-y-36">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <Reveal>
              <p className="eyebrow mb-4">Impact analysis</p>
              <h2 className="font-display font-semibold text-[clamp(1.9rem,3.5vw,2.75rem)] leading-[1.15] tracking-[-0.01em] mb-6">
                Call sites found by static analysis, down to the line
              </h2>
              <p className="text-base leading-8 text-text-secondary mb-6">
                The prototype maps call sites found by static analysis - file, line, and the affected API. Coverage is partial; dynamic usage may be missed.
              </p>
              <p className="text-base leading-8 text-text-secondary">
                The layout below illustrates a two-file impact map. Paths and line numbers are examples.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <ImpactMapMock />
              <p className="mt-3 text-center text-[13px] text-text-tertiary">Illustrative impact map; example paths and line numbers.</p>
            </Reveal>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <Reveal className="lg:order-2">
              <p className="eyebrow mb-4">Patch generation</p>
              <h2 className="font-display font-semibold text-[clamp(1.9rem,3.5vw,2.75rem)] leading-[1.15] tracking-[-0.01em] mb-6">
                The smallest diff that fixes the break
              </h2>
              <p className="text-base leading-8 text-text-secondary mb-6">
                Patches are scoped to the affected call sites and nothing else. A reviewer should be able to read the whole fix in one sitting - because there is nothing in it except the fix.
              </p>
              <p className="text-base leading-8 text-text-secondary">
                A proposed patch is a proposal, not a verdict. It only becomes a recommendation after your tests pass against it.
              </p>
            </Reveal>
            <Reveal delay={120} className="lg:order-1">
              <DiffMock />
              <p className="mt-3 text-center text-[13px] text-text-tertiary">The real diff from the verified fixture run, runs/latest/proof.json.</p>
            </Reveal>
          </div>

          <div className="grid lg:grid-cols-5 gap-12 lg:gap-16 items-center">
            <Reveal className="lg:col-span-2">
              <p className="eyebrow mb-4">Test execution</p>
              <h2 className="font-display font-semibold text-[clamp(1.9rem,3.5vw,2.75rem)] leading-[1.15] tracking-[-0.01em] mb-6">
                Your suite is the judge
              </h2>
              <p className="text-base leading-8 text-text-secondary mb-6">
                trypatchbay runs the repository&rsquo;s own test command - the same one your CI runs. No simulated harness, no substitute checks, no partial credit.
              </p>
              <p className="text-base leading-8 text-text-secondary">
                The raw output is kept and attached to the result, so a reviewer can rerun the exact same command.
              </p>
            </Reveal>
            <Reveal delay={120} className="lg:col-span-3">
              <TestRunMock />
              <p className="mt-3 text-center text-[13px] text-text-tertiary">From the verified fixture run (runs/latest/proof.json); display condensed.</p>
            </Reveal>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <Reveal>
              <p className="eyebrow mb-4">Verification first</p>
              <h2 className="font-display font-semibold text-[clamp(1.9rem,3.5vw,2.75rem)] leading-[1.15] tracking-[-0.01em] mb-6">
                Red to green, or no pull request
              </h2>
              <p className="text-base leading-8 text-text-secondary mb-6">
                On bundled fixtures only, trypatchbay reproduces the break, applies a deterministic rename patch, and reruns the fixture test suite. If the suite does not go green, you get a diagnosis of the break - never an unproven fix.
              </p>
              <p className="text-base leading-8 text-text-secondary">
                This loop runs today against the bundled fixture migration (mockpay 1.0.0 to 2.0.0): two failing tests in, three passing tests out. The fixture stands in for a live provider; a real-provider run is the next milestone.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <TerminalMock />
              <p className="mt-3 text-center text-[13px] text-text-tertiary">Output condensed from a verified local run.</p>
            </Reveal>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <Reveal className="lg:order-2">
              <p className="eyebrow mb-4">Evidence, attached</p>
              <h2 className="font-display font-semibold text-[clamp(1.9rem,3.5vw,2.75rem)] leading-[1.15] tracking-[-0.01em] mb-6">
                Every PR carries its own proof
              </h2>
              <p className="text-base leading-8 text-text-secondary mb-6">
                The diff, the call sites it touches and the before-and-after test output all ship inside the pull request. Your team reviews evidence, not claims.
              </p>
              <p className="text-base leading-8 text-text-secondary">
                Automated PR delivery is in development. The evidence format is already produced by the local proof loop.
              </p>
            </Reveal>
            <Reveal delay={120} className="lg:order-1">
              <EvidenceMock />
              <p className="mt-3 text-center text-[13px] text-text-tertiary">Illustrative PR layout; evidence content from a real local run.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------ FAILURE VISIBILITY ------------------------ */}
      <section className="py-28 lg:py-36 bg-navy-deep">
        <div className="gutter max-w-content mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <Reveal>
            <p className="eyebrow mb-4 !text-white/50">Failure visibility</p>
            <h2 className="font-display font-semibold text-white text-[clamp(1.9rem,3.5vw,2.75rem)] leading-[1.15] tracking-[-0.01em] mb-6">
              Failed runs get shown, not hidden
            </h2>
            <p className="text-base leading-8 text-white/75 mb-6">
              When a patch does not fix the break - or the suite cannot run at all - the result is labelled failed or inconclusive, with the full output attached. An inconclusive run is never rounded up to a pass.
            </p>
            <p className="text-base leading-8 text-white/75">
              That is the whole point of proof before the PR: the failures are exactly where you can see them.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="rounded-3xl bg-white/5 border border-white/10 p-6 lg:p-8">
              <div className="flex items-center justify-between mb-5">
                <p className="font-mono text-[13px] text-white/60">migration result &middot; illustrative</p>
                <span className="badge bg-[#F08585]/15 text-[#F08585]">inconclusive</span>
              </div>
              <div className="space-y-3 font-mono text-[13px]">
                <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                  <span className="text-white/70">patch applied</span>
                  <span className="text-white/80">yes</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                  <span className="text-white/70">test suite</span>
                  <span className="text-[#F08585]">could not complete - setup error</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                  <span className="text-white/70">presented as</span>
                  <span className="text-white/80">not verified - no PR prepared</span>
                </div>
              </div>
              <p className="mt-5 text-[13px] leading-6 text-white/50">
                Illustrative example of the failure path: the run stops, the evidence says why, and nothing is dressed up as ready.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------ SECURITY / RELIABILITY ------------------------ */}
      <section id="security" className="gutter py-28 lg:py-36 bg-white border-y border-rule">
        <div className="max-w-content mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20">
          <Reveal>
            <p className="eyebrow mb-4">Security &amp; reliability</p>
            <h2 className="font-display font-semibold text-[clamp(1.9rem,4vw,3rem)] leading-[1.15] tracking-[-0.01em] mb-6">
              Every state means exactly what it says.
            </h2>
            <p className="text-base leading-8 text-text-secondary mb-8">
              trypatchbay never blurs the line between a suggestion and a proof. Each result carries one of these states, and the wording never upgrades a result it cannot stand behind.
            </p>
            <div className="rounded-2xl border border-rule bg-background p-6">
              <p className="font-display font-semibold text-ink mb-3">What trypatchbay will not claim</p>
              <ul className="space-y-2.5 text-[15px] leading-6 text-text-secondary">
                <li className="flex gap-2.5 items-start"><X size={16} strokeWidth={2} className="text-error shrink-0 mt-1" aria-hidden="true" /> No claim that a patch is correct without your tests passing.</li>
                <li className="flex gap-2.5 items-start"><X size={16} strokeWidth={2} className="text-error shrink-0 mt-1" aria-hidden="true" /> No automatic merging - review stays with your team.</li>
                <li className="flex gap-2.5 items-start"><X size={16} strokeWidth={2} className="text-error shrink-0 mt-1" aria-hidden="true" /> No sandboxed-execution claims: hosted isolated runs are still in security review, so they are not offered.</li>
              </ul>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <ol className="relative border-l-2 border-rule-strong ml-3 space-y-8 py-2">
              {[
                ['Patch proposed', 'A migration diff exists. Nothing about it is proven yet.', 'bg-accent-light text-navy'],
                ['Tests ran', 'Your suite executed against the patch. Output exists either way.', 'bg-accent-light text-navy'],
                ['Tests passed', 'The suite is green after the patch, with before and after output attached.', 'bg-success-bg text-success'],
                ['Failed', 'The suite ran and failed. The patch is not presented as ready.', 'bg-error-bg text-error'],
                ['Inconclusive', 'The suite could not complete. No pass is claimed; the available output explains why.', 'bg-warning-bg text-warning'],
                ['Ready for human review', 'Diff plus evidence packaged for a reviewer. The decision is yours.', 'bg-navy text-white'],
              ].map(([title, body, cls]) => (
                <li key={title} className="relative pl-8">
                  <span className={`absolute -left-[13px] top-0.5 badge ${cls} !px-2 !py-1`}><span className="block w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" /></span>
                  <p className="font-display font-semibold text-ink">{title}</p>
                  <p className="mt-1 text-[15px] leading-7 text-text-secondary">{body}</p>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* --------------------------- SOURCES STRIP --------------------------- */}
      <section className="py-28 lg:py-36 bg-white border-y border-rule overflow-hidden">
        <div className="gutter max-w-content mx-auto">
          <Reveal className="max-w-2xl">
            <p className="eyebrow mb-4">Coverage</p>
            <h2 className="font-display font-semibold text-[clamp(1.9rem,4vw,3rem)] leading-[1.15] tracking-[-0.01em]">
              Built around the providers your stack actually depends on
            </h2>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-text-secondary">
              <span className="text-sm">Verified today on</span>
              <span className="flex items-center gap-2"><BrandLogo name="typescript" size={20} /><span className="text-sm font-medium">TypeScript</span></span>
              <span className="flex items-center gap-2"><BrandLogo name="nodedotjs" size={20} /><span className="text-sm font-medium">Node.js</span></span>
              <span className="text-sm text-text-tertiary">- more ecosystems planned</span>
            </div>
          </Reveal>
        </div>
        <Reveal delay={120}>
          <div className="mt-14 flex gap-5 overflow-x-auto no-scrollbar gutter pb-2 snap-x">
            {SOURCES.map(s => (
              <div key={s.name} className="snap-start shrink-0 w-[280px] rounded-2xl border border-rule bg-background p-7">
                <div className="mb-4 flex h-8 items-center text-navy">
                  {s.kind === 'brand' && s.brand === 'stripe' && <BrandLogo name="stripe" size={28} />}
                  {s.kind === 'brand' && s.brand === 'twilio' && <BrandLogo name="twilio" size={28} />}
                  {s.kind === 'brand' && s.brand === 'npm' && <BrandLogo name="npm" size={28} />}
                  {s.kind === 'icon' && s.icon === 'store' && <Store size={24} strokeWidth={2} aria-hidden="true" />}
                  {s.kind === 'icon' && s.icon === 'bot' && <Bot size={24} strokeWidth={2} aria-hidden="true" />}
                  {s.kind === 'icon' && s.icon === 'openapi' && <FileJson size={24} strokeWidth={2} aria-hidden="true" />}
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{s.name}</h3>
                <p className="text-sm leading-6 text-text-secondary">{s.note}</p>
              </div>
            ))}
            <div className="snap-start shrink-0 w-[280px] rounded-2xl border border-dashed border-rule-strong p-7 flex items-center">
              <p className="text-sm leading-6 text-text-tertiary">Live watching for these sources is in development; detection today runs on recorded changes.</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ----------------------------- STAGE TABS ----------------------------- */}
      <section className="gutter py-28 lg:py-36">
        <div className="max-w-content mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto mb-16">
            <p className="eyebrow mb-4">Under the hood</p>
            <h2 className="font-display font-semibold text-[clamp(1.9rem,4vw,3rem)] leading-[1.15] tracking-[-0.01em]">
              What a run actually looks like
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <StageTabs />
          </Reveal>
        </div>
      </section>

      {/* ----------------------- DEV WORKFLOW INTEGRATION ----------------------- */}
      <section className="gutter py-28 lg:py-36">
        <div className="max-w-content mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto mb-16">
            <p className="eyebrow mb-4">Where it lands</p>
            <h2 className="font-display font-semibold text-[clamp(1.9rem,4vw,3rem)] leading-[1.15] tracking-[-0.01em]">
              Built for the review flow your team already lives in
            </h2>
            <p className="mt-5 text-[15px] leading-7 text-text-secondary">
              Planned GitHub delivery packages a normal pull request: the diff, the evidence, the affected call sites. No new dashboard to learn, no review process to change.
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: FolderGit2, t: 'Repos', d: 'The proof loop runs locally on bundled fixtures. Other repositories stay blocked pending verified isolation.', st: 'Runs locally' },
              { icon: FileDiff, t: 'Diffs', d: 'Minimal, reviewable patches scoped to the affected call sites.', st: 'Runs locally' },
              { icon: FlaskConical, t: 'Tests', d: 'Your own suite, rerun before and after, output attached.', st: 'Runs locally' },
              { icon: GitPullRequest, t: 'Pull requests', d: 'Delivery as GitHub PRs is in development - no install button until it is real.', st: 'In development' },
            ].map(({ icon: Icon, t, d, st }, i) => (
              <Reveal key={t} delay={i * 60} className="h-full">
                <div className="card h-full !p-7 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-light text-navy">
                      <Icon size={20} strokeWidth={2} aria-hidden="true" />
                    </span>
                    <span className={`badge ${st === 'Runs locally' ? 'bg-success-bg text-success' : 'bg-accent-light text-text-secondary'}`}>{st}</span>
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2">{t}</h3>
                  <p className="text-sm leading-6 text-text-secondary">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={100}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
              <BrandLogo name="github" size={22} />
              <p className="text-[15px] text-text-secondary">
                GitHub-centered by design: the repository, the diff and the pull request stay where your team already reviews code.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* -------------------------------- FAQ -------------------------------- */}
      <section id="faq" className="gutter py-28 lg:py-36 bg-white border-y border-rule">
        <div className="max-w-content mx-auto grid lg:grid-cols-[1fr_1.6fr] gap-12 lg:gap-20">
          <Reveal>
            <p className="eyebrow mb-4">FAQ</p>
            <h2 className="font-display font-semibold text-[clamp(1.9rem,4vw,3rem)] leading-[1.15] tracking-[-0.01em]">
              Straight answers about what exists today.
            </h2>
            <p className="mt-5 text-[15px] leading-7 text-text-secondary">
              trypatchbay is early. These answers describe the product exactly as it stands - what runs, what is planned, and what it will never do.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <FAQ />
          </Reveal>
        </div>
      </section>

      {/* ----------------------------- FINAL CTA ----------------------------- */}
      <section className="gutter pb-28 lg:pb-36">
        <Reveal className="max-w-content mx-auto">
          <div className="rounded-4xl bg-navy-deep px-8 py-16 lg:px-20 lg:py-24 grid lg:grid-cols-2 gap-10 items-center overflow-hidden relative">
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full hidden pointer-events-none" />
            <h2 className="relative font-display font-medium text-white text-[clamp(1.9rem,4vw,3rem)] leading-[1.15] tracking-[-0.01em]">
              Stop chasing breaking changes.
            </h2>
            <div className="relative">
              <p className="text-base leading-8 text-white/75 mb-8">
                trypatchbay is in active development. The verification loop runs today; provider watching and pull-request delivery ship next.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href="/how-it-works" className="pill-light">How it works</a>
                <a href="/pricing" className="pill-outline">Pricing</a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
