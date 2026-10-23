export default function GettingStartedPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <p className="text-sm text-text-tertiary mb-2"><a href="/docs" className="text-accent hover:underline">Docs</a> / Getting Started</p>
      <h1 className="text-3xl font-bold mb-8">Getting Started</h1>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Prerequisites</h2>
          <ul className="space-y-2 text-text-secondary list-disc pl-5">
            <li>A GitHub account with repositories to monitor</li>
            <li>Node.js 18+ installed locally (for self-hosted engine)</li>
            <li>At least one npm dependency to track</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">1. Install the GitHub App</h2>
          <p className="text-text-secondary mb-4">
            The Patchversion GitHub App requests read access to your code and write access
            for creating branches and pull requests. No other permissions are requested.
          </p>
          <div className="card bg-warning-bg border-warning/20">
            <p className="text-sm text-warning">
              <strong>Not yet available.</strong> The GitHub App registration is pending.
              This section will be updated when the app is published.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">2. Configure monitoring</h2>
          <p className="text-text-secondary mb-4">
            Choose which npm packages to watch. Patchversion checks the registry for new
            versions and parses changelogs for breaking change indicators.
          </p>
          <div className="code-block">
            <pre>{`# Example: watch stripe-node and openai
patchversion watch add stripe-node
patchversion watch add openai`}</pre>
          </div>
          <p className="text-xs text-text-tertiary mt-2">CLI not yet published. This is a conceptual example.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">3. Review your first change</h2>
          <p className="text-text-secondary">
            When a breaking change is detected, Patchversion maps affected code in your
            repository, generates a fix, validates it against your test suite, and prepares
            a pull request with the evidence. You review and merge.
          </p>
        </section>
      </div>
    </div>
  );
}
