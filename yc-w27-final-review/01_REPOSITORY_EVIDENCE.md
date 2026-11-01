# TryPatchBay — Repository Technical Evidence Baseline

**Date & Time:** October 31, 2026, 19:15:00 IST (13:45:00 UTC)
**Auditor:** Technical Due-Diligence & Infrastructure Review
**Repository:** `Nitish-1303/Patchversion`
**Local Workspace:** `C:\Users\NITISH\Downloads\Patchversion`
**Production URL:** https://trypatchbay.vercel.app
**YC Demo Repository:** `Nitish-1303/CipherBill` (Branch: `main`)

---

## 1. Executive Summary & Verification Status

This document establishes the verified technical baseline of TryPatchBay ahead of Y Combinator Winter 2027 (W27) submission. Every statement, test count, commit SHA, and performance metric recorded below is backed by direct CLI execution, test runner logs, or production HTTP responses.

### Key Technical Facts:
- **Clean Git State:** The local working tree is clean. Local audit HEAD is `d70b670`. Remote tracking `origin/main` is `3d72cb1`. PR #31 was merged into `main` at `d2b33f7`.
- **Deployment Isolation:** The live production deployment (`dpl_GCb2YNpJHRju1SssSwbvVe7igA2a`) is serving commit `3d72cb1`. Local audit documentation and review files are **not deployed to production** and have **not been pushed to GitHub**.
- **CI Verification:** GitHub Actions workflow run `41201751472` on commit `3d72cb1` passed all 7 required jobs in 3m 58s.
- **Reconciled Test Suite:** Across all 3 monorepo packages, **44 Jest suites passed** (35 engine, 9 site) and **2 Node test runner tests passed**, totaling **418 passed tests** and **0 failing tests** (6 skipped tests across 2 integration suites requiring an external live PostgreSQL container).
- **Automated Proofs:** Both migration proof runners exit 0: Mockpay 1 $\rightarrow$ 2 synthetic rename runs in 40.5s (`npm run prove`), and real-world Lodash 3 $\rightarrow$ 4 AST migration runs in 51.8s (`npm run prove:real`).
- **Production HTTP Health:** Live HTTP smoke tests confirm all public routes return 200 OK and protected API routes enforce 401 Unauthorized.
- **Execution Boundary:** Arbitrary customer repository execution is strictly **fail-closed**. Proof loops run solely on vetted local fixtures.

---

## 2. Git & Release-State Verification Table

| Attribute | Verified Value | Verification Method / Evidence |
|---|---|---|
| **Repository Name** | `Nitish-1303/Patchversion` | `git remote get-url origin` |
| **Current Branch** | `main` | `git branch --show-current` $\rightarrow$ `main` |
| **Working Tree** | Clean (0 uncommitted or untracked changes) | `git status --short` $\rightarrow$ empty |
| **Local Audit HEAD** | `d70b670` | `git rev-parse --short HEAD` |
| **Remote Tracking HEAD (`origin/main`)** | `3d72cb1a30e4bc74e5093a86db52c6fbc5c8599f` | `git rev-parse origin/main` |
| **PR #31 Target & Status** | Merged into `main` at `d2b33f7ef70b1801d73cbc45dacff71fc8e1023f` | `gh pr view 31 --json state,mergeCommit` |
| **PR #31 Head SHA** | `6f3e7132d30142cc6f60e28c4e0758f38f25107b` | `gh pr view 31 --json headRefOid` |
| **Active Production Deployment** | `dpl_GCb2YNpJHRju1SssSwbvVe7igA2a` (State: `● Ready`) | Vercel deployment inspection |
| **Production Source SHA** | `3d72cb1a30e4bc74e5093a86db52c6fbc5c8599f` | Vercel deployment metadata |
| **Deployment Isolation** | Local audit commits are **strictly not deployed** | Production serves remote `3d72cb1`; local HEAD is ahead |

---

## 3. GitHub Actions CI Verification

**Run ID:** `41201751472`
**Workflow:** `.github/workflows/ci.yml` (`CI`)
**Trigger:** `push` to `main`
**Commit:** `3d72cb1a30e4bc74e5093a86db52c6fbc5c8599f`
**Status:** Completed (Conclusion: **Success**)
**Duration:** 3 minutes 58 seconds (12:34:59Z – 12:38:57Z)

### Job-by-Job Execution Details:

| Job Name | Database ID | Status | Conclusion | Steps | Notes |
|---|---|---|---|:---:|---|
| **test** | 124538757657 | completed | **success** | 8/8 | Monorepo unit and integration tests |
| **typecheck** | 124538757791 | completed | **success** | 10/10 | TypeScript strict check, linting, npm audit |
| **prove** | 124538757800 | completed | **success** | 8/8 | Mockpay 1.0.0 $\rightarrow$ 2.0.0 synthetic proof |
| **postgres-live-integration** | 124538757804 | completed | **success** | 10/10 | Live PostgreSQL container service integration |
| **prove-real** | 124538757807 | completed | **success** | 8/8 | Lodash 3.10.1 $\rightarrow$ 4.17.21 real package proof |
| **build** | 124539137201 | completed | **success** | 8/8 | Next.js production build with Turbopack |
| **readiness-audit** | 124539359444 | completed | **success** | 8/8 | Evaluates machine-readable deployment readiness |

All 7 jobs ran against the identical commit `3d72cb1` with zero skipped or allowed-to-fail steps.

---

## 4. Local Test Suite & Mathematical Reconciliation

The monorepo test suite was executed locally and reconciled down to individual test cases:

### Workspace Breakdown:
1. **`@patchversion/engine` (Jest):**
   - Test Suites: **35 passed**, 2 skipped (require external live PostgreSQL container), 37 total.
   - Tests: **330 passed**, 6 skipped, 336 total.
   - Execution Time: 241.35 seconds.
2. **`@patchversion/site` (Jest):**
   - Test Suites: **9 passed**, 0 skipped, 9 total.
   - Tests: **86 passed**, 0 skipped, 86 total (including 15 security RBAC and atomic rate limiter tests).
   - Execution Time: 58.98 seconds.
3. **`@patchversion/shared` (`node --test`):**
   - Test Suites: **0** (raw Node.js test runner).
   - Tests: **2 passed**, 0 skipped, 2 total.
   - Execution Time: 0.14 seconds.

### Reconciled Totals:
- **Total Passing Jest Suites:** $35 + 9 = \mathbf{44\text{ passed suites}}$ (46 total suites).
- **Total Passing Tests:** $330 + 86 + 2 = \mathbf{418\text{ passed tests}}$ (424 total tests).
- **Total Failing Suites / Tests:** $\mathbf{0}$.
- **Skipped Suites:** 2 (both in engine, requiring live PostgreSQL container for end-to-end DB tests, which run in GitHub Actions CI).
- **Skipped Tests:** 6 (all within the 2 skipped PostgreSQL integration suites).

---

## 5. Local Proofs & Build Metrics

| Command | Exit Code | Duration | Outcome / Verified Metrics |
|---|:---:|:---:|---|
| `npm run typecheck` | `0` | 14.3s | Zero TypeScript compiler diagnostic errors across all packages. |
| `npm test` | `0` | ~300s | 44 passing Jest suites, 418 passing tests, 0 failures. |
| `npm run prove` | `0` | 40.5s | Synthetic Mockpay 1 $\rightarrow$ 2: Baseline 3/3 pass $\rightarrow$ Bump 1/3 fail $\rightarrow$ Fix 3/3 pass on `fixtures/sample-repo`. |
| `npm run prove:real` | `0` | 51.8s | Lodash 3 $\rightarrow$ 4: Baseline 3/3 pass $\rightarrow$ Bump 1/3 fail $\rightarrow$ Fix 3/3 pass on `fixtures/lodash-repo` (`_.contains` $\rightarrow$ `_.includes`). |
| `npm run build` | `0` | 15.3s | Turbopack compiled 32 static/dynamic routes into `.next` production bundle. |
| `npm run readiness` | `0` | 1.2s | Demo Ready: **YES**; Staging: **NO**; Customer: **NO**; Overall Gate: **BLOCKED** (fail-closed). |

---

## 6. Live Production Infrastructure & HTTP Smoke Tests

**Live Production URL:** https://trypatchbay.vercel.app
**Deployment ID:** `dpl_GCb2YNpJHRju1SssSwbvVe7igA2a`
**Status:** `● Ready`
**Active Production Commit:** `3d72cb1a30e4bc74e5093a86db52c6fbc5c8599f`
**Timestamp of Verification:** 2026-10-31T13:13:04Z

### HTTP Smoke Test Results:

| Route / Endpoint | Method | HTTP Status | Content-Type | Size | Verified Behavior |
|---|:---:|:---:|---|:---:|---|
| `https://trypatchbay.vercel.app/` | GET | `200 OK` | `text/html; charset=utf-8` | 65,859 B | Public landing page renders with stylesheet and script links. |
| `https://trypatchbay.vercel.app/login` | GET | `200 OK` | `text/html; charset=utf-8` | 26,190 B | Reviewer login view with email and password inputs. |
| `https://trypatchbay.vercel.app/dashboard` | GET | `200 OK` | `text/html; charset=utf-8` | 24,139 B | Authenticated dashboard shell. |
| `https://trypatchbay.vercel.app/api/health` | GET | `200 OK` | `application/json` | 101 B | `{"status":"healthy","version":"0.1.0","timestamp":"2026-10-31T13:13:04.699Z","service":"trypatchbay"}` |
| `https://trypatchbay.vercel.app/api/findings?repo=Nitish-1303/CipherBill` | GET | `401 Unauthorized` | `application/json` | 24 B | `{"error":"Unauthorized"}` (Enforces session gate). |
| `https://trypatchbay.vercel.app/api/scan` | GET | `401 Unauthorized` | `application/json` | 24 B | `{"error":"Unauthorized"}` (Enforces session gate). |

---

## 7. CipherBill Dependency Mapping & Node Count Reconciliation

When scanning demonstration repository `Nitish-1303/CipherBill` (branch: `main`):
- **Dependencies Reported in Manifest:** **523 packages** (direct + transitive in lockfile).
- **Nodes Rendered in Dependency Graph:** **543 nodes**.

### Accounting for the 20 Additional Nodes:
Inspecting `packages/engine/src/scanner/dependency-mapper.ts`:
```typescript
// Dependency graph construction logic:
// 1. Root workspace node:
graph.addNode({ id: 'ws:package.json', type: 'workspace', label: 'CipherBill' }); // 1 node
// 2. Package dependency nodes:
dependencies.forEach(dep => graph.addNode({ id: `dep:${dep.name}`, type: 'package', ... })); // 523 nodes
// 3. Source file nodes that directly import mapped dependencies:
sourceFilesWithImports.forEach(file => graph.addNode({ id: `file:${file.path}`, type: 'file', ... })); // 19 nodes
// Total nodes = 1 + 523 + 19 = 543 nodes.
```
- **1 Workspace Node:** Represents the repository root manifest (`ws:package.json`).
- **523 Dependency Nodes:** Direct and transitive dependencies parsed from `package.json` / `package-lock.json`.
- **19 File Nodes:** Specific source files in CipherBill that contain active top-level ES module imports of dependencies.
- **Total Graph Nodes:** $1 + 523 + 19 = \mathbf{543\text{ nodes}}$. The discrepancy is 100% accounted for by graph construction architecture.
- **Findings Reported:** **0 breaking changes detected**. This is strictly truthful: CipherBill does not use the deprecated APIs defined in TryPatchBay's current rule registry.

---

## 8. Rate Limiting Architecture & Failure Mode Classification

- **Normal Operation (PostgreSQL Available):**
  - Distributed atomic sliding-window enforcement executed via atomic SQL:
    ```sql
    INSERT INTO rate_limits (key, count, first_attempt_at, last_attempt_at)
    VALUES ($1, 1, $2, $2)
    ON CONFLICT (key) DO UPDATE
    SET count = rate_limits.count + 1, last_attempt_at = $2
    RETURNING count, first_attempt_at;
    ```
  - Provides consistent, distributed limit enforcement across all Vercel serverless Lambda instances.
- **Failure Mode (PostgreSQL Outage / Unreachable):**
  - When the database query throws or times out, the handler catches the exception and falls back to a process-local memory `Map` within the running Node.js process.
  - **Security Implications:** Because Vercel serverless functions scale across multiple independent Lambda containers, each container maintains its own private memory store. During a database outage, an attacker distributing traffic across $N$ distinct Lambda instances could issue up to $N \times \text{limit}$ requests before being blocked. The limiter does not fail open (unlimited access) and does not fail closed (all blocked), but degrades gracefully to per-instance bounding.

---

## 9. Security Defenses & Execution Boundaries

1. **Untrusted Code Execution (Fail-Closed):**
   - Arbitrary customer code execution is **fail-closed** (`isDemoFixture: false` blocks remote execution).
   - Vercel serverless environments do not have microVM or Docker container isolation. Therefore, proof validation only executes on vetted local fixtures.
2. **Path Traversal & Ancestor Symlink Traversal:**
   - Evaluates canonical resolved paths using `fs.realpathSync`.
   - Rejects any target path containing directory traversal sequences (`..`) or symlinks resolving outside the repository root boundary.
3. **Role-Based Access Control (RBAC):**
   - Enforces strict permission levels: `viewer` (read-only scan inspection), `operator` (proof execution on fixtures), `admin` (credential management).
   - Reviewer accounts are restricted to `viewer` role; mutation and execution endpoints return `403 Forbidden`.
4. **Tamper-Evident Delivery:**
   - Computes SHA-256 hash over candidate diffs.
   - Requires single-use human approval tokens cryptographically matching the diff hash before triggering GitHub App PR creation under concurrency mutex locks.

