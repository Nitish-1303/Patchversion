'use client';

import { useState } from 'react';

const TABS = [
  {
    id: 'detect',
    label: 'Detect',
    title: 'The break, caught at the source.',
    body: 'PatchBay reads provider changelogs, deprecation notices and version diffs, then decides whether the change actually breaks an API shape your code relies on.',
    status: 'Detection rules verified on a real Stripe migration. Live changelog watching in development.',
    panel: (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-white/90">stripe-node 21.0.1 &rarr; 23.0.1</span>
          <span className="badge-breaking">breaking</span>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <p className="text-sm text-white/80 leading-6">
            <span className="font-mono text-[13px] text-white">payment_method_types</span> is removed from
            Checkout Sessions. Sessions now default to the payment methods enabled on the account.
          </p>
        </div>
        <p className="text-[13px] text-white/50 font-mono">source: Stripe upgrade guide &middot; parsed 3 field removals</p>
      </div>
    ),
  },
  {
    id: 'map',
    label: 'Map',
    title: 'Every affected call site, found.',
    body: "An index of your repo\u2019s API usage pinpoints exactly which files and lines touch the changed surface - not a guess, a list.",
    status: 'Call-site mapping verified locally against a real payments repo.',
    panel: (
      <div className="space-y-3">
        <p className="text-[13px] font-semibold text-white/90">2 call sites use the removed field</p>
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 font-mono text-[13px] leading-7">
          <div className="flex justify-between"><span className="text-white/85">src/checkout/createSession.ts</span><span className="text-white/40">:14</span></div>
          <div className="flex justify-between"><span className="text-white/85">src/checkout/retrySession.ts</span><span className="text-white/40">:41</span></div>
        </div>
        <p className="text-[13px] text-white/50 font-mono">impact: checkout creation fails on upgrade</p>
      </div>
    ),
  },
  {
    id: 'patch',
    label: 'Patch',
    title: 'A minimal fix, not a rewrite.',
    body: 'The patch changes only what the break requires. The full diff ships in the pull request, so review takes minutes, not archaeology.',
    status: 'Patch generation verified locally, red to green.',
    panel: (
      <div className="rounded-xl bg-white/5 border border-white/10 p-4 font-mono text-[13px] leading-7 overflow-x-auto">
        <div className="text-white/40">{'// src/checkout/createSession.ts'}</div>
        <div className="text-[#FF8A8A]">-  payment_method_types: [&apos;card&apos;],</div>
        <div className="text-[#7EE2A0]">+  mode: &apos;payment&apos;,</div>
        <div className="text-white/60">&nbsp;&nbsp;line_items: [...],</div>
        <div className="text-white/60">&nbsp;&nbsp;success_url: successUrl,</div>
      </div>
    ),
  },
  {
    id: 'prove',
    label: 'Prove',
    title: 'Green tests, or no pull request.',
    body: 'Before anything reaches you, PatchBay reruns your own test suite against the patched code. A fix that cannot turn the suite green is reported as a diagnosis, never opened as a PR.',
    status: 'Verified locally: 47/47 tests passing after the Stripe migration patch.',
    panel: (
      <div className="rounded-xl bg-white/5 border border-white/10 p-4 font-mono text-[13px] leading-7 overflow-x-auto">
        <div className="text-white/40">$ npm run prove</div>
        <div className="text-[#FF8A8A]">before: 3 failing &middot; checkout.session payment_method_types</div>
        <div className="text-[#7EE2A0]">after:&nbsp;&nbsp;47/47 passing</div>
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
