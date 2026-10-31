# TryPatchBay — YC W27 Application Changelog

**Date & Time:** October 31, 2026, 19:15:00 IST (13:45:00 UTC)
**Document Purpose:** Detailed audit changelog recording every modification made to the YC W27 application copy, comparing previous draft statements with the final evidence-backed text, and citing the exact repository evidence justifying each change.

---

## 1. Summary of Changes

A total of 10 major copy revisions were executed across the YC application materials to eliminate unsubstantiated claims, comply strictly with YC character limits, align with solo-founder reality, and ensure 100% technical defensibility under technical due diligence.

---

## 2. Detailed Field-by-Field Changelog

### Revision 1: Founder Voice & Pronouns
- **Section / Field:** Throughout all application sections, founder video guidelines, and demo scripts.
- **Original Wording:** *"We are building an automated dependency migration engine... our team... we plan to..."*
- **Revised Wording:** *"I am building an automated dependency migration engine... I have built... I plan to..."*
- **Rationale:** Nitish is the solo technical founder. Git commit history contains a single author. Using "we" creates a false impression of a multi-founder team or employees, which would trigger immediate scrutiny during partner interviews.
- **Evidence Reference:** Git commit author logs in `Nitish-1303/Patchversion`.

---

### Revision 2: Company One-Liner Character Limit
- **Section / Field:** Company Profile $\rightarrow$ One-Liner (50 characters max).
- **Original Wording:** *"Automated dependency migration engine with deterministic AST proofs"* (69 characters).
- **Revised Wording:** *"Automated breaking dependency migration engine"* (46 characters).
- **Rationale:** The YC portal enforces a strict 50-character limit on the company one-liner field. The previous draft was 69 characters and would be rejected or truncated by the form.
- **Evidence Reference:** Character count string validation (`"Automated breaking dependency migration engine".length === 46`).

---

### Revision 3: Customer Code Execution Boundary
- **Section / Field:** Idea & Solution $\rightarrow$ Sandboxed Execution.
- **Original Wording:** *"Runs isolated red-to-green proof loops in the customer's actual test environment before opening PRs."*
- **Revised Wording:** *"Runs automated red-to-green proof loops on vetted migration fixtures, with remote customer repository execution fail-closed pending microVM container isolation."*
- **Rationale:** `packages/engine/src/sandbox/runner.ts` and `orchestrator.ts` gate execution with `isDemoFixture`. Customer repo execution is fail-closed. Vercel serverless Lambda instances do not have microVM or Docker isolation. Claiming to run arbitrary untrusted customer test suites in production would be an inaccurate security claim.
- **Evidence Reference:** `packages/engine/src/sandbox/runner.ts`, `packages/engine/src/orchestrator.ts`, and `npm run readiness` output (`Customer Execution Gate: BLOCKED`).

---

### Revision 4: Security Audit Attribution
- **Section / Field:** Progress / Traction $\rightarrow$ Application Security.
- **Original Wording:** *"Passed Cloudflare security audit across 12 boundaries."*
- **Revised Wording:** *"Hardened against 12 application-security boundaries using Cloudflare's security review criteria, including fail-closed execution and symlink defenses."*
- **Rationale:** Cloudflare Inc. did not audit or certify TryPatchBay. The team ran the open-source `cloudflare/security-audit-skill` locally as a code-review tool during engineering hardening.
- **Evidence Reference:** Repository audit transcripts and security review commit `7a4e18c`.

---

### Revision 5: Supported Language Ecosystems
- **Section / Field:** What is your solution and how is it different?
- **Original Wording:** *"Supports JavaScript, TypeScript, and Python web stacks."*
- **Revised Wording:** *"Currently supports JavaScript and TypeScript (npm), with architecture designed to extend to Python and other ecosystems."*
- **Rationale:** The AST parser (`ts-morph`) and migration rule registry only implement TypeScript and JavaScript transforms (`npm`). Python/PyPI exists only as a schema enum in `packages/shared/src/types.ts`.
- **Evidence Reference:** `packages/engine/src/migration/rules/` and `packages/engine/src/scanner/`.

---

### Revision 6: Lodash Proof Metrics & Test Fixture Qualification
- **Section / Field:** Progress $\rightarrow$ Verified Proofs.
- **Original Wording:** *"Verified real-world dependency migration: Lodash 3 to 4 in 70s."*
- **Revised Wording:** *"Verified genuine Lodash 3.10.1 to 4.17.21 migration on an internal test fixture in 51.8s with 100% call-site coverage (`npm run prove:real`)."*
- **Rationale:** The actual execution duration on `fixtures/lodash-repo` (`acme/membership`) is 51.8 seconds (not 70s). Furthermore, qualifying it as an "internal test fixture" avoids any implication that Lodash was migrated on a live third-party customer production repo.
- **Evidence Reference:** `packages/engine/src/prove.ts`, `runs/lodash-migration.json`, and terminal execution log of `npm run prove:real`.

---

### Revision 7: CipherBill Status & 0 Breaking Changes Qualification
- **Section / Field:** Progress $\rightarrow$ Zero Hallucination Demonstration.
- **Original Wording:** *"CipherBill customer repository demonstration... detected 0 breaking changes."*
- **Revised Wording:** *"Public demonstration connected to real open-source GitHub repository `Nitish-1303/CipherBill`, accurately mapping 523 dependencies across 543 graph nodes and truthfully reporting 0 supported breaking changes."*
- **Rationale:** `Nitish-1303/CipherBill` is an open-source project created by the founder, not a commercial customer. Furthermore, stating "0 supported breaking changes" clarifies that CipherBill does not match rules in TryPatchBay's current catalog, rather than making an unverified global claim that CipherBill has zero breaking changes across all 523 packages.
- **Evidence Reference:** `packages/engine/src/scanner/dependency-mapper.ts` (1 workspace node + 523 dependency nodes + 19 source file nodes = 543 nodes).

---

### Revision 8: Commercial Traction & Pricing Model
- **Section / Field:** Progress $\rightarrow$ Traction & How will you make money?
- **Original Wording:** *"Enterprise contracts at $499/repo/month including dedicated microVM isolation runners... Developer team tier at $99/repo/month."*
- **Revised Wording:** *"Early-stage working prototype with 0 active users, 0 paying customers, and $0 revenue. Proposed testing price is $49/month for individual developers/small teams and $299/month for organizations."*
- **Rationale:** Stating enterprise tiers as existing facts misleadingly implies commercial adoption. The reality is $0 revenue and 0 paying customers. Pricing tiers are hypotheses to be tested during the YC batch.
- **Evidence Reference:** Production database state (zero billing accounts, zero Stripe customer subscriptions).

---

### Revision 9: YC RFS Alignment Context
- **Section / Field:** Idea $\rightarrow$ Relation to YC RFS.
- **Original Wording:** *"Endorsed by YC's Fall 2026 RFS for Self-Maintaining APIs."*
- **Revised Wording:** *"Directly addresses the technical challenge highlighted in YC's Fall 2026 Request for Startups ('Self-Maintaining APIs' by Harsha Gaddipati) from the repository consumer perspective."*
- **Rationale:** YC publishes Requests for Startups as open problem areas, not startup endorsements. Framing it as a technical response from the consumer side is intellectually honest and demonstrates domain insight.
- **Evidence Reference:** YC Fall 2026 RFS publication *"Self-Maintaining APIs"* by Harsha Gaddipati.

---

### Revision 10: Rate Limiting Technical Classification
- **Section / Field:** Progress $\rightarrow$ Production Infrastructure.
- **Original Wording:** *"Fully distributed sliding-window rate limiting."*
- **Revised Wording:** *"Distributed atomic sliding-window rate limiting via PostgreSQL under normal operation, with degraded process-local memory fallback during database outages."*
- **Rationale:** The rate limiter uses PostgreSQL atomic upserts across Lambdas, but if PostgreSQL fails or times out, it falls back to an in-memory `Map` inside the Node.js process. Per-container isolation allows up to $N \times \text{limit}$ requests across $N$ instances during an outage.
- **Evidence Reference:** `packages/site/src/lib/rate-limiter.ts` implementation and test suite `packages/site/__tests__/rate-limiter-atomic.test.ts`.

