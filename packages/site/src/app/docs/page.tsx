export default function DocsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="max-w-3xl mb-12">
        <h1 className="text-4xl font-bold mb-4">Documentation</h1>
        <p className="text-lg text-text-secondary">
          Everything you need to set up, configure, and use PatchBay.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DocCard
          title="Getting Started"
          description="Install the GitHub App, connect a repository, and configure your first API monitor."
          href="/docs/getting-started"
        />
        <DocCard
          title="Core Concepts"
          description="How change detection, impact analysis, and remediation work together."
          href="/docs/concepts"
        />
        <DocCard
          title="Monitoring"
          description="Configure which packages and APIs to watch, and how often."
          href="/docs/monitoring"
        />
        <DocCard
          title="Change Detection"
          description="How PatchBay classifies changes as breaking, additive, or informational."
          href="/docs/change-detection"
        />
        <DocCard
          title="Impact Analysis"
          description="How AST-based code analysis finds affected call sites."
          href="/docs/impact-analysis"
        />
        <DocCard
          title="Remediation"
          description="How fixes are generated, tested, and presented for review."
          href="/docs/remediation"
        />
        <DocCard
          title="Integrations"
          description="Connect GitHub, Slack, and other services."
          href="/docs/integrations"
        />
        <DocCard
          title="Security"
          description="How PatchBay handles your code, credentials, and data."
          href="/docs/security"
        />
        <DocCard
          title="Troubleshooting"
          description="Common issues and how to resolve them."
          href="/docs/troubleshooting"
        />
      </div>
    </div>
  );
}

function DocCard({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <a href={href} className="card hover:border-accent transition-colors group">
      <h3 className="font-semibold mb-2 group-hover:text-accent transition-colors">{title}</h3>
      <p className="text-sm text-text-secondary">{description}</p>
    </a>
  );
}
