# PatchBay — Technical Architecture Specification

## 1. Monorepo Organization

PatchBay is organized as a unified TypeScript monorepo using npm workspaces:

```
├── packages/
│   ├── shared/         # Domain types, design tokens, and shared contracts
│   ├── engine/         # Autonomous pipeline: detection, AST mapping, patch gen, isolation, bot
│   └── site/           # Next.js 16 (Turbopack) web dashboard, marketing pages, API routes
├── fixtures/           # Validated repository fixtures (sample-repo, lodash-repo)
├── runs/               # Cryptographic proof bundles with tamper-evident manifests
└── docs/               # Architecture, security threat model, implementation matrices
```

---

## 2. End-to-End Pipeline

```
+-------------------------------------------------------------------------+
|                         Autonomous Pipeline                             |
+-------------------------------------------------------------------------+
  1. DETECT: NpmWatcher & StripeApiProviderAdapter
     - Detects breaking releases, semver major bumps, and deprecation notices
     - Produces normalized ChangeRecord

  2. MAP: UsageMapper (ts-morph AST)
     - Scans repository source files (CJS and ESM)
     - Maps exact call sites (file, line, column, import statement, expression)
     - Produces UsageMap and ImpactAnalysis

  3. PATCH: FixGenerator
     - Deterministic AST transformations for known rename patterns
     - Validates source syntax via TypeScript parser before proposing diff
     - Produces unified git diff

  4. PROVE: IsolatedRunner & SandboxRunner
     - Runs test suite in baseline state (green)
     - Bumps dependency version and verifies break (red)
     - Applies patch and re-runs test suite (green)
     - Writes tamper-evident SHA-256 evidence bundle

  5. APPROVE: Human Review
     - Interactive dashboard displays diff, logs, and cryptographic proof
     - Tenant user clicks "Approve Patch"

  6. DELIVER: PRBot & GitHubClient
     - Obtains atomic delivery lease in DB to prevent duplicate pull requests
     - Creates git branch, commits changes, and opens GitHub Draft PR
```

---

## 3. Database & Tenancy Architecture

The system supports dual persistence modes:
- **Production Mode (PostgreSQL):** Parameterized queries via `pg.Pool`, foreign-key cascade protections, transaction isolation, and row-level tenant locking.
- **Development Mode (JSON File Store):** Atomic write-ahead files (`.tmp` + rename) with zero configuration required for local hacking.

All entities (`repositories`, `findings`, `patches`, `validations`, `approvals`, `pull_requests`, `watch_targets`) are strictly isolated by `tenant_id`.
