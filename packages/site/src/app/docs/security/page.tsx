export default function DocsSecurityPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <p className="text-sm text-text-tertiary mb-2"><a href="/docs" className="text-accent hover:underline">Docs</a> / Security</p>
      <h1 className="text-3xl font-bold mb-8">Security</h1>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Repository Access</h2>
          <p className="text-text-secondary mb-4">
            Patchversion uses a GitHub App with least-privilege permissions:
          </p>
          <ul className="space-y-2 text-text-secondary list-disc pl-5">
            <li><strong>Read:</strong> Repository contents, metadata</li>
            <li><strong>Write:</strong> Branches and pull requests only</li>
            <li><strong>No access:</strong> Secrets, deploy keys, GitHub Actions variables, user data</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Sandbox Isolation</h2>
          <p className="text-text-secondary mb-4">
            When validating fixes, Patchversion runs your test suite in an isolated environment:
          </p>
          <ul className="space-y-2 text-text-secondary list-disc pl-5">
            <li>Docker container with <code className="bg-accent-light px-1 rounded">--network none</code> (no external access)</li>
            <li>Resource limits: 512MB memory, 1 CPU, 120-second timeout</li>
            <li>Local child-process fallback when Docker is unavailable</li>
            <li>No customer code leaves the sandbox unencrypted</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Data Handling</h2>
          <ul className="space-y-2 text-text-secondary list-disc pl-5">
            <li>Customer code is never used for model training</li>
            <li>Only affected code context (not full files) is sent to LLM for fix generation</li>
            <li>Secrets files (.env, credentials) are explicitly excluded from analysis</li>
            <li>Audit events are recorded for every detection, analysis, fix attempt, and PR</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">What is NOT yet implemented</h2>
          <ul className="space-y-2 text-text-secondary list-disc pl-5">
            <li>Formal security audit</li>
            <li>SOC 2 or compliance certification</li>
            <li>Penetration testing</li>
            <li>Encrypted at-rest state storage</li>
            <li>Multi-tenant data isolation (single-tenant only for now)</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
