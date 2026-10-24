'use client';

import { useState } from 'react';

const ITEMS = [
  {
    q: 'What does PatchBay do?',
    a: 'It watches for breaking changes in the third-party SDKs your code depends on, locates the affected call sites in your repositories, proposes a migration patch, runs your own test suite against it, and prepares a pull request with the verification evidence attached.',
  },
  {
    q: 'Which ecosystems are supported today?',
    a: 'TypeScript and Node.js SDK migrations. The proof loop is verified on a real stripe-node migration (21.0.1 to 23.0.1), where 3 failing tests went to 47 of 47 passing. Support for further ecosystems is planned.',
  },
  {
    q: 'How does verification work?',
    a: 'PatchBay reruns the repository\u2019s own test suite before and after applying the proposed patch, and attaches both outputs to the result. A patch is never presented as correct without that test evidence.',
  },
  {
    q: 'Does it auto-merge changes?',
    a: 'No. Every migration arrives as a pull request for a human to review. Nothing is merged automatically, and a prepared PR does not mean the change is safe to merge without review.',
  },
  {
    q: 'What happens when tests fail?',
    a: 'The failure is reported with the full test output, before and after. Failed or inconclusive runs are shown as exactly that - they are never presented as verified.',
  },
  {
    q: 'Is PatchBay publicly available?',
    a: 'It is in early development by a solo founder. The offline proof loop runs locally; hosted monitoring, the dashboard, and PR delivery are in development. Reach out through the contact page for design-partner conversations.',
  },
  {
    q: 'How is my repository code handled?',
    a: 'The current proof loop runs locally against repositories you point it at. Planned hosted execution with isolated environments is still under security review and is not claimed as available.',
  },
  {
    q: 'Which features are implemented today?',
    a: 'Implemented and verified locally: detecting a breaking SDK change, locating affected call sites, generating a migration patch, and rerunning the test suite as proof. In development: continuous version monitoring, the hosted dashboard, and PR delivery.',
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-rule border-y border-rule">
      {ITEMS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${i}`}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-6 py-6 text-left group"
            >
              <span className="font-display text-lg font-semibold text-ink group-hover:text-navy transition-colors">
                {item.q}
              </span>
              <span
                aria-hidden="true"
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-rule-strong text-navy transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M7 1v12M1 7h12" />
                </svg>
              </span>
            </button>
            <div
              id={`faq-panel-${i}`}
              role="region"
              className="grid transition-all duration-300 ease-out"
              style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <p className="pb-7 pr-12 text-[15px] leading-7 text-text-secondary max-w-3xl">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
