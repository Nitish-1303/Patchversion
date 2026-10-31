# TryPatchBay — Evidence-First Acceptance Tests

## 1. Acceptance Gates Summary

All releases of TryPatchBay must pass an exhaustive multi-stage verification pipeline before deployment to production:

| Gate | Command / Script | Acceptance Threshold | Purpose |
| :--- | :--- | :--- | :--- |
| **Gate 1: Type Safety** | `npm run typecheck` | Exit 0, 0 type errors | Monorepo TypeScript compilation |
| **Gate 2: Code Quality** | `npm run lint` | Exit 0, 0 linter errors | Code formatting and style rules |
| **Gate 3: Test Suites** | `npm test` | Exit 0, 100% tests passing (43+ suites, 400+ tests) | Core engine, scanner, DB, API routes |
| **Gate 4: Synthetic Proof** | `npm run prove` | Exit 0, Mockpay proof generated | Deterministic AST rename proof |
| **Gate 5: Real Proof** | `npm run prove:real` | Exit 0, Lodash 3 $\rightarrow$ 4 proof generated | Real-world call-site migration proof |
| **Gate 6: Prototype Readiness** | `npm run readiness` | Exit 0, "Prototype Demo Ready: YES" | Release checklist and baseline checks |
| **Gate 7: Production Build** | `npm run build` | Exit 0, Turbopack clean build (32 routes) | Next.js production build |
| **Gate 8: Live Production Smoke** | `browser-rehearsal-cipherbill.mjs` | Exit 0, 100% compliance | End-to-end live rehearsal against production |

---

## 2. Test Execution Details

### 2.1 Gate 1 — TypeScript Compilation
```bash
npm run typecheck
```
- Workspace packages verified: `@patchversion/shared`, `@patchversion/engine`, `@patchversion/site`.
- Target: Zero compile errors across all strict tsconfig targets.

### 2.2 Gate 2 — Linting
```bash
npm run lint
```
- Target: Clean lint across all workspaces.

### 2.3 Gate 3 — Monorepo Unit & Integration Test Suites
```bash
npm test
```
Key subsystems verified:
- `auth-reliability.test.ts`: Session lifecycle, signing secret enforcement, and revocation.
- `auth-api.test.ts`: Password hashing, timing-safe equality, rate limiting (5 failed attempts/min), RBAC helpers.
- `scan-api.test.ts`: Tenant isolation, rate limiting (10 scans/min per tenant).
- `scanner.test.ts`: Symlink traversal defenses, loop detection, manifest extraction.
- `lodash-proof-metrics.test.ts`: Canonical repo-relative path matching and multi-directory collision prevention.
- `tenant-isolation-and-approval-audit.test.ts`: Approval status, diff hash matching, and single-use PR delivery.
- `webhook-and-packages-hardening.test.ts`: GitHub HMAC signature verification and RBAC on package watch targets.

### 2.4 Gate 4 — Synthetic Migration Proof (`npm run prove`)
- **Fixture**: `fixtures/sample-repo` (Mockpay 1.0.0 $\rightarrow$ 2.0.0).
- **Execution Flow**:
  1. Baseline run (1.0.0): 3 passing, 0 failing.
  2. Bumped run (2.0.0): 1 passing, 2 failing (TypeError: Parameter 'source' is no longer supported).
  3. Fixed run (2.0.0 with AST patch): 3 passing, 0 failing.
- **Coverage**: 100% call-site coverage (`src/createCharge.js`).

### 2.5 Gate 5 — Real Migration Proof (`npm run prove:real`)
- **Fixture**: `fixtures/lodash-repo` (Lodash 3.10.1 $\rightarrow$ 4.17.21).
- **Execution Flow**:
  1. Baseline run (3.10.1): 1 passing test (`_.contains`).
  2. Bumped run (4.17.21): 1 failing test (`TypeError: _.contains is not a function`).
  3. Fixed run (4.17.21 with AST patch): 1 passing test (`_.includes`).
- **Coverage**: 100% call-site coverage verified (1 of 1 affected call site).

### 2.6 Gate 8 — Live Production Smoke Rehearsal
- **Target**: `https://trypatchbay.vercel.app`
- **Criteria**:
  - Live HTTP 200 response.
  - Zero synthetic Mockpay findings in the customer-facing CipherBill dashboard.
  - Dedicated repository: `Nitish-1303/CipherBill` (Default branch: `main`).
  - Read-only integrity: Zero mutations, zero PR creations on CipherBill.
