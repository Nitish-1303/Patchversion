# TryPatchBay — Final Engineering Backlog & Post-Submission Roadmap

**Audit Date & Time:** October 31, 2026, 19:00:00 IST (13:30:00 UTC)
**Repository:** `Nitish-1303/Patchversion`
**Commit SHA:** `cee10e2`

---

## 1. Technical State Classification

To provide a qualified, evidence-based assessment for YC technical due diligence:

### A. What is Verified as Operational for YC Prototype Demonstration
1. **GitHub Repository Scanning:** Real connection to GitHub API, lockfile v3 parsing, DAG graph construction (543 nodes, 1,374 edges on CipherBill), and AST parsing of 25 source files.
2. **Deterministic Migration Proving:** End-to-end reproducible proof loop (Baseline green $\rightarrow$ Bump red $\rightarrow$ Fix green) for real Lodash 3 $\rightarrow$ 4 (`_.contains` $\rightarrow$ `_.includes`) and synthetic Mockpay 1 $\rightarrow$ 2 (`source` $\rightarrow$ `payment_method`) on internal test fixtures.
3. **Core Application Security:** Mutation routes enforce RBAC (`POST /api/repos`, `/api/packages`, `/api/approvals`, `/api/pull-requests`). Untrusted customer code execution is fail-closed. Ancestor symlink traversal and cyclic links are trapped.
4. **Vercel Production Platform:** Deployed at [`https://trypatchbay.vercel.app`](https://trypatchbay.vercel.app), serving SSR frontend, authenticated dashboard, and truthful scan findings.
5. **Zero-Mutation Demo Guarantee:** Scanning `Nitish-1303/CipherBill` performs 0 writes, 0 commits, and 0 pull requests.

### B. What is Implemented but Not Fully Proven
1. **GitHub App Installation Flow on Production:** The GitHub App integration and Octokit transport are implemented and verified in automated test suites (`test/github-transport.test.ts`), but production demonstration operates under personal OAuth / demo tokens.
2. **Distributed Rate Limiter Multi-Lambda Burst Stress:** Atomic PostgreSQL sliding window is tested with mock pool integration tests, but has not been load-tested under high concurrent Lambda burst traffic.
3. **Monorepo Workspaces:** Workspace manifests (`pnpm-workspace.yaml`, npm workspaces) are parsed, but complex inter-workspace cross-package migrations are not fully tested.

### C. What is NOT Implemented
1. **MicroVM / Container Sandbox Cluster:** Ephemeral Firecracker / Docker sandboxes for executing arbitrary customer test scripts in production. Live customer code execution is fail-closed.
2. **Real-Time Continuous Changelog Scraper:** Live background daemon polling millions of npm releases and synthesizing rules automatically.
3. **Non-JavaScript Ecosystems:** Python (PyPI), Go, and Rust (Cargo) migrations.

---

## 2. Immediate Fixes vs. Safe-to-Defer Roadmap

### What Was Corrected in this Evidence Package:
- [x] **Rate Limiting Reclassification:** Accurately classified as distributed atomic enforcement under normal database operation, degrading to process-local fallback during database failure. Security implications documented.
- [x] **Commit Distinction:** Clarified that local audit HEAD contains documentation and audit packages that are intentionally not deployed to production (production serves `3d72cb1`).
- [x] **Node Discrepancy Accounting:** Fully accounted for 543 graph nodes ($1\text{ workspace} + 523\text{ packages} + 19\text{ source files}$) directly from `dependency-mapper.ts`.
- [x] **HTTP Smoke Test Evidence:** Added exact timestamps, HTTP status codes, Content-Types, and payload sizes from live production smoke testing.
- [x] **Replaced Absolute Phrasing:** Replaced unconditional claims with qualified statements reflecting prototype reality.

### What Can Safely Wait Until Post-Submission:
1. **Containerized MicroVM Cluster:** Running customer tests safely in ephemeral microVMs is an enterprise infrastructure task requiring dedicated backend orchestration (AWS Firecracker / Fly Machines). The current fail-closed gate is the correct, secure posture for a prototype.
2. **Rule Registry Expansion:** Expanding the migration catalog from Lodash/Mockpay to the top 50 npm libraries (Axios 1.0, React 19, Zod 3).
3. **Continuous Changelog Harvester:** Automated web scraping of release notes and RFCs.
4. **Self-Serve Stripe Billing & GitHub App Marketplace Listing.**

---

## 3. The Five Highest-Priority Engineering Actions (In Strict Order)

1. **Maintain Git Submission Lock:**
   - Freeze `main` branch. Do not introduce speculative code changes, new dependencies, or schema modifications during YC review.
2. **Deploy Isolated MicroVM Execution Runner (Target: Q1 2027):**
   - Deploy an isolated execution backend using AWS Firecracker or Docker-on-Nomad with strict 60-second timeouts and network isolation to safely enable live `npm test` validation for customer repos.
3. **Expand Migration Rule Registry to Top 10 High-Churn Libraries (Target: Q1 2027):**
   - Add verified declarative rules for `axios` (0.x $\rightarrow$ 1.x), `zod` (v3 changes), and `next` (14 $\rightarrow$ 15 async headers).
4. **Transition to Verified GitHub App Marketplace Listing (Target: Q2 2027):**
   - Package TryPatchBay as a GitHub Marketplace App with automated webhook installation, granular repository permissions, and GitHub OAuth onboarding.
5. **Publish Open-Source Local CLI (`patchbay prove`) (Target: Q2 2027):**
   - Allow developers to run AST migrations and red-to-green proof loops locally in their own CI pipelines without uploading code.
