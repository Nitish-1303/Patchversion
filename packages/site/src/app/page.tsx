export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm font-medium text-accent uppercase tracking-wider mb-4">
              API Maintenance, Automated
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-6">
              Your APIs change.<br />Your code adapts.
            </h1>
            <p className="text-lg text-text-secondary mb-8 max-w-lg">
              Patchversion detects third-party API changes, finds affected code in your
              repositories, and prepares tested fixes your team can review.
            </p>
            <div className="flex flex-wrap gap-3 mb-6">
              <a href="/signup" className="btn-primary">Connect a Repository</a>
              <a href="/how-it-works" className="btn-secondary">Explore the Demo</a>
            </div>
            <p className="text-sm text-text-tertiary">
              Every proposed change is reviewable. Your team approves before anything merges.
            </p>
          </div>

          {/* Product Preview - clearly labeled demo */}
          <div className="card p-0 overflow-hidden">
            <div className="bg-accent-light px-4 py-2 rule-b flex items-center justify-between">
              <span className="text-xs font-medium text-accent">INTERACTIVE PREVIEW - SIMULATED DATA</span>
              <span className="badge-breaking">Breaking</span>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">stripe-node</p>
                  <p className="text-xs text-text-secondary">v14.2.0 → v15.0.0</p>
                </div>
                <span className="text-xs text-text-tertiary">Detected 2m ago</span>
              </div>

              <div className="bg-error-bg rounded-md p-3">
                <p className="text-xs font-medium text-error mb-1">Breaking Change Detected</p>
                <p className="text-xs text-error/80">
                  Parameter <code className="bg-error/10 px-1 rounded">source</code> renamed to{' '}
                  <code className="bg-error/10 px-1 rounded">payment_method</code> in charges.create
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-text-secondary mb-2">Affected: acme/payments</p>
                <div className="code-block text-xs">
                  <div className="text-error">- source: &apos;tok_visa&apos;</div>
                  <div className="text-success">+ payment_method: &apos;tok_visa&apos;</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="badge-success">Tests: 15/15 passed</span>
                </div>
                <span className="text-xs text-accent font-medium">PR Ready for Review</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="rule-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold mb-6">
              API changes shouldn&apos;t become production incidents.
            </h2>
            <div className="space-y-4 text-text-secondary">
              <p>
                Release notes go unnoticed. Breaking changes hide in dependency updates.
                Affected code must be found manually. Fixes require investigation and testing.
                Integrations drift out of sync over time.
              </p>
              <p>
                The result: engineers spend hours chasing compatibility issues instead of
                building product.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="rule-t bg-accent-light/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-3xl font-bold mb-4">From upstream change to reviewed fix.</h2>
          <p className="text-text-secondary mb-12 max-w-2xl">
            Patchversion automates the full maintenance pipeline, keeping your integrations
            compatible without manual toil.
          </p>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                step: '1',
                title: 'Detect',
                desc: 'Monitor API specifications, changelogs, and releases for meaningful changes.',
              },
              {
                step: '2',
                title: 'Understand',
                desc: 'Determine the compatibility impact and classify breaking vs. additive changes.',
              },
              {
                step: '3',
                title: 'Analyze',
                desc: 'Locate potentially affected code across your connected repositories.',
              },
              {
                step: '4',
                title: 'Remediate',
                desc: 'Propose a tested patch and prepare a pull request for your review.',
              },
            ].map(item => (
              <div key={item.step} className="card">
                <div className="w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center text-sm font-semibold mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-text-secondary">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="rule-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-3xl font-bold mb-12">Capabilities</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'API Change Detection',
                desc: 'Monitor npm registries, changelogs, and live API contracts for new releases and behavioral drift.',
                href: '/product#monitoring',
              },
              {
                title: 'Breaking-Change Analysis',
                desc: 'Classify changes as breaking or additive with confidence scoring and evidence.',
                href: '/product#intelligence',
              },
              {
                title: 'Repository Impact Mapping',
                desc: 'AST-based analysis finds every call site in your code that touches a changed API.',
                href: '/product#impact',
              },
              {
                title: 'AI-Assisted Remediation',
                desc: 'Generate minimal patches for known migration patterns, with LLM fallback for complex cases.',
                href: '/product#remediation',
              },
              {
                title: 'Pull-Request Automation',
                desc: 'Evidence-backed PRs with proof artifacts, coverage honesty, and test results.',
                href: '/product#remediation',
              },
              {
                title: 'Integration Health Monitoring',
                desc: 'Track the status of every connected API and repository in one dashboard.',
                href: '/dashboard',
              },
              {
                title: 'Change History',
                desc: 'Full audit trail of every detection, analysis, fix attempt, and outcome.',
                href: '/dashboard',
              },
              {
                title: 'Team Notifications',
                desc: 'Alert the right people when a breaking change affects your code.',
                href: '/dashboard',
              },
            ].map(f => (
              <a key={f.title} href={f.href} className="card hover:border-accent transition-colors group">
                <h3 className="font-semibold mb-2 group-hover:text-accent transition-colors">{f.title}</h3>
                <p className="text-sm text-text-secondary">{f.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Developer Workflow */}
      <section className="rule-t bg-accent-light/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-3xl font-bold mb-8">See the workflow.</h2>
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wider">Before (v14)</h3>
              <div className="code-block">
                <pre>{`// Your existing code
const charge = await stripe.charges.create({
  amount: 2000,
  currency: 'usd',
  source: 'tok_visa',
});`}</pre>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wider">After (v15) - proposed fix</h3>
              <div className="code-block">
                <pre>{`// Patchversion proposal
const charge = await stripe.charges.create({
  amount: 2000,
  currency: 'usd',
  payment_method: 'tok_visa',  // renamed
});`}</pre>
              </div>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-4">
            <span className="badge-success">Tests: 15/15 passed</span>
            <span className="text-sm text-text-secondary">
              Verified in isolated sandbox before PR creation.
            </span>
          </div>
          <p className="mt-4 text-xs text-text-tertiary">
            Illustrative example using simulated data. Not from a live monitoring session.
          </p>
        </div>
      </section>

      {/* Security & Control */}
      <section className="rule-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold mb-6">Security and control.</h2>
            <div className="space-y-4">
              {[
                'Least-privilege repository permissions: read code, write only to PR branches.',
                'Every proposed change is a reviewable diff. Nothing merges without human approval.',
                'Sandbox execution is isolated. No customer code leaves the environment unencrypted.',
                'Audit trail for every detection, analysis, fix attempt, and outcome.',
                'Secrets are never read or included in prompts.',
              ].map(item => (
                <div key={item} className="flex gap-3">
                  <svg className="w-5 h-5 text-success flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-text-secondary">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="rule-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl font-bold mb-4">Spend less time chasing API changes.</h2>
          <p className="text-text-secondary mb-8 max-w-lg mx-auto">
            Let your engineering team focus on building while Patchversion helps keep integrations compatible.
          </p>
          <div className="flex justify-center gap-3">
            <a href="/signup" className="btn-primary">Connect a Repository</a>
            <a href="/how-it-works" className="btn-secondary">Explore the Demo</a>
          </div>
        </div>
      </section>
    </div>
  );
}
