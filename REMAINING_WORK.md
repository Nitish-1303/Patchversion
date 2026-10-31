# TryPatchBay — Remaining Engineering Backlog & Post-Submission Roadmap

**Evaluation Date:** October 31, 2026  
**Status:** Post-Remediation & Production Ready for YC W27  
**Repository:** `Nitish-1303/Patchversion`  

---

## 1. Prioritization Hierarchy

The TryPatchBay engineering roadmap is structured into four clear tiers:
- **P0 (Resolved):** Critical security, data integrity, authorization, and truthfulness blockers required before submitting to Y Combinator.
- **P1 (Near-Term Core Product):** Production scaling, microVM test isolation, and rule expansion for top npm packages.
- **P2 (Operational Reliability):** Infrastructure hardening, continuous integration, and GitHub App Marketplace distribution.
- **P3 (Developer Experience & Polish):** CLI tooling, video demonstrations, and community rule contributions.

---

## 2. Priority Breakdown & Work Items

### P0: Security, Correctness & Truthfulness (Completed in Current Release)
All P0 blockers have been implemented, tested, and verified on `main`:

| Item ID | Description | Resolution & Evidence | Status |
|---|---|---|:---:|
| **P0-1** | Missing RBAC on repository creation | Implemented `assertRole(auth.user, ['owner', 'admin'])` in `POST /api/repos`. | **RESOLVED** |
| **P0-2** | Process-local rate limiting vulnerability | Migrated to distributed atomic PostgreSQL sliding-window upsert with memory fallback. | **RESOLVED** |
| **P0-3** | Remote Code Execution boundary safety | Enforced fail-closed policy: untrusted customer code cannot execute on serverless host. | **RESOLVED** |
| **P0-4** | Symlink traversal & directory escape defenses | Implemented `assertSafePath` and `assertSafeSymlink` with dangling/cyclic link traps. | **RESOLVED** |
| **P0-5** | CipherBill demo truthfulness | Mapped real GitHub tree (523 dependencies, 543 nodes, 1374 edges); zero synthetic fixtures. | **RESOLVED** |

---

### P1: Core Product Scaling (Target: Q1 2027)

These items enhance core migration coverage and expand autonomous execution capabilities:

#### 1. Containerized MicroVM Execution Runner
- **Objective:** Enable pre/post test execution on arbitrary customer repositories without security risks.
- **Architecture:** Deploy ephemeral microVM instances (e.g. AWS Firecracker, Fly Machines, or Docker on Nomad) with network isolation, restricted CPU/memory quotas, and 60-second execution timeouts.
- **Milestone:** Support automated `npm test` validation for any public or private GitHub repository.

#### 2. Migration Rule Registry Expansion (Top 50 npm Packages)
- **Objective:** Expand the rule catalog beyond Mockpay, Lodash, and Next.js to cover ubiquitous breaking changes.
- **Target Libraries:**
  - `axios`: 0.x $\rightarrow$ 1.x (error object restructuring, AxiosHeaders handling).
  - `zod`: 3.x schema breaking methods.
  - `react`: 18 $\rightarrow$ 19 (removal of `propTypes`, `defaultProps`, forwardRef simplifications).
  - `vitest` / `jest`: Test runner configuration and mock syntax translations.
- **Acceptance Criteria:** Each rule must include positive fixture, negative fixture, AST transforms, and automated proving tests.

#### 3. Monorepo & Multi-Package Manager Support
- **Objective:** Add support for `pnpm-lock.yaml`, `yarn.lock` (v1 and Berry), and Cargo/Pip manifests.
- **Milestone:** Parse pnpm workspace packages and resolve inter-workspace dependencies.

---

### P2: Infrastructure & Operational Hardening (Target: Q2 2027)

#### 1. Multi-Region PostgreSQL Staging & Disaster Recovery
- **Objective:** Deploy dedicated Neon / AWS Aurora PostgreSQL staging database with automatic migration rollbacks.
- **Milestone:** Zero-downtime database schema migrations via Prisma / Drizzle with read replicas.

#### 2. GitHub App Marketplace Listing & Self-Serve Billing
- **Objective:** Transition from personal GitHub OAuth tokens to a verified GitHub App listed on GitHub Marketplace.
- **Features:** Automated repository webhook provisioning on install, tiered usage limits via Stripe.

#### 3. Automated Webhook Secret Rotation & Dead-Letter Queue
- **Objective:** Queue failed webhook deliveries in Redis / SQS with exponential backoff and automated signature key rotation.

---

### P3: Developer Experience & Polish (Target: Ongoing)

#### 1. Official YC Demonstration Video & Interactive Walkthrough
- **Deliverable:** High-definition 60-second product demo video walking through CipherBill dependency discovery, Lodash AST proof, and PR generation.

#### 2. Open-Source PatchBay CLI (`patchbay prove`)
- **Objective:** Enable developers to run TryPatchBay AST migrations and proofs entirely locally in their terminal before committing.

#### 3. Community Codemod Submission Portal
- **Objective:** Provide a declarative YAML/JSON format allowing library authors to publish official migration recipes directly to TryPatchBay.

---

## 3. Immediate Next Steps

1. **Maintain submission lock:** Do not introduce unverified dependencies or destabilizing schema changes prior to YC review.
2. **Rehearse live demo:** Ensure reviewer credentials (`reviewer@trypatchbay.demo`) remain active and monitored.
3. **Monitor production error logs:** Continuously track Vercel Lambda logs and PostgreSQL connection pool metrics.
