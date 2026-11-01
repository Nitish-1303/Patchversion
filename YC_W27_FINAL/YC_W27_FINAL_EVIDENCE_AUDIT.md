# TryPatchBay — Final Evidence Audit

**Application:** Y Combinator Winter 2027 (W27)  
**Founder:** Yeluru Nitish  
**Audit Date:** 2026-10-31  
**Local Git Commit:** `f349f2d` (HEAD)  
**Production Deployment Commit:** `3d72cb1` (Serving on Vercel deployment `dpl_GCb2YNpJHRju1SssSwbvVe7igA2a`)  
**Production URL:** `https://trypatchbay.vercel.app`  

### Evidence Status Classification Definitions
* **Verified:** Freshly reproduced and confirmed by command execution or direct inspection in this audit session.
* **Historical:** Supported by an earlier recorded run or fixture test passing in the suite, but not rerun from scratch in this session.
* **Partially Verified:** Core backend/API mechanisms verified, but full end-to-end user experience requires manual interactive browser confirmation.
* **Unverified:** Plausible, but not independently established with current tooling.
* **Unsupported:** No evidence found, contradicted by the implementation, or overstating capabilities.

---

## 1. Technical Claims and Evidence Mapping

| Claim in Application | Evidence Source & Command | Outcome & Commit SHA | Date & Time | Audit Status | Limitation & Context |
|---|---|---|---|---|---|
| **418 passing tests, 6 skipped, 0 failing across 44 active suites** | `npm test` executed across all workspaces | Exit 0. Engine: 330 passed, 6 skipped (35 passed suites, 2 skipped suites). Site: 86 passed (9 suites). Shared: 2 passed (Node runner). Total: 418 passed, 6 skipped, 0 failed. Commit: `f349f2d`. | 2026-10-31 21:44 IST | **Verified** | 2 skipped engine suites require live PostgreSQL credentials not set in local env. Active suites count: 44 (46 total suites). |
| **Zero TypeScript compiler errors** | `npm run typecheck` across all workspaces | Exit 0. 0 errors across `@patchversion/shared`, `@patchversion/engine`, and `@patchversion/site`. Commit: `f349f2d`. | 2026-10-31 21:46 IST | **Verified** | Verified against local HEAD `f349f2d`. |
| **Lint passes with 0 errors** | `npm run lint` | Exit 0. 0 errors, 1 pre-existing warning (`'crypto' is defined but never used` in test file). Commit: `f349f2d`. | 2026-10-31 21:46 IST | **Verified** | Non-blocking test warning only; zero production code issues. |
| **Lodash 3.10.1 to 4.17.21 migration verified in 56.8s** | `npm run prove:real` in `fixtures/lodash-repo`; `test/lodash-proof-metrics.test.ts` passed in test suite | Real package upgrade: rewrites `_.contains` to `_.includes` in `src/membership.js`. Fixture tests: 3/3 pass. Recorded duration: 56.8s. | 2026-10-31 (earlier run; test verified 21:44 IST) | **Historical** | Performed on an **internal test fixture**, NOT an arbitrary customer repository. Downloads real packages from npm. |
| **Synthetic Mockpay API rename benchmark in 46.0s** | `npm run prove` in `fixtures/sample-repo`; `test/orchestrator.test.ts` passed in test suite | Synthetic benchmark: rewrites parameter `source` to `payment_method` in `src/createCharge.js`. Fixture tests: 3/3 pass. Recorded duration: 46.0s. | 2026-10-31 (earlier run; test verified 21:44 IST) | **Historical** | **Synthetic benchmark** (`mockpay` is a fabricated test package, not a third-party library). Kept secondary in application claims. |
| **CipherBill scan: 523 dependencies, 543 graph nodes, 0 rule matches** | `GET https://trypatchbay.vercel.app/api/scan?repositoryId=Nitish-1303/CipherBill` with Bearer auth token | HTTP 200 OK. Returns `totalDependencies: 523`, `transitiveCount: 504`, graph nodes (1 workspace + 523 deps + 19 source files = 543 total). 0 breaking changes matched. Commit: `3d72cb1`. | 2026-10-31 21:36 IST | **Verified** | 0 matches means no patterns matched the supported rule catalog (Lodash & Mockpay). It does NOT prove CipherBill has no other breaking changes. |
| **Production health endpoint operational** | `GET https://trypatchbay.vercel.app/api/health` | HTTP 200 OK, `{"status":"healthy","version":"0.1.0"}`. Commit: `3d72cb1`. | 2026-10-31 21:32 IST | **Verified** | Confirms production API is operational. Serving commit `3d72cb1`. Local HEAD is 4 documentation commits ahead. |
| **Reviewer demo authentication API** | `POST https://trypatchbay.vercel.app/api/auth` with `{ email: "developer@trypatchbay.dev" }` | HTTP 200 OK. Returns session token and sets `trypatchbay_session` cookie. Commit: `3d72cb1`. | 2026-10-31 21:35 IST | **Verified** | Web UI login page has "Quick Demo Sign-in (developer@trypatchbay.dev)" button. No password required for reviewer access. |
| **Full interactive browser reviewer journey** | Navigating to `/login`, clicking button, viewing dashboard & graph in desktop browser | CLI calls verified: 200 OK for HTML, auth POST, and API routes. Interactive UI render requires browser. | 2026-10-31 21:35 IST | **Partially Verified** | Backend APIs and HTML form verified via CLI. Founder manual clickthrough recommended before submission. |
| **Child-process proof runner (not a container/microVM)** | Source code inspection: `packages/engine/src/sandbox/runner.ts` | Uses Node.js `child_process.spawn` with sanitized `PATH`. No Docker, Firecracker, or gVisor sandbox. | 2026-10-31 21:30 IST | **Verified** | Child process isolation is NOT a security sandbox. Correctly documented as such. |
| **Customer repository execution disabled** | Source code inspection: `packages/engine/src/jobs/orchestrator.ts:315-317` | Explicit `throw new Error(...)` blocking non-demo repository test execution. | 2026-10-31 21:30 IST | **Verified** | Customer-repository execution is fail-closed pending qualified container isolation. |
| **PostgreSQL atomic rate limiting and RBAC** | Source inspection: `packages/site/src/app/api/security/rate-limiter.ts`, `packages/site/src/middleware.ts` | Atomic counter in PostgreSQL with process-local fallback during database outages. RBAC on API routes. | 2026-10-31 21:30 IST | **Verified** | Degraded process-local fallback is documented. Distributed enforcement operates under normal DB conditions. |

---

## 2. Unsupported Claims Removed from Application

| Previous Unsupported Claim | Reason for Removal | Audit Status | Current Application Resolution |
|---|---|---|---|
| *"The read-only dependency scanner is live today for any public GitHub repository."* | Unauthenticated requests return HTTP 401. Arbitrary public repositories return HTTP 404 (only pre-seeded demo repositories can be scanned). | **Unsupported** | Removed. Accurately described as a demo workspace for pre-connected repositories. |
| *"Continue as Reviewer button"* | The button on `/login` is actually labeled "Quick Demo Sign-in (developer@trypatchbay.dev)". | **Unsupported** | Replaced with exact button text and clear login instructions. |
| *"At every company I worked at..."* / domain expertise claims | Personal employment anecdotes and unverified domain expertise claims lacked direct backing evidence. | **Unsupported** | Replaced with direct, factual statement of problem interest and technical exploration. |
| *"Renovate and Dependabot do not run tests or verify that tests still pass."* | Inaccurate competitor portrayal; Dependabot and Renovate trigger CI pipelines that run test suites. | **Unsupported** | Replaced with balanced description: they automate PRs and use CI, but do not automatically rewrite application code to resolve breaking API changes. |
| *"10 pilot engineering teams in 6 weeks"* | Unconfirmed future planning goal, not an established founder commitment. | **Unsupported** | Removed completely. |
| *"$30M to $50M TAM"* | Unsourced market-size figure. | **Unsupported** | Removed completely. |
| *"I spend 100% of my working hours on TryPatchBay."* | Unconfirmed phrasing. | **Unsupported** | Replaced with confirmed statement: "I have been working full-time on TryPatchBay since September 20, 2026." |
| *"Low living costs and dependable infrastructure"* | Speculative personal motivation statements. | **Unsupported** | Replaced with plain factual statement of current residence in Chennai and planned relocation to SF. |
| *"Zero matches means no breaking changes exist in CipherBill."* | A zero-match scan only proves no patterns matched the current rule catalog (Lodash & Mockpay). | **Unsupported** | Explicitly qualified as zero matches against the current supported rule catalog. |

---

## 3. Commercial & Founder Evidence

* **Paying Customers:** 0 (**Verified**).
* **Revenue:** $0 (**Verified**).
* **Pricing Hypotheses:** $49/mo (small teams) and $299/mo (organizations). Explicitly stated as unvalidated hypotheses (**Verified**).
* **Investment / Funding:** $0 outside investment; bootstrapped with modest personal funds (**Verified**).
* **Incorporation:** No legal entity formed; no jurisdiction chosen; 100% planned founder ownership (**Verified**).
* **Location:** Current residence in Chennai, India; planned post-YC relocation to San Francisco, USA (subject to visa) (**Verified**).
* **Prior YC Applications:** Third application; earlier application specifics unconfirmed (**Accurately documented**).
