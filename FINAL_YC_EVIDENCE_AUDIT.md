# TryPatchBay — Final YC W27 Evidence Audit Report

**Audit Date & Time:** October 31, 2026, 19:00:00 IST (13:30:00 UTC)
**Auditor Roles:** Senior Infrastructure Engineer, Application-Security Reviewer & YC Due-Diligence Reviewer
**Repository:** `Nitish-1303/Patchversion`
**Local Repository Path:** `C:\Users\NITISH\Downloads\Patchversion`
**Local Audit Commit:** `cee10e2`
**Remote Tracking (`origin/main`):** `3d72cb1a30e4bc74e5093a86db52c6fbc5c8599f`
**Production Deployment:** [https://trypatchbay.vercel.app](https://trypatchbay.vercel.app) (`dpl_GCb2YNpJHRju1SssSwbvVe7igA2a`)
**Production Source Commit:** `3d72cb1a30e4bc74e5093a86db52c6fbc5c8599f`

---

## 1. Executive Summary

This final audit independently investigates the technical state of TryPatchBay prior to Y Combinator Winter 2027 (W27) submission.

Every conclusion in this document is qualified by direct CLI output, process exit codes, Git commits, live HTTP responses, and test runner logs recorded during this verification session.

### Release & Deployment State:
- **Local Git Audit HEAD:** `cee10e2` (clean working tree). Contains local documentation corrections, audit packages, and security test hardening.
- **Remote `origin/main`:** `3d72cb1`. PR #31 was merged into `main` at `d2b33f7`.
- **Production Deployment Status:** Deployment `dpl_GCb2YNpJHRju1SssSwbvVe7igA2a` is `● Ready` on Vercel and serves commit `3d72cb1`. **Local audit changes (`cee10e2`) have NOT been deployed or pushed to production**, strictly adhering to read-only audit constraints.
- **CI Status:** GitHub Actions Run `41201751472` on `origin/main` (`3d72cb1`) passed 7/7 checks in 3m 58s.
- **Test Suite Verification:** 44 passing Jest suites (35 engine, 9 site) and 2 passing node:test tests = **418 passing tests** (6 skipped tests in 2 skipped Docker-dependent integration suites). Zero failing tests.

---

## 2. Git Release-State Evidence Table

| Attribute | Verified Value | Evidence / Command Output |
|---|---|---|
| **Current Branch** | `main` | `git branch --show-current` $\rightarrow$ `main` |
| **Working Tree Status** | Clean (0 uncommitted or untracked changes) | `git status --short` $\rightarrow$ empty |
| **Local Audit HEAD SHA** | `cee10e2` (or current pass commit) | `git rev-parse HEAD` |
| **Remote Tracking HEAD (`origin/main`)** | `3d72cb1a30e4bc74e5093a86db52c6fbc5c8599f` | `git rev-parse origin/main` |
| **Production Source SHA** | `3d72cb1a30e4bc74e5093a86db52c6fbc5c8599f` | `vercel inspect dpl_GCb2YNpJHRju1SssSwbvVe7igA2a` |
| **Deployment Isolation** | Local audit deliverables are **not deployed** | Local HEAD is ahead of remote by local documentation/test commits |
| **PR #31 Merge Commit** | `d2b33f7ef70b1801d73cbc45dacff71fc8e1023f` | `gh pr view 31 --json mergeCommit` |
| **PR #31 Head SHA** | `6f3e7132d30142cc6f60e28c4e0758f38f25107b` | `gh pr view 31 --json headRefOid` |

---

## 3. GitHub Actions CI Verification

**GitHub Actions Run ID:** `41201751472`
**Workflow:** CI (`.github/workflows/ci.yml`)
**Trigger Event:** `push`
**Target Branch:** `main`
**Commit SHA:** `3d72cb1a30e4bc74e5093a86db52c6fbc5c8599f`
**Started At:** 2026-10-31T12:34:59Z
**Completed At:** 2026-10-31T12:38:57Z (Duration: 3m 58s)
**Overall Run Conclusion:** **SUCCESS**

### Individual Job Audit:

| Job Name | Database ID | Status | Conclusion | Steps Passed | Notes |
|---|---|---|---|:---:|---|
| **test** | 124538757657 | completed | **success** | 8/8 | Ran `npm test` across workspaces |
| **typecheck** | 124538757791 | completed | **success** | 10/10 | Ran `npm audit`, `lint`, and `typecheck` |
| **prove** | 124538757800 | completed | **success** | 8/8 | Ran synthetic Mockpay proof |
| **postgres-live-integration** | 124538757804 | completed | **success** | 10/10 | Spun up postgres container & ran live integration |
| **prove-real** | 124538757807 | completed | **success** | 8/8 | Ran real Lodash 3 $\rightarrow$ 4 proof |
| **build** | 124539137201 | completed | **success** | 8/8 | Ran Next.js production build |
| **readiness-audit** | 124539359444 | completed | **success** | 8/8 | Evaluated machine-readable readiness gates |

**Job Consistency Check:** All 7 jobs executed against the same commit `3d72cb1`. Zero jobs were skipped, cancelled, or allowed to fail.

---

## 4. Local Verification & Test Count Reconciliation

Every workspace command was executed locally and captured with exact metrics:

### Reconciliation of Test & Suite Counts:

1. **`@patchversion/engine` (Jest):**
   - Test Suites: **35 passed**, 2 skipped (require external live postgres container), **37 total**.
   - Tests: **330 passed**, 6 skipped, **336 total**. Time: 241.35s.
2. **`@patchversion/site` (Jest):**
   - Test Suites: **9 passed**, 0 skipped, **9 total**.
   - Tests: **86 passed**, 0 skipped, **86 total** (including 15 RBAC and rate limiter tests). Time: 58.98s.
3. **`@patchversion/shared` (`node --test`):**
   - Test Suites: **0** (raw Node test runner without describe blocks).
   - Tests: **2 passed**, 0 skipped, **2 total**. Time: 0.14s.

### Total Mathematical Reconciliations:
- **Total Passing Test Suites:** $35 + 9 = \mathbf{44\text{ passed suites}}$ (46 total Jest suites).
- **Total Passing Tests:** $330 + 86 + 2 = \mathbf{418\text{ passed tests}}$ (424 total tests).
- **Total Failing Suites / Tests:** $\mathbf{0}$.

### Local Proof & Build Execution Results:

| Command | Exit Code | Output / Duration | Evidence / Notes |
|---|:---:|---|---|
| `npm run typecheck` | `0` | Zero errors across shared, engine, and site (14.3s) | TypeScript 5.4 compiler verification |
| `npm test` | `0` | 44 passing suites, 418 passing tests | All workspaces green |
| `npm run prove` | `0` | Mockpay 1 $\rightarrow$ 2: Baseline 3/3 $\rightarrow$ Bump 1/3 (Fail) $\rightarrow$ Fix 3/3 (Pass) in 40.5s | Synthetic test fixture (`acme/payments`) |
| `npm run prove:real` | `0` | Lodash 3 $\rightarrow$ 4: Baseline 3/3 $\rightarrow$ Bump 1/3 (Fail) $\rightarrow$ Fix 3/3 (Pass) in 51.8s | Real package migration on test fixture (`acme/membership`) |
| `npm run build` | `0` | Turbopack compiled 32 static/dynamic routes in 15.3s | Production bundle compiled |
| `npm run readiness` | `0` | Demo Ready: YES; Staging: NO; Customer: NO; Overall: BLOCKED | Machine-readable gate (Fail-Closed) |

---

## 5. Vercel Production Infrastructure & HTTP Smoke Tests

**Live Production Domain:** `https://trypatchbay.vercel.app`
**Active Deployment ID:** `dpl_GCb2YNpJHRju1SssSwbvVe7igA2a`
**Status:** `● Ready`
**Created At:** Sat Oct 31 2026 18:05:01 IST (12:35:01 UTC)
**Deployed Commit:** `3d72cb1a30e4bc74e5093a86db52c6fbc5c8599f`
**Assigned Aliases:**
- `https://trypatchbay.vercel.app`
- `https://patchbay-one.vercel.app`
- `https://trypatchbay-nitish-1303s-projects.vercel.app`
- `https://trypatchbay-git-main-nitish-1303s-projects.vercel.app`

### Live HTTP Smoke Test Evidence:
*Executed live via Node.js fetch against production endpoints on 2026-10-31T13:13:04Z.*

| Route / Endpoint | Method | HTTP Status | Content-Type | Payload Size | Observed Evidence Sample |
|---|:---:|:---:|---|:---:|---|
| `https://trypatchbay.vercel.app/` | GET | `200 OK` | `text/html; charset=utf-8` | 65,859 bytes | SSR HTML landing page with Turbopack CSS bundle |
| `https://trypatchbay.vercel.app/login` | GET | `200 OK` | `text/html; charset=utf-8` | 26,190 bytes | Login view with email/password form |
| `https://trypatchbay.vercel.app/dashboard` | GET | `200 OK` | `text/html; charset=utf-8` | 24,139 bytes | Authenticated console view |
| `https://trypatchbay.vercel.app/api/health` | GET | `200 OK` | `application/json` | 101 bytes | `{"status":"healthy","version":"0.1.0","timestamp":"2026-10-31T13:13:04.699Z","service":"trypatchbay"}` |
| `https://trypatchbay.vercel.app/api/findings?repo=Nitish-1303/CipherBill` | GET | `401 Unauthorized` | `application/json` | 24 bytes | `{"error":"Unauthorized"}` (Session token required) |
| `https://trypatchbay.vercel.app/api/scan` | GET | `401 Unauthorized` | `application/json` | 24 bytes | `{"error":"Unauthorized"}` (Session token required) |

---

## 6. Rate Limiting Architecture & Failure Mode Classification

- **Normal Operation (PostgreSQL Active):**
  - **Distributed Atomic Enforcement:** Evaluates SQL sliding-window upsert:
    `INSERT INTO rate_limits (key, count, first_attempt_at, last_attempt_at) VALUES ($1, 1, $2, $2) ON CONFLICT (key) DO UPDATE ... RETURNING count, first_attempt_at`.
  - Bounded across all serverless Lambda instances concurrently accessing the database.
- **Failure Mode (PostgreSQL Down / Unreachable):**
  - **Degraded Process-Local Fallback:** Catches database errors and falls back to an in-memory `Map` store local to the Node.js process.
  - **Security Implications:** Because each Vercel serverless Lambda maintains an isolated memory store, an attacker distributing requests across $N$ distinct Lambda containers during a database outage could exceed the global threshold by up to $N \times \text{limit}$ requests. Enforcement does *not* fail open (unlimited) or fail closed (all blocked), but degrades to per-instance bounding.

---

## 7. Audit Limitations & Scope Boundaries

1. **Test Fixtures vs. Customer Codebases:** Lodash and Mockpay are local test fixtures; they demonstrate engine mechanics, not customer adoption or live production migrations.
2. **Customer Code Execution:** Customer repository execution is **fail-closed**; no microVM or container isolation is deployed on Vercel Lambdas.
3. **Detection Scope:** Scans report zero matching rules for CipherBill; this does not prove zero breaking changes exist, only that no currently supported rules matched.
4. **Commercial Traction:** TryPatchBay has $0 revenue and no paying customers. Pricing tiers represent planned commercial targets.
