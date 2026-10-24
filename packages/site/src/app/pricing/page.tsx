import { Check, ChevronDown } from 'lucide-react';
export default function PricingPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">Pricing</h1>
        <p className="text-lg text-text-secondary max-w-xl mx-auto">
          Planned paid plans for developers and engineering teams.
        </p>
        <p className="text-sm text-text-tertiary mt-2">Proposed plans - product and billing are not yet available.</p>
        <p className="text-sm text-text-secondary mt-4 max-w-2xl mx-auto">
          Every feature below is labeled honestly: <span className="badge-success">Runs today</span> means
          verified in local runs on real code. <span className="badge bg-accent-light text-text-secondary">Planned</span> means
          designed but not built yet.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        {/* Pro */}
        <div className="card flex flex-col border-accent relative">
          <h3 className="text-lg font-semibold mb-1">Pro</h3>
          <p className="text-sm text-text-secondary mb-6">For developers maintaining API integrations.</p>
          <div className="mb-6">
            <span className="text-4xl font-bold">$29</span>
            <span className="text-text-secondary">/month</span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">Verified in local runs</p>
          <ul className="space-y-3 text-sm text-text-secondary">
            <PricingFeature>Break reproduction against a repo&apos;s own test suite</PricingFeature>
            <PricingFeature>AST call-site mapping for TypeScript/JavaScript</PricingFeature>
            <PricingFeature>Minimal deterministic patches for known migration patterns</PricingFeature>
            <PricingFeature>Evidence artifacts: diff + before/after test output</PricingFeature>
          </ul>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mt-6 mb-3">Planned for launch</p>
          <ul className="space-y-3 text-sm text-text-tertiary flex-1">
            <PricingFeature planned>Up to 10 repositories</PricingFeature>
            <PricingFeature planned>Up to 20 watched API services</PricingFeature>
            <PricingFeature planned>Scheduled change detection</PricingFeature>
            <PricingFeature planned>Pull requests delivered with proof attached</PricingFeature>
            <PricingFeature planned>Priority support</PricingFeature>
          </ul>
          <span className="btn-primary mt-8 text-center opacity-50 cursor-not-allowed" aria-disabled="true">Not yet available</span>
        </div>

        {/* Team */}
        <div className="card flex flex-col">
          <h3 className="text-lg font-semibold mb-1">Team</h3>
          <p className="text-sm text-text-secondary mb-6">For engineering teams collaborating on remediation.</p>
          <div className="mb-6">
            <span className="text-4xl font-bold">$99</span>
            <span className="text-text-secondary">/month</span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">Verified in local runs</p>
          <ul className="space-y-3 text-sm text-text-secondary">
            <PricingFeature>Everything verified for Pro</PricingFeature>
          </ul>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mt-6 mb-3">Planned for launch</p>
          <ul className="space-y-3 text-sm text-text-tertiary flex-1">
            <PricingFeature planned>Everything in Pro</PricingFeature>
            <PricingFeature planned>Unlimited repositories and watched services</PricingFeature>
            <PricingFeature planned>Team workspace and roles</PricingFeature>
            <PricingFeature planned>Audit history</PricingFeature>
            <PricingFeature planned>Slack notifications</PricingFeature>
            <PricingFeature planned>Dedicated support</PricingFeature>
          </ul>
          <span className="btn-secondary mt-8 text-center opacity-50 cursor-not-allowed" aria-disabled="true">Not yet available</span>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto mt-24">
        <h2 className="text-2xl font-bold mb-8 text-center">Frequently asked questions</h2>
        <div className="space-y-6">
          <FaqItem
            q="Which API providers are supported?"
            a="Today the proof loop runs locally against npm package upgrades - it is verified on a real stripe-node migration (Checkout Sessions, 21.0.1 to 23.0.1). Live registry and changelog watching, plus OpenAPI spec monitoring, are in development."
          />
          <FaqItem
            q="Does PatchBay modify my code automatically?"
            a="No. The design is: PatchBay prepares a proposed fix as a pull request with evidence attached, and your team reviews and merges. Nothing merges automatically. Pull-request delivery itself is in development."
          />
          <FaqItem
            q="Can I review every proposed patch?"
            a="Yes - that is the point. The proof loop already produces the full diff and the before/after test output in local runs. Packaging that evidence into a pull request is in development."
          />
          <FaqItem
            q="How are repository permissions handled?"
            a="The plan is a GitHub App with least-privilege permissions: read access to code and metadata, write access limited to branches and pull requests. The app is not yet registered."
          />
          <FaqItem
            q="What happens when a fix fails its tests?"
            a="No pull request. In the local proof loop, a patch that cannot turn the repo's own test suite green is rejected. The designed behavior for launch is an issue describing the break and what could not be fixed."
          />
          <FaqItem
            q="Can I use my own API specifications?"
            a="Not yet. Registering OpenAPI specifications as monitoring sources is planned. Detection is currently proven for npm package upgrades."
          />
        </div>
      </div>
    </div>
  );
}

function PricingFeature({ children, planned }: { children: React.ReactNode; planned?: boolean }) {
  return (
    <li className="flex gap-2 items-start">
      {planned ? (
        <span className="badge bg-accent-light text-text-tertiary flex-shrink-0 mt-0.5">Planned</span>
      ) : (
        <Check size={20} strokeWidth={2} aria-hidden="true" className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
      )}
      {children}
    </li>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="card group">
      <summary className="cursor-pointer font-medium list-none flex items-center justify-between">
        {q}
        <ChevronDown size={20} strokeWidth={2} aria-hidden="true" className="w-4 h-4 text-text-tertiary group-open:rotate-180 transition-transform" />
      </summary>
      <p className="mt-3 text-sm text-text-secondary">{a}</p>
    </details>
  );
}
