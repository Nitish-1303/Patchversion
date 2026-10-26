import { ArrowRight, Check } from 'lucide-react';
export default function ProductPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="max-w-3xl mb-16">
        <h1 className="text-4xl font-bold mb-4">Product</h1>
        <p className="text-lg text-text-secondary">
          PatchBay is designed to automate the maintenance pipeline between API providers and your codebase.
          Each stage below is labeled with where it actually stands today.
        </p>
      </div>

      {/* Pipeline visualization */}
      <section className="mb-20">
        <div className="card overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max py-4 px-2">
            {['API Change', 'Detection', 'Impact Analysis', 'Patch Generation', 'Tests', 'Pull Request'].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-accent-light rounded-lg px-4 py-2">
                  <span className="w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-xs font-semibold">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium whitespace-nowrap">{step}</span>
                </div>
                {i < 5 && (
                  <ArrowRight size={20} strokeWidth={2} aria-hidden="true" className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API Monitoring */}
      <section id="monitoring" className="mb-20">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-bold">API Monitoring</h2>
          <span className="badge bg-accent-light text-text-secondary">In development</span>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="min-w-0">
            <p className="text-text-secondary mb-4">
              Designed to watch the packages and APIs your code depends on: when a new version
              ships or a documented API shape changes, PatchBay produces a normalized change record
              with the source, version, and classification.
            </p>
            <p className="text-text-secondary mb-4">
              Live watching is not running yet. Detection today is driven by recorded changes fed
              to the local engine - the same records the watcher will produce.
            </p>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex gap-2"><CheckIcon /> npm registry version tracking <PlannedChip /></li>
              <li className="flex gap-2"><CheckIcon /> Changelog parsing and normalization <PlannedChip /></li>
              <li className="flex gap-2"><CheckIcon /> Live API contract probes <PlannedChip /></li>
              <li className="flex gap-2"><CheckIcon /> OpenAPI specification watching <PlannedChip /></li>
            </ul>
          </div>
          <div className="card min-w-0">
            <p className="text-xs font-medium text-text-secondary mb-3 uppercase tracking-wider">Change Record Example</p>
            <div className="code-block text-xs">
              <pre>{`{
  "package": "mockpay",
  "from": "1.0.0",
  "to": "2.0.0",
  "source": "changelog",
  "severity": "breaking",
  "evidence": "'source' parameter renamed to 'payment_method' in charges.create"
}`}</pre>
            </div>
            <p className="text-xs text-text-tertiary mt-3">Recorded change from the verified fixture run (runs/latest/proof.json).</p>
          </div>
        </div>
      </section>

      {/* Change Intelligence */}
      <section id="intelligence" className="mb-20 rule-t pt-20">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-bold">Change Intelligence</h2>
          <span className="badge-success">Runs locally</span>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="min-w-0">
            <p className="text-text-secondary mb-4">
              Not every version bump breaks your code. PatchBay classifies each change as
              breaking, additive, or informational using semver analysis and release note parsing.
            </p>
            <p className="text-text-secondary">
              Every classification includes a confidence score and the evidence behind it.
              When confidence is low, the system says so rather than guessing.
            </p>
          </div>
          <div className="space-y-3 min-w-0">
            <div className="card flex items-center gap-3">
              <span className="badge-breaking">Breaking</span>
              <div>
                <p className="text-sm font-medium">Major version bump + breaking keywords</p>
                <p className="text-xs text-text-secondary">Confidence: 95%</p>
              </div>
            </div>
            <div className="card flex items-center gap-3">
              <span className="badge-feature">Feature</span>
              <div>
                <p className="text-sm font-medium">New methods added, no removals</p>
                <p className="text-xs text-text-secondary">Confidence: 88%</p>
              </div>
            </div>
            <div className="card flex items-center gap-3">
              <span className="badge" style={{ background: '#FFFBEB', color: '#D97706' }}>Deprecation</span>
              <div>
                <p className="text-sm font-medium">Method marked deprecated</p>
                <p className="text-xs text-text-secondary">Confidence: 72%</p>
              </div>
            </div>
            <p className="text-xs text-text-tertiary">Example classifications for illustration.</p>
          </div>
        </div>
      </section>

      {/* Impact Analysis */}
      <section id="impact" className="mb-20 rule-t pt-20">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-bold">Impact Analysis</h2>
          <span className="badge-success">Proven locally</span>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="min-w-0">
            <p className="text-text-secondary mb-4">
              Once a breaking change is confirmed, PatchBay maps the call sites it can find in the
              repository that touches the changed package. This uses AST (Abstract Syntax Tree)
              analysis, not text search, so it follows common import and require forms.
            </p>
            <p className="text-text-secondary">
              The result is a list of affected files, line numbers, and call expressions.
              Comments and string literals are not matched. Dynamic or indirect use can be missed.
            </p>
          </div>
          <div className="card min-w-0">
            <p className="text-xs font-medium text-text-secondary mb-3 uppercase tracking-wider">Impact Report</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1 rule-b">
                <span className="font-mono text-xs">src/createCharge.js:4</span>
                <span className="badge-breaking text-xs">affected</span>
              </div>
              <div className="flex justify-between py-1 rule-b">
                <span className="font-mono text-xs">src/createCharge.js:14</span>
                <span className="badge-success text-xs">not affected</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-mono text-xs">coverage</span>
                <span className="badge-success text-xs">1 of 1 verified</span>
              </div>
            </div>
            <p className="text-xs text-text-tertiary mt-3">From the verified fixture run (runs/latest/proof.json).</p>
          </div>
        </div>
      </section>

      {/* AI Remediation */}
      <section id="remediation" className="mb-20 rule-t pt-20">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-bold">Remediation</h2>
          <span className="badge-success">Proven locally</span>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="min-w-0">
            <p className="text-text-secondary mb-4">
              The only automatic fix today is a deterministic rename of a field or parameter - the same class of fix that migrated the bundled sample repo off
              mockpay 2.0.0&apos;s renamed <span className="font-mono text-sm">source</span> parameter.
            </p>
            <p className="text-text-secondary mb-4">
              The fix is only accepted if the repo&apos;s own test suite passes against the new
              version after the fix is applied. No green tests, no proposal. LLM-assisted generation
              for novel breaking changes is planned, not built.
            </p>
          </div>
          <div className="card min-w-0">
            <p className="text-xs font-medium text-text-secondary mb-3 uppercase tracking-wider">Proof Artifact</p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Tests before fix</span>
                <span className="text-error font-medium">2 failing</span>
              </div>
              <div className="flex justify-between">
                <span>Tests after fix</span>
                <span className="text-success font-medium">3/3 passed</span>
              </div>
              <div className="rule-t pt-3 flex justify-between font-medium">
                <span>Call sites</span>
                <span>1 of 1 patched</span>
              </div>
            </div>
            <p className="text-xs text-text-tertiary mt-3">From the verified fixture run (npm run prove, exit 0; runs/latest/proof.json).</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function PlannedChip() {
  return <span className="badge bg-accent-light text-text-tertiary ml-1">Planned</span>;
}

function CheckIcon() {
  return (
    <Check size={20} strokeWidth={2} aria-hidden="true" className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
  );
}
