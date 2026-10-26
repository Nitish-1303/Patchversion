export default function ConceptsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <p className="text-sm text-text-tertiary mb-2"><a href="/docs" className="text-accent hover:underline">Docs</a> / Core Concepts</p>
      <h1 className="text-3xl font-bold mb-4">Core Concepts</h1>
      <p className="text-sm text-text-tertiary mb-8">
        These pages describe how the system is designed to work. Impact analysis and proof
        artifacts run locally today; watching and pull-request delivery are in development.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Change Records</h2>
          <p className="text-text-secondary">
            Every detected API change is stored as a normalized change record: package name,
            from/to versions, source (registry, changelog, probe), classification (breaking,
            additive, deprecation), confidence score, and raw release notes. Change records
            are the foundation for all downstream analysis.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Usage Maps</h2>
          <p className="text-text-secondary">
            A usage map is an AST-derived index of the call sites in your repository that
            touch a tracked package. Coverage is partial: dynamic or indirect use can be missed. It records the file path, line number, import statement,
            and call expression for each usage. Today a usage map is built when the local engine is run.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Impact Analysis</h2>
          <p className="text-text-secondary">
            When a breaking change is detected, PatchBay intersects the change record
            with your usage map to find exactly which call sites are affected. The result
            includes both affected and unaffected call sites, so you can see the full picture.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Proof Artifacts</h2>
          <p className="text-text-secondary">
            Every proposed fix comes with a proof artifact: the test results before the fix
            (red), the test results after the fix (green), and a coverage-honesty block
            stating exactly which call sites were and were not verified. No green, no PR.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Coverage Honesty</h2>
          <p className="text-text-secondary">
            PatchBay never claims full coverage when it doesn&apos;t have it. Every report
            and PR states: &quot;Verified N of M call sites. These K have no test path.&quot;
            A partial proof says so. Silence is preferred over a false positive.
          </p>
        </section>
      </div>
    </div>
  );
}

