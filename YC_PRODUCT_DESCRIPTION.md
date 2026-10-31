# TryPatchBay — Product Description

## Executive Summary

**TryPatchBay** is an automated dependency migration platform that upgrades third-party packages, writes the required code modifications, and empirically proves that the upgrades do not break production applications.

Software development relies on open-source dependencies, but major version upgrades introduce breaking API changes that cause maintenance gridlock. TryPatchBay transforms major version upgrades from weeks of manual debugging into verified, automated pull requests backed by reproducible test evidence.

---

## The Core Problem

When an upstream dependency releases a breaking change (e.g. `lodash.contains` renamed to `lodash.includes`, or Stripe parameter refactors):
1. **Existing bots fail**: Dependabot/Renovate submit version bump PRs that immediately fail in CI, leaving developers to do all the work.
2. **LLMs hallucinate**: AI assistants guess at code changes but introduce subtle edge cases, invalid signatures, and lack verification.
3. **Manual audits are expensive**: Engineers must search codebases for every deprecated call site, write migration code, and manually verify edge cases.

---

## The TryPatchBay Solution: 4-Step Evidence Loop

### 1. Detect & Classify
TryPatchBay tracks package ecosystems (npm, pypi) and maintains a curated registry of breaking API change classifications. When an upgrade is available, TryPatchBay extracts the formal breaking change specification (e.g., deprecated method, parameter rename, return type change).

### 2. AST Call-Site Mapping
Instead of naive regex matching, TryPatchBay parses repository source code into Abstract Syntax Trees (ASTs) using `@babel/parser`. It identifies every call expression, imported identifier, and object property affected by the upstream breaking change, recording exact file paths, lines, and character coordinates.

### 3. Deterministic Patch Generation
Using AST transformation rules, TryPatchBay synthesizes a minimal, canonical unified diff (`fixDiff`) targeting only the affected call sites. This ensures zero unwanted code refactorings, style deviations, or hallucinated logic.

### 4. Red-to-Green Proof Engine
Before proposing a code change, TryPatchBay executes an automated proof loop inside an isolated sandbox:
- **Baseline (Old Version)**: Runs existing unit/integration tests $\rightarrow$ Validates that the test suite passes on the current version (Green).
- **Bump (New Version Unpatched)**: Installs the upgraded version $\rightarrow$ Validates that tests fail with the expected breaking change exception (Red).
- **Fix (New Version Patched)**: Applies the candidate AST patch $\rightarrow$ Validates that tests now pass 100% (Green).
- **Coverage Check**: Asserts that every file modified by the patch directly corresponds to an identified call site.

---

## Governance & GitHub Delivery

- **Single-Use Cryptographic Approvals**: Human reviewers inspect the change summary, mapped call sites, unified diff, and execution logs in the TryPatchBay dashboard. Approving the patch binds the SHA-256 hash of the diff.
- **Delivery Mutex**: When submitted, TryPatchBay verifies the diff hash has not drifted, acquires a transactional delivery lock, and uses its GitHub App installation to create the pull request.
- **Fail-Closed Security**: Arbitrary customer code execution on application hosts is strictly blocked. In production, untrusted customer repositories are analyzed statically; sandbox execution is restricted to vetted repositories until dedicated containerized microVM isolation is active.

---

## Verified Proof Benchmarks

- **Lodash 3 $\rightarrow$ 4 Migration (`npm run prove:real`)**:
  - Upstream change: `_.contains(collection, target)` $\rightarrow$ `_.includes(collection, target)`.
  - Execution duration: ~70 seconds.
  - Verification: 1 of 1 affected call site mapped, red-to-green proof verified, 0 unverified sites.
- **Mockpay 1 $\rightarrow$ 2 Migration (`npm run prove`)**:
  - Upstream change: `charges.create({ source })` $\rightarrow$ `charges.create({ payment_method })`.
  - Execution duration: ~43 seconds.
  - Verification: 3 baseline passed $\rightarrow$ 2 failing on bump $\rightarrow$ 3 passing on fix.
