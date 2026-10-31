# TryPatchBay — Combined Security & Design Remediation Plan

**Auditor:** Senior Staff Application Security & Frontend Engineer  
**Repository:** `Nitish-1303/Patchversion`  
**Production URL:** `https://trypatchbay.vercel.app`  
**Date:** October 31, 2026  
**Status:** PROPOSAL / AWAITING USER APPROVAL (Zero Source Code Modified)  

---

## 1. Prioritized Issue Matrix

| Rank | Issue ID | Category | Verdict / Severity | Title | Estimated Scope |
|:---:|---|---|:---:|---|:---:|
| **1** | **SEC-001** | Security / Auth | **CONFIRMED**<br>Medium | Role-Based Access Control on Approvals & PR Deliveries | Small (3 files, ~40 lines) |
| **2** | **SEC-002** | Security / DoS | **CONFIRMED**<br>Medium | API Rate Limiting on Authentication & AST Scan Endpoints | Small (2 files, ~60 lines) |
| **3** | **DES-001** | Frontend / UX | **HALLMARK P1**<br>Quality | Eliminate Conflicting "Signups Disconnected" Lead-Capture Form | Small (1 file, ~15 lines) |
| **4** | **DES-002** | Frontend / a11y| **HALLMARK P1**<br>WCAG AA | Remediate Sub-10px Typography & Low Contrast Secondary Labels | Small (1 file, ~25 lines) |
| **5** | **DES-003** | Frontend / Slop| **HALLMARK P2**<br>Anti-Slop | Remove Repetitive Eyebrow Chip Badges & Symmetric 3-Card Grids | Medium (2 files, ~50 lines) |
| **6** | **SEC-003** | Security / Sandbox| **NEEDS_VALIDATION**<br>High (Deferred) | MicroVM/Container Isolation for Customer Code Execution | Large (Future Milestone) |
| **7** | **SEC-004** | Security / Config | **NEEDS_VALIDATION**<br>Low (Hardening) | Enforce Session Secret Requirement in Staging Integration Tests | Small (1 file, ~10 lines) |

---

## 2. Detailed Remediation Plans

### Rank 1 — SEC-001: Enforce Role-Based Access Control on Mutation Endpoints
- **Problem:**
  Currently, any authenticated user belonging to a tenant can approve code patches (`POST /api/approvals`), trigger PR deliveries on GitHub (`POST /api/pull-requests`), and modify watched packages (`POST /api/packages`), regardless of their assigned role (`owner`, `admin`, `member`, or `reviewer`).
- **Exact Files Affected:**
  - `packages/site/src/app/api/backend.ts` (Add `assertRole` helper)
  - `packages/site/src/app/api/approvals/route.ts`
  - `packages/site/src/app/api/pull-requests/route.ts`
  - `packages/site/src/app/api/packages/route.ts`
- **Proposed Technical Change:**
  ```typescript
  // In packages/site/src/app/api/backend.ts
  export function assertRole(user: User, allowedRoles: ('owner' | 'admin' | 'member' | 'reviewer')[]): void {
    if (!allowedRoles.includes(user.role)) {
      throw new Error(`Forbidden: role "${user.role}" does not have permission for this action.`);
    }
  }
  ```
  In `POST /api/approvals` and `POST /api/pull-requests`:
  Enforce `assertRole(auth.user, ['owner', 'admin'])`. If user has role `'member'` or `'reviewer'`, return HTTP 403 Forbidden.
- **Risk Assessment:** Low. Zero impact on single-user workspaces (default role is `owner`). Correctly blocks unauthorized member/reviewer escalations.
- **Test Plan:**
  Add integration test in `packages/site/test/auth-api.test.ts` creating a user with `role: 'member'` and `role: 'reviewer'`, verifying that calling `POST /api/approvals` and `POST /api/pull-requests` returns HTTP 403 with code `FORBIDDEN_INSUFFICIENT_ROLE`.

---

### Rank 2 — SEC-002: In-Memory Sliding-Window Rate Limiting for Auth & Scans
- **Problem:**
  No throttling exists on `POST /api/auth` (allowing automated password brute-forcing) or `POST /api/scan` (allowing resource-exhaustion DoS on the AST engine).
- **Exact Files Affected:**
  - `packages/site/src/app/api/security/rate-limiter.ts` (New module)
  - `packages/site/src/app/api/auth/route.ts`
  - `packages/site/src/app/api/scan/route.ts`
- **Proposed Technical Change:**
  Implement a lightweight, zero-dependency sliding-window memory rate limiter:
  - Auth route: Maximum 5 failed attempts per IP per minute.
  - Scan route: Maximum 10 scan triggers per tenant per minute.
  - Returns standard HTTP 429 `Too Many Requests` with `Retry-After` header.
- **Risk Assessment:** Very Low. Protects production host CPU/RAM without requiring external Redis/Upstash infrastructure.
- **Test Plan:**
  Unit test in `packages/site/test/` asserting 6th auth attempt returns HTTP 429.

---

### Rank 3 — DES-001: Align Marketing Hero with Live Application State
- **Problem:**
  The hero component `UpdatesForm` contains dead state: clicking it outputs "Email updates are not connected in this prototype yet" and displays "signups are not connected yet". In reality, TryPatchBay has functional user signup and authentication.
- **Exact Files Affected:**
  - `packages/site/src/app/components/Experience.tsx`
  - `packages/site/src/app/page.tsx`
- **Proposed Technical Change:**
  Replace the dead newsletter input with primary and secondary call-to-action buttons:
  - Primary button: `Start free scan` $\rightarrow$ links to `/signup`.
  - Secondary button: `View live demo` $\rightarrow$ links to `/dashboard`.
- **Risk Assessment:** Zero risk. Significantly improves first-impression credibility for reviewers.
- **Test Plan:**
  Run `npm test -w @patchversion/site -- test/components.test.ts` to verify CTA links render properly.

---

### Rank 4 — DES-002: Remediate Sub-10px Typography & Low Contrast Labels
- **Problem:**
  Multiple secondary elements in `globals.css` and `dashboard/page.tsx` use `font-size: 8px` or `9px` and `#737996`, failing WCAG 2.1 AA 4.5:1 contrast requirements.
- **Exact Files Affected:**
  - `packages/site/src/app/globals.css`
  - `packages/site/src/app/dashboard/page.tsx`
- **Proposed Technical Change:**
  - Establish a strict minimum font-size scale: base micro-labels at `11px` (`0.6875rem`) instead of `8px`/`9px`.
  - Darken secondary text color token from `#737996` / `#8389a2` to `#5e6582` (achieving 4.7:1 contrast ratio against `#f7f7fc`).
- **Risk Assessment:** Zero functional risk; purely visual polish and compliance.
- **Test Plan:**
  Automated CSS token validation test.

---

### Rank 5 — DES-003: Hallmark Anti-AI-Slop Restructuring
- **Problem:**
  Repetitive uppercase `.eyebrow-chip` badges appear on every single section of `page.tsx`. Additionally, two identical 3-card symmetric feature grids create visual monotony.
- **Exact Files Affected:**
  - `packages/site/src/app/page.tsx`
  - `packages/site/src/app/components/PageSections.tsx`
- **Proposed Technical Change:**
  - Remove eyebrow chips from secondary sections (Features, FAQ, Workflow). Keep only in Hero and Proof sections.
  - Refactor the second feature grid (`homeCards`) into an asymmetric 2-column bento card:
    - Left (60%): Live AST Call-Site Inspector preview.
    - Right (40%): Tamper-Evident SHA-256 evidence bundle summary.
- **Risk Assessment:** Low. Preserves all marketing copy while breaking generative AI layout fatigue.
- **Test Plan:**
  Visual component smoke test.

---

### Rank 6 & 7 — Deferred Architectural Hardening (Future Milestones)
- **SEC-003 (MicroVM Sandbox):** Deferred pending infrastructure integration (Firecracker or gVisor microVMs). In the interim, untrusted customer repository test execution remains strictly **fail-closed**.
- **SEC-004 (Strict Secret Validation in Staging):** Add CI check in `.github/workflows/ci.yml` asserting `PATCHVERSION_SESSION_SECRET` is present during staging runs.

---

## 3. Strict Project Boundaries Check

- [x] Product scope preserved as dependency migration automation.
- [x] No API-provider changelog monitoring added.
- [x] CipherBill remains the sole repository in the YC demo path.
- [x] CipherBill demo remains strictly read-only (zero PRs, zero branch mutations).
- [x] No claims of isolated arbitrary customer code execution.
- [x] Zero customer data, tokens, or private repository contents exposed.
- [x] Zero application source code modified during this audit phase.
- [x] Fully awaiting user approval before executing any remediation changes.
