# Day 2 — Product Salvage Evidence (2026-11-19)

**Worktree:** `C:\Users\NITISH\Downloads\Patchversion-main-p0`  
**Branch:** `agent/p0-product-completion`  
**Base:** `3668ba3` (`origin/main`)  
**Dirty tree preserved:** `C:\Users\NITISH\Downloads\Patchversion` @ `3c54282` (not overwritten)

**Customer readiness:** still `NOT_CUSTOMER_READY` (full external developer workflow not independently verified end-to-end).

## A — Companion API port (contracts)

| API | Contract | DB deps | Authz | Errors / concurrency |
|---|---|---|---|---|
| `GitHubClient.getAppInstallation(id)` | GET `/app/installations/:id` → `{id,suspended}` or `null` on 404 | none | App JWT | throws if App not configured / non-404 HTTP |
| `GitHubClient.getInstallationAccess(id)` | GET same → `{id,permissions}` | none | App JWT | throws on non-OK |
| `revokeRepository(tenantId,id)` | status→`revoked` | `repositories` | tenant-scoped WHERE | false if missing |
| `revokeRepositoryByGithubId(tenantId,githubRepoId)` | same by github id | `repositories` | tenant-scoped | false if missing |
| `updateInstallationStatus(..., eventTimeMs?)` | status update + optional `last_event_at` ordering | `installations` (+ optional column) | tenant + github installation id; refuse resurrect deleted; refuse older eventTime | transactional in Postgres; JSON store atomic save |
| `createOAuthState` / `consumeOAuthState` | one-time hashed state | `oauth_states` (migration 005) | N/A (CSRF) | consume rejects missing/expired/replay; PG falls back if table missing |
| `updateTenantPlan` / `getTenantBySubscriptionId` / `getMonthlyPullRequestCount` | billing entitlement | `tenants.plan/subscription_*` (003) | tenant id / subscription id | PG graceful if columns absent |
| `getUserByGithubUserId` / `linkGithubAccount` | GitHub identity bind | `users.github_user_id` unique (005) | identity conflict checks in OAuth callback | createUser rejects duplicate github id |

## B — Security regression checks

- `isQualifiedIsolationActive()` remains hard `false` (fail-closed).
- Webhook route uses `verifyGitHubWebhookSignature`, allowlist, replay window, idempotent `recordWebhookDelivery`, `processVerifiedGitHubWebhook`.
- OAuth login/callback: timing-safe state compare, cookie clear, optional durable `consumeOAuthState`.
- Scan/comment paths call `authorizeTenantRepository` (tenant + installation fencing).
- Stripe ingest refuse-closed without `STRIPE_WEBHOOK_SECRET`; PayPal signature verify + test bypass only under `NODE_ENV=test`.
- Task2 hardening suite PASS (live GitHub skipped).

## C — Site integration

Wired real implementations for: GitHub webhook, OAuth login/callback, scan authz, comment, billing webhook, PayPal verify service/plans.

## D — Migration safety (not run on production)

Main lineage:

1. `001_initial_schema`
2. `002_lifecycle_capability_replay` (already on main)
3. `003_billing_and_rls` (renumbered; dirty feat used `002_billing`)
4. `004_restricted_roles_and_rls`
5. `005_github_hardening` (`last_event_at`, `oauth_states`, unique github user id)

Compatible with fresh init and previously migrated main DBs that only applied 001–002. **Incompatible numbering** with dirty feat branch (`002_billing`…); do not mix migration histories without an explicit remap. **No production migrate executed.**

## E — Test evidence

| Command | Exit | Result |
|---|---:|---|
| `npm run typecheck -w @patchversion/shared` | 0 | PASS |
| `npm run typecheck -w @patchversion/engine` | 0 | PASS |
| `npm run build -w @patchversion/shared` | 0 | PASS |
| `npm run build -w @patchversion/engine` | 0 | PASS |
| `npm run test -w @patchversion/engine -- --testPathIgnorePatterns="hosted-db-isolation\|unguarded-db-paths"` | 0 | **483 passed**, 21 skipped, 2 suites skipped |
| Security focus (`postgres-migration\|task2-github\|webhook-verifier\|provider-adapter\|r-exec-fail-closed\|execution-provider-security`) | 0 | **83 passed**, 5 skipped |
| `npm run test -w @patchversion/site` | 0 | **129 passed** |
| `npm run lint` (root) | 2 | BLOCKED — ESLint 8/9 rule options conflict on host |
| Scoped eslint on changed API trees | 0 | PASS |
| `npm run build -w @patchversion/site` | 1 | BLOCKED — Next page-data `TypeError: fnOrEmpty is not a function` (also `/opengraph-image.png`; Node v24.14.1 / next@16.4.3 host issue) |

Windows note: `hosted-db-isolation` / `unguarded-db-paths` fail with `spawn … ENOENT` / `ECONNRESET` when not ignored — environmental, not product logic regressions.

## Remaining blockers

1. Site production `next build` fails on this host during page data collection (`fnOrEmpty`).
2. Root eslint broken by tooling version skew.
3. Live GitHub App OAuth + qualified microVM isolation still missing → external workflow unverified.
4. Do not merge migration histories from dirty `fix/p0-…` without remap.
5. No merge/deploy performed.

## Independent review

**Verdict: NEEDS_REVISION** (read-only security auditor)

Addressed in-tree after audit:
- Postgres `consumeOAuthState` fail-closed when `oauth_states` missing (`false`, not `true`).
- `createOAuthState` returns `persisted`; login sets `github_oauth_durable` only when persisted; callback requires consume only then.
- GitHub login demo session gated behind `ALLOW_DEMO_GITHUB_LOGIN=true` and never in `production`.

Still open from audit (do not claim PASS):
- Site `next build` / root ESLint host tooling failures.
- Live GitHub + hosted-db suites unverified on this Windows host.
- Migration remap required before any dirty-branch history merge.

Customer readiness remains **NOT_CUSTOMER_READY**.
