# trypatchbay

**Proof you can read. Results we publish.**

Early-stage prototype for breaking third-party SDK changes. A local proof loop maps call sites, applies a deterministic rename fix and reruns the repo's tests on bundled fixtures. Live watching, the GitHub App and pull-request delivery are in development.

## Current status

Early development. Verified today, reproducible from this repo:

- End-to-end proof loop against the bundled fixture: mockpay 1.0.0 -> 2.0.0,
  2 failing tests to 3/3 passing (`npm run prove`; artifacts in `runs/latest/`).
- Engine unit tests (`npm test`).

In development, not yet running: live package/API watching, the GitHub App and
PR delivery, the hosted dashboard, and billing. The Docker-isolated sandbox is
designed but failed an internal security review and stays blocked until qualified.
No customer repositories have been processed.

## What it is designed to do

Planned flow when a third-party API your code depends on ships a breaking change. Stages 3 to 6 run locally on bundled fixtures today; stages 1 and 7 do not run:

1. **WATCH** - (in development, not running) Detect the release via npm registry metadata; changelog parsing and live API contract probes are planned
2. **MAP** - AST-based analysis lists the call sites it can find in your repo that touch the changed package (partial coverage: dynamic or indirect use can be missed)
3. **DETECT** - Classifies the change as breaking with confidence scoring
4. **REPRODUCE** - Runs your test suite against the new version in a local sandbox process (Docker isolation is designed, not yet qualified)
5. **FIX** - Generates a minimal patch (deterministic rename fixes only; the LLM path is a stub and nothing else is auto-fixed)
6. **PROVE** - Re-runs your test suite after the fix. Only if green: prepares a PR with evidence (GitHub delivery is in development)
7. **PR** - The PR carries the full proof: red-to-green results, coverage honesty, and what was NOT verified

## Non-negotiables

- **Proof is a first-class artifact.** Design goal: any future fix PR should include human-readable red-to-green evidence before review. Today proof runs in a local process with no isolation, on bundled fixtures only; the prototype prepares PR text but does not open or submit pull requests.
- **Coverage honesty in every PR.** "Verified N of M call sites; these K have no test path."
- **Silence by default.** No PR, no notification, unless there is a verified fix or a verified unfixable break needing a human.
- **Honesty in public.** Limitations are published. No failure-rate metrics exist yet.
- **npm/JavaScript first.** One ecosystem, deep, before any breadth.

## Project structure

```
packages/
  engine/    # Core engine: watcher, usage map, break detector, sandbox, fix generator, PR bot
  site/      # Marketing site + dashboard (Next.js)
  shared/    # Types and design tokens
fixtures/    # Test fixtures for validation
```

## Setup

Node.js 20.9 or later is required. Continuous integration currently uses Node.js 24.

```bash
npm install
npm run build
npm test
```

## Reproduction

One command runs the full loop against the bundled fixture: detect a breaking
change (mockpay 1.0.0 -> 2.0.0 renames `source` to `payment_method`), map the
affected call sites, generate the fix, prove it red-to-green in a local process (no isolation),
and prepare evidence-backed PR text (not an actual pull request). Transcript, proof artifact and PR text
land in `runs/latest/` (previous runs are archived to `runs/archive/`).

A second command proves the loop against a REAL npm package (lodash
3.10.1 -> 4.17.21, installed from the public registry; documented
`_.contains` -> `_.includes` rename). Artifacts land in
`runs/lodash-4-migration/`:

```bash
npm run prove:real
```

Both runs execute in a local process with no isolation; only the bundled
fixture trees are permitted to run this way.

```bash
npm install
npm run prove
```

The fixture installs both mockpay versions from `fixtures/sample-repo/vendor/`
- no npm registry access needed. Its tests call the real client, so the version
bump genuinely turns them red and only the fix turns them green again.

## Architecture

- **Watcher**: code to poll the npm registry (not running anywhere; no hosted scheduler) for new versions of tracked packages (registry metadata only today - deprecation messages, not full changelogs)
- **Contract probes**: code to diff live API response schemas against stored baselines; not run continuously or in any hosted setup
- **Usage mapper**: ts-morph AST analysis of imports and call sites per tracked package (partial coverage)
- **Break detector**: semver + release note analysis to classify breaking changes
- **Sandbox**: local child process (NO isolation; trusted fixtures only, other repos are refused). A Docker-isolated mode is planned but UNVERIFIED and blocked in code until validated
- **Fix generator**: deterministic rename patterns; LLM fallback is a stub; a fix is accepted only if the local test run proves green
- **PR bot**: prepares evidence-backed PR text locally, with proof artifacts and coverage honesty blocks; GitHub PR delivery is in development
- **State store**: durable record of every detection, decision, proof, failure - raw material for the public dataset

## License

MIT
