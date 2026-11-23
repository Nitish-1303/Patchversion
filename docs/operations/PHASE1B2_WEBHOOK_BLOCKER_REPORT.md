# Phase 1B.2 Webhook Blocker Report

**Date:** 2026-11-23  
**Worktree:** `C:\Users\NITISH\Downloads\Patchversion-phase1b2-webhooks`  
**Branch:** `feat/phase1b2-webhook-source-of-truth` @ `e354cc0`  
**Release posture:** **`NOT_CUSTOMER_READY`**  
**Actions not taken:** commit, push, merge, deploy, Neon/prod DB, live GitHub App, OAuth changes, migration apply, fail-closed isolation flip.

## Dirty inventory (preserved)

| Path | Role |
|---|---|
| `packages/engine/src/github/webhook-http-handler.ts` | SoT HTTP handler (new) |
| `packages/engine/src/github/webhook-security.ts` | Payload-hash `ph=`, replay, allowlist |
| `packages/engine/src/github/webhook-processor.ts` | Strict installation / tenant handling |
| `packages/engine/src/db/{database,postgres-store,store-interface}.ts` | `getWebhookDelivery` + UNIQUE insert |
| `packages/engine/src/index.ts` | Exports |
| `packages/site/src/app/api/github/webhook/route.ts` | Thin Next route → SoT |
| `packages/site/test/github-webhook-auth.test.ts` | Auth + 10b conflict |
| `packages/engine/test/webhook-delivery-concurrency.test.ts` | In-memory concurrency |
| `packages/engine/test/webhook-postgres.integration.test.ts` | Disposable PG persistence/concurrency |
| `packages/engine/package.json` | `test:postgres` includes webhook PG suite |
| `packages/site/package.json` | Pinned local `tsc` under guard |
| `docs/operations/*` | Ops docs + this report + site TS baseline |

Accidental `"patchversion": "file:../Patchversion"` in root `package.json` was **reverted to HEAD** before final verification. Other worktrees untouched.

## Security / idempotency / concurrency / uniqueness audit

| Control | Verdict | Evidence |
|---|---|---|
| HMAC raw-body verify | **PASS** | Site auth suite 1–8, 13 |
| Missing/empty/whitespace secret fail-closed | **PASS** | Auth suite 5–7 |
| Event allowlist | **PASS** | `webhook-security` + handler 400 `EVENT_NOT_ALLOWED` |
| Replay window | **PASS** | Handler rejects stale (`WEBHOOK_REPLAY_REJECTED`) |
| Delivery-id idempotency | **PASS** | Auth #10; concurrency; PG suite |
| Altered-body same delivery → 409 | **PASS** | Auth #10b; concurrency; PG suite (`WEBHOOK_PAYLOAD_CONFLICT`) |
| Concurrent same payload → one accept | **PASS** | 8-way in-memory + PG HTTP tests |
| DB `delivery_id UNIQUE` + `ON CONFLICT DO NOTHING` | **PASS** | `schema.sql`; postgres-store; 16-way concurrent insert → count=1 |
| Strict installation / no silent cross-tenant | **PASS** | Processor ignoredReasons (`unknown_installation`, `installation_tenant_mismatch`, …) |
| Fail-closed isolation gate | **UNCHANGED** | Not weakened; remain off until founder host qual |
| Hosted DB guard | **PASS** | Ordinary tests strip URLs; `test:postgres` uses disposable `patchbay_test` only |

## Verified commands (exit codes)

| Command | Exit |
|---|---|
| Engine webhook unit set (4 suites, **27** tests) | **0** |
| Site `github-webhook-auth` (**15** tests) | **0** |
| `npm run test:postgres` (**27** tests; + PG legacy conflict) | **0** |
| Site/engine typecheck (tsc **5.9.3**) | **0** |
| Pre-commit grand total **69** | **0** — `PHASE1B2_FOUNDER_APPROVAL_CHECKLIST.md` |

Disposable Postgres: Docker `postgres:16-alpine` container `patchbay-test-pg` on `127.0.0.1:5432` with hosted-db-guard credentials only. **No Neon.**

## Site TypeScript baseline

Reproducible failure was **PATH collision**: Node `spawn('tsc')` without shell selected user `C:\Users\NITISH\node_modules\.bin\tsc.exe` (**4.9.5**) over workspace `tsc.cmd` (**5.9.3**), rejecting `moduleResolution: "bundler"`.  
**Fix:** pin `node ../../node_modules/typescript/bin/tsc` in site `typecheck` script. Documented in `SITE_TYPESCRIPT_BASELINE.md`. No tsconfig semantics change.

## Remaining blockers (customer-ready)

| ID | Severity | Status | Notes |
|---|---|---|---|
| B-ISO-001 | P0 | MITIGATED (off) | Keep fail-closed |
| B-MIG-001 / B-MIG-002 | P0/P1 | OPEN | No migration apply; Neon blocked |
| B-GH-001 | P1 | **MITIGATED** (SoT + tests in worktree; not merged) | Needs founder review → commit/PR |
| B-GH-002 | P1 | OPEN | Live App→PR E2E not run |
| B-ONB-001 | P1 | OPEN | Onboarding honesty |
| B-CUST-001 | P1 | OPEN | Customer validation |

## Stop for founder approval

Before: commit/push/PR merge, production/staging deploy, Neon inspect/migrate, live GitHub App webhook delivery, OAuth edits, isolation gate flip, destructive infra.

## Verdict

**Phase 1B.2 webhook SoT: functionally verified in isolated worktree.**  
**Product release gate: `NOT_CUSTOMER_READY`.**
