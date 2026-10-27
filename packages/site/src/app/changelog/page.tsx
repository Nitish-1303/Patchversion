export default function ChangelogPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <h1 className="text-3xl font-bold mb-4">Changelog</h1>
      <p className="text-text-secondary mb-8">
        Release history for trypatchbay. Only shipped changes are listed.
      </p>

      <div className="space-y-8">
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-feature">engine</span>
            <span className="text-sm text-text-tertiary">2026-10-24</span>
          </div>
          <h3 className="font-semibold mb-2">Proof loop verified end to end (bundled fixture)</h3>
          <ul className="text-sm text-text-secondary space-y-1 list-disc pl-5">
            <li>mockpay migration (1.0.0 to 2.0.0) reproduced and fixed locally against the bundled fixture</li>
            <li>Red to green: 2 failing tests in, 3/3 passing after the patch (npm run prove, exit 0)</li>
            <li>AST call-site mapping verified on the bundled sample repository (fixtures/sample-repo)</li>
          </ul>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-feature">v0.1.0</span>
            <span className="text-sm text-text-tertiary">2026-10-23</span>
          </div>
          <h3 className="font-semibold mb-2">Initial scaffold</h3>
          <ul className="text-sm text-text-secondary space-y-1 list-disc pl-5">
            <li>Core engine scaffold: usage mapper, break detector, local proof loop, fix generator (watcher and PR delivery stubbed)</li>
            <li>Marketing site: homepage, product, pricing, how-it-works, integrations, competitors</li>
            <li>Dashboard demo with labeled fixture data</li>
            <li>13 unit tests passing</li>
            <li>CI workflow (typecheck + test)</li>
            <li>Market research and competitor analysis</li>
            <li>Customer discovery materials</li>
          </ul>
        </div>
      </div>

      <p className="text-sm text-text-tertiary mt-8">
        This page lists real changes only. No planned or hypothetical releases.
      </p>
    </div>
  );
}
