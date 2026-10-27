'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { EASE, DURATION } from './motion';

const ITEMS = [
  {
    q: 'What does trypatchbay do?',
    a: 'It is being built to watch for breaking changes in the third-party SDKs your code depends on, locate the affected call sites in your repositories, propose a migration patch, run your own test suite against it, and prepare a pull request with the verification evidence attached. Today the locate, patch and test steps run locally on bundled fixtures; watching and pull-request delivery are in development.',
  },
  {
    q: 'Which ecosystems are supported today?',
    a: 'TypeScript and Node.js SDK migrations. The proof loop is verified end to end against the bundled fixture (mockpay 1.0.0 to 2.0.0): 2 failing tests went to 3 of 3 passing, with the proof artifact published in the repository. Runs against live providers are the next milestone.',
  },
  {
    q: 'How does verification work?',
    a: 'On bundled fixtures only, trypatchbay reruns the fixture test suite before and after applying a rename-only patch, and saves both outputs locally. There is no verified isolation or live GitHub PR delivery. A patch is never presented as correct without that test evidence.',
  },
  {
    q: 'Does it auto-merge changes?',
    a: 'No. The plan is a pull request for a human to review; today only PR text is prepared. Nothing is merged automatically, and prepared PR text does not mean the change is safe to merge without review.',
  },
  {
    q: 'What happens when tests fail?',
    a: 'The failure is reported with the full test output, before and after. Failed or inconclusive runs are shown as exactly that - they are never presented as verified.',
  },
  {
    q: 'Is trypatchbay publicly available?',
    a: 'It is in early development by a solo founder. The offline proof loop runs locally; hosted monitoring, the dashboard, and PR delivery are in development. Reach out through the contact page for design-partner conversations.',
  },
  {
    q: 'How is my repository code handled?',
    a: 'The current end-to-end proof loop runs locally on bundled fixtures. Other repositories remain blocked pending verified isolation. Planned hosted execution is still under security review and is not claimed as available.',
  },
  {
    q: 'Which features are implemented today?',
    a: 'Implemented and verified locally: detecting a breaking SDK change, locating affected call sites (partial coverage), generating a rename-only migration patch, and rerunning the test suite as proof. In development: continuous version monitoring, the hosted dashboard, and PR delivery.',
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();
  return (
    <div className="divide-y divide-rule border-y border-rule">
      <noscript>{ITEMS.map(item => <details key={item.q} className="py-4"><summary>{item.q}</summary><p className="py-3 leading-7">{item.a}</p></details>)}</noscript>
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
              <motion.span
                aria-hidden="true"
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ duration: reduce ? 0 : DURATION.fast, ease: EASE }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-rule-strong text-navy"
              >
                <Plus size={14} strokeWidth={2} aria-hidden="true" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`faq-panel-${i}`}
                  role="region"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduce ? 0 : DURATION.base, ease: EASE }}
                  className="overflow-hidden"
                >
                  <p className="pb-7 pr-12 text-[15px] leading-7 text-text-secondary max-w-3xl">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
