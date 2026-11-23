# Phase 1B.2 — Founder Merge-Readiness Report

**Date:** 2026-11-23  
**Auditor role:** Strict founder-review readiness (implementation worktree only)  
**Worktree:** `C:\Users\NITISH\Downloads\Patchversion-phase1b2-webhooks`  
**Branch:** `feat/phase1b2-webhook-source-of-truth`  
**Base:** `e354cc07f8c9cb1c20b3c2bca685c664a3bf4aec` (PR #45/#46 merge)  
**Isolation:** `isQualifiedIsolationActive() === false` (unchanged, fail-closed)  
**Product gate:** **`NOT_CUSTOMER_READY`**  
**Merge gate (this phase):** **`CONDITIONAL_READY_FOR_FOUNDER_COMMIT`** — code verified; **no commit/push/merge until founder approves**

## Scope of diff (complete)

### Modified (tracked)

| File | Intent |
|---|---|
| `packages/engine/src/db/database.ts` | `getWebhookDelivery` (in-memory) |
| `packages/engine/src/db/postgres-store.ts` | `getWebhookDelivery` (PG) |
| `packages/engine/src/db/store-interface.ts` | Optional `getWebhookDelivery?` |
| `packages/engine/src/github/webhook-security.ts` | `ph=` payload-hash helpers |
| `packages/engine/src/github/webhook-processor.ts` | Require installation id for check_run / pull_request |
| `packages/engine/src/index.ts` | Export SoT handler + hash helpers |
| `packages/engine/package.json` | Include webhook PG suite in `test:postgres` |
| `packages/site/src/app/api/github/webhook/route.ts` | Thin route → `handleGitHubWebhookHttp` |
| `packages/site/test/github-webhook-auth.test.ts` | Test 10b payload conflict |
| `packages/site/package.json` | Pin workspace TypeScript **5.9.3** binary only |

### Untracked (new)

| File | Intent |
|---|---|
| `packages/engine/src/github/webhook-http-handler.ts` | Webhook HTTP SoT |
| `packages/engine/test/webhook-delivery-concurrency.test.ts` | In-memory uniqueness/concurrency (+ legacy conflict) |
| `packages/engine/test/webhook-postgres.integration.test.ts` | Disposable PG persistence/concurrency |
| `docs/operations/*` | Ops inventory, blockers, TS baseline, this report |

### Explicitly clean / untouched

- Root `package.json` / `package-lock.json` (no `file:../Patchversion` regression)
- All `packages/engine/src/db/migrations/*.sql` and `schema.sql` (no migration edits)
- OAuth, login/callback, repository-authorization, GitHub client
- Isolation provider (`return false`)
- Neon / production secrets / deploy configs

**Dependency regression check:** site `package.json` change is **script-only** (typecheck pin). Dependency versions and order match HEAD except intentional script line. Engine `package.json` change is **script-only** (`test:postgres` file list).

## Security controls (re-verified)

| Control | Status | Notes |
|---|---|---|
| HMAC over raw body | PASS | Verifier + site auth 1–8, 13 |
| Secret missing/empty/whitespace fail-closed | PASS | Auth 5–7 |
| Event allowlist | PASS | Handler 400 `EVENT_NOT_ALLOWED` |
| Replay window | PASS | `WEBHOOK_REPLAY_REJECTED` |
| Delivery-id idempotency | PASS | Auth #10; concurrency; PG |
| Same delivery + altered body → 409 | PASS | Auth #10b; concurrency; PG |
| Legacy rows without `ph=` → 409 on HMAC mismatch | PASS | New concurrency test (founder-audit fix) |
| `delivery_id UNIQUE` + `ON CONFLICT DO NOTHING` | PASS | Existing schema; PG 16-way insert |
| Strict installation for PR/check paths | PASS | Processor requires installation id |
| Hosted DB isolation in tests | PASS | strip vs `local-test` disposable URL only |
| Fail-closed customer isolation | PASS | Still hard `false` |

## Migration safety

- **No new migration files** and **no edits** to 001–007 SQL in this worktree.
- `webhook_deliveries.delivery_id TEXT NOT NULL UNIQUE` already in `001_initial_schema.sql` / `schema.sql`.
- Runtime behavior change is application-level (`getWebhookDelivery`, stored signature material `ph=<hash>|<sig>`).
- **Do not apply** Neon/prod migrations for this phase (nothing to apply; B-MIG still OPEN).

## TypeScript 5.9.3 baseline

| Check | Result |
|---|---|
| `node node_modules/typescript/bin/tsc --version` | **Version 5.9.3** |
| Site `npm run typecheck` (pinned) | exit **0** |
| Engine `npx tsc --noEmit` | exit **0** |
| Root cause of prior failure | Windows `spawn('tsc')` selected user `tsc.exe` **4.9.5** |
| Fix | Pin `node ../../node_modules/typescript/bin/tsc` in site typecheck |
| tsconfig / `moduleResolution: bundler` | Unchanged vs HEAD |

## Evidence — test re-run (2026-11-23 founder audit)

| Suite | Tests | Exit |
|---|---|---|
| Webhook unit set (concurrency + verifier + raw-signature + body-limit) | **27** | **0** |
| `npm run test:postgres` (live + lifecycle + webhook-postgres) | **27** | **0** |
| Site `github-webhook-auth.test.ts` | **15** | **0** |
| **Grand total (pre-commit review)** | **69** | **0** |

Disposable Postgres: Docker `patchbay-test-pg` (`postgres:16-alpine`) @ `127.0.0.1:5432`, credentials from `hosted-db-guard` only. **No Neon access.**

> Pre-commit review added PG legacy-conflict coverage. Final checklist: `PHASE1B2_FOUNDER_APPROVAL_CHECKLIST.md`.

## Code-level fixes applied during this audit

1. Restored site dependency key order (`shared` before `engine`) — removed npm churn.
2. Hardened SoT conflict check for **legacy** delivery rows lacking `ph=` prefix (HMAC header mismatch → 409) + test.

## Residual risks (accept or schedule — not merge blockers for 1B.2 SoT)

| Risk | Severity | Mitigation |
|---|---|---|
| `WebhookReceiver` local prototype still separate from SoT | P2 | Not production route; document; optional later wire-up |
| Process failure **after** `recordWebhookDelivery` → retries return already-processed | P2 | Pre-existing idempotency tradeoff; monitor 500 + Retry-After |
| Live GitHub App → PR E2E unproven (B-GH-002) | P1 | Founder-gated live credentials |
| Customer isolation still off (B-ISO-001) | P0 product | Correct; keep fail-closed |
| Other dirty worktrees exist | Ops | Do not merge from wrong tree |

## Rollback instructions (if merged later)

1. Revert the merge commit / PR on `main` (or `git revert -m 1 <merge_sha>`).
2. Confirm site route again imports prior inlined handler path from revert.
3. No DB migration rollback required for this change set (schema unchanged).
4. Optional: truncate or leave legacy `webhook_deliveries` rows; new `ph=` encoding is forward-compatible with conflict logic.
5. Re-run site auth + engine webhook suites; confirm `isQualifiedIsolationActive()` still false.

**Pre-merge rollback (current state):** discard worktree changes or reset branch to `e354cc0` — nothing pushed.

## Founder decision checklist

- [ ] Approve commit on `feat/phase1b2-webhook-source-of-truth` (this worktree only)
- [ ] Approve push + PR targeting `main` (or designated integration branch)
- [ ] Explicitly **deny** Neon migrate / OAuth / live App ops / isolation flip as part of this PR
- [ ] After merge: schedule B-GH-002 live E2E separately

## Verdict

| Gate | Result |
|---|---|
| Phase 1B.2 webhook SoT code quality | **PASS** (conditional on founder commit approval) |
| Diff scope / no dep regression | **PASS** |
| Migration safety | **PASS** (no SQL changes; apply still forbidden) |
| Security controls | **PASS** |
| Isolation fail-closed | **PASS** |
| Customer-ready product | **`NOT_CUSTOMER_READY`** |
| **Stop** | Awaiting founder approval before commit/push/merge/deploy/external |

Related: `PHASE1B2_WEBHOOK_BLOCKER_REPORT.md`, `SITE_TYPESCRIPT_BASELINE.md`, `BLOCKER_REGISTER.md` (B-GH-001 MITIGATED).
