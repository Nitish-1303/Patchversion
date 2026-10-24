import { Check } from 'lucide-react';
export default function HowItWorksPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="max-w-3xl mb-16">
        <h1 className="text-4xl font-bold mb-4">How It Works</h1>
        <p className="text-lg text-text-secondary">
          The complete pipeline from API change to reviewed pull request.
          Each stage is labeled with its real status: what runs today, and what is still being built.
        </p>
      </div>

      <div className="space-y-16">
        <Stage
          number={1}
          title="Connect"
          status="planned"
          description="Authorize a repository and configure which APIs to monitor. The plan is a GitHub App with least-privilege permissions: read access to your code, write access limited to creating branches and pull requests. The app is not yet registered."
          details={[
            'Install the GitHub App on selected repositories',
            'Choose which npm packages or API endpoints to track',
            'Set monitoring frequency per package',
          ]}
        />
        <Stage
          number={2}
          title="Monitor"
          status="development"
          description="PatchBay is being built to poll the npm registry for new versions of tracked packages and parse changelogs. Today, detection runs on recorded changes fed to the local engine - the same change records the watcher will produce. Live contract probes are planned, not built."
          details={[
            'Registry polling on a configurable schedule',
            'Changelog parsing with normalized change records',
            'Live contract probes (planned) would compare response schemas against stored baselines',
          ]}
        />
        <Stage
          number={3}
          title="Detect"
          status="local"
          description="Each change is classified: breaking, additive, or informational. Classification uses semver analysis plus release note keyword detection with a confidence score. This logic runs in the local engine today."
          details={[
            'Semver major/minor/patch analysis',
            'Release note pattern matching (breaking, removed, renamed, deprecated)',
            'Confidence scoring with explicit reasoning',
          ]}
        />
        <Stage
          number={4}
          title="Analyze"
          status="proven"
          description="For confirmed breaking changes, PatchBay scans the repository using AST analysis to find every import, require, and call expression that touches the changed package. Verified locally on a real payments repository."
          details={[
            'ts-morph AST parsing (not regex or text search)',
            'Handles named imports, default imports, namespace imports, and require()',
            'Produces a precise call-site map with file paths, line numbers, and expressions',
          ]}
        />
        <Stage
          number={5}
          title="Remediate"
          status="proven"
          description="PatchBay generates a minimal patch. For known migration patterns (field removals, renames) it applies a deterministic transformation - verified locally on a real stripe-node migration. LLM-assisted generation for novel breaking changes is planned, not built."
          details={[
            'Deterministic fixes for known patterns (fast, reliable)',
            'LLM-assisted generation for novel breaking changes (planned)',
            'Minimal diffs only - no unnecessary refactoring',
          ]}
        />
        <Stage
          number={6}
          title="Verify"
          status="proven"
          description="The fix runs against the repo&apos;s own test suite in a local child process: tests on the old version (baseline), the new version (expect failures), and the new version with the fix (expect green). Verified locally: 3 failing tests turned into 47/47 passing on a real Stripe migration. A hardened isolated environment for running other people&apos;s code is designed but not yet qualified - it failed an internal security review, so customer repositories stay blocked until it passes."
          details={[
            'Local child-process execution (runs today)',
            'Hardened isolation (network-disabled container, resource limits) - in qualification, not passed',
            'Red-to-green proof artifact produced by every run',
            'If the fix fails, no proposal - the break is reported instead',
          ]}
        />
        <Stage
          number={7}
          title="Review"
          status="planned"
          description="The design: a pull request with the fix diff, the proof artifact, a coverage-honesty block, and the change classification. Your team reviews and merges; nothing merges automatically. PR delivery is not built yet - the evidence format is already produced by the local proof loop."
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
            <h3 className="font-semibold mb-2">Not a hosted product yet</h3>
            <p className="text-sm text-text-secondary">
              The proof loop runs locally. There is no deployed service, no GitHub App,
              no live repository watching, and no automated pull requests yet.
            </p>
          </div>
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
              Verification requires a working test suite in the repository. Repositories
              without tests can get impact analysis and fix proposals, but no automated proof.
            </p>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-2">Fix coverage</h3>
            <p className="text-sm text-text-secondary">
              Deterministic fixes cover known patterns (removals, renames, signature changes). Novel
              breaking changes need LLM-assisted generation, which is planned and unproven.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  proven: { text: 'Proven locally', className: 'badge-success' },
  local: { text: 'Runs locally', className: 'badge-success' },
  development: { text: 'In development', className: 'badge bg-accent-light text-text-secondary' },
  planned: { text: 'Planned', className: 'badge bg-accent-light text-text-secondary' },
};

function Stage({ number, title, description, details, status }: {
  number: number;
  title: string;
  description: string;
  details: string[];
  status: 'proven' | 'local' | 'development' | 'planned';
}) {
  const s = STATUS_LABEL[status];
  return (
    <section className="grid md:grid-cols-12 gap-8">
      <div className="md:col-span-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-10 h-10 bg-accent text-white rounded-full flex items-center justify-center text-lg font-semibold">
            {number}
          </span>
          <h2 className="text-2xl font-bold">{title}</h2>
          <span className={s.className}>{s.text}</span>
        </div>
        <p className="text-text-secondary">{description}</p>
      </div>
      <div className="md:col-span-8">
        <ul className="space-y-2">
          {details.map(d => (
            <li key={d} className="flex gap-2 text-sm text-text-secondary">
              <Check size={20} strokeWidth={2} aria-hidden="true" className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
              {d}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
