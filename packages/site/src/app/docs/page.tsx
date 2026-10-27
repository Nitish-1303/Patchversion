export default function DocsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="max-w-3xl mb-12">
        <h1 className="text-4xl font-bold mb-4">Documentation</h1>
        <p className="text-lg text-text-secondary">
          trypatchbay is in development. The homepage demo runs on a controlled local
          fixture, and the GitHub App and CLI are not yet published. These pages
          describe the planned setup and how the system is designed to work.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DocCard
          title="Getting Started"
          description="The planned setup flow: install the GitHub App, connect a repository, and configure monitoring. Not yet available."
          href="/docs/getting-started"
        />
        <DocCard
          title="Core Concepts"
          description="How change detection, impact analysis, and remediation are designed to work together."
          href="/docs/concepts"
        />
        <DocCard
          title="Security"
          description="How trypatchbay is designed to handle your code, credentials, and data, including what is not yet implemented."
          href="/docs/security"
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
