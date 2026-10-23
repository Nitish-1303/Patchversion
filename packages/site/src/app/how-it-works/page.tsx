export default function HowItWorksPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="max-w-3xl mb-16">
        <h1 className="text-4xl font-bold mb-4">How It Works</h1>
        <p className="text-lg text-text-secondary">
          The complete pipeline from API change to reviewed pull request.
          Each stage is automated, with human review before any merge.
        </p>
      </div>

      <div className="space-y-16">
        <Stage
          number={1}
          title="Connect"
          description="Authorize a repository and configure which APIs to monitor. Patchversion uses a GitHub App with least-privilege permissions: read access to your code, write access limited to creating branches and pull requests."
          details={[
            'Install the GitHub App on selected repositories',
            'Choose which npm packages or API endpoints to track',
            'Set monitoring frequency per package',
          ]}
        />
        <Stage
          number={2}
          title="Monitor"
          description="Patchversion polls the npm registry for new versions of tracked packages, parses changelogs, and optionally probes live API endpoints to detect behavioral drift before release notes exist."
          details={[
            'Registry polling on a configurable schedule',
            'Changelog parsing with normalized change records',
            'Live contract probes compare response schemas against stored baselines',
          ]}
        />
        <Stage
          number={3}
          title="Detect"
          description="Each new version or drift event is classified: breaking, additive, or informational. Classification uses semver analysis plus release note keyword detection with a confidence score."
          details={[
            'Semver major/minor/patch analysis',
            'Release note pattern matching (breaking, removed, renamed, deprecated)',
            'Confidence scoring with explicit reasoning',
          ]}
        />
        <Stage
          number={4}
          title="Analyze"
          description="For confirmed breaking changes, Patchversion scans your repository using AST analysis to find every import, require, and call expression that touches the changed package."
          details={[
            'ts-morph AST parsing (not regex or text search)',
            'Handles named imports, default imports, namespace imports, and require()',
            'Produces a precise call-site map with file paths, line numbers, and expressions',
          ]}
        />
        <Stage
          number={5}
          title="Remediate"
          description="Patchversion generates a minimal patch. For known migration patterns (field renames), it applies a deterministic transformation. For complex cases, it uses LLM-assisted generation with the failing code and test output as context."
          details={[
            'Deterministic fixes for known patterns (fast, reliable)',
            'LLM-assisted generation for novel breaking changes',
            'Minimal diffs only - no unnecessary refactoring',
          ]}
        />
        <Stage
          number={6}
          title="Verify"
          description="The fix runs in an isolated sandbox against your repo&apos;s own test suite. The sandbox runs your tests against the old version (baseline), the new version (expect failures), and the new version with the fix (expect green). Only a verified green produces a PR."
          details={[
            'Docker container with --network none (no external access)',
            'Local child-process fallback when Docker is unavailable',
            'Red-to-green proof artifact included in every PR',
            'If the fix fails, no PR is created - an honest issue is opened instead',
          ]}
        />
        <Stage
          number={7}
          title="Review"
          description="A pull request is created with the fix diff, the proof artifact, a coverage-honesty block, and the change classification. Your team reviews and merges. Nothing merges automatically."
          details={[
            'PR includes what changed upstream, affected call sites, and fix diff',
            'Proof table: baseline / before-fix / after-fix test results',
            'Coverage honesty: "verified N of M call sites"',
            'Confidence score and explicit list of what was NOT verified',
          ]}
        />
      </div>

      {/* Limitations */}
      <section className="mt-20 rule-t pt-16">
        <h2 className="text-2xl font-bold mb-6">Current limitations</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold mb-2">Ecosystem coverage</h3>
            <p className="text-sm text-text-secondary">
              JavaScript/TypeScript (npm) only. Python, Go, Ruby, and other ecosystems
              are not yet supported.
            </p>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-2">Test dependency</h3>
            <p className="text-sm text-text-secondary">
              The sandbox requires a working test suite in your repository. Repositories
              without tests get impact analysis and fix proposals, but no automated verification.
            </p>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-2">Fix coverage</h3>
            <p className="text-sm text-text-secondary">
              Deterministic fixes cover known patterns (renames, signature changes). Novel
              breaking changes require LLM generation, which may not always produce a working fix.
            </p>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-2">Live probe coverage</h3>
            <p className="text-sm text-text-secondary">
              Contract probes require publicly accessible API endpoints. Authenticated or
              internal APIs need manual baseline configuration.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stage({ number, title, description, details }: {
  number: number;
  title: string;
  description: string;
  details: string[];
}) {
  return (
    <section className="grid md:grid-cols-12 gap-8">
      <div className="md:col-span-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-10 h-10 bg-accent text-white rounded-full flex items-center justify-center text-lg font-semibold">
            {number}
          </span>
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
        <p className="text-text-secondary">{description}</p>
      </div>
      <div className="md:col-span-8">
        <ul className="space-y-2">
          {details.map(d => (
            <li key={d} className="flex gap-2 text-sm text-text-secondary">
              <svg className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {d}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
