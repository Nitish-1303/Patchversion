# Day 3 — Day-2 Review Findings Classification

**Source review:** `docs/release/day2-independent-review-2026-11-19.md` + CI run `44426944354`  
**Branch:** `agent/p0-product-completion` @ `438abef`  
**Dirty tree preserved:** `3c54282`

| ID | Finding | Severity | Location | Root cause | Required correction | Regression risk | Reproduction | Acceptance |
|---|---|---|---|---|---|---|---|---|
| F1 | Postgres `consumeOAuthState` fail-open pre-005 | **Critical** (remediated Day2) | `packages/engine/src/db/postgres-store.ts` ~1175 | Missing table returned `true` | Keep `return false`; durable cookie gate on callback | OAuth broken until 005 on PG without durable cookie path | Unit/task2 + oauth routes | consume missing-table → false; durable cookie require consume |
| F2 | Production demo GitHub login without client id | **Critical** (remediated Day2) | `packages/site/src/app/api/auth/github/login/route.ts` | Unconditional demo session | Keep `ALLOW_DEMO_GITHUB_LOGIN` + non-production gate | Local demo UX requires explicit env | `GET /api/auth/github/login` without client id | production → 503 `GITHUB_CLIENT_ID_MISSING` |
| F3 | Live migration tests hardcode version `002` | **High** | `lifecycle-replay-store.test.ts` ~599/649; `postgres-live.integration.test.ts` ~76 | New 003–005 not reflected in live expectations | Assert dynamic latest version via `loadMigrationFiles()`; upgrade path expects 002–005 applied | False CI failures; under-tests new migrations | CI `postgres-live-integration` | Fresh → current=`005`; from-001 → applied includes 002–005 |
| F4 | Migration numbering collision with dirty tree | **High** (process) | dirty `002_billing` vs main `002_lifecycle` + `003_billing` | Parallel histories | Document remap; never merge dirty migration table rows into main DBs | Schema_migrations checksum drift | Diff dirty vs main migration dirs | Remap doc present; no dual apply |
| F5 | Root ESLint resolves global ESLint 8 on Windows | **High** (env/tooling) — **CLOSED** | Historical: bare `eslint` → global 8.57.1 | PATH pollution | Pin already landed; **do not reopen as source-code blocker; no further ESLint config changes** | None | `npm run lint` | CI lint green; local pin exit 0 |
| F6 | Site `next build` `fnOrEmpty` on Windows Node 24 | **High** (env/tooling) | Next tracer early-return when `trace(type, options)` lacks callback under some local conditions; also hit `/opengraph-image.png` | Host/Next interaction; CI typecheck+test already green; build skipped due to F3 | Reproduce under WSL/CI after F3; fix only if product defect | Build gate | `npm run build -w @patchversion/site` | exit 0 on CI Ubuntu Node 24 |
| F7 | Live GitHub App E2E skipped | **Medium** (verification gap) | `task2-github-onboarding-hardening.test.ts` LIVE-* | No credentials in CI/local | Keep skipped; document NOT TESTED | Cannot claim customer-ready | Task2 LIVE-STATUS | Documented gap; no false PASS |
| F8 | Windows hosted-db-isolation / unguarded-db-paths spawn ENOENT | **Medium** (env) | those test files | Windows spawn/`sh`/npm path | Investigate; prefer CI Linux evidence | Ignoring hides host regressions | Run suites without ignore on Windows | Document or fix spawn path |
| F9 | Stale `p0-integration-plan.md` companion-blocked note | **Low** | `docs/engineering/p0-integration-plan.md` | Docs lag | Update status to ported | Doc confusion | Read plan | Plan matches HEAD |
| F10 | Webhook/Stripe/PayPal/isolation positives | n/a OK | various | — | Preserve | — | security suites | continue PASS |

**Release-gate close-out:** Founder rule required **NEEDS_REVISION** until F1–F10 evidence + CI Ubuntu Node 24. Fresh auditor: **PASS** (`day3-independent-review-2026-11-19.md`) after ledger `day3-build-release-gate-evidence-2026-11-19.md` (CI `44433229669` @ `01d61ad`, Node v24.22.2). WSL Node 22 corroborating only. Windows hosted-DB suites **executed** (22 passed). Customer readiness remains **NOT_CUSTOMER_READY**.
