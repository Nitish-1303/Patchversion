# trypatchbay technical architecture

**Status:** Prototype implementation and intended architecture, distinguished below.
Today the end-to-end loop runs locally on bundled fixtures with no isolation.
It prepares PR text; it does not open or submit pull requests. Hosted watching,
GitHub App authentication, and PR delivery are not implemented.

## Stack

- **Language:** TypeScript (strict)
- **Monorepo:** npm workspaces
- **Engine:** Node.js, ts-morph (AST), Jest (testing)
- **Site:** Next.js 16.4.3 (App Router), React 18, Tailwind CSS
- **State:** File-backed store (to be replaced with PostgreSQL for production)
- **Runtime baseline:** Node.js 20.9 or newer; CI uses Node.js 24
- **CI:** GitHub Actions (lint, typecheck, tests, fixture proof, and build on push/PR)

## Components

```
packages/
  engine/                    # Core pipeline
    src/
      watcher/               # npm registry polling
      probes/                # Live API contract probes
      usage-map/             # AST-based call-site mapper
      break-detector/        # Classification + impact analysis
      sandbox/               # Red-to-green proof loop
      fix-generator/         # Deterministic + LLM fix generation
      pr-bot/                # Evidence-backed PR preparation
      state/                 # File-backed durable store
      engine.ts              # Orchestrator
      webhook-receiver.ts    # GitHub App webhook handler
      config.ts              # Configuration
  shared/                    # Types + design tokens
  site/                      # Next.js marketing site
fixtures/                    # Test fixtures
```

## Intended Data Flow

The fixture demo exercises mapping, classification, deterministic rename fixes,
local test reruns, and PR-text preparation. Watcher/probe modules are prototype
code, not a running hosted service. The sandbox label below names a module, not
a verified isolation boundary.

```
npm registry --> watcher --> change record
                                  |
                          break-detector --> classification
                                  |
                          usage-map --> call sites
                                  |
                          impact-analyzer --> affected call sites
                                  |
                          fix-generator --> candidate fix
                                  |
                          sandbox --> red-to-green proof
                                  |
                          pr-bot --> prepared PR (not submitted)
```

## Key Design Decisions

1. **Current paths are deliberately limited.** Docker execution is blocked as
   unverified; only bundled fixtures may run in the local child process (no isolation).
   Deterministic rename fixes work; the LLM path is a stub. PR preparation produces
   local text/artifacts, not GitHub delivery. These are prototype limits, not
   production-ready fallbacks.

2. **Silence by default.** No PR, no notification, unless there is a verified fix
   or a verified unfixable break.

3. **Proof is a first-class artifact.** Intended architecture: a future fix PR
   should carry red-to-green test results before review. Today those results are
   produced in a local process with no isolation on bundled fixtures only; no
   verified isolated sandbox exists and no actual PR is opened or submitted.

4. **Coverage honesty.** Prepared PR text states which call sites were and were not
   verified. Future delivered PRs should preserve those limits.

5. **No auto-merge.** Human review is required for every change.
