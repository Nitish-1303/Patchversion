# Phase 1 — Verified Capability & Gap Matrix

**Date:** 2026-11-19  
**Worktree:** `Patchversion-main-p0` / `agent/p0-product-completion`  
**HEAD:** `235467048afef0fb6efc9293487ca336dd2e1a8e`  
**PR:** https://github.com/Nitish-1303/Patchversion/pull/45 (OPEN, CI green)  
**Dirty tree:** `Patchversion` @ `3c54282` — **untouched**  
**Baseline audits:** salvage PASS (limited scope); Phase 0 `NOT_CUSTOMER_READY` (2026-11-18, dirty-tree docs)  
**Final readiness:** **NOT_READY** for customer use and production (this matrix does not claim otherwise)

Classification key (do not upgrade without evidence of the **wired production customer path**):

| Class | Meaning |
|---|---|
| **IMPLEMENTED** | Code exists and is wired into a site/engine path used by customers |
| **PARTIAL** | Real code exists but incomplete, gated, or only works for some cases |
| **MOCKED** | Demo/fixture/canned path; must not be mistaken for customer production |
| **MISSING** | Required capability absent |
| **UNVERIFIED** | Code claims real integration; live external proof absent |

---

## 1. Repository / release baseline

| Item | Status |
|---|---|
| Salvage PR #45 | Companions + migrations 003–005 + site wiring on main lineage |
| CI Ubuntu Node 24 build | Passed @ `01d61ad` / docs commit `2354670` |
| Postgres 16 live migrations | Passed (21 tests) |
| Independent salvage review | PASS (limited scope) |
| Live GitHub App E2E | NOT TESTED |
| Production deploy of PR #45 | **Not done** (founder gate) |
| Dirty WIP @ `3c54282` | Preserved; migration remap required before any dirty DB merge |

---

## 2. Customer journey capability matrix

| # | Capability | Class | Wiring evidence | Gap / blocker |
|---|---|---|---|---|
| 1 | Marketing / docs surfaces | **PARTIAL** | `packages/site/src/app/**` pages | Claims can overstate live watching/PR vs fixture reality |
| 2 | Session auth | **PARTIAL** / **UNVERIFIED** live | `api/auth/*`, session HMAC | Live external signup not proven; demo login gated non-prod |
| 3 | GitHub OAuth login | **PARTIAL** / **UNVERIFIED** live | `api/auth/github/login`, `callback`; durable OAuth state consume fail-closed | LIVE-* E2E skipped; prod env completeness unverified in this mission |
| 4 | GitHub App install onboarding | **PARTIAL** / **UNVERIFIED** live | `api/github/onboarding` → install URL; `api/github/callback` | Requires `GITHUB_APP_*` configured; live install not proven |
| 5 | Webhook ingestion + signature | **PARTIAL** / **UNVERIFIED** live | `api/github/webhook` + engine webhook security | Unit-tested; live delivery not proven |
| 6 | Installation ownership / revoke fencing | **PARTIAL** | engine github modules + store | Live revoke/tombstone path not E2E proven |
| 7 | List authorized private repos | **PARTIAL** / **UNVERIFIED** live | `api/repos` GET refreshes via `listInstallationRepositories` when App configured | Needs live App token; demo tenant filters to CipherBill |
| 8 | Dependency scan (remote GitHub files) | **PARTIAL** / **UNVERIFIED** live | `orchestrator.scanRepositoryWithDependencyMap` → `scanner.scanRemoteRepository` via GitHub Contents API | Scan auth uses `revalidateRemote: false` on `/api/scan` |
| 9 | Dependency scan (fixtures) | **MOCKED** / fixture | Demo repo + `localPath` permitted fixtures | Valid for prove/demo only |
| 10 | Supported migration discovery | **PARTIAL** | `break-detector`, `scanner`, known changes / prove rules | Continuous registry watch incomplete for customers |
| 11 | Deterministic AST transform | **PARTIAL** | `fix-generator` + CI `prove` / `prove:real` on fixtures | Not proven on arbitrary customer private repos |
| 12 | Isolated customer test execution | **MISSING** (correctly fail-closed) | `isQualifiedIsolationActive()` → **false**; `resolveExecutionProvider` → `UnavailableExecutionProvider` unless trusted fixture / qualified test-double | **Hard customer blocker:** live repos throw before suite execution |
| 13 | Baseline / post-migration tests | **MOCKED** for customers | Trusted fixtures may run local process; demo can synthesize proof when FS disabled | Customer repos cannot get real red→green evidence |
| 14 | Reproducible verification evidence | **PARTIAL** (fixtures) | evidence bundle / proof artifacts | Customer path blocked by isolation |
| 15 | Human approval gate | **PARTIAL** / **UNVERIFIED** live | `api/approvals` + DB approvals; PR delivery requires active approval + diff hash | UX completeness for external pilot unverified |
| 16 | Real draft GitHub PR | **PARTIAL** / **UNVERIFIED** live | `orchestrator.deliverPullRequest` → `github.createPullRequest` | Code path real; blocked upstream by validation/isolation for non-fixtures; live E2E skipped |
| 17 | Failure recovery / retries / cancel | **PARTIAL** | durable jobs, delivery claims, in-flight PR guards | Production incident recovery unverified |
| 18 | Tenant isolation (app + RLS SQL) | **PARTIAL** / **UNVERIFIED** in prod | Migrations 003–004 FORCE RLS; app tenant checks | SQL on PR branch not production-applied |
| 19 | Quotas / plans | **PARTIAL** | plan columns, PR quota query excludes `is_simulation` | Enforcement vs live paid customer unverified; checkout can return `demo: true` without Stripe |
| 20 | Billing webhooks (Stripe/PayPal) | **PARTIAL** / **UNVERIFIED** live | signature checks + idempotency in routes/tests | Prod processor env / live webhooks unverified |
| 21 | Auditability / observability / backups | **MISSING** / **PARTIAL** | basic logs; readiness evaluator | No verified backup/alert/incident runbook evidence |
| 22 | Firecracker / qualified microVM | **MISSING** (stage-gated) | F2 docs on dirty tree; host evidence blocked | Must not enable via env |

---

## 3. API route inventory (site)

| Route | Primary behavior | Class |
|---|---|---|
| `POST/GET /api/auth/github/login` | Real OAuth start; optional gated demo | PARTIAL |
| `GET /api/auth/github/callback` | Real OAuth callback + durable consume | PARTIAL / UNVERIFIED live |
| `POST /api/github/onboarding` | Real install URL if App configured | PARTIAL / UNVERIFIED live |
| `GET/POST /api/github/callback` | Install callback wiring | PARTIAL / UNVERIFIED live |
| `POST /api/github/webhook` | Signature-gated webhook | PARTIAL / UNVERIFIED live |
| `POST /api/github/comment` | GitHub comment helper | PARTIAL / UNVERIFIED |
| `GET/POST /api/repos` | Live refresh when App configured; demo fixture attach rules | PARTIAL |
| `GET/POST /api/scan` | Orchestrator scan + generateAndValidateFix; demo repo auto-seed | PARTIAL — **customer validate fail-closed** |
| `GET/POST /api/findings` | DB findings | PARTIAL |
| `GET/POST /api/approvals` | Approvals | PARTIAL |
| `GET/POST /api/pull-requests` | `deliverPullRequest` | PARTIAL / UNVERIFIED live |
| `GET/POST /api/packages` | Mix of registry + **mockpay fixture-demo** | PARTIAL + MOCKED |
| `GET /api/dashboard/demo-evidence` | **Fixture demo artifacts** | MOCKED |
| `POST /api/billing/checkout` | Stripe/PayPal if configured else **`demo: true` fallback** | PARTIAL + MOCKED fallback |
| `POST /api/billing/paypal` | Verify subscription (demo billing allowlist possible) | PARTIAL |
| `POST /api/billing/webhook` | Stripe/PayPal webhooks | PARTIAL / UNVERIFIED live |
| `GET /api/health` | Health | IMPLEMENTED |
| `GET/POST /api/auth` | Session helpers | PARTIAL |

---

## 4. Critical mocks / stubs / silent fallbacks (must not be mistaken for production)

1. **Dashboard public demo cockpit** — fixture runs (`lodash` / `mockpay`) via `/api/dashboard/demo-evidence`.
2. **`ensureCheckoutServiceFixtureRepo` / DEMO_REPO_ID** auto-seed on scan when missing.
3. **CipherBill / demo tenant** special-casing in repos listing.
4. **`generateAndValidateFix`** synthesized demo proof when fixture FS path unavailable (serverless).
5. **Billing checkout** returns `demo: true` when Stripe/PayPal not provisioned.
6. **`ALLOW_DEMO_GITHUB_LOGIN` / `ALLOW_DEMO_BILLING`** non-production shortcuts.
7. **`isQualifiedIsolationActive()` hard false** — not a mock; it **blocks** customer execution (correct) but means product cannot complete customer validate→PR without a qualified host.

---

## 5. Isolation & untrusted code rule

- Customer / non-fixture repositories: validation execution is **refused** (`orchestrator.generateAndValidateFix`).
- Default provider: `UnavailableExecutionProvider`.
- Docker mode: blocked.
- Next.js must not become the sandbox for untrusted customer code — current fail-closed posture aligns; **customer-ready product still needs a qualified isolated executor** before claiming test evidence on private repos.

---

## 6. Verdict after Phase 1 inspection

| Gate | Verdict |
|---|---|
| Salvage / CI build | Met (prior evidence) |
| Customer-usable end-to-end | **NOT_READY** |
| Production-ready | **NOT_READY** |
| Combined | **NOT_READY** |

Do **not** declare CUSTOMER_READY or PRODUCTION_READY from builds, unit tests, docs, or salvage PASS alone.
