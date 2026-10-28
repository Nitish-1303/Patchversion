import { MarketingPage } from '../components/PageSections';

export default function AboutPage() {
  return <MarketingPage
    eyebrow="ABOUT TRYPATCHBAY"
    title="A small prototype for a recurring engineering problem."
    description="API changes can ripple into code that depends on them. trypatchbay explores how to make those changes easier to trace and review."
    cards={[
      { title: 'Start with clarity', body: 'Show what changed and why the API shape matters to the example code.' },
      { title: 'Keep changes narrow', body: 'Make proposed edits easy to read and reason about.' },
      { title: 'Keep proof close', body: 'Present the local test output alongside the change it supports.' },
    ]}
    splits={[
      { eyebrow: 'WHERE IT IS TODAY', title: 'An early local prototype.', body: 'The existing proof loop runs against a bundled fixture. It demonstrates change detection, call-site mapping, a deterministic rename fix and a local test rerun.', caption: 'Bundled sample · local execution only', lines: ['Recorded fixture change', 'Mapped sample call site', 'Local test evidence'] },
      { eyebrow: 'WHAT IS NEXT', title: 'Build the operational boundaries.', body: 'Live repository watching, sandboxed execution and pull request delivery are in development. No customer repositories are connected.', caption: 'Planned product work · not yet available', lines: ['Provider change watching', 'Isolated execution', 'Human-reviewed PR delivery'] },
    ]}
    callout={{ title: 'Built in the open, one careful step at a time.', body: 'This site describes an early product direction. The current demo uses only bundled example data.' }}
  />;
}
