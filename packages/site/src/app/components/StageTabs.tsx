'use client';

import { useState } from 'react';

const TABS = [
  {
    id: 'detect',
    label: 'Detect',
    title: 'The break, caught at the source.',
    body: 'PatchBay reads provider changelogs, deprecation notices and version diffs, then decides whether the change actually breaks an API shape your code relies on.',
    status: 'Detection runs on the bundled breaking-change fixture. Live changelog watching in development.',
    panel: (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-white/90">mockpay 1.0.0 &rarr; 2.0.0</span>
          <span className="badge-breaking">breaking</span>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <p className="text-sm text-white/80 leading-6">
            <span className="font-mono text-[13px] text-white">source</span> is renamed to
            <span className="font-mono text-[13px] text-white"> payment_method</span> in charges.create. The old parameter is ignored.
          </p>
        </div>
        <p className="text-[13px] text-white/50 font-mono">source: recorded changelog entry &middot; 1 parameter rename</p>
      </div>
    ),
  },
  {
    id: 'map',
    label: 'Map',
    title: 'Every affected call site, found.',
    body: "An index of your repo\u2019s API usage pinpoints exactly which files and lines touch the changed surface - not a guess, a list.",
    status: 'Call-site mapping verified locally against the bundled sample repo.',
    panel: (
      <div className="space-y-3">
        <p className="text-[13px] font-semibold text-white/90">2 call sites use the changed package</p>
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 font-mono text-[13px] leading-7">
          <div className="flex justify-between"><span className="text-white/85">src/createCharge.js</span><span className="text-white/40">:4</span></div>
          <div className="flex justify-between"><span className="text-white/85">src/createCharge.js</span><span className="text-white/40">:14</span></div>
        </div>
        <p className="text-[13px] text-white/50 font-mono">impact: :4 fails on upgrade; :14 unaffected</p>
      </div>
    ),
  },
  {
    id: 'patch',
    label: 'Patch',
    title: 'A minimal fix, not a rewrite.',
    body: 'The patch changes only what the break requires. The full diff ships in the pull request, so review takes minutes, not archaeology.',
    status: 'Patch generation verified locally on the fixture, red to green.',
    panel: (
      <div className="rounded-xl bg-white/5 border border-white/10 p-4 font-mono text-[13px] leading-7 overflow-x-auto">
        <div className="text-white/40">{'// src/createCharge.js'}</div>
        <div className="text-[#FF8A8A]">-  source: source,</div>
        <div className="text-[#7EE2A0]">+  payment_method: source,</div>
        <div className="text-white/60">&nbsp;&nbsp;description: &apos;Payment for order&apos;</div>
      </div>
    ),
  },
  {
    id: 'prove',
    label: 'Prove',
    title: 'Green tests, or no pull request.',
    body: 'Before anything reaches you, PatchBay reruns your own test suite against the patched code. A fix that cannot turn the suite green is reported as a diagnosis, never opened as a PR.',
    status: 'Verified locally on the fixture: 2 failing to 3/3 passing after the patch (runs/latest/proof.json).',
    panel: (
      <div className="rounded-xl bg-white/5 border border-white/10 p-4 font-mono text-[13px] leading-7 overflow-x-auto">
        <div className="text-white/40">$ npm run prove</div>
        <div className="text-[#FF8A8A]">before: 2 failing &middot; missing parameter payment_method</div>
        <div className="text-[#7EE2A0]">after:&nbsp;&nbsp;3/3 passing</div>
        <div className="text-white/60">exit code 0 &middot; evidence attached to PR</div>
      </div>
    ),
  },
];

export default function StageTabs() {
  const [active, setActive] = useState(TABS[3].id);
  const current = TABS.find(t => t.id === active)!;

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2 mb-12">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`rounded-full px-6 py-2.5 text-[15px] font-medium transition-all duration-200 ${
              active === tab.id
                ? 'bg-navy text-white'
                : 'bg-white border border-rule-strong text-text-secondary hover:text-ink hover:border-navy'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div>
          <h3 className="font-display text-[28px] lg:text-[34px] leading-[1.2] font-semibold text-ink mb-4">
            {current.title}
          </h3>
          <p className="text-base leading-7 text-text-secondary mb-6">{current.body}</p>
          <p className="inline-flex items-center gap-2 text-[13px] font-medium text-navy bg-accent-light border border-rule rounded-full px-4 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
            {current.status}
          </p>
        </div>
        <div className="rounded-3xl bg-navy-deep p-6 lg:p-8 shadow-soft">{current.panel}</div>
      </div>
    </div>
  );
}
