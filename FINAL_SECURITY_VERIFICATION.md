# TryPatchBay — Final Security Verification & Defenses Report

**Audit Date & Time:** October 31, 2026, 18:50:00 IST (13:20:00 UTC)  
**Auditor:** Application Security & Infrastructure Reviewer  
**Repository:** `Nitish-1303/Patchversion`  
**Commit SHA:** `7a4e18c4e14b2211e1f389a80e1ab6c1bc73e013`  

---

## 1. Security Architecture & Threat Model

TryPatchBay interacts with developer repositories, dependency manifests, and automated code transformations. The platform's security model is designed around **Fail-Closed Isolation and Zero-Trust Access Controls**:

1. **Zero Untrusted Execution:** Untrusted customer repositories are never executed on host serverless runtimes.
2. **Strict Multi-Tenancy:** Tenant IDs are derived exclusively from authenticated server session context, never client payloads.
3. **Defense-in-Depth File Access:** Path traversal, external symlinks, and dangling symlinks are trapped before file access.
4. **Atomic Distributed Rate Limiting:** High-frequency mutation and authentication routes are bounded by atomic database counters.

---

## 2. Exhaustive Verification of Security Defenses

### SEC-001: Role-Based Access Control (RBAC) & Tenant Boundaries
- **Audited Endpoints & Implementations:**
  - `POST /api/repos`: Enforces `assertRole(auth.user, ['owner', 'admin'])` ([`route.ts`](file:///C:/Users/NITISH/Downloads/Patchversion/packages/site/src/app/api/repos/route.ts#L69)). Blocks unprivileged members from attaching repositories to the workspace.
  - `POST /api/packages`: Enforces `assertRole(auth.user, ['owner', 'admin'])` ([`route.ts`](file:///C:/Users/NITISH/Downloads/Patchversion/packages/site/src/app/api/packages/route.ts#L82)).
  - `POST /api/approvals`: Enforces `assertRole(auth.user, ['owner', 'admin', 'reviewer'])` ([`route.ts`](file:///C:/Users/NITISH/Downloads/Patchversion/packages/site/src/app/api/approvals/route.ts#L10)).
  - `POST /api/pull-requests`: Enforces `assertRole(auth.user, ['owner', 'admin'])` ([`route.ts`](file:///C:/Users/NITISH/Downloads/Patchversion/packages/site/src/app/api/pull-requests/route.ts#L25)).
- **Tenant Context Derivation:**
  - `getAuthContext(request)` extracts session token from HTTP-only cookie or `Authorization: Bearer` header, retrieves the session from database, and extracts `user.tenantId`.
  - Client request bodies cannot specify or override `tenantId`.
- **Cross-Tenant Isolation:**
  - All database queries filter by `tenant_id = $1`. Cross-tenant lookup attempts reject with `404 Not Found` (preventing existence probing) or `403 Forbidden`.
- **Test Evidence:**
  - Verified in `packages/site/test/rbac-and-mutation-authorization.test.ts` (15 tests covering unauthenticated 401, member 403, reviewer 403/allowed, admin/owner allowed, and cross-tenant isolation).

---

### SEC-002: Distributed Sliding-Window Atomic Rate Limiting
- **Implementation:** [`rate-limiter.ts`](file:///C:/Users/NITISH/Downloads/Patchversion/packages/site/src/app/api/security/rate-limiter.ts).
- **Database Semantics:**
  - Evaluates an atomic PostgreSQL `INSERT ... ON CONFLICT (key) DO UPDATE` query returning `count` and `first_attempt_at`.
  - Window reset occurs atomically in SQL when `first_attempt_at + windowMs <= now`.
- **Rate Limit Policy by Endpoint:**
  - **Authentication (`POST /api/auth`):** Maximum 5 failed attempts per minute per IP + email key. Returns `429 Too Many Requests` with `Retry-After: 60`.
  - **Scanning (`POST /api/scan`):** Maximum 10 scan requests per minute per tenant ID. Returns `429 Too Many Requests` with `Retry-After: 60`.
- **Database Failure Policy Classification:**
  - **Classification:** **Degraded local-only enforcement.**
  - **Behavior:** If PostgreSQL is unreachable or connection fails, `RateLimiter` falls back to an in-process `Map` memory store.
  - **Consequence for Serverless Clusters:** In an outage where PostgreSQL is offline, rate limits are enforced per-instance rather than globally. An attacker whose requests hit $N$ distinct serverless Lambda instances could make up to $N \times \text{limit}$ requests during the failure window. The platform does *not* fail open (unlimited) or fail closed (all blocked), but degrades gracefully to local bounding.

---

### SEC-003: Untrusted Customer Execution Fail-Closed Boundary
- **Threat Vector:** Executing arbitrary build or test scripts (`npm test`, `vitest`) on customer-supplied repositories can allow arbitrary Remote Code Execution (RCE) on the serverless runtime.
- **Fail-Closed Enforcement:**
  - `repository-scanner.ts` contains **zero imports of `child_process`**.
  - `orchestrator.ts` strictly gates code execution behind `isDemoFixture`:
    ```typescript
    if (!repoPath) {
      if (isDemoFixture) {
        // Return deterministic fixture proof
      }
      throw new Error(`Cannot execute test validation: execution for live repository "${repo.fullName}" is disabled. Execution is restricted to trusted demo fixtures until container isolation is qualified.`);
    }
    ```
  - For all customer repositories, execution is hard-blocked.
- **Test Evidence:**
  - Verified in `packages/engine/test/customer-execution-boundary-audit.test.ts`: Attempting test validation on a customer repo throws the expected isolation error.

---

### SEC-005: Path Traversal & Symbolic Link Exploitation Defenses
- **Defensive API:**
  - `assertSafePath(baseDir, targetPath)`: Canonicalizes paths using `path.resolve` and verifies `resolvedPath.startsWith(baseDir)`. Traps `../`, `..\\`, and absolute paths outside the repo root.
  - `assertSafeSymlink(baseDir, symlinkPath)`: Evaluates symlink destinations using `fs.realpathSync`.
- **Dangling Symlink Defense:**
  - Uses `fs.readlinkSync` to inspect broken or dangling symlinks, asserting that the link target does not point outside `baseDir`.
- **Cyclic Symlink Defense:**
  - Traps `ELOOP` system errors and throws `SYMLINK_LOOP_DETECTED`.
- **Windows Path Separators:**
  - Normalizes backward slashes (`\\`) to POSIX slashes (`/`) before directory prefix comparisons.
- **Test Evidence:**
  - Verified in `packages/engine/test/repository-scan-security.test.ts` across 8 traversal, absolute path, and symlink attack fixtures.

---

## 3. Webhook & Secret Handling

- **GitHub Webhook Verification:**
  - Uses `crypto.createHmac('sha256', secret)` to verify `X-Hub-Signature-256`.
  - Compares HMAC digests using `crypto.timingSafeEqual` to prevent timing attacks.
  - Maximum payload size capped at 1MB (returns `413 Payload Too Large` on overflow).
  - Deduplicates requests using `X-GitHub-Delivery` ID to mitigate replay attacks.
- **Secret Hygiene:**
  - Zero private keys, API tokens, or session secrets are committed to Git.
  - Production requires explicit `PATCHVERSION_SESSION_SECRET` (minimum 32 characters); development fallback is disabled in production mode.

---

## 4. Security Claim Boundaries & Explicit Non-Claims

To ensure complete credibility for YC due diligence:

1. **NO SOC 2 Compliance:** TryPatchBay has not undergone a SOC 2 audit.
2. **NO Formal Penetration Test:** Security verification was conducted using internal audit suites and Cloudflare's open-source security audit development skill; no external third-party penetration testing firm was contracted.
3. **NO Arbitrary Customer Code Sandboxing:** TryPatchBay does *not* claim to safely execute arbitrary customer test scripts in production. That capability is deliberately blocked until containerized microVMs (e.g. Firecracker) are implemented.
4. **NO Absolute Global Rate Limiting in Database Outages:** During PostgreSQL downtime, rate limiting degrades to per-instance memory counters.
