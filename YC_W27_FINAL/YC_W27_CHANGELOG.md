# TryPatchBay — YC Winter 2027 Changelog

**Application:** Y Combinator Winter 2027 (W27)  
**Founder:** Yeluru Nitish  
**Audit Date:** 2026-10-31  

This changelog records all edits, corrections, removals, and verifications made across the TryPatchBay YC W27 application documents.

---

## 1. Substantive Corrections & Reasons

### A. Location Explanation Refinement (Section 3)
* **Change:** Removed speculative justifications ("low living costs and dependable development infrastructure"). Replaced with: "I currently live in Chennai, India, and have built the prototype here. If accepted to YC, I intend to relocate to San Francisco for the batch and build the company there, subject to obtaining the appropriate visa."
* **Reason:** Followed the strict prompt rule to use only facts directly provided by the founder and avoid inventing personal motivations or giving immigration advice.

### B. Why YC Motivation (Section 7)
* **Change:** Replaced generic praise of YC's network with concrete business needs: "I am applying to YC because I need candid product feedback from engineering teams, help validating customer demand, and guidance on turning an early technical prototype into a viable developer-tooling business. The 2026 Request for Startups topic 'Self-Maintaining APIs' by Harsha Gaddipati also influenced my interest in exploring this problem from the consumer repository side."
* **Reason:** Followed the Razorpay Rize and YC principles: show founder thoughtfulness, concrete reasons for applying, and connect to Harsha Gaddipati's RFS without claiming YC endorsement or partnership.

### C. Reviewer Demo Access & Public Scanner Availability (Section 3 & 4)
* **Change:** Removed the claim that the read-only scanner is live for "any public GitHub repository". Corrected the login instruction to: "visit https://trypatchbay.vercel.app/login and click 'Quick Demo Sign-in (developer@trypatchbay.dev)'. This signs in as the demo reviewer without a password."
* **Reason:** Production API testing revealed that unauthenticated scan calls return 401 Unauthorized, and arbitrary unconfigured repos return 404. The prototype is an authenticated demo console connected to pre-seeded demo repositories (`patchbay-demo/checkout-service` and `Nitish-1303/CipherBill`).

### D. Competitor Characterization (Section 5)
* **Change:** Balanced the competitor analysis: acknowledged that Dependabot and Renovate automate PRs and integrate with CI checks, OpenRewrite uses recipe-based AST refactoring in Java, and general-purpose assistants generate probabilistic code without proof loops. Framed TryPatchBay's AST-plus-proof approach as an experimental technical hypothesis rather than a proven competitive moat.
* **Reason:** Ensures fair, technically accurate competitor analysis as required by YC guidance.

### E. Security Boundary & Sandbox Accuracy (Section 3 & 4)
* **Change:** Replaced ambiguous "isolated test runner" phrasing with "child-process proof runner". Highlighted prominently in the product description that arbitrary customer repository execution is disabled pending container or microVM isolation.
* **Reason:** Child processes are not security sandboxes. Accurately reflects codebase reality (`packages/engine/src/jobs/orchestrator.ts:315-317`).

### F. Pricing & Market Projections (Section 5)
* **Change:** Removed all unsourced TAM figures ($30M–$50M). Explicitly labeled $49/mo and $299/mo as unvalidated pricing hypotheses. Stated directly: $0 revenue, 0 paying customers.
* **Reason:** Eliminates unverified traction and market-size claims.

### G. Cofounder Stance (Section 1)
* **Change:** Replaced generic solo founder text with: "Yes. I am open to finding one complementary cofounder with operational, go-to-market, technical, or financial strengths."
* **Reason:** Accurately reflects confirmed founder preference.

---

## 2. Claims Preserved as Accurate

* **Company Name & One-Liner:** "TryPatchBay" / "Automated breaking dependency migration engine" (46 characters).
* **Code Ownership:** 100% written by founder; no contractor or third-party code.
* **Tech Stack:** TypeScript on Node.js, ts-morph, TypeScript compiler API, Next.js 16, PostgreSQL. Claude and Cursor noted as development tools only; deterministic compiler logic at runtime.
* **Fresh Test Results:** 418 passing tests, 6 skipped, 0 failing across 44 active suites (freshly verified by `npm test`).
* **Clean Build:** Zero TypeScript compiler errors (`npm run typecheck`), zero ESLint errors (`npm run lint`).
* **Commercial Status:** 0 paying customers, $0 revenue, bootstrapped with modest personal funds, no outside investment.
* **Entity Status:** Not incorporated; 100% planned founder ownership; no legal entity or stock issuance exists yet.
* **Prior YC Application History:** Third application; earlier application specifics unconfirmed.
* **Alternative Startup Ideas:** Backup-AI and YourSRE.

---

## 3. Retained Historical Claims

* **Lodash Migration (56.8s):** Retained as an internal test fixture migration (`npm run prove:real` in `fixtures/lodash-repo`), verified in active test suites.
* **Synthetic Mockpay Benchmark (46.0s):** Retained as a synthetic benchmark (`npm run prove` in `fixtures/sample-repo`), verified in active test suites.
* **CipherBill Node Count (543 nodes, 523 dependencies):** Retained and verified against live API scan response for `Nitish-1303/CipherBill`.

---

## 4. Remaining Open Issues for Submission

1. **Founder Video:** Outstanding. Video must be recorded (60s, solo to camera) and the YouTube/Vimeo URL entered in Section 2 of the portal.
2. **Prior Application Records:** If the portal requires specific prior batch or company names, founder must verify if email records exist.
3. **Portal Reviewer Login Test:** Founder should do a final incognito test of the "Quick Demo Sign-in" button on `https://trypatchbay.vercel.app/login`.
