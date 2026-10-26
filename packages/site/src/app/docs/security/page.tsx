export default function DocsSecurityPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <p className="text-sm text-text-tertiary mb-2"><a href="/docs" className="text-accent hover:underline">Docs</a> / Security</p>
      <h1 className="text-3xl font-bold mb-8">Security</h1>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Repository Access (planned)</h2>
          <p className="text-text-secondary mb-4">
            The plan is a GitHub App with least-privilege permissions. The app is not yet
            registered, and PatchBay has no access to any repository today:
          </p>
          <ul className="space-y-2 text-text-secondary list-disc pl-5">
            <li><strong>Read:</strong> Repository contents, metadata</li>
            <li><strong>Write:</strong> Branches and pull requests only</li>
            <li><strong>No access:</strong> Secrets, deploy keys, GitHub Actions variables, user data</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Execution Isolation</h2>
          <p className="text-text-secondary mb-4">
            Today, fix verification runs as a local child process on the maintainer&apos;s own
            machine, against bundled fixture trees only. Other repositories are refused, including
            repositories owned by the maintainer. The hardened isolated environment intended for
            running other people&apos;s code (network-disabled container, resource limits) is
            designed but <strong>not yet qualified</strong>: it failed an internal security review,
            and customer repositories stay blocked until a qualified isolation boundary exists.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Data Handling (design commitments)</h2>
          <ul className="space-y-2 text-text-secondary list-disc pl-5">
            <li>Customer code will never be used for model training</li>
            <li>Only affected code context (not full files) is sent to an LLM when LLM-assisted fixes ship (not built yet)</li>
            <li>Secrets files (.env, credentials) are explicitly excluded from analysis</li>
            <li>Audit events are planned for every detection, analysis, fix attempt, and PR</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">What is NOT yet implemented</h2>
          <ul className="space-y-2 text-text-secondary list-disc pl-5">
            <li>Formal security audit</li>
            <li>SOC 2 or compliance certification</li>
            <li>Penetration testing</li>
            <li>Hardened isolated execution environment (in qualification, not passed)</li>
            <li>GitHub App registration and repository access</li>
            <li>Encrypted at-rest state storage</li>
            <li>Multi-tenant data isolation (single-tenant only for now)</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
