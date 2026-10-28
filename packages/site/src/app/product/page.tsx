import { MarketingPage } from '../components/PageSections';

export default function ProductPage() {
  return <MarketingPage
    eyebrow="PRODUCT PREVIEW"
    title="A local proof loop for API changes."
    description="trypatchbay is an early prototype. Today, a bundled fixture demonstrates how an API change can be mapped to code, patched and checked locally."
    cards={[
      { title: 'Change context', body: 'A recorded fixture describes the example API change and the call shape it affects.' },
      { title: 'Code impact', body: 'The local sample maps detectable call sites. Repository scanning is in development.' },
      { title: 'Review evidence', body: 'The fixture includes a proposed diff and its test output. Sandboxed execution and PR delivery are in development.' },
    ]}
    splits={[
      { eyebrow: 'UNDERSTAND', title: 'Keep the changed surface in view.', body: 'The prototype pairs a plain-language change summary with the example call site, so the reason for a proposed edit stays visible.', caption: 'Example information hierarchy · fixture only', lines: ['Changed API parameter', 'Affected example path', 'Reason for proposed edit'] },
      { eyebrow: 'VERIFY', title: 'Make the evidence easy to inspect.', body: 'A local fixture run demonstrates before and after test output. It is not a sandboxed run and it does not touch a connected repository.', caption: 'Local proof output · not a hosted run', lines: ['Baseline test output', 'Minimal fixture patch', 'After-patch test output'] },
    ]}
    bandTitle="Account-backed dashboard access is not available."
    bandBody="Authentication and persistent application data are not implemented. The dashboard route explains this limitation and loads no sample account data."
    bandHref="/docs/getting-started"
    callout={{ title: 'Still taking shape.', body: 'Live watching, sandboxed runs and pull request delivery are in development.' }}
  />;
}
