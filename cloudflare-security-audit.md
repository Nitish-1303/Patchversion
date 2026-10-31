# Cloudflare Security Audit: TryPatchBay

**Auditor:** Senior Application Security Architect (Cloudflare Security Audit Skill Framework)  
**Target Codebase:** `Nitish-1303/Patchversion`  
**Target Deployment:** `https://trypatchbay.vercel.app`  
**Audit Standard:** Cloudflare Security Audit 6-Phase Adversarial Verification  
**Date:** October 31, 2026  

---

## 1. Executive Summary & Audit Scope

This security assessment follows the rigorous **six-phase workflow** established by Cloudflare’s `security-audit-skill`:
1. **Reconnaissance:** Architectural mapping of entry points, services, and trust boundaries.
2. **Coverage-Led Hunting:** Exhaustive code-level inspection across all 12 prioritized boundaries.
3. **Adversarial Candidate Validation:** Stress-testing and attempting to disprove candidate findings.
4. **Structured Ledger Output:** Triaging findings strictly into `confirmed`, `needs_validation`, or `rejected`.
5. **Independent Record Verification:** Tracing inputs end-to-end to verify actual observable consequences.
6. **Target-Neutral Exploitability Reporting:** Producing actionable, source-grounded vulnerability disclosures.

### Summary of Triage Verdicts

| Verdict | Total | High | Medium | Low / Info | Summary |
|---|:---:|:---:|:---:|:---:|---|
| **`confirmed`** | **2** | 0 | 2 | 0 | Source-grounded vulnerabilities with demonstrated impact. |
| **`needs_validation`** | **2** | 1 | 1 | 0 | Valid leads dependent on missing isolated runtime or production environment variables. |
| **`rejected`** | **8** | — | — | — | Candidate hypotheses actively disproved by upstream defenses. |

---

## 2. Critical Execution Restriction & Sandbox Boundary Statement

> [!WARNING]
> **OS-Enforced Sandbox Status:**  
> TryPatchBay currently runs fixture proof evaluations using the local child process (`local-process`) without an independently verified container or microVM (e.g. gVisor, Firecracker, or Docker).
> 
> **Operational Compliance:**
> - Untrusted customer code execution is **fail-closed** blocked on the production server.
> - The live scanner performs **static AST and lockfile analysis only**; it never executes `npm install`, build scripts, or tests on remote repositories.
> - Execution-dependent candidates involving customer test execution are strictly classified as **`needs_validation`** rather than claiming arbitrary-code sandboxing.

---

## 3. Detailed Boundary Analysis (Phases 2 & 3)

### Boundary 1: Authentication & Session Handling
- **Source Files:** `packages/site/src/app/api/auth/route.ts`, `packages/engine/src/db/database.ts`, `postgres-store.ts`
- **Verification Details:**
  - Password hashing uses `crypto.scryptSync(password, salt, 64)` with 16 bytes random hex salt and timing-safe equality (`crypto.timingSafeEqual`).
  - Session tokens use HMAC-SHA256 signatures (`v1.<payload>.<sig>`) with server-side expiry checking (`expires_at`) and revocation tracking (`isSessionRevoked`).
  - Session cookies enforce `HttpOnly: true`, `SameSite: 'lax'`, and `Secure: true` in production.
- **Verdict:** **`rejected` (No vulnerability found; properly hardened).**

---

### Boundary 2: Server-Side Authorization & Role Enforcement
- **Source Files:**
  - `packages/site/src/app/api/approvals/route.ts:4-28`
  - `packages/site/src/app/api/pull-requests/route.ts:18-45`
  - `packages/site/src/app/api/packages/route.ts:75-100`
- **Trust Boundary:** Authenticated session (`auth.user`) vs. Privileged Tenant Actions.
- **Candidate Finding:** Missing Role-Based Authorization Checks on Critical Mutation Endpoints.
- **Adversarial Validation:**
  - In `packages/shared/src/types.ts:191`, `User.role` is defined as `'owner' | 'admin' | 'member'`.
  - In `POST /api/approvals`, the code checks `if (!auth) return 401;` but does **not** check `auth.user.role`.
  - In `POST /api/pull-requests`, any authenticated user in the tenant can call `orchestrator.deliverPullRequest(...)` regardless of role.
  - In `POST /api/packages`, any tenant member can add or modify watched dependencies.
- **Observed Impact:** An unprivileged member (`role: 'member'`) can approve code patches and trigger live pull request creation on GitHub, bypassing organizational authorization controls.
- **Verdict:** **`confirmed`** (Severity: **Medium**, CWE-285: Improper Authorization).
- **Practical Remediation:** Introduce a role guard helper `assertRole(auth.user, ['owner', 'admin'])` before processing approvals, PR deliveries, or package registrations.

---

### Boundary 3: Tenant and Repository Isolation
- **Source Files:** `packages/engine/src/db/postgres-store.ts`, `packages/site/src/app/api/backend.ts`
- **Verification Details:**
  - All database queries filter strictly by `WHERE tenant_id = $1 AND id = $2`.
  - Cross-tenant requests tested in `tenant-isolation-and-approval-audit.test.ts` confirmed that Tenant A receives HTTP 404 when querying Tenant B's repositories, findings, patches, validations, or PRs.
  - Demo workspace isolation strictly restricts `checkout-service` to `DEMO_TENANT_ID`.
- **Verdict:** **`rejected` (Tenant boundaries verified secure).**

---

### Boundary 4 & 5: GitHub OAuth, Installation Verification & Repository Validation
- **Source Files:** `packages/site/src/app/api/github/callback/route.ts:45-105`, `packages/site/src/app/api/repos/route.ts`
- **Verification Details:**
  - Installation onboarding enforces single-use CSRF tokens with 15-minute expiration (`STATE_EXPIRED` and `STATE_REPLAY_REJECTED`).
  - Target account verification enforces `state.targetAccount.toLowerCase() === accountLogin.toLowerCase()`.
  - In `POST /api/repos`, client-supplied `localPath` is completely ignored for custom repos.
- **Verdict:** **`rejected` (Properly authenticated and state-bound).**

---

### Boundary 6 & 7: Manifest & Lockfile Parsing, Dependency Graph Construction
- **Source Files:** `packages/engine/src/scanner/lockfile-parsers/`, `packages/engine/src/scanner/dependency-mapper.ts`
- **Verification Details:**
  - `pnpm-lock.ts` and `yarn-lock.ts` use custom line parsers, avoiding vulnerable YAML/eval execution.
  - `DependencyMapper` uses an iterative traversal over `processedNames: Set<string>`, preventing recursive stack overflows on cyclic lockfile dependencies.
- **Verdict:** **`rejected` (Safe parsing and graph construction).**

---

### Boundary 8: AST Scanning & Source-Path Traversal
- **Source Files:** `packages/engine/src/scanner/security.ts`, `packages/engine/src/scanner/repository-scanner.ts`
- **Verification Details:**
  - `assertSafePath` normalizes backslashes to forward slashes before evaluation, preventing POSIX backslash traversal evasion (`..\\..\\`).
  - `assertSafeSymlink` verifies realpaths through ancestor directory symlinks, broken external symlinks, and detects symlink loops (`ELOOP` $\rightarrow$ `SYMLINK_LOOP_DETECTED`).
  - `readFileSafely` gates all disk reads through path and symlink boundary checks.
  - Resource budget (`ScanBudget`) limits scans to 5,000 files, 2MB per file, 50MB total, and 60 seconds duration.
- **Verdict:** **`rejected` (Path traversal and symlink escape defenses verified).**

---

### Boundary 9: Migration Patch Generation & File Writes
- **Source Files:** `packages/engine/src/sandbox/runner.ts`, `packages/engine/src/fix-generator/generator.ts`
- **Verification Details:**
  - AST transforms are executed in-memory via `ts-morph` AST nodes.
  - All test runs and diff applications are executed in clean temporary directories (`fs.mkdtempSync(path.join(os.tmpdir(), 'patchversion-sandbox-'))`) and cleaned up immediately. Original repository directories are never mutated.
- **Verdict:** **`rejected` (Zero file write escape detected).**

---

### Boundary 10: Test Execution & Customer Process Boundary
- **Source Files:** `packages/engine/src/sandbox/runner.ts:160-230`
- **Trust Boundary:** Local Child Process vs. Host Environment.
- **Candidate Finding:** Untrusted Customer Code Execution in Local Child Process.
- **Adversarial Validation:**
  - In `SandboxRunner.runTests`, `execFileSync(npm.command, npm.args, { cwd: workDir, env: minimalEnv(), ... })` executes `npm test` on the host machine.
  - If a user could submit an arbitrary untrusted repository to `SandboxRunner`, malicious `test` or `pretest` npm scripts could execute arbitrary shell commands on the host.
  - **Mitigation Checked:** In the live application, `SandboxRunner` is **only** invoked on admitted fixture repositories (`fixtures/sample-repo`, `fixtures/lodash-repo`) via `resolveTrustedFixture`. For remote repositories (`Nitish-1303/CipherBill`), execution is fail-closed blocked.
- **Verdict:** **`needs_validation`** (Severity: **High** if execution opened to customer repos; currently mitigated by fail-closed policy. Requires verified microVM before customer rollout).

---

### Boundary 11: API Input Validation & Rate Limiting
- **Source Files:**
  - `packages/site/src/app/api/auth/route.ts`
  - `packages/site/src/app/api/scan/route.ts`
  - `packages/site/src/app/api/packages/route.ts`
- **Trust Boundary:** Public Internet Client vs. Next.js API Routes.
- **Candidate Finding:** Absence of Rate Limiting on Authentication and Resource-Intensive Endpoints.
- **Adversarial Validation:**
  - Grep for `rateLimit` across `packages/site` returned 0 matches.
  - `POST /api/auth` (both `login` and `register` actions) accepts unlimited consecutive attempts without IP or account-level throttling.
  - `POST /api/scan` triggers multi-file AST scanning and graph construction on demand. A script can flood `POST /api/scan` to exhaust CPU/memory.
- **Observed Impact:** Vulnerable to credential stuffing, password brute-forcing, and resource-exhaustion denial of service (DoS).
- **Verdict:** **`confirmed`** (Severity: **Medium**, CWE-307: Improper Restriction of Excessive Authentication Attempts).
- **Practical Remediation:** Implement token-bucket or sliding-window rate limiting in Next.js middleware (e.g. `@upstash/ratelimit` or memory cache for 5 attempts/min on auth, 10 scans/min on repos).

---

### Boundary 12: CI Permissions, Secrets & Deployment Configuration
- **Source Files:** `.github/workflows/ci.yml`
- **Verification Details:**
  - `permissions: contents: read` restricts GitHub token capabilities.
  - `persist-credentials: false` prevents git credential persistence on runner disks.
  - No deployment secrets or long-lived keys are mounted in pull request workflows.
- **Verdict:** **`rejected` (CI pipeline adheres to least-privilege principles).**

---

## 4. Cloudflare Structured Output Ledger (`findings.json`)

```json
{
  "audit": "Cloudflare Security Audit - TryPatchBay",
  "version": "1.0.0",
  "timestamp": "2026-10-31T11:38:00.000Z",
  "repository": "Nitish-1303/Patchversion",
  "findings": [
    {
      "id": "SEC-001",
      "verdict": "confirmed",
      "severity": "MEDIUM",
      "cwe": "CWE-285",
      "title": "Missing Role-Based Access Control on Patch Approval and PR Delivery Endpoints",
      "location": {
        "files": [
          "packages/site/src/app/api/approvals/route.ts",
          "packages/site/src/app/api/pull-requests/route.ts",
          "packages/site/src/app/api/packages/route.ts"
        ]
      },
      "impact": "Unprivileged tenant members can approve code patches and trigger live PR deliveries to GitHub without owner/admin authorization.",
      "remediation": "Enforce assertRole(auth.user, ['owner', 'admin']) in mutation API routes."
    },
    {
      "id": "SEC-002",
      "verdict": "confirmed",
      "severity": "MEDIUM",
      "cwe": "CWE-307",
      "title": "Missing Rate Limiting on Authentication and AST Scan Endpoints",
      "location": {
        "files": [
          "packages/site/src/app/api/auth/route.ts",
          "packages/site/src/app/api/scan/route.ts"
        ]
      },
      "impact": "Automated brute-forcing of credentials on /api/auth and resource-exhaustion DoS via repeated /api/scan triggers.",
      "remediation": "Add sliding-window rate limiting middleware for authentication (5 req/min) and scan requests (10 req/min)."
    },
    {
      "id": "SEC-003",
      "verdict": "needs_validation",
      "severity": "HIGH",
      "cwe": "CWE-94",
      "title": "Host Process Exposure on Untrusted Customer Repository Test Execution",
      "location": {
        "files": [
          "packages/engine/src/sandbox/runner.ts"
        ]
      },
      "impact": "If customer test execution is enabled on local host without OS container isolation, malicious npm scripts can compromise host.",
      "remediation": "Maintain fail-closed restriction; require verified microVM (Firecracker/gVisor) before enabling customer-code testing."
    },
    {
      "id": "SEC-004",
      "verdict": "needs_validation",
      "severity": "LOW",
      "cwe": "CWE-798",
      "title": "Development Fallback Session Secret in Non-Production Environments",
      "location": {
        "files": [
          "packages/engine/src/db/database.ts",
          "packages/engine/src/db/postgres-store.ts"
        ]
      },
      "impact": "Hardcoded dev session secret active when PATCHVERSION_SESSION_SECRET is omitted in non-production environments.",
      "remediation": "Strict production check already prevents deployment without secret; enforce in staging CI as well."
    }
  ]
}
```
