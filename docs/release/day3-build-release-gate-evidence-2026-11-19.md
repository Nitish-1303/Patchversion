# Day 3 — Build & Release-Gate Evidence Ledger (2026-11-19)

**Branch:** `agent/p0-product-completion`  
**HEAD (this ledger):** `01d61adc6ed23c04b1dadca6a932daf115d5b9d4`  
**PR:** https://github.com/Nitish-1303/Patchversion/pull/45  
**Dirty worktree:** `Patchversion` @ `3c54282` — **preserved**  
**Customer readiness:** **NOT_CUSTOMER_READY**  
**Release-gate posture (founder rule):** **NEEDS_REVISION** until Day-2 findings are closed with evidence **and** CI Ubuntu Node 24 acceptance gate passes, then a fresh independent review may upgrade the verdict. Do **not** treat WSL Node 22 alone as merge/deploy authorization.

---

## 1. Local / host results (recorded exactly)

| Evidence | Command / scope | Result | Notes |
|---|---|---|---|
| Windows hosted-DB suites | `npm run test -w @patchversion/engine -- --runInBand test/hosted-db-isolation.test.ts test/unguarded-db-paths.test.ts` | **22 passed**, 1 skipped, suites **2 passed**, **exit 0** | Previously ignored for spawn ENOENT; **actually executed** on Windows after spawn/`npm_execpath` fix — not silently marked passed |
| Migration unit tests | `test/postgres-migration.test.ts` | **7 passed**, **Jest exit 0** | Checksums, advisory lock, idempotency, checksum fail-closed, schema integrity + `oauth_states` in CANONICAL_TABLES |
| Billing unit tests | `test/billing-api.test.ts` | **18 passed**, **Jest exit 0** | Shell/Jest may emit “Force exiting Jest” / PowerShell NativeCommandError noise — **treat Jest suite exit 0 as the test result**; do not conflate with shell cleanup noise |
| Clean WSL Node 22 production build | `npm run build -w @patchversion/site` under WSL Node **v22.22.1**, clean `.next` | **exit 0** | 41/41 static routes; `/api/billing/checkout` present. **Valid positive**; **does not** independently authorize merge/deploy |
| Contaminated earlier WSL build | Interrupted / `.next` wiped mid-run | **Excluded** | Must not be cited as acceptance evidence |
| Windows Node 24 `next build` | Host Node **v24.14.1**, `npm run build -w @patchversion/site` | **exit 1** | `TypeError: fnOrEmpty is not a function` while collecting page data for `/api/billing/checkout`. Classified as **Windows/Node 24 environment-specific** failure, **not** a proven application defect (contradicted by CI Ubuntu Node 24 + clean WSL Node 22) |

---

## 2. CI Ubuntu Node 24 acceptance gate (authoritative for production build)

| Field | Value |
|---|---|
| Run | [44433229669](https://github.com/Nitish-1303/Patchversion/actions/runs/44433229669) |
| Job | `build` — [135256028601](https://github.com/Nitish-1303/Patchversion/actions/runs/44433229669/job/135256028601) |
| Commit SHA | `01d61adc6ed23c04b1dadca6a932daf115d5b9d4` |
| Runner | `ubuntu-latest` |
| Node version | **v24.22.2** (`actions/setup-node@v7` with `node-version: 24`) |
| npm | 11.19.1 |
| Command | `npm run build` → `hosted-db-guard` → shared `tsc` + engine `tsc` + `next build` |
| Job conclusion | **success** |
| Effective exit | **0** (step “Run npm run build” conclusion success) |
| Site build highlights | Next.js 16.4.3; Compiled successfully; Generating static pages **41/41**; route `ƒ /api/billing/checkout` listed |

**Supported production-build environment:** **CI Ubuntu Node 24** (and equivalent Linux Node 24).  
**Known host limitation:** Windows Node 24 local `next build` `fnOrEmpty` — retained as environment residual only.

Also green on same run: typecheck (incl. lint), test, prove, prove-real, postgres-live-integration, readiness-audit.

Prior green builds on same gate: `44431028314` @ `35e8174`, `44431727701` @ `20ef0dc`.

---

## 3. Migrations 003–005 (non-production verification)

### Schema lineage (main)

1. `001_initial_schema`  
2. `002_lifecycle_capability_replay`  
3. `003_billing_and_rls` — plan/subscription columns + ENABLE/FORCE RLS + tenant policies  
4. `004_restricted_roles_and_rls` — restricted roles, HMAC SECURITY DEFINER path, policy refresh  
5. `005_github_hardening` — `installations.last_event_at`, `oauth_states`, unique `users.github_user_id`

Remap vs dirty `002_billing`: `docs/release/migration-remap-main-vs-dirty-2026-11-19.md`. **Do not dual-apply.**

### Production-like PostgreSQL evidence

| Check | Evidence | Result |
|---|---|---|
| Fresh apply → latest `005` | CI `postgres-live-integration` @ `01d61ad`: 21 tests passed on **postgres:16-alpine** | **PASS** |
| Upgrade from 001 → apply 002–005 | `lifecycle-replay-store` live tests (dynamic `latest`) | **PASS** (CI) |
| Idempotency | Second `runMigrations` applies `[]` (unit + live) | **PASS** |
| Canonical tables include `oauth_states` | `CANONICAL_TABLES` + unit integrity tests | **PASS** |
| RLS / tenant isolation SQL | `003`/`004` FORCE RLS + tenant_id policies | Present in SQL; exercised via migration apply path in CI |
| Production migrations | — | **Not run** |

Historical pre-fix CI: run `44426944354` @ `438abef` failed hardcoded `002` — see `ci-44426944354-postgres-live-pre-fix-2026-11-19.md`.

---

## 4. Day-2 findings → evidence map

| ID | Finding | Closure evidence | Status |
|---|---|---|---|
| F1 | OAuth consume fail-open | `postgres-store.ts` returns `false` if `oauth_states` missing; durable cookie gate | **Closed** (code + prior security tests) |
| F2 | Demo login ungated | `ALLOW_DEMO_GITHUB_LOGIN` + non-production + site tests | **Closed** |
| F3 | Live tests hardcode `002` | Dynamic `latest`; CI postgres-live 21 passed @ `01d61ad` | **Closed** |
| F4 | Dirty vs main migration collision | Remap doc + process rule; dirty `3c54282` preserved | **Closed** (process) |
| F5 | Global ESLint 8 on Windows | Pin `node ./node_modules/eslint/bin/eslint.js`; CI lint green; **not reopened** | **Closed** (historical host) |
| F6 | Site `next build` / `fnOrEmpty` | **CI Ubuntu Node 24 build exit 0** @ `01d61ad`; clean WSL Node 22 exit 0; Windows Node 24 retained as env limitation | **Closed** for acceptance gate |
| F7 | Live GitHub E2E | LIVE-* still `test.skip`; documented NOT TESTED | **Closed as documented gap** (keeps NOT_CUSTOMER_READY) |
| F8 | Windows hosted-db suites ignored | **Actually executed:** 22 passed, exit 0 | **Closed** |
| F9 | Stale p0 plan | Plan updated for Day 2–3 ports | **Closed** |
| F10 | Webhook/billing/isolation OK | Billing 18 passed; isolation hard-false preserved | **Closed** (preserve) |

---

## 5. Restrictions

No merge of PR #45, no deploy, no production migrations, no production secret changes without founder approval.
