'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';

/* Illustrative migration demo - fictional package, simulated data, clearly labelled. */

const STAGES = [
  { id: 'A', title: 'Dependency change detected', body: 'paylink-sdk publishes 5.0.0. The changelog removes the legacy charges.create({ card }) signature your billing code relies on.' },
  { id: 'B', title: 'Impact analysis', body: 'trypatchbay maps the dependency surface of the repo and flags the call sites it can find that touch the removed API - two files in this example. Static analysis can miss indirect use.' },
  { id: 'C', title: 'Proposed patch', body: 'A minimal patch rewrites each affected call to the 5.0.0 signature. Nothing outside the blast radius is touched.' },
  { id: 'D', title: 'Test execution', body: 'The repo\u2019s own test suite runs against the patched code - the same command a developer would run, with the raw output kept.' },
  { id: 'E', title: 'Verification', body: 'The suite runs before and after the patch and both outputs are compared. Only a green after-run earns the verified state - here, 2 failing to 42 of 42 passing.' },
  { id: 'F', title: 'PR preparation', body: 'The migration, the diff, and the verification report are prepared as a pull request draft. A human reviews and merges - never trypatchbay.' },
];

function Tag() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-bg text-warning text-[11px] font-semibold uppercase tracking-[0.12em] px-2.5 py-1">
      Illustrative example
    </span>
  );
}

function StageVisual({ stage, pinned = true }: { stage: number; pinned?: boolean }) {
  // Unpinned (mobile / reduced-motion): render only this stage's panel in normal flow
  // so tall content sets its own height instead of overflowing a fixed box.
  const layer = (i: number, cls = '') =>
    pinned
      ? `absolute inset-0 transition-all duration-500 ${cls} ${stage === i ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`
      : cls;
  const show = (i: number) => pinned || stage === i;
  return (
    <div className={pinned ? 'relative h-full min-h-[340px]' : 'relative'}>
      {/* A: dependency change */}
      {show(0) && <div className={layer(0)}>
        <div className="card h-full flex flex-col justify-center gap-5">
          <Tag />
          <div className="flex items-center justify-center gap-5">
            <div className="rounded-2xl border border-rule-strong px-6 py-4 text-center">
              <p className="font-mono text-sm text-text-tertiary">paylink-sdk</p>
              <p className="font-mono text-2xl font-semibold text-text-secondary line-through decoration-error/60">4.2.0</p>
            </div>
            <ArrowRight size={20} strokeWidth={2} aria-hidden="true" />
            <div className="rounded-2xl border-2 border-navy px-6 py-4 text-center bg-accent-light/50">
              <p className="font-mono text-sm text-text-tertiary">paylink-sdk</p>
              <p className="font-mono text-2xl font-semibold text-navy">5.0.0</p>
            </div>
          </div>
          <p className="text-center text-sm text-error bg-error-bg rounded-xl px-4 py-3 font-medium">
            Breaking: removes charges.create({'{ card }'})
          </p>
        </div>
      </div>}

      {/* B: impact analysis */}
      {show(1) && <div className={layer(1)}>
        <div className="card h-full flex flex-col gap-4">
          <Tag />
          <p className="font-mono text-xs uppercase tracking-widest text-text-tertiary">Repository impact map</p>
          <div className="font-mono text-[13.5px] leading-8">
            <p className="text-text-tertiary">src/</p>
            <p className="pl-4 text-text-tertiary">app/</p>
            <p className="pl-8 text-text-secondary">page.tsx</p>
            <p className="pl-4 text-text-secondary">billing/</p>
            <p className="pl-8 rounded-lg bg-error-bg text-error px-2 -mx-2 flex justify-between"><span>charge.ts</span><span className="text-xs self-center font-semibold">affected :22</span></p>
            <p className="pl-8 rounded-lg bg-error-bg text-error px-2 -mx-2 flex justify-between"><span>retry.ts</span><span className="text-xs self-center font-semibold">affected :8</span></p>
            <p className="pl-4 text-text-tertiary">webhooks/</p>
            <p className="pl-8 text-text-secondary">handler.ts <span className="text-success text-xs">clean</span></p>
          </div>
          <p className="mt-auto text-sm text-text-secondary">2 files reference the removed signature.</p>
        </div>
      </div>}

      {/* C: proposed patch */}
      {show(2) && <div className={layer(2)}>
        <div className="card h-full flex flex-col gap-4 !p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-5">
            <p className="font-mono text-xs text-text-tertiary">src/billing/charge.ts</p>
            <Tag />
          </div>
          <div className="code-block !rounded-none mx-0 text-[13px] leading-7 flex-1">
            <p className="text-code-text/50">  20  const result =</p>
            <p className="text-[#F08585] bg-[#F08585]/10 -mx-4 px-4">- 21  await paylink.charges.create({'{'}</p>
            <p className="text-[#F08585] bg-[#F08585]/10 -mx-4 px-4">- 22&nbsp;&nbsp;card: source.id,</p>
            <p className="text-[#8ADCB0] bg-[#8ADCB0]/10 -mx-4 px-4">+ 21  await paylink.charges.create({'{'}</p>
            <p className="text-[#8ADCB0] bg-[#8ADCB0]/10 -mx-4 px-4">+ 22&nbsp;&nbsp;payment_method: source.id,</p>
            <p className="text-code-text/50">  23&nbsp;&nbsp;amount, currency,</p>
            <p className="text-code-text/50">  24  {'}'});</p>
          </div>
          <p className="px-6 pb-5 text-sm text-text-secondary">Same change applied at retry.ts:8.</p>
        </div>
      </div>}

      {/* D: test execution */}
      {show(3) && <div className={layer(3)}>
        <div className="card h-full flex flex-col gap-4 !p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-5">
            <p className="font-mono text-xs text-text-tertiary">the repo&rsquo;s own suite</p>
            <Tag />
          </div>
          <div className="code-block !rounded-none flex-1 text-[13px] leading-7">
            <p className="text-code-text/60">$ npm test</p>
            <p className="text-code-text/60">running 42 tests against patched code&hellip;</p>
            <p className="text-code-text/60">billing/charge.test.ts &middot; 18 tests</p>
            <p className="text-code-text/60">billing/retry.test.ts &middot; 12 tests</p>
            <p className="text-code-text/60">webhooks/handler.test.ts &middot; 12 tests</p>
            <p className="text-code-text/40 mt-2">finished in 6.4s</p>
          </div>
          <p className="px-6 pb-5 text-sm text-text-secondary">The same command a developer would run - illustrative output, not a live execution.</p>
        </div>
      </div>}

      {/* E: verification */}
      {show(4) && <div className={layer(4)}>
        <div className="card h-full flex flex-col gap-4 justify-center">
          <Tag />
          <p className="font-mono text-xs uppercase tracking-widest text-text-tertiary">Before / after comparison</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-error-bg px-4 py-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-error mb-1">Before patch</p>
              <p className="font-mono text-xl font-semibold text-error">2 failing</p>
            </div>
            <div className="rounded-xl bg-success-bg px-4 py-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-success mb-1">After patch</p>
              <p className="font-mono text-xl font-semibold text-success">42 / 42</p>
            </div>
          </div>
          <p className="text-sm text-text-secondary">Both raw outputs attach to the result. Only a green after-run earns the verified state.</p>
        </div>
      </div>}

      {/* F: PR preparation */}
      {show(5) && <div className={layer(5)}>
        <div className="card h-full flex flex-col gap-4 justify-center">
          <Tag />
          <div className="rounded-2xl border border-rule-strong p-5">
            <p className="font-display font-semibold text-ink">fix(paylink): migrate charges.create to 5.0.0</p>
            <ul className="mt-4 space-y-2.5 text-sm text-text-secondary">
              <li className="flex gap-2 items-start"><Check size={16} strokeWidth={2} className="text-success shrink-0 mt-0.5" aria-hidden="true" /> Full diff, 2 files</li>
              <li className="flex gap-2 items-start"><Check size={16} strokeWidth={2} className="text-success shrink-0 mt-0.5" aria-hidden="true" /> Before/after test output attached</li>
              <li className="flex gap-2 items-start"><Check size={16} strokeWidth={2} className="text-success shrink-0 mt-0.5" aria-hidden="true" /> Affected call sites listed</li>
            </ul>
            <p className="mt-4 text-[13px] text-text-tertiary">A prepared PR is not a merged PR - review stays with your team.</p>
          </div>
        </div>
      </div>}
    </div>
  );
}

export default function MigrationDemo() {
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(false);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const wide = window.matchMedia('(min-width: 1024px)');
    const apply = () => setPinned(!mq.matches && wide.matches);
    apply();
    mq.addEventListener('change', apply);
    wide.addEventListener('change', apply);
    return () => { mq.removeEventListener('change', apply); wide.removeEventListener('change', apply); };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.stage);
            setActive(idx);
          }
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );
    refs.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="max-w-content mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <p className="eyebrow mb-4">The product, in motion</p>
        <h2 className="font-display font-semibold text-[clamp(1.9rem,4vw,3rem)] leading-[1.15] tracking-[-0.01em]">
          Watch one migration end to end.
        </h2>
        <p className="mt-5 text-[15px] leading-7 text-text-secondary">
          A walkthrough with a fictional package and simulated data - the product flow is shown illustratively. The verified fixture run above is the real execution.
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-16">
        {/* Sticky visual (desktop); hidden on mobile where each stage shows inline */}
        {pinned && (
          <div className="relative">
            <div className="sticky top-28">
              <StageVisual stage={active} pinned />
              <div className="mt-6 flex items-center justify-center gap-2" aria-hidden="true">
                {STAGES.map((s, i) => (
                  <span key={s.id} className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? 'w-8 bg-navy' : 'w-4 bg-rule-strong'}`} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stage text blocks */}
        <div>
          {STAGES.map((s, i) => (
            <div
              key={s.id}
              data-stage={i}
              ref={el => { refs.current[i] = el; }}
              className="lg:min-h-[78vh] flex flex-col justify-center py-10 lg:py-0"
            >
              {!pinned && (
                <div className="mb-8"><StageVisual stage={i} pinned={false} /></div>
              )}
              <div className={`transition-opacity duration-300 ${pinned && i !== active ? 'opacity-40' : 'opacity-100'}`}>
                <p className="font-mono text-xs font-semibold tracking-[0.2em] text-navy/60 mb-3">STAGE {s.id}</p>
                <h3 className="font-display text-2xl font-semibold text-ink mb-4">{s.title}</h3>
                <p className="text-[15px] leading-7 text-text-secondary max-w-md">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
