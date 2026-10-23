# Technical Architecture

**Status:** As built. Subject to revision based on MVP scoping.

## Stack

- **Language:** TypeScript (strict)
- **Monorepo:** npm workspaces
- **Engine:** Node.js, ts-morph (AST), Jest (testing)
- **Site:** Next.js 14 (App Router), Tailwind CSS
- **State:** File-backed store (to be replaced with PostgreSQL for production)
- **CI:** GitHub Actions (typecheck + test on push/PR)

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

## Data Flow

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

1. **Every stage has a real path and an offline fallback.** Docker sandbox falls back
   to local child process. LLM fix generation falls back to deterministic patterns.
   GitHub App PR falls back to local git branch.

2. **Silence by default.** No PR, no notification, unless there is a verified fix
   or a verified unfixable break.

3. **Proof is a first-class artifact.** Every fix PR carries the red-to-green test
   results produced in the sandbox BEFORE the PR opens.

4. **Coverage honesty.** Every PR states exactly which call sites were and were not
   verified.

5. **No auto-merge.** Human review is required for every change.
