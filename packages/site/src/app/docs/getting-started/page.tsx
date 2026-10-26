export default function GettingStartedPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <p className="text-sm text-text-tertiary mb-2"><a href="/docs" className="text-accent hover:underline">Docs</a> / Getting Started</p>
      <h1 className="text-3xl font-bold mb-8">Getting Started</h1>
      <p className="text-text-secondary mb-8">
        Prototype today: run <code>npm install</code> and <code>npm run prove</code> from a local
        checkout to reproduce the bundled fixture demo. It runs without isolation and prepares
        PR text only; it does not open or submit pull requests. The hosted setup below is planned,
        not available through configuration alone.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Planned hosted setup prerequisites</h2>
          <ul className="space-y-2 text-text-secondary list-disc pl-5">
            <li>Planned: a GitHub account with repositories to connect when App installation ships</li>
            <li>Node.js 18+ installed locally (for the current bundled fixture demo)</li>
            <li>Planned: select npm dependencies to track; live watching is not running</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">1. Connect a repository (planned)</h2>
          <p className="text-text-secondary mb-4">
            A GitHub App with limited repository read access and branch/pull-request write access
            is planned. Authentication, permission requests, and App installation are not implemented.
          </p>
          <div className="card bg-warning-bg border-warning/20">
            <p className="text-sm text-warning">
              <strong>Not yet available.</strong> The GitHub App registration is pending.
              This section will be updated when the app is published.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">2. Configure monitoring (planned)</h2>
          <p className="text-text-secondary mb-4">
            The intended workflow will let you choose npm packages to watch for new versions
            and breaking changes. Hosted registry watching and changelog parsing are not running.
          </p>
          <div className="code-block">
            <pre>{`# Example: watch stripe-node and openai
patchversion watch add stripe-node
patchversion watch add openai`}</pre>
          </div>
          <p className="text-xs text-text-tertiary mt-2">CLI not yet published. This is a conceptual example.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">3. Review your first change (planned)</h2>
          <p className="text-text-secondary">
            The intended workflow maps affected code, proposes a fix, reruns tests, and delivers
            evidence in a pull request for human review. Today the end-to-end loop is limited
            to bundled fixtures and prepares local PR text; GitHub PR delivery is not implemented.
          </p>
          <p className="text-xs text-text-tertiary mt-2">Designed workflow. This is not live yet; the current demo uses a local fixture.</p>
        </section>
      </div>
    </div>
  );
}
