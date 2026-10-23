# Patchversion

**Proof you can read. Results we publish.**

A GitHub App that watches third-party APIs and packages for breaking changes, maps exactly where your code is affected, proves the fix in a sandbox BEFORE opening a PR, and publishes its own failure rate in public.

## What it does

When a third-party API your code depends on ships a breaking change:

1. **WATCH** - Detects the release via npm registry, changelogs, and live API contract probes
2. **MAP** - AST-based analysis finds every call site in your repo that touches the changed package
3. **DETECT** - Classifies the change as breaking with confidence scoring
4. **REPRODUCE** - Runs your test suite against the new version in an isolated sandbox
5. **FIX** - Generates a minimal patch (deterministic for known patterns, LLM-assisted otherwise)
6. **PROVE** - Re-runs your test suite after the fix. Only if green: opens a PR with evidence
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

To run the fixture end-to-end (detects a simulated breaking change, maps usage, attempts fix, verifies in sandbox):

```bash
cd fixtures/sample-repo
npm install
npm test  # Should pass on v1

# Simulate the breaking change
# The engine will detect the field rename, generate the fix, and verify
```

## Architecture

- **Watcher**: polls npm registry + changelogs for new versions of tracked packages
- **Contract probes**: hit live API endpoints and diff response schemas against stored baselines
- **Usage mapper**: ts-morph AST analysis to find every import and call site per tracked package
- **Break detector**: semver + release note analysis to classify breaking changes
- **Sandbox**: Docker (`--network none`) or local child process; runs the repo's own test suite
- **Fix generator**: deterministic patterns first, LLM fallback; fix accepted only if sandbox proves green
- **PR bot**: evidence-backed PRs with proof artifacts and coverage honesty blocks
- **State store**: durable record of every detection, decision, proof, failure - raw material for the public dataset

## License

MIT
