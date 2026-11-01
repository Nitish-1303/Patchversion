# TryPatchBay — Final Evidence and Claim Audit

**Purpose:** Authoritative claim-by-claim verification table for the YC W27 application.
**Audit date:** 2026-10-31
**Evidence scope:** Local repository `C:\Users\NITISH\Downloads\Patchversion`, live Vercel production at `https://trypatchbay.vercel.app`, and freshly-run test suite this session.

> [!NOTE]
> "Verified" means independently confirmed by running the command or reading the source file this session. "NOT VERIFIED" means the claim appears in documentation but lacks direct evidence from this audit session. Claims marked NOT VERIFIED are excluded from the final application.

---

## Section A — Test Suite Integrity

| Claim in Application | Source / Command | Result | Confidence | Limitation |
|---|---|---|---|---|
| 418 passing tests, 6 skipped, 0 failing | `npm test` (run this session, exit 0) | Engine: 330 passed / 6 skipped (37 suites, 2 skipped suites = live DB integration); Site: 86 passed (9 suites); Shared: 2 passed | HIGH | Test counts reflect the state on 2026-10-31. 2 skipped engine suites require a live PostgreSQL database not available in CI without credentials. |
| 44 suites total | Same `npm test` run | 37 engine suites + 9 site suites = 46 suites, minus 2 skipped = 44 active suites | HIGH | "44 suites" is the active-suites count; total including skipped is 46. |
| Zero type errors | `npm run typecheck` (exit 0 this session) | TypeScript compiler reports 0 errors | HIGH | Reflects current HEAD `f349f2d`. |
| 1 lint warning, 0 lint errors | `npm run lint` (exit 0 this session) | 1 warning: `'crypto' is defined but never used` in `rbac-and-mutation-authorization.test.ts:8` | HIGH | Non-blocking warning in test file, not in production code. |

---

## Section B — Proof Runner Verification

| Claim in Application | Source / Command | Result | Confidence | Limitation |
|---|---|---|---|---|
| Lodash 3.10.1 → 4.17.21 migration verified in 56.8 seconds | `npm run prove:real` (run previous session; results recorded) | Exit 0. `fixtures/lodash-repo` (`acme/membership`). Baseline 3/3 pass → Bump 1/3 fail (2 failed on `_.contains`) → Fix 3/3 pass. `_.contains` → `_.includes` rewritten in `src/membership.js`. Duration: 56.8s | HIGH | This is a **trusted internal test fixture**, not a customer migration. Package downloads are real (`lodash@3.10.1` and `lodash@4.17.21` from npm). |
| Mockpay 1→2 synthetic benchmark verified in 46.0 seconds | `npm run prove` (run previous session) | Exit 0. `fixtures/sample-repo` (`acme/payments`). Baseline 3/3 pass → Bump 1/3 fail (2 failed on `source` param) → Fix 3/3 pass. 1 call site rewritten in `src/createCharge.js`. Duration: 46.0s | HIGH | **Synthetic benchmark** — `mockpay` is a fabricated test package, not a real third-party library. |
| Fail-closed execution for non-demo repositories | `packages/engine/src/jobs/orchestrator.ts` lines 315–317 | `throw new Error("Cannot execute test validation: execution for live repository ... is disabled. Execution is restricted to trusted demo fixtures until container isolation is qualified.")` | HIGH | Literal throw in source. Not configurable at runtime without code change. |

---

## Section C — Scanner and Dependency Graph

| Claim in Application | Source / Command | Result | Confidence | Limitation |
|---|---|---|---|---|
| CipherBill scanner maps 523 dependencies, 543 graph nodes | `packages/engine/src/scanner/dependency-mapper.ts` + live scan results | 543 nodes = 1 workspace root node + 523 dependency nodes + 19 source file nodes. Breakdown verified in source. | HIGH | Node count is deterministic given a fixed `package-lock.json` state. Count may drift if `Nitish-1303/CipherBill` updates its dependencies. |
| CipherBill scan reports 0 breaking changes matching the current rule catalog | Live scanner output (previous session) | Exact result: "No breaking changes matched the migration rules currently supported by TryPatchBay." | HIGH | This does not mean CipherBill has no breaking changes — it means none were matched by the current rule set (Lodash and Mockpay rules). |

---

## Section D — Production Deployment

| Claim in Application | Source / Command | Result | Confidence | Limitation |
|---|---|---|---|---|
| Production URL live | `GET https://trypatchbay.vercel.app` (smoke test 2026-10-31T14:11:46Z) | 200 OK, 65,859 bytes | HIGH | Confirms page renders. Does not confirm authenticated scan functionality. |
| `/api/health` returns 200 | `GET https://trypatchbay.vercel.app/api/health` (same smoke test) | 200 OK, `{"status":"healthy","version":"0.1.0"}` | HIGH | Health endpoint confirmed operational. |
| Production serves commit `3d72cb1` | Vercel deployment `dpl_GCb2YNpJHRju1SssSwbvVe7igA2a` | Deployment active, commit SHA `3d72cb1` confirmed via Vercel API | HIGH | Local HEAD is `f349f2d` (4 commits ahead). Local YC documentation changes are not deployed to production. |
| Authenticated scan returns 401 without credentials | `GET https://trypatchbay.vercel.app/api/findings?repo=Nitish-1303/CipherBill` | 401 Unauthorized | HIGH | Authentication is enforced. Confirms RBAC is operational in production, not a full scan success. |

---

## Section E — Security and Architecture

| Claim in Application | Source / Command | Result | Confidence | Limitation |
|---|---|---|---|---|
| Atomic rate limiting via PostgreSQL | `packages/engine/src/lib/rate-limiter.ts` | PostgreSQL-backed atomic counter with process-local fallback during DB failure. Distributed enforcement under normal DB operation; degraded to process-local during DB outage. | HIGH | Process-local fallback does not enforce across multiple Vercel function instances. This is a documented degraded mode, not a silent failure. |
| Role-based access control implemented | `packages/site/src/middleware.ts`, `packages/engine/src/lib/rbac.ts` | RBAC enforced on API routes at middleware layer | HIGH | RBAC is correctly implemented. It does not substitute for container isolation of the execution sandbox. |
| Execution is child-process based, NOT container/microVM isolated | `packages/engine/src/sandbox/runner.ts` | Child `spawn` with `PATH` restriction. No Docker, Firecracker, or gVisor. | HIGH | The application's own readiness check (`npm run readiness`) reports `Customer: NO` and blocks customer-repository execution at `orchestrator.ts:315-317`. |

---

## Section F — Readiness Gate

| Claim | Source / Command | Result | Confidence | Limitation |
|---|---|---|---|---|
| Demo readiness: PASS | `npm run readiness` (previous session, exit 0) | `Demo Ready: YES` | HIGH | Demo scope only (trusted fixtures). |
| Customer readiness: BLOCKED | Same | `Customer: NO` — blocked on (1) independent second consumer migration and (2) verified container/microVM sandbox | HIGH | Not claimed as customer-ready in any application field. |

---

## Section G — Claims Deliberately Excluded from the Application

The following claims appear in earlier draft documents but are **excluded from `18_FINAL_YC_W27_APPLICATION.md`** because they are unverified, overstated, or not yet true:

| Excluded Claim | Reason for Exclusion |
|---|---|
| "Isolated sandbox" or "sandboxed execution" for customer repos | Execution is child-process based. The readiness gate explicitly blocks customer execution. "Isolated" would imply container-level isolation, which does not exist. |
| "10 pilot customers in 6 weeks" | This was an unconfirmed planning goal, not a founder commitment. Removed. |
| "$30–50M TAM" | No source cited for this figure. Removed from revenue answer. |
| "All breaking changes detected" | Only breaking changes matching the current supported rule catalog are detected (Lodash and Mockpay rules as of this audit). |
| "Automated PR delivery to customers in production" | PR delivery is implemented in `orchestrator.ts` but is read-only in demo mode and blocked for customer repositories at lines 315–317. |
| "Live npm monitoring daemon" | The rule catalog is curated and static, not a live npm change monitor. |
| "418 tests as traction" | Test count is a development quality metric, not a product adoption metric. Correctly framed as engineering evidence in the application. |
| Customer or paying user claims | 0 paying customers, $0 revenue. Stated accurately. |
| Any claim of YC endorsement or partnership | Not applicable. |
