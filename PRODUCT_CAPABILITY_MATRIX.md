# TryPatchBay — Product Capability Matrix

**Evaluation Date:** October 31, 2026  
**Product Version:** 0.1.0  
**Repository:** `Nitish-1303/Patchversion`  

---

## Capability Status Legend
- ✅ **Implemented & Verified:** Fully written, tested in automated test suites, and operational in production or sandbox workflows.
- 🟡 **Partially Implemented / Scoped:** Functional within specific supported parameters (e.g. specific language or package ecosystems), with clearly defined boundaries.
- 🔒 **Blocked / Deferred by Design:** Deliberately gated or scoped out to ensure safety, security, or zero-mutation guarantees (e.g. untrusted remote code execution).

---

## 1. Capability Breakdown Across 7 Core Product Areas

| Area | Feature / Capability | Status | Implementation Details & Boundaries |
|---|---|:---:|---|
| **A. Dependency Discovery** | Manifest parsing (`package.json`) | ✅ | Parses `dependencies`, `devDependencies`, `peerDependencies`, and version constraints. |
| | Lockfile parsing (`package-lock.json` v1, v2, v3) | ✅ | Fully parses all 3 format versions into canonical package registry maps. Verified on CipherBill (format v3, 504 transitive packages). |
| | Dependency graph resolution | ✅ | Builds adjacency list directed acyclic graph (DAG) mapping direct packages to transitive dependencies. Verified 543 nodes, 1374 edges. |
| | Non-npm ecosystem support (Pipfile, Cargo, Go) | 🟡 | Data models accommodate generic ecosystems; parser currently active and verified for JavaScript/TypeScript (`npm`). |
| **B. Breaking-Change Detection** | Curated Migration Rule Registry | ✅ | Declarative rule engine matching package names, breaking version transitions, and deprecation patterns. |
| | AST identifier & call site mapping | ✅ | Scans for method renames, signature changes, and removed exports (e.g. `mockpay` `processTransaction` $\rightarrow$ `chargePayment`, `lodash` `_.contains` $\rightarrow$ `_.includes`). |
| | False-positive suppression | ✅ | Checks import bindings and local scopes before flagging calls. Unimported or shadow-scoped identifiers are ignored. |
| | Real-world coverage breadth | 🟡 | High-fidelity coverage for registered rules (Mockpay, Lodash 3$\rightarrow$4, Next.js migrations). Expands as rules are added. |
| **C. Source-Code Traceability** | JavaScript / TypeScript AST parsing | ✅ | Babel parser with TypeScript and JSX plugins. Recovers exact line, column, and AST node references. |
| | Syntax resilience | ✅ | Handles TypeScript 5.x syntax, JSX/TSX syntax, top-level await, dynamic imports, and modern ECMAScript features. |
| | Partial parsing / non-standard syntax | 🟡 | Graceful degradation: unparseable files log warning without aborting repository sweep. |
| **D. Deterministic Patch Generation** | AST-guided code transformation | ✅ | AST rewriting preserves indentation, quotes, and coding style using Recast / Babel generator. |
| | Unified diff generation | ✅ | Produces standard POSIX unified diffs (`diff -u`) with line count headers and file paths. |
| | Cryptographic diff hashing | ✅ | SHA-256 content hashes generated for every diff to guarantee integrity across approval cycles. |
| | Multi-file simultaneous transformations | ✅ | Coordinated multi-file patchsets modifying imports, callsites, and package manifests in one atomic unit. |
| **E. Patch Validation** | Sandboxed test execution | ✅ | Executes pre-patch tests, applies patch, and executes post-patch tests to verify behavior and test passing. |
| | Trusted fixture validation | ✅ | Verifiable on trusted internal fixtures (`fixtures/mockpay-service`, `fixtures/lodash-repo`) in isolated temp dirs. |
| | Remote untrusted customer code execution | 🔒 | **Fail-closed by design.** Remote execution of customer code without microVM isolation (e.g., Firecracker / Docker sandbox) is blocked. Prevents arbitrary remote code execution on host/Vercel serverless. |
| **F. Evidence Reports** | Pre/Post test comparison | ✅ | Captures test run durations, assertions passed, and test output logs before and after patch application. |
| | Evidence bundle packaging | ✅ | Bundles rule metadata, source AST trace, unified diff, SHA-256 hash, and execution logs into inspectable JSON. |
| | Visual review UI | ✅ | Interactive diff viewer, file-by-file inspection, and confidence metrics presented to engineers. |
| **G. Human Approval & PR Creation** | Role-Based Access Control (RBAC) | ✅ | Mutating approvals require `owner`, `admin`, or `reviewer` role. Repository registration requires `owner` or `admin`. |
| | Cross-tenant isolation | ✅ | Strict tenant boundaries ensure Tenant A cannot view, approve, or generate PRs for Tenant B resources. |
| | GitHub Pull Request creation | ✅ | Automated Git branch creation (`patchversion/...`), commit creation, and GitHub Pull Request opening via Octokit. |
| | Customer Repository Zero-Mutation Guarantee | ✅ | Demo repository (`Nitish-1303/CipherBill`) is strictly read-only. Scan and exploration actions perform zero writes to user repos. |

---

## 2. Summary of Operating Boundaries

1. **Production Demonstration:** The production demo workspace is anchored to `Nitish-1303/CipherBill`. It proves real GitHub API integration, tree retrieval, manifest parsing, and dependency graph calculation without mutating the customer codebase.
2. **Deterministic Migration Proving:** Deep AST rewriting and test validation are proved end-to-end via reproducible local/CI commands (`npm run prove` and `npm run prove:real`).
3. **Execution Safety:** Customer-provided live repos do not execute arbitrary test scripts on serverless infrastructure. Execution validation is gated behind containerized sandboxes.
