# Patchversion

**Proof you can read. Results we publish.**

Today PatchBay is a local, fixture-based prototype. Against recorded breaking changes in its bundled fixture repositories, it maps the supported call sites where your code is affected (coverage is partial and may miss some), generates a deterministic rename fix, and proves it by re-running the fixture's own test suite, red to green. Planned and not yet built: the GitHub App, continuous monitoring of live APIs and packages, a verified isolated sandbox, live pull-request delivery, and publishing its own failure rate in public.

## Current status

Early development. Verified today, reproducible from this repo:

- End-to-end proof loop against the bundled fixture: mockpay 1.0.0 -> 2.0.0,
  2 failing tests to 3/3 passing (`npm run prove`; artifacts in `runs/latest/`).
- Engine unit tests (`npm test`).

In development, not yet running: live package/API watching, the GitHub App and
PR delivery, the hosted dashboard, and billing. The Docker-isolated sandbox is
designed but failed an internal security review and stays blocked until qualified.
No customer repositories have been processed.

## What it does

When a third-party API your code depends on ships a breaking change:

1. **WATCH** - Detects the release via npm registry metadata today; changelog watching and live API contract probes are planned, not built
2. **MAP** - AST-based analysis finds the supported call sites in your repo that touch the changed package - limited to supported cases, and may miss call sites
3. **DETECT** - Classifies the change as breaking with confidence scoring
4. **REPRODUCE** - Runs your test suite against the new version in a local sandbox process (Docker isolation is designed, not yet qualified)
5. **FIX** - Generates a minimal patch (deterministic for known patterns; LLM assistance is planned, not built)
6. **PROVE** - Re-runs your test suite after the fix. Only if green: prepares a PR with evidence (GitHub delivery is in development)
7. **PR** - The PR carries the full proof: red-to-green results, coverage honesty, and what was NOT verified

## Non-negotiables

- **Proof is a first-class artifact.** Every fix PR carries human-readable proof produced in the sandbox before the PR opens.
- **Coverage honesty in every PR.** "Verified N of M call sites; these K have no test path."
- **Silence by default.** No PR, no notification, unless there is a verified fix or a verified unfixable break needing a human.
- **Honesty in public.** Failure rate, misses, and limitations are published.
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

```bash
npm install
npm run build
npm test
```

## Reproduction

One command runs the full loop against the bundled fixture: detect a breaking
change (mockpay 1.0.0 -> 2.0.0 renames `source` to `payment_method`), map the
affected call sites, generate the fix, prove it red-to-green in the sandbox,
and prepare the evidence-backed PR. Transcript, proof artifact and PR text
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

- **Watcher**: polls the npm registry for new versions of tracked packages (registry metadata only today - deprecation messages, not full changelogs)
- **Contract probes**: PLANNED and not verified - would hit live API endpoints and diff response schemas against stored baselines (code exists, never run against live endpoints)
- **Usage mapper**: ts-morph AST analysis to find the supported imports and call sites per tracked package (partial coverage, may miss some)
- **Break detector**: semver + release note analysis to classify breaking changes
- **Sandbox**: local child process (NO isolation; trusted fixtures only, other repos are refused). A Docker-isolated mode is planned but UNVERIFIED and blocked in code until validated
- **Fix generator**: deterministic rename fixes only (removals and signature changes are not handled). An LLM fallback is PLANNED and NOT implemented (the code path is a stub that returns nothing). A fix is accepted only if the sandbox proves green
- **PR bot**: prepares evidence-backed PR text locally, with proof artifacts and coverage honesty blocks; GitHub PR delivery is in development
- **State store**: durable record of every detection, decision, proof, failure - raw material for the public dataset

## License

MIT
