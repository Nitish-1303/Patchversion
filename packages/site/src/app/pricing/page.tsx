export default function PricingPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">Pricing</h1>
        <p className="text-lg text-text-secondary max-w-xl mx-auto">
          Start free. Scale when you need more repositories and integrations.
        </p>
        <p className="text-sm text-text-tertiary mt-2">Proposed pricing - not yet billing-enabled.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {/* Free */}
        <div className="card flex flex-col">
          <h3 className="text-lg font-semibold mb-1">Free</h3>
          <p className="text-sm text-text-secondary mb-6">For individual developers evaluating the product.</p>
          <div className="mb-6">
            <span className="text-4xl font-bold">$0</span>
            <span className="text-text-secondary">/month</span>
          </div>
          <ul className="space-y-3 text-sm text-text-secondary flex-1">
            <PricingFeature>1 repository</PricingFeature>
            <PricingFeature>3 monitored API services</PricingFeature>
            <PricingFeature>Hourly change detection</PricingFeature>
            <PricingFeature>5 remediation runs/month</PricingFeature>
            <PricingFeature>Community support</PricingFeature>
          </ul>
          <a href="/signup" className="btn-secondary mt-8 text-center">Get Started</a>
        </div>

        {/* Pro */}
        <div className="card flex flex-col border-accent relative">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-medium px-3 py-1 rounded-full">
            Most Popular
          </span>
          <h3 className="text-lg font-semibold mb-1">Pro</h3>
          <p className="text-sm text-text-secondary mb-6">For developers maintaining multiple integrations.</p>
          <div className="mb-6">
            <span className="text-4xl font-bold">$29</span>
            <span className="text-text-secondary">/month</span>
          </div>
          <ul className="space-y-3 text-sm text-text-secondary flex-1">
            <PricingFeature>10 repositories</PricingFeature>
            <PricingFeature>20 monitored API services</PricingFeature>
            <PricingFeature>15-minute change detection</PricingFeature>
            <PricingFeature>Unlimited remediation runs</PricingFeature>
            <PricingFeature>PR automation with proof</PricingFeature>
            <PricingFeature>Priority support</PricingFeature>
          </ul>
          <a href="/signup" className="btn-primary mt-8 text-center">Start Pro Trial</a>
        </div>

        {/* Team */}
        <div className="card flex flex-col">
          <h3 className="text-lg font-semibold mb-1">Team</h3>
          <p className="text-sm text-text-secondary mb-6">For engineering teams collaborating on remediation.</p>
          <div className="mb-6">
            <span className="text-4xl font-bold">$99</span>
            <span className="text-text-secondary">/month</span>
          </div>
          <ul className="space-y-3 text-sm text-text-secondary flex-1">
            <PricingFeature>Unlimited repositories</PricingFeature>
            <PricingFeature>Unlimited API services</PricingFeature>
            <PricingFeature>Real-time change detection</PricingFeature>
            <PricingFeature>Unlimited remediation runs</PricingFeature>
            <PricingFeature>Team workspace + roles</PricingFeature>
            <PricingFeature>Audit history (90 days)</PricingFeature>
            <PricingFeature>Slack notifications</PricingFeature>
            <PricingFeature>Dedicated support</PricingFeature>
          </ul>
          <a href="/signup" className="btn-secondary mt-8 text-center">Contact Sales</a>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto mt-24">
        <h2 className="text-2xl font-bold mb-8 text-center">Frequently asked questions</h2>
        <div className="space-y-6">
          <FaqItem
            q="Which API providers are supported?"
            a="Patchversion monitors npm packages and public API changelogs. The first supported ecosystem is JavaScript/TypeScript packages on npm. Additional providers and spec-based monitoring are in development."
          />
          <FaqItem
            q="Does Patchversion modify my code automatically?"
            a="No. Patchversion generates a proposed fix and prepares a pull request. Your team reviews and approves before anything merges. No automatic merging."
          />
          <FaqItem
            q="Can I review every proposed patch?"
            a="Yes. Every PR includes the full diff, the test results from our sandbox verification, and a coverage-honesty block showing exactly what was and was not verified."
          />
          <FaqItem
            q="How are repository permissions handled?"
            a="Patchversion uses a GitHub App with least-privilege permissions: read access to code and metadata, write access limited to creating branches and pull requests. No access to secrets or deployments."
          />
          <FaqItem
            q="What happens when a fix fails its tests?"
            a="The PR is not created. Instead, Patchversion opens an issue describing the break, the affected code, and what it could not fix. No silent failures."
          />
          <FaqItem
            q="Can I use my own API specifications?"
            a="Yes. You can register OpenAPI specifications, GraphQL schemas, or changelog URLs as monitoring sources alongside npm registry watching."
          />
        </div>
      </div>
    </div>
  );
}

function PricingFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <svg className="w-4 h-4 text-success flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      {children}
    </li>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="card group">
      <summary className="cursor-pointer font-medium list-none flex items-center justify-between">
        {q}
        <svg className="w-4 h-4 text-text-tertiary group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <p className="mt-3 text-sm text-text-secondary">{a}</p>
    </details>
  );
}
