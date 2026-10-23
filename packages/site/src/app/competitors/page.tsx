export default function CompetitorsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="max-w-3xl mb-12">
        <h1 className="text-4xl font-bold mb-4">How PatchBay compares</h1>
        <p className="text-lg text-text-secondary">
          An honest look at the tools that solve overlapping problems.
          Every claim is sourced from public documentation.
        </p>
      </div>

      {/* Direct competitors */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">Direct competitors</h2>
        <p className="text-sm text-text-secondary mb-6">
          Tools that detect API changes, map affected code, and generate fixes.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-rule rounded-lg">
            <thead>
              <tr className="bg-accent-light/50">
                <th className="text-left p-3 font-medium">Capability</th>
                <th className="text-left p-3 font-medium">PatchBay</th>
                <th className="text-left p-3 font-medium">Patchline</th>
                <th className="text-left p-3 font-medium">MendAPI</th>
                <th className="text-left p-3 font-medium">Since.dev</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              <tr>
                <td className="p-3 font-medium">API change detection</td>
                <td className="p-3">npm registry + changelog</td>
                <td className="p-3">Changelog + OpenAPI + SDK</td>
                <td className="p-3">Changelog + SDK + OpenAPI</td>
                <td className="p-3">Registry + changelog + behavior</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Code impact mapping</td>
                <td className="p-3">Yes (TypeScript AST)</td>
                <td className="p-3">Yes (TypeScript + Python)</td>
                <td className="p-3">Yes (local scan)</td>
                <td className="p-3">Yes (GitHub connect)</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Fix generation</td>
                <td className="p-3">Deterministic + LLM</td>
                <td className="p-3">Opt-in migration PRs</td>
                <td className="p-3">47 migration packs</td>
                <td className="p-3">Draft repair PRs</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Test validation</td>
                <td className="p-3">Sandbox red-to-green</td>
                <td className="p-3">Network-isolated sandbox</td>
                <td className="p-3">Not specified</td>
                <td className="p-3">In user CI</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Auto-merge</td>
                <td className="p-3">Never</td>
                <td className="p-3">Never</td>
                <td className="p-3">Review required</td>
                <td className="p-3">Human decides</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Open source</td>
                <td className="p-3">Engine: planned</td>
                <td className="p-3">No</td>
                <td className="p-3">CLI only</td>
                <td className="p-3">No</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Pricing</td>
                <td className="p-3">Paid plans proposed</td>
                <td className="p-3">Pilot pricing</td>
                <td className="p-3">Not published</td>
                <td className="p-3">Not published</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-xs text-text-tertiary space-y-1">
          <p>Sources: patchline.cloud/patchline-vs-dependabot, mendapi.com/guides, since.dev/docs</p>
          <p>Last checked: 2026-10-23. Competitor capabilities may have changed since.</p>
        </div>
      </section>

      {/* Adjacent tools */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">Adjacent tools</h2>
        <p className="text-sm text-text-secondary mb-6">
          Tools that solve related but different problems. Often used alongside API change detection.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold mb-2">Dependabot / Renovate</h3>
            <p className="text-sm text-text-secondary mb-3">
              Dependency version management. Detects new package versions and opens update PRs.
              Does not detect provider-side API changes, map affected code, or generate fixes.
            </p>
            <p className="text-xs text-text-tertiary">
              Complementary: use Dependabot/Renovate for version hygiene, PatchBay for API compatibility.
            </p>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-2">oasdiff</h3>
            <p className="text-sm text-text-secondary mb-3">
              OpenAPI specification diffing with 773 change checks. Reviews spec changes on pull requests.
              Does not map changes to customer code or generate fixes.
            </p>
            <p className="text-xs text-text-tertiary">
              Complementary: oasdiff for API providers reviewing their own changes, PatchBay for consumers.
            </p>
          </div>
        </div>
      </section>

      {/* Honest positioning */}
      <section className="card bg-accent-light/30">
        <h2 className="text-xl font-bold mb-4">Where PatchBay stands today</h2>
        <div className="space-y-3 text-sm text-text-secondary">
          <p>
            PatchBay is in early development. The engine code exists and passes tests,
            but has not been validated against a real production repository.
          </p>
          <p>
            Patchline and MendAPI are live products with real users. If you need API change
            detection today, evaluate them first.
          </p>
          <p>
            PatchBay&apos;s planned differentiators are: open-source engine, generic OpenAPI
            spec monitoring (not limited to curated providers). These are plans, not demonstrated advantages.
          </p>
        </div>
      </section>
    </div>
  );
}
