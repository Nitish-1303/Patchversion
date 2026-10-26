# Technical Architecture

**Status:** Part 1 describes what is implemented and verified locally today. Part 2 is PLANNED architecture that is not built. Nothing in Part 2 is available, and Part 2 is not a description of the current system.

## Part 1: Implemented today (local fixture pipeline only)

### Stack

- **Language:** TypeScript (strict)
- **Monorepo:** npm workspaces
- **Engine:** Node.js, ts-morph (AST), Jest (testing)
- **Site:** Next.js 14 (App Router), Tailwind CSS
- **State:** File-backed store
- **CI:** GitHub Actions workflow (typecheck + test on push/PR) is written but not yet verified by a run on GitHub

### Components

```
packages/
  engine/                    # Core pipeline
    src/
      watcher/               # npm registry polling (registry metadata only)
      probes/                # Contract probe code (not verified against live endpoints)
      usage-map/             # AST-based call-site mapper (partial coverage)
      break-detector/        # Classification + impact analysis
      sandbox/               # Red-to-green proof loop (local child process, NO isolation)
      fix-generator/         # Deterministic rename fixes; LLM path is a stub
      pr-bot/                # Prepares PR text and a local branch/file; submits nothing
      state/                 # File-backed durable store
      engine.ts              # Orchestrator
      webhook-receiver.ts    # Webhook receiver (signature-checked); no GitHub App auth
      config.ts              # Configuration
  shared/                    # Types + design tokens
  site/                      # Next.js marketing site
fixtures/                    # Test fixtures
```

### Data flow

```
change record --> break-detector --> classification
                                  |
                          usage-map --> supported call sites (partial coverage)
                                  |
                          impact-analyzer --> affected call sites
                                  |
                          fix-generator --> candidate fix (rename only)
                                  |
                          sandbox --> red-to-green proof (bundled fixtures only)
                                  |
                          pr-bot --> prepared PR file (local; not submitted)
```

### Execution limits in the code today

1. **Sandbox:** the only working mode is a local child process with no isolation. The engine refuses to run any repository that is not a bundled trusted fixture. Docker mode is blocked in code because container isolation has never been validated.
2. **Fix generation:** deterministic parameter or field renames only. Removals and signature changes are not handled. The LLM path builds a prompt and returns nothing; it is not a working fallback.
3. **Pull requests:** the pr-bot writes a prepared PR file and local evidence. No pull request is opened on GitHub, and there is no GitHub App authentication.
4. **Silence by default.** Nothing is prepared unless there is a verified fix or a verified unfixable break.
5. **Proof as an artifact.** A prepared fix carries the red-to-green test results from the local run.
6. **Coverage honesty.** Prepared output states which call sites were and were not verified. Mapping is partial and may miss call sites.
7. **No auto-merge.** Human review is required for every change.

## Part 2: PLANNED architecture (not built)

These items are design intent only.

- **Isolated sandbox:** a container-based sandbox with no network, validated on a real host, before any non-fixture repository can run. Until then local mode stays fixture-only.
- **LLM-assisted fix generation:** a model call for breaking changes that deterministic rename fixes do not cover. A fix would still be accepted only if the sandbox proves it green.
- **GitHub App delivery:** App registration, installation auth, and opening a pull request with the proof attached. Until then the output is the local prepared PR file.
- **Hosted monitoring:** continuous watching of tracked packages and changelogs from a hosted worker.
- **Production state store:** replace the file-backed store with PostgreSQL.
- **Fallbacks:** none of these planned paths exist yet, so there is no automatic fallback from one to another. Today the single available path is the local, fixture-only one.
