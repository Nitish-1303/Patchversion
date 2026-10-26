# PatchBay build scoreboard

**Purpose:** one honest, reproducible list of acceptance checks. A check counts
only when it was actually executed with the command shown and met its
acceptance criteria. Skipped tests, mocked integrations, placeholders and
unexecuted code never count as passing.

**Status values:** `PASS` (executed, criteria met) / `FAIL` (executed,
criteria not met) / `BLOCKED` (a genuine external dependency, permission or
decision is missing) / `NOT RUN` (not executed).

**Current totals (2026-10-26, commit see change log): 11 PASS / 1 FAIL /
2 BLOCKED / 10 NOT RUN = 24 defined checks. 11/24 passing.**

## Baseline checks

| ID | Check | Command | Expected | Evidence | Status | Next action |
|----|-------|---------|----------|----------|--------|-------------|
| B-01 | Repository base integrity | `git rev-parse HEAD` + `git rev-parse HEAD^` + `git ls-remote https://github.com/Nitish-1303/Patchversion` | Local branch is 1 commit ahead of GitHub `main` `85dc2e9c` | git output, 2026-10-26: local `1aef710d`, parent `85dc2e9c`, remote `main` `85dc2e9c` | PASS | none |
| B-02 | Clean install from lockfile | `npm install` | exits 0, workspaces resolve | run log 2026-10-26 | PASS | switch docs to `npm ci` once CI has run remotely |
| B-03 | Fixture proof (mockpay 1.0.0 -> 2.0.0) | `npm run prove` | exit 0; baseline 3/3 green, bumped 2 failing, fixed 3/3 green | `runs/latest/transcript.txt` (2026-10-26T05:24Z) | PASS | none |
| B-04 | Real-package proof (lodash 3.10.1 -> 4.17.21) | `npm run prove:real` | exit 0; red-to-green against real registry packages | `runs/lodash-4-migration/transcript.txt` (2026-10-26T05:25Z) | PASS | none |
| B-05 | Full unit/integration suite | `npm test` | 92/92 tests in 11 suites pass | jest output 2026-10-26 | PASS | none |
| B-06 | Site copy-guard | `npx jest site-copy-claims` (packages/engine) | 26/26 pass; no overclaiming copy | jest output 2026-10-26 | PASS | none |
| B-07 | Typecheck | `npm run typecheck` | exit 0, all workspaces | run log 2026-10-26 | PASS | none |
| B-08 | Production build | `npm run build` | exit 0; 18 static routes | Next.js build output 2026-10-26 | PASS | none |
| B-09 | Real lint checks | `npm run lint` | a configured linter actually checks source | `--if-present` finds no workspace lint script; exits 0 checking nothing | FAIL | configure a linter or remove the script (decision pending) |
| B-10 | CI green on GitHub Actions | push to GitHub, inspect workflow run | typecheck/test/prove/build green remotely | no remote CI run has ever occurred (workflow carries this note itself) | NOT RUN | run after push authorization |

## Milestone gate checks

| ID | Gate | Check | Command / inspection | Evidence | Status | Next action |
|----|------|-------|----------------------|----------|--------|-------------|
| G1-01 | G1 | One-command documented reproduction | `npm run prove`, `npm run prove:real` per README | B-03, B-04; README "Reproduction" section matches behavior | PASS | none |
| G1-02 | G1 | No stale-artifact reuse | inspect `runs/archive/` after reruns | reruns on 2026-10-26 created timestamped archives `2026-10-26T05-24-57-119Z` and `2026-10-26T05-25-20-146Z` before overwriting | PASS | none |
| G2-01 | G2 | Supported-form detection tests | `npx jest mapper` + `npx jest negative-cases` | mapper 6/6, negative-cases 14/14, 2026-10-26 | PASS | none |
| G2-02 | G2 | Measured detection coverage (precision/recall on a defined dataset) | not yet defined | no benchmark dataset exists | NOT RUN | G11 benchmark suite |
| G3-01 | G3 | Unsupported patterns are not modified | `npx jest negative-cases` | 14/14 pass, 2026-10-26 | PASS | none |
| G5-01 | G5 | Fail-closed refusals (untrusted repo refused, docker mode blocked, malformed patch refused, failing baseline inconclusive) | `npx jest phase1-hardening` | 7/7 pass, 2026-10-26; engine admission gate in `packages/engine/src/engine.ts` | PASS | none |
| G6-01 | G6 | Verified isolated execution for untrusted repos | inspect + adversarial tests | no isolated sandbox exists; `docker` mode throws as UNVERIFIED; non-fixture repos are refused | BLOCKED | design proposal delivered 2026-10-26; needs isolation-architecture decision and host qualification |
| G7-01 | G7 | GitHub App auth + verified webhook handling | inspect + integration tests | app not registered, no credentials; webhook receiver is a skeleton (signature verification code exists but no live app to verify against) | BLOCKED | design proposal delivered 2026-10-26; needs app registration decision |
| G8-01 | G8 | Local prepared-PR artifact with evidence | produced by `npm run prove` / `prove:real` | `runs/latest/prepared-pr.md`, `runs/lodash-4-migration/prepared-pr.md` (2026-10-26) | PASS | none |
| G8-02 | G8 | Live GitHub PR creation (draft, deduplicated) | end-to-end run | never executed; depends on G7 | NOT RUN | after G7 |
| G9-01 | G9 | Live registry watcher run with dedup/retry | run watcher against npm registry | watcher code exists (registry metadata only); never run as a live monitor | NOT RUN | after G6/G7 decisions |
| G10-01 | G10 | LLM-assisted migration with validation | not runnable | code path is a stub that returns nothing; no model credentials; gated on G6 per plan | NOT RUN | after G6; needs spend decision |
| G11-01 | G11 | Versioned benchmark suite with published results | not yet defined | no benchmark dataset exists | NOT RUN | define dataset after G2-02 |
| G12-01 | G12 | Beta-readiness report | this scoreboard + final regression | earlier audit verdict: NO-GO for public beta (fixture-only, no GitHub App, no isolation) | NOT RUN | after G6-G11 |

## Security properties (verified 2026-10-26, from code inspection + tests)

- Untrusted/customer repository execution is REFUSED in local mode
  (`engine.ts` admission gate; `phase1-hardening` tests). Local child-process
  execution has NO isolation and is restricted to the bundled fixture trees.
- `docker` sandbox mode throws on selection: unverified, never validated.
- Child processes run on a minimal environment (no secret inheritance),
  process-group kill with timeout, output capped at 1 MiB, workdir copy
  excludes `.git`, `.env*`, keys and credential files.
- Patch application enforces realpath containment; cleanup failure blocks a
  success outcome.
- `npm run prove:real` downloads real packages from the public npm registry
  and executes them locally without isolation. Only bundled fixtures may
  run this way; the same protection does NOT exist for arbitrary repos.

## Known discrepancies (documentation vs reality)

- None open in README/site copy after commit `1aef710d` (26 copy-guard
  checks enforce this).
- Root `package.json` description overstated sandbox/PR claims; fixed in
  this batch.
- `npm run lint` was a silent no-op; it now prints that no linter is
  configured. A real linter is still not configured (B-09 FAIL).

## Change log

| Date | Commit | Change | Totals after |
|------|--------|--------|--------------|
| 2026-10-26 | `6f58d07` | Scoreboard created; baseline executed end-to-end (B-01..B-08 PASS, B-09 FAIL, B-10 NOT RUN); gate checks recorded | 11/1/2/10 |
| 2026-10-26 | `a05edba` | Proof-run artifacts refreshed from actual reruns; old artifacts archived | 11/1/2/10 |
| 2026-10-26 | `1971054` | G0: honest root package description; lint script admits it is a no-op (B-09 stays FAIL until a linter is configured) | 11/1/2/10 |
| 2026-10-26 | `a0069f8` | docs/status.md test counts and revalidation date refreshed | 11/1/2/10 |
