# TryPatchBay — Final Product Capability Matrix

**Audit Date & Time:** October 31, 2026, 18:50:00 IST (13:20:00 UTC)  
**Repository:** `Nitish-1303/Patchversion`  
**Commit SHA:** `7a4e18c4e14b2211e1f389a80e1ab6c1bc73e013`  

---

## 1. Capability Status Taxonomy

To satisfy strict technical due diligence, each capability is classified into one of six mutually exclusive states:
1. **Implemented:** Written in codebase and functional.
2. **Tested:** Verified by passing automated test suites with assertions.
3. **Deployed:** Running live on production Vercel infrastructure.
4. **Demonstrated:** Actively showcased in the user-facing demo on `Nitish-1303/CipherBill`.
5. **Planned:** Designed or represented in data schemas, but not yet implemented.
6. **Not Implemented:** Out of scope or deliberately omitted.

---

## 2. Product Capability Matrix

| Area | Feature / Capability | Status | Implementation Reference | Automated Test Evidence | Limitations & Unverified Items |
|---|---|:---:|---|---|---|
| **A. Dependency Discovery** | `package.json` Manifest Parsing | **Demonstrated** | `scanner/repository-scanner.ts` | `test/scanner.test.ts` | Handles prod, dev, peer deps for npm. Monorepo pnpm/yarn workspaces partially supported. |
| | `package-lock.json` v1/v2/v3 Parsing | **Demonstrated** | `scanner/repository-scanner.ts` | `test/scanner.test.ts` | Verified on CipherBill (format v3, 504 transitive packages). `yarn.lock` and `pnpm-lock.yaml` parsers are basic. |
| | Dependency Graph DAG Construction | **Demonstrated** | `scanner/dependency-mapper.ts` | `test/scanner.test.ts` | Builds adjacency list directed graph. Verified 543 nodes, 1,374 edges on CipherBill. |
| | Python (`Pipfile`/`poetry`), Go, Cargo Discovery | **Planned** | Data models accommodate generic ecosystems | None | **Not implemented.** Only `npm` ecosystem is functional. |
| **B. Breaking Change Detection** | Curated Migration Rule Registry | **Tested** | `migration/rules/` | `test/migration-rules.test.ts` | Hand-curated declarative rules (Mockpay, Lodash 3 $\rightarrow$ 4). Rule coverage is currently narrow. |
| | Automated Real-Time Changelog Scraper | **Not Implemented** | None | None | Does not continuously scrape arbitrary npm changelogs. |
| | False-Positive Scope & Binding Suppression | **Tested** | `usage-map/mapper.ts` | `test/mapper.test.ts` | Checks import bindings and local scopes; ignores unimported identifiers. |
| **C. Source-Code Traceability** | TypeScript/JavaScript AST Parsing | **Demonstrated** | `usage-map/mapper.ts` (`ts-morph`) | `test/mapper.test.ts` | Parses `.ts`, `.tsx`, `.js`, `.jsx`. Scanned 25 files on CipherBill. |
| | Exact Call-Site Coordinate Mapping | **Tested** | `usage-map/mapper.ts` | `test/mapper.test.ts` | Extracts file path, line number, column, and call expression text. |
| | Bounded Remote Tree Retrieval | **Demonstrated** | `scanner/repository-scanner.ts` | `test/remote-source-analysis-audit.test.ts` | Bounded file retrieval via GitHub Trees API with size and file count caps. |
| | Dynamic Imports & Reflection Tracking | **Not Implemented** | None | None | Dynamic string `import()` or `eval()` calls are not tracked by AST parser. |
| **D. Deterministic Patch Generation** | AST-Based Code Rewriting | **Tested** | `fix-generator/generator.ts` | `test/fix-generator.test.ts` | Rewrites AST nodes without altering surrounding formatting or unassociated code. |
| | Unified Diff Generation (`diff -u`) | **Tested** | `fix-generator/generator.ts` | `test/fix-generator.test.ts` | Generates canonical unified diffs with line count headers. |
| | Cryptographic SHA-256 Diff Hashing | **Tested** | `fix-generator/generator.ts` | `test/rbac-and-mutation-authorization.test.ts` | Diffs are hashed with SHA-256 to guarantee tamper-resistance. |
| | Probabilistic / LLM Patch Generation | **Not Implemented** | None | None | **Deliberately excluded.** All patch synthesis is deterministic rule-based. |
| **E. Patch Validation** | Red-to-Green Test Proving (Baseline $\rightarrow$ Bump $\rightarrow$ Fix) | **Tested** | `prove.ts`, `sandbox/runner.ts` | `npm run prove`, `npm run prove:real` | Proven on Mockpay (synthetic) and Lodash 3 $\rightarrow$ 4 (real package) in local child process. |
| | Untrusted Customer Code Sandbox Execution | **Not Implemented** | `jobs/orchestrator.ts` | `test/customer-execution-boundary-audit.test.ts` | **Fail-closed by design.** Arbitrary customer repos cannot execute tests in serverless Lambdas. |
| | MicroVM / Container Isolation Cluster | **Planned** | Architecture planned for Firecracker / Nomad | None | **Not implemented.** Local proof loop runs in standard Node process. |
| **F. Evidence Reports** | Pre/Post Test Output Logs | **Tested** | `evidence/bundle.ts` | `test/evidence-bundle.test.ts` | Captures exit codes, assertions passed/failed, and stdout/stderr. |
| | Machine-Readable Evidence Bundles | **Tested** | `evidence/bundle.ts` | `test/evidence-bundle.test.ts` | Bundles diff, test logs, coverage metrics, and manifest into `runs/.../proof.json`. |
| | Dashboard Evidence Viewer | **Deployed** | `app/dashboard/` | Browser smoke test | Displays diffs, file trees, and scan results. |
| **G. Human Approval & PR Creation** | Role-Based Access Control (RBAC) | **Deployed** | `api/backend.ts`, `api/repos/route.ts` | `test/rbac-and-mutation-authorization.test.ts` | Enforces `owner`/`admin` on repos, packages, and PRs; `reviewer` on approvals. |
| | Cross-Tenant Resource Isolation | **Deployed** | PostgreSQL query scoping | `test/rbac-and-mutation-authorization.test.ts` | Strict tenant boundaries (`WHERE tenant_id = $1`). Cross-tenant access denied. |
| | GitHub Pull Request Delivery via App | **Tested** | `jobs/orchestrator.ts`, `github/transport.ts` | `test/github-transport.test.ts` | Branch creation, commit generation, and PR opening via Octokit. |
| | Customer Repository Zero-Mutation Guarantee | **Demonstrated** | `Nitish-1303/CipherBill` | GitHub API audit | Scan and viewing operations perform strictly zero writes or commits to customer repos. |

---

## 3. Summary of Demonstrated vs. Planned Boundaries

- **What the Live Demo Demonstrates:** Authentic GitHub repository connection, lockfile v3 parsing, dependency graph DAG construction (543 nodes, 1,374 edges), AST parsing of 25 source files, and truthful reporting of zero matching breaking changes on `Nitish-1303/CipherBill`.
- **What Local Proving Demonstrates:** Deterministic AST rewriting, call-site mapping, and empirical test execution (Baseline green $\rightarrow$ Bump red $\rightarrow$ Fix green) on trusted fixtures (Mockpay and Lodash 3 $\rightarrow$ 4).
- **What is Deferred / Not Implemented:** MicroVM container execution for arbitrary customer code (fail-closed), automated continuous web changelog scraping, and non-JavaScript ecosystems.
