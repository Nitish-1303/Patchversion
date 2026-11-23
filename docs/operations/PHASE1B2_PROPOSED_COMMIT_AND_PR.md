# Phase 1B.2 — Final Exact Commit & PR Instructions (Founder Review Only)

**Gate:** **`CONDITIONAL_READY_FOR_FOUNDER_COMMIT`**  
**Product:** **`NOT_CUSTOMER_READY`**  
**Worktree:** `C:\Users\NITISH\Downloads\Patchversion-phase1b2-webhooks`  
**Branch:** `feat/phase1b2-webhook-source-of-truth`  
**Base HEAD:** `e354cc0`  
**Index:** empty (nothing staged)  
**Isolation:** `isQualifiedIsolationActive() === false`

**Do not run** stage/commit/push/PR until founder sign-off. This file is instructions only.

---

## Independent verification (final)

| Check | Result |
|---|---|
| Every proposed path exists on disk | **24/24 OK** |
| Dirty set vs scopes A/B/C | **NO_UNRELATED_DIRTY**; all A+B present |
| `git add --dry-run` → 24 paths | **exit 0**; index still empty after dry-run |
| PowerShell here-string message parses | **OK** (4 lines / 228 chars) |
| Unit webhook set | **27** passed, exit **0** |
| `npm run test:postgres` | **27** passed, exit **0** |
| Site `github-webhook-auth` | **15** passed, exit **0** |
| **Grand total** | **69** passed, **0** failures |
| Site + engine typecheck | exit **0**; `tsc` **Version 5.9.3** |
| Root lockfile / migrations / sandbox / OAuth | **clean** |
| Other worktrees | **preserved** |

### Exact dry-run add list (24 files)

**A — SoT (8):**  
`webhook-http-handler.ts` (new), `webhook-security.ts`, `webhook-processor.ts`, `database.ts`, `postgres-store.ts`, `store-interface.ts`, `engine/src/index.ts`, `site/.../webhook/route.ts`

**B — Tests/scripts (5):**  
`webhook-delivery-concurrency.test.ts` (new), `webhook-postgres.integration.test.ts` (new), `github-webhook-auth.test.ts`, `engine/package.json`, `site/package.json`

**C — Ops docs (11):**  
`BLOCKER_REGISTER.md`, `CUSTOMER_VALIDATION_ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, `MASTER_INVENTORY.md`, `PHASE1B2_FOUNDER_APPROVAL_CHECKLIST.md`, `PHASE1B2_MERGE_READINESS_REPORT.md`, `PHASE1B2_PROPOSED_COMMIT_AND_PR.md`, `PHASE1B2_WEBHOOK_BLOCKER_REPORT.md`, `SECURITY_BASELINE.md`, `SITE_TYPESCRIPT_BASELINE.md`, `TOOL_ADOPTION_REGISTER.md`

---

## Final exact commit commands (PowerShell)

After founder approval of commit only:

```powershell
Set-Location C:\Users\NITISH\Downloads\Patchversion-phase1b2-webhooks

# Confirm branch + empty index
git branch --show-current
git diff --cached --name-only

git add -- `
  packages/engine/src/github/webhook-http-handler.ts `
  packages/engine/src/github/webhook-security.ts `
  packages/engine/src/github/webhook-processor.ts `
  packages/engine/src/db/database.ts `
  packages/engine/src/db/postgres-store.ts `
  packages/engine/src/db/store-interface.ts `
  packages/engine/src/index.ts `
  packages/site/src/app/api/github/webhook/route.ts `
  packages/engine/test/webhook-delivery-concurrency.test.ts `
  packages/engine/test/webhook-postgres.integration.test.ts `
  packages/site/test/github-webhook-auth.test.ts `
  packages/engine/package.json `
  packages/site/package.json `
  docs/operations/

# Expect exactly 24 staged paths
git status --short
git diff --cached --name-only | Measure-Object -Line

git commit -m @"
feat(webhooks): unify GitHub webhook SoT with delivery conflict checks

Centralize HMAC/idempotency/payload-hash handling in handleGitHubWebhookHttp,
harden legacy delivery rows, and add disposable Postgres concurrency coverage.
"@

git status --short
```

**A+B only (omit docs):** drop the `docs/operations/` line from `git add`.

**Notes**
- Closing `"@` of the here-string must be at column 0.
- Do **not** use `--no-verify` unless founder explicitly orders it.
- Do **not** `git push` or `gh pr create` without separate approval.

---

## Final exact PR instructions (after push approval)

```powershell
Set-Location C:\Users\NITISH\Downloads\Patchversion-phase1b2-webhooks
git push -u origin HEAD

gh pr create --base main --head feat/phase1b2-webhook-source-of-truth --title "feat(webhooks): Phase 1B.2 GitHub webhook source of truth" --body @"
## Summary
- Unify GitHub webhook HTTP handling in ``handleGitHubWebhookHttp`` (HMAC, replay window, delivery-id idempotency, payload-hash conflict → 409).
- Harden legacy delivery rows without ``ph=`` prefix; require installation id on check_run / pull_request processing paths.
- Thin Next.js route; add in-memory concurrency + disposable Postgres persistence tests; pin site typecheck to workspace TypeScript 5.9.3.

## Test plan
- [x] Engine webhook unit set — 27 passed
- [x] ``npm run test:postgres`` (disposable local only) — 27 passed
- [x] Site ``github-webhook-auth`` — 15 passed (69 total)
- [x] Site + engine typecheck (TS 5.9.3)
- [ ] CI on PR (after push)
- [ ] **Do not** run Neon, live GitHub App/OAuth, or migration apply as part of this PR

## Explicit non-goals / gates
- Product remains **NOT_CUSTOMER_READY**
- Isolation remains fail-closed (``isQualifiedIsolationActive() === false``)
- No migration SQL changes; no Neon access
- B-GH-002 live App→PR E2E deferred to separate founder gate

## Rollback
- Revert this PR/merge; no DB migration rollback required
- Re-run webhook unit + ``test:postgres`` + site auth; confirm isolation still false
"@
```

If `main` is not the agreed base, replace `--base main` with the founder-designated branch.

---

## Rollback

| When | Action |
|---|---|
| Before push | `git reset --hard e354cc0` in **this worktree only** (discards uncommitted Phase 1B.2; other worktrees untouched) |
| After merge | Revert merge commit; no SQL rollback; re-run 69-test buckets; isolation must stay `false` |

---

## Founder sign-off

- [ ] Approve **commit** (A+B+C or A+B) in this worktree only  
- [ ] Approve **push**  
- [ ] Approve **PR create** (not merge)  
- [ ] Deny Neon / migrate / live App-OAuth / deploy / isolation for this change set  
- [ ] Acknowledge **`NOT_CUSTOMER_READY`**
