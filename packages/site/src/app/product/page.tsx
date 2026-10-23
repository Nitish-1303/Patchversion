export default function ProductPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="max-w-3xl mb-16">
        <h1 className="text-4xl font-bold mb-4">Product</h1>
        <p className="text-lg text-text-secondary">
          PatchBay automates the maintenance pipeline between API providers and your codebase.
          Here is what each stage does and how it works.
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
                  <svg className="w-4 h-4 text-text-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API Monitoring */}
      <section id="monitoring" className="mb-20">
        <h2 className="text-2xl font-bold mb-6">API Monitoring</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="min-w-0">
            <p className="text-text-secondary mb-4">
              PatchBay watches the packages and APIs your code depends on. When a new version
              ships or a live API response shape changes, it produces a normalized change record
              with the source, version, and classification.
            </p>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex gap-2"><CheckIcon /> npm registry version tracking</li>
              <li className="flex gap-2"><CheckIcon /> Changelog parsing and normalization</li>
              <li className="flex gap-2"><CheckIcon /> Live API contract probes (response schema diffing)</li>
              <li className="flex gap-2"><CheckIcon /> OpenAPI specification watching</li>
            </ul>
          </div>
          <div className="card min-w-0">
            <p className="text-xs font-medium text-text-secondary mb-3 uppercase tracking-wider">Change Record Example</p>
            <div className="code-block text-xs">
              <pre>{`{
  "package": "stripe-node",
  "from": "14.2.0",
  "to": "15.0.0",
  "source": "registry",
  "severity": "breaking",
  "confidence": 0.95,
  "evidence": "renamed source to payment_method"
}`}</pre>
            </div>
            <p className="text-xs text-text-tertiary mt-3">Simulated data for illustration.</p>
          </div>
        </div>
      </section>

      {/* Change Intelligence */}
      <section id="intelligence" className="mb-20 rule-t pt-20">
        <h2 className="text-2xl font-bold mb-6">Change Intelligence</h2>
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
          </div>
        </div>
      </section>

      {/* Impact Analysis */}
      <section id="impact" className="mb-20 rule-t pt-20">
        <h2 className="text-2xl font-bold mb-6">Impact Analysis</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="min-w-0">
            <p className="text-text-secondary mb-4">
              Once a breaking change is confirmed, PatchBay maps every call site in your
              repository that touches the changed package. This uses AST (Abstract Syntax Tree)
              analysis, not text search, so it handles imports, aliases, and re-exports correctly.
            </p>
            <p className="text-text-secondary">
              The result is a precise list of affected files, line numbers, and call expressions.
              No false positives from commented-out code or string literals.
            </p>
          </div>
          <div className="card min-w-0">
            <p className="text-xs font-medium text-text-secondary mb-3 uppercase tracking-wider">Impact Report</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1 rule-b">
                <span className="font-mono text-xs">src/createCharge.ts:5</span>
                <span className="badge-breaking text-xs">affected</span>
              </div>
              <div className="flex justify-between py-1 rule-b">
                <span className="font-mono text-xs">src/createCharge.ts:12</span>
                <span className="badge-breaking text-xs">affected</span>
              </div>
              <div className="flex justify-between py-1 rule-b">
                <span className="font-mono text-xs">src/refund.ts:3</span>
                <span className="badge-success text-xs">not affected</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-mono text-xs">src/webhook.ts:8</span>
                <span className="badge-success text-xs">not affected</span>
              </div>
            </div>
            <p className="text-xs text-text-tertiary mt-3">Simulated data for illustration.</p>
          </div>
        </div>
      </section>

      {/* AI Remediation */}
      <section id="remediation" className="mb-20 rule-t pt-20">
        <h2 className="text-2xl font-bold mb-6">AI Remediation</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="min-w-0">
            <p className="text-text-secondary mb-4">
              For known migration patterns (field renames, signature changes), PatchBay applies
              a deterministic fix. For complex cases, it uses LLM-assisted generation with the
              failing code, change description, and test output as context.
            </p>
            <p className="text-text-secondary">
              The fix is only accepted if the sandbox proves it: your repo&apos;s own test suite
              must pass against the new version after the fix is applied. No green tests, no PR.
            </p>
          </div>
          <div className="card min-w-0">
            <p className="text-xs font-medium text-text-secondary mb-3 uppercase tracking-wider">Proof Artifact</p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Tests on v14 (baseline)</span>
                <span className="text-success font-medium">15/15 passed</span>
              </div>
              <div className="flex justify-between">
                <span>Tests on v15 (before fix)</span>
                <span className="text-error font-medium">10/15 passed</span>
              </div>
              <div className="flex justify-between">
                <span>Tests on v15 (after fix)</span>
                <span className="text-success font-medium">15/15 passed</span>
              </div>
              <div className="rule-t pt-3 flex justify-between font-medium">
                <span>Coverage</span>
                <span>2 of 2 call sites verified</span>
              </div>
            </div>
            <p className="text-xs text-text-tertiary mt-3">Simulated data for illustration.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-success flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
