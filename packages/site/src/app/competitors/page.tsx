import { MarketingPage } from '../components/PageSections';

export default function ScopePage() {
  return <MarketingPage eyebrow="PRODUCT SCOPE" title="A focused idea, at prototype scale." description="This page describes the problem trypatchbay is exploring without making claims about other products or services." cards={[
    { title: 'Follow API change context', body: 'Make a provider change easier to connect to a code path.' },
    { title: 'Keep the change reviewable', body: 'Show a proposed edit in a way a maintainer can inspect.' },
    { title: 'Keep proof nearby', body: 'Pair a fixture patch with local test evidence.' },
  ]} splits={[
    { eyebrow: 'CURRENTLY BUILT', title: 'A local fixture loop.', body: 'The existing prototype demonstrates a recorded change against bundled sample code. It does not connect to customer or live repositories.', caption: 'Bundled example only', lines: ['Fixture input', 'Sample call-site map', 'Local test output'] },
  ]} bandTitle="No market comparison claims." bandBody="trypatchbay is in early development. The current site focuses on its own scope and availability." />;
}
