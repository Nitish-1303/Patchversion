import Reveal from './components/Reveal';
import StageTabs from './components/StageTabs';
import FAQ from './components/FAQ';

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
          PatchBay run &middot; stripe-node 21.0.1 &rarr; 23.0.1
        </span>
        <span className="ml-auto badge-success">verified</span>
      </div>

      {/* stage stepper */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-6 lg:px-8 pt-6 text-[12px] font-semibold uppercase tracking-[0.12em]">
        {['Watch', 'Detect', 'Map', 'Patch', 'Prove', 'PR'].map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 ${s === 'Prove' ? 'bg-navy text-white' : 'bg-accent-light text-navy/70'}`}>{s}</span>
            {i < 5 && <span className="text-rule-strong">&rarr;</span>}
          </span>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-4 p-6 lg:p-8">
        {/* break card */}
        <div className="lg:col-span-2 rounded-2xl border border-rule bg-background p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-error mb-2">Break detected</p>
          <p className="font-display font-semibold text-ink leading-snug mb-2">
            Stripe removes <span className="font-mono text-[14px]">payment_method_types</span> from Checkout Sessions
          </p>
          <p className="text-sm text-text-secondary leading-6">
            Sessions created with an explicit method list fail after the upgrade.
          </p>
          <div className="mt-4 pt-4 border-t border-rule space-y-2 font-mono text-[12px] text-text-secondary">
            <div className="flex justify-between"><span>src/checkout/createSession.ts</span><span className="text-error">:14</span></div>
            <div className="flex justify-between"><span>src/checkout/retrySession.ts</span><span className="text-error">:41</span></div>
          </div>
        </div>

        {/* verification card */}
        <div className="lg:col-span-2 rounded-2xl bg-navy-deep p-5 text-white">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/50 mb-2">Proof</p>
          <p className="font-display font-semibold leading-snug mb-4">Rerun of the repo&rsquo;s own test suite, before and after the patch</p>
          <div className="space-y-3 font-mono text-[13px]">
            <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              <span className="text-white/70">before patch</span>
              <span className="text-[#FF8A8A]">3 failing</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              <span className="text-white/70">after patch</span>
              <span className="text-[#7EE2A0]">47 / 47 passing</span>
            </div>
            <p className="text-white/40 text-[12px]">npm run prove &middot; exit code 0</p>
          </div>
        </div>

        {/* PR card */}
        <div className="lg:col-span-1 rounded-2xl border border-rule bg-background p-5 flex flex-col">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-text-tertiary mb-2">Pull request</p>
          <p className="font-display font-semibold text-ink leading-snug mb-3">fix(stripe): migrate Checkout Sessions</p>
          <ul className="space-y-2 text-[13px] text-text-secondary flex-1">
            <li className="flex gap-2"><span className="text-success">&#10003;</span>Full diff, 2 files</li>
            <li className="flex gap-2"><span className="text-success">&#10003;</span>Before/after test output</li>
            <li className="flex gap-2"><span className="text-success">&#10003;</span>Affected call sites</li>
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
        <div className="text-white/70">reproducing break on stripe-node 23.0.1&hellip;</div>
        <div className="text-[#FF8A8A]">&#10007; creates checkout session &middot; payment_method_types unknown</div>
        <div className="text-[#FF8A8A]">&#10007; retries failed session</div>
        <div className="text-[#FF8A8A]">&#10007; preserves line items</div>
        <div className="mt-3 text-white/70">applying patch&hellip; rerunning suite&hellip;</div>
        <div className="text-[#7EE2A0]">&#10003; 47/47 tests passing</div>
        <div className="text-white/40">exit code 0</div>
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
          <p className="text-[14px] font-semibold text-ink">fix(stripe): migrate Checkout Sessions off payment_method_types</p>
          <p className="text-[12px] text-text-tertiary">patchbay &middot; evidence attached</p>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="rounded-xl bg-code-bg p-4 font-mono text-[12.5px] leading-6 overflow-x-auto">
          <div className="text-[#FF8A8A]">-  payment_method_types: [&apos;card&apos;],</div>
          <div className="text-[#7EE2A0]">+  mode: &apos;payment&apos;,</div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div className="rounded-xl bg-error-bg px-4 py-3"><span className="font-semibold text-error">Before</span><br /><span className="text-text-secondary">3 tests failing</span></div>
          <div className="rounded-xl bg-success-bg px-4 py-3"><span className="font-semibold text-success">After</span><br /><span className="text-text-secondary">47/47 passing</span></div>
        </div>
        <p className="text-[13px] text-text-secondary">Call sites, the full diff and the raw test output travel with the PR. Review is a read, not an investigation.</p>
      </div>
    </div>
  );
}

/* ---------------------------------- page ---------------------------------- */

const STAGES = [
  { name: 'Watch', desc: 'Provider changelogs, deprecation notices and version diffs, tracked on a schedule.', status: 'In development' },
  { name: 'Detect', desc: 'Decide whether a change actually breaks an API shape your code uses.', status: 'Proven locally' },
  { name: 'Map', desc: 'An index of every call site that touches the changed surface, down to the line.', status: 'Proven locally' },
  { name: 'Patch', desc: 'A minimal diff that changes only what the break requires.', status: 'Proven locally' },
  { name: 'Prove', desc: 'Your own test suite, rerun against the patch. Green, or no PR.', status: 'Proven locally' },
  { name: 'PR', desc: 'A review-ready pull request with the evidence attached.', status: 'In development' },
];

const SOURCES = [
  { name: 'Stripe', note: 'Versioned API with published upgrade guides. Migration verified locally.' },
  { name: 'Shopify', note: 'Quarterly API releases with forced version upgrades for apps.' },
  { name: 'Twilio', note: 'Deprecation notices and helper-library majors.' },
  { name: 'OpenAI', note: 'Model deprecations and SDK breaking changes.' },
  { name: 'npm packages', note: 'Semver majors with breaking changelogs.' },
  { name: 'OpenAPI specs', note: 'Spec diffs that flag removed fields and changed types.' },
];

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
              Proof loop verified locally &middot; 47/47 tests
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-8 font-display font-bold text-white text-[clamp(2.6rem,6.5vw,4.3rem)] leading-[1.08] tracking-[-0.02em] max-w-4xl">
              Breaking changes.<br />Meet your match.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 text-lg leading-8 text-white/80 max-w-xl">
              PatchBay helps engineering teams navigate breaking SDK changes by identifying affected code, proposing migration patches, running tests, and preparing reviewable pull requests with verification evidence.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
              <a href="#proof" className="pill-light">See the verified loop</a>
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
            Illustrated preview of the PatchBay run view, modeled on a real local verification run. Hosted dashboard in development.
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
                  Dependabot and Renovate open update PRs, but they never run your code. Whether the upgrade breaks your checkout is yours to find out.
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
                    <span className="font-display text-[13px] font-bold text-white bg-navy rounded-full w-8 h-8 flex items-center justify-center">{i + 1}</span>
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

      {/* -------------------------- ALTERNATING ROWS -------------------------- */}
      <section className="gutter py-28 lg:py-36">
        <div className="max-w-content mx-auto space-y-28 lg:space-y-36">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <Reveal>
              <p className="eyebrow mb-4">Verification first</p>
              <h2 className="font-display font-semibold text-[clamp(1.9rem,3.5vw,2.75rem)] leading-[1.15] tracking-[-0.01em] mb-6">
                Red to green, or no pull request
              </h2>
              <p className="text-base leading-8 text-text-secondary mb-6">
                PatchBay reproduces the break against your real code, applies a minimal patch, and reruns your test suite. If the suite does not go green, you get a diagnosis of the break - never an unproven fix.
              </p>
              <p className="text-base leading-8 text-text-secondary">
                This loop runs today against a real Stripe API migration: three failing tests in, 47 passing tests out.
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

      {/* --------------------------- SOURCES STRIP --------------------------- */}
      <section className="py-28 lg:py-36 bg-white border-y border-rule overflow-hidden">
        <div className="gutter max-w-content mx-auto">
          <Reveal className="max-w-2xl">
            <p className="eyebrow mb-4">Coverage</p>
            <h2 className="font-display font-semibold text-[clamp(1.9rem,4vw,3rem)] leading-[1.15] tracking-[-0.01em]">
              Built around the providers your stack actually depends on
            </h2>
          </Reveal>
        </div>
        <Reveal delay={120}>
          <div className="mt-14 flex gap-5 overflow-x-auto no-scrollbar gutter pb-2 snap-x">
            {SOURCES.map(s => (
              <div key={s.name} className="snap-start shrink-0 w-[280px] rounded-2xl border border-rule bg-background p-7">
                <h3 className="font-display font-semibold text-lg mb-2">{s.name}</h3>
                <p className="text-sm leading-6 text-text-secondary">{s.note}</p>
              </div>
            ))}
            <div className="snap-start shrink-0 w-[280px] rounded-2xl border border-dashed border-rule-strong p-7 flex items-center">
              <p className="text-sm leading-6 text-text-tertiary">Detection sources beyond Stripe are on the roadmap.</p>
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

      {/* -------------------------------- FAQ -------------------------------- */}
      <section id="faq" className="gutter py-28 lg:py-36 bg-white border-y border-rule">
        <div className="max-w-content mx-auto grid lg:grid-cols-[1fr_1.6fr] gap-12 lg:gap-20">
          <Reveal>
            <p className="eyebrow mb-4">FAQ</p>
            <h2 className="font-display font-semibold text-[clamp(1.9rem,4vw,3rem)] leading-[1.15] tracking-[-0.01em]">
              Straight answers about what exists today.
            </h2>
            <p className="mt-5 text-[15px] leading-7 text-text-secondary">
              PatchBay is early. These answers describe the product exactly as it stands - what runs, what is planned, and what it will never do.
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
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-pale/10 blur-3xl pointer-events-none" />
            <h2 className="relative font-display font-medium text-white text-[clamp(1.9rem,4vw,3rem)] leading-[1.15] tracking-[-0.01em]">
              Stop chasing breaking changes.
            </h2>
            <div className="relative">
              <p className="text-base leading-8 text-white/75 mb-8">
                PatchBay is in active development. The verification loop runs today; provider watching and pull-request delivery ship next.
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
