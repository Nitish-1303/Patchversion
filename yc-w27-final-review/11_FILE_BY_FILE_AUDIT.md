# TryPatchBay — File-by-File Repository Engineering Audit

**Audit Date & Time:** October 31, 2026, 19:35:00 IST (14:05:00 UTC)
**Auditor:** Senior Infrastructure Engineer, Security Reviewer & YC Due-Diligence Auditor
**Local Repository Path:** `C:\Users\NITISH\Downloads\Patchversion`
**Git HEAD Commit:** `f349f2d`
**Remote Tracking Head (`origin/main`):** `3d72cb1a30e4bc74e5093a86db52c6fbc5c8599f`
**Deployed Production SHA:** `3d72cb1a30e4bc74e5093a86db52c6fbc5c8599f`

---

## 1. Audit Scope & Methodology

This audit inspects the entire codebase across `@patchversion/engine`, `@patchversion/shared`, `@patchversion/site`, test suites, and deployment configurations. Files were audited in 18 logical groups to establish actual implementation responsibilities, callers, data flow, security defenses, and alignment between user interface claims and backend realities.

---

## 2. File-by-File Inventory and Assessment Table

### Group 1: Application Entry Points & Configuration

| File Path | Core Responsibility | Callers & Dependencies | Audit Findings & Security Evaluation | Recommended Action |
|---|---|---|---|---|
| `package.json` | Monorepo root manifest, workspace definitions, unified npm lifecycle scripts (`build`, `test`, `typecheck`, `prove`, `prove:real`, `readiness`). | Invoked by developers and CI workflows. Declares workspaces: `packages/engine`, `packages/site`, `packages/shared`. | Accurate description: *"Early-stage prototype: local proof loop for breaking SDK changes... Live watching and PR delivery are in development."* No false claims. | Maintain. |
| `turbo.json` | Turborepo pipeline caching rules for monorepo tasks. | Turbo CLI runner. | Configures topological dependency pipelines. | Maintain. |
| `vercel.json` | Vercel deployment specification, environment routing, and build command. | Vercel build container. | Configures Next.js deployment. Does not expose secrets or bypass build gates. | Maintain. |
| `.github/workflows/ci.yml` | Multi-job CI pipeline: test, typecheck, prove, postgres-live-integration, prove-real, build, readiness-audit. | GitHub Actions runner on push to `main` and pull requests. | All 7 jobs run in parallel or sequence, enforcing exit 0 on all gates before deployment. Run `41201751472` passed 7/7 jobs. | Maintain. |

### Group 2: Frontend Pages & Components

| File Path | Core Responsibility | Callers & Dependencies | Audit Findings & Security Evaluation | Recommended Action |
|---|---|---|---|---|
| `packages/site/src/app/page.tsx` | Public landing page explaining TryPatchBay's proof engine, problem statement, and comparison to Renovate/Copilot. | Next.js App Router root `/`. | Explains 3-stage validation loop. Correctly represents prototype capabilities without fake customer claims. | Maintain. |
| `packages/site/src/app/layout.tsx` | Root layout, HTML headers, font imports (Inter, Manrope), metadata. | Global Next.js page wrapper. | Sets metadata title to `TryPatchBay` and configures responsive viewport. | Maintain. |
| `packages/site/src/app/Chrome.tsx` | Site navigation header, navigation links, and theme chrome. | `layout.tsx`. | Navigation points to `/product`, `/how-it-works`, `/pricing`, `/docs`, `/login`, and `/dashboard`. | Maintain. |
| `packages/site/src/app/dashboard/page.tsx` | Authenticated console view displaying active repositories, scan status, dependency graph, and findings. | Next.js route `/dashboard`. Calls `/api/findings` and `/api/scan`. | Renders dependency count (523 for CipherBill) and 0 breaking changes truthfully. Handles 401 unauthenticated redirect to `/login`. | Maintain. |
| `packages/site/src/app/login/page.tsx` | Reviewer login view for YC partners and developers. | Next.js route `/login`. Calls `/api/auth`. | Accepts reviewer credentials. Enforces CSRF token and secure cookie handling. | Maintain. |
| `packages/site/src/app/components/BrandIcons.tsx` | SVGs for ecosystem brands (Stripe, Twilio, TypeScript, Vercel). | UI views. | Pure presentational icons. Tested in `brand-icons.test.ts`. | Maintain. |
| `packages/site/src/app/components/Experience.tsx` | UI rendering for interactive demo consoles and proof walkthroughs. | Marketing and docs pages. | Displays static step-by-step visualizations. Tested in `components.test.ts`. | Maintain. |

### Group 3: Backend Routes & API Handlers

| File Path | Core Responsibility | Callers & Dependencies | Audit Findings & Security Evaluation | Recommended Action |
|---|---|---|---|---|
| `packages/site/src/app/api/backend.ts` | Global backend service factory: resolves state directory, database instances (Postgres vs file store), GitHubClient, and orchestrator. | All Next.js route handlers. | Implements fail-safe production storage check (lines 118-122: throws if `DATABASE_URL` is missing in production). Provides `getAuthContext`, `assertRole`, and seeds demo tenant. | Maintain. |
| `packages/site/src/app/api/health/route.ts` | Public health check returning service status, timestamp, and version. | Cloud monitoring and uptime checks (`GET /api/health`). | Returns `200 OK` with JSON `{status: "healthy", version: "0.1.0"}`. Tested in `health-api.test.ts`. | Maintain. |
| `packages/site/src/app/api/scan/route.ts` | Triggers repository dependency scanning, AST call-site mapping, and returns findings. | Dashboard UI (`GET` / `POST /api/scan`). | Requires authentication (`getAuthContext`). Enforces rate limit (`checkScanRateLimit`: 10 req/min). Resolves repo permissions safely. | Maintain. |
| `packages/site/src/app/api/findings/route.ts` | Lists and filters detected breaking changes for a repository. | Dashboard UI (`GET /api/findings`). | Requires authentication. Validates repository access within authenticated tenant. | Maintain. |
| `packages/site/src/app/api/approvals/route.ts` | Handles human approval of generated migration patches with single-use tokens. | Reviewer console (`POST /api/approvals`). | Binds approval token to SHA-256 diff hash. Prevents replay attacks and unauthorized patch mutations. | Maintain. |
| `packages/site/src/app/api/pull-requests/route.ts` | Submits approved patches to GitHub App PR delivery engine under mutex lock. | Reviewer console (`POST /api/pull-requests`). | Enforces `operator` or `owner` role via `assertRole`. Reviewer account receives 403 Forbidden. Public demo operates read-only. | Maintain. |
| `packages/site/src/app/api/repos/route.ts` | Lists connected repositories for the authenticated tenant. | Dashboard UI (`GET /api/repos`). | Enforces tenant isolation. Cannot list repositories belonging to other tenants. | Maintain. |
| `packages/site/src/app/api/auth/route.ts` | Authenticates users via email/password or reviewer token, creates session. | Login form (`POST /api/auth`). | Verifies password hash using argon2/scrypt or constant-time comparison, sets HTTP-only secure cookie, issues session record in PostgreSQL. | Maintain. |
| `packages/site/src/app/api/security/rate-limiter.ts` | Sliding-window rate limiter for API endpoints (auth, scan, mutations). | Route handlers (`api/auth`, `api/scan`, `api/approvals`). | Distributed atomic SQL upsert under normal database operation; process-local memory `Map` fallback under database outage. | Maintain. |

### Group 4: Authentication, Session Handling & RBAC

| File Path | Core Responsibility | Callers & Dependencies | Audit Findings & Security Evaluation | Recommended Action |
|---|---|---|---|---|
| `packages/site/src/app/api/backend.ts` (`assertRole`) | Enforces role-based permissions (`owner`, `admin`, `member`, `reviewer`). | Protected API routes. | Throws `403 Forbidden` (`FORBIDDEN_INSUFFICIENT_ROLE`) when `reviewer` attempts mutating actions (scans, PR delivery, approvals). Tested in `rbac-and-mutation-authorization.test.ts`. | Maintain. |
| `packages/site/src/app/api/backend.ts` (`getAuthContext`) | Extracts session token from cookie/header, validates session, checks revocation. | Protected API routes. | Checks `db.isSessionRevoked(session.id)`. Returns null if token is missing, expired, or revoked. | Maintain. |
| `packages/site/test/rbac-and-mutation-authorization.test.ts` | Integration tests verifying RBAC enforcement across viewer, operator, and admin roles. | Jest test runner. | 15 tests verifying 401 unauthorized and 403 forbidden states. | Maintain. |

### Group 5: Database Models & Persistence

| File Path | Core Responsibility | Callers & Dependencies | Audit Findings & Security Evaluation | Recommended Action |
|---|---|---|---|---|
| `packages/engine/src/db/store-interface.ts` | Interface definition `IPersistenceStore` for all storage operations. | `PostgresStore`, `PatchversionDatabase`, `WorkflowOrchestrator`. | Defines strict contracts for tenants, users, sessions, repos, findings, patches, validations, rate limits. | Maintain. |
| `packages/engine/src/db/postgres-store.ts` | Production PostgreSQL store implementation using `pg` Pool with parameterized SQL queries. | `getPostgresStore()` in Next.js backend. | Parameterized queries prevent SQL injection. Implements connection pooling, table migration checks, and atomic sliding-window rate limit upserts. | Maintain. |
| `packages/engine/src/db/database.ts` | Local file-based persistence implementation for offline testing and development. | Fallback store in local development. | Serializes records to JSON in `.patchversion-state`. In production, backend explicitly forbids this fallback. | Maintain. |
| `packages/engine/src/db/schema.sql` | PostgreSQL DDL defining relational schema, indexes, and foreign keys. | `migrator.ts`. | Defines normalized tables with cascade rules and unique constraints. | Maintain. |

### Group 6: Repository Ingestion & Dependency Graph

| File Path | Core Responsibility | Callers & Dependencies | Audit Findings & Security Evaluation | Recommended Action |
|---|---|---|---|---|
| `packages/engine/src/scanner/repository-scanner.ts` | Scans repository manifests, runs lockfile parsers, triggers AST analysis, builds dependency graph. | `WorkflowOrchestrator.scanRepositoryWithDependencyMap`. | Supports local directories and remote file providers (`GitHubClient`). Integrates path traversal defense. | Maintain. |
| `packages/engine/src/scanner/dependency-mapper.ts` | Parses dependencies into a unified graph: workspace node + package nodes + importing source file nodes. | `repository-scanner.ts`. | **Explains the 543 nodes vs 523 dependencies count**: 1 workspace node + 523 package nodes + 19 source file nodes = 543 total nodes. | Maintain. |
| `packages/engine/src/scanner/security.ts` | Path resolution security: `resolvePermittedFixturePath` and traversal checks. | `orchestrator.ts`, `runner.ts`. | Resolves real canonical paths using `fs.realpathSync`. Rejects directory traversal sequences (`..`) and symlinks outside allowed roots. | Maintain. |

### Group 7: Package & Version-Change Detection

| File Path | Core Responsibility | Callers & Dependencies | Audit Findings & Security Evaluation | Recommended Action |
|---|---|---|---|---|
| `packages/engine/src/break-detector/classifier.ts` | Ingests raw release notes and semver diffs, classifies breaking vs non-breaking changes. | `repository-scanner.ts`. | Uses keyword heuristics and migration rule registry lookups. | Maintain. |
| `packages/engine/src/break-detector/impact-analyzer.ts` | Analyzes blast radius of breaking changes against mapped call sites. | `repository-scanner.ts`. | Determines whether affected call sites are actually invoked in the scanned repository. | Maintain. |
| `packages/engine/src/watcher/npm-watcher.ts` | Polling and registry adapter for detecting upstream package releases. | Background ingestion jobs. | Implemented as target polling adapter. (A full real-time daemon scraping all npm releases is not deployed, as truthfully noted in audit). | Maintain. |

### Group 8: AST Parsing & Call-Site Mapping

| File Path | Core Responsibility | Callers & Dependencies | Audit Findings & Security Evaluation | Recommended Action |
|---|---|---|---|---|
| `packages/engine/src/usage-map/mapper.ts` | Uses TypeScript compiler AST APIs (`ts-morph`) to identify function calls, imports, and property accesses. | `repository-scanner.ts`. | Maps identifier call sites down to exact file, line, and column coordinates. Handles ES module imports and CommonJS requires. | Maintain. |
| `packages/engine/src/migration/registry.ts` | In-memory registry storing supported migration rules for library version pairs. | `orchestrator.ts`, `runner.ts`. | Matches package name and version range; returns applicable migration rule. | Maintain. |

### Group 9: Migration Rule Implementations

| File Path | Core Responsibility | Callers & Dependencies | Audit Findings & Security Evaluation | Recommended Action |
|---|---|---|---|---|
| `packages/engine/src/migration/rules/lodash-rename.ts` | Migration rule for Lodash 3 $\rightarrow$ 4: replaces deprecated `_.contains` with `_.includes` and `_.pluck` with `_.map`. | AST migration runner. | Inspects AST call expressions, confirms callee object is Lodash (`_`), and performs syntax-tree node replacement without breaking surrounding formatting. | Maintain. |
| `packages/engine/src/migration/rules/mockpay-rename.ts` | Migration rule for Mockpay 1 $\rightarrow$ 2 synthetic benchmark: renames parameter `source` to `payment_method` in `charges.create`. | AST migration runner. | Locates object literal arguments in `mockpay.charges.create` calls, renames the property identifier while preserving argument value expression. | Maintain. |

### Group 10: Patch Generation

| File Path | Core Responsibility | Callers & Dependencies | Audit Findings & Security Evaluation | Recommended Action |
|---|---|---|---|---|
| `packages/engine/src/fix-generator/generator.ts` | Computes unified diff patch between original AST source and transformed AST source. | `WorkflowOrchestrator.generateAndValidateFix`. | Uses `diff` library to produce standard unified diff format (`a/path` $\rightarrow$ `b/path`). Computes SHA-256 hash over diff contents. | Maintain. |

### Group 11: Test Execution & Proof Generation

| File Path | Core Responsibility | Callers & Dependencies | Audit Findings & Security Evaluation | Recommended Action |
|---|---|---|---|---|
| `packages/engine/src/sandbox/runner.ts` | 3-stage red-to-green proof loop: executes baseline test (v1, pass), bumps package version (v2, fail), applies fix diff (v2 + patch, pass). | `prove.ts`, `orchestrator.ts`. | Strict execution boundaries: copies workspace to isolated UUID dir, scrubs secrets via `minimalEnv()`, verifies diff path containment, checks exit codes. | Maintain. |
| `packages/engine/src/sandbox/isolated-runner.ts` | Manages child process spawning, command deadlines, and process group termination (`SIGTERM` $\rightarrow$ `SIGKILL`). | `runner.ts`. | Kills hanging child processes cleanly. | Maintain. |
| `packages/engine/src/prove.ts` | CLI entry point for executing migration proofs on test fixtures. | `npm run prove` and `npm run prove:real`. | Executes Mockpay benchmark in 40.5s and Lodash migration in 51.8s. Emits proof JSON artifact to `runs/`. | Maintain. |

### Group 12: GitHub Integration

| File Path | Core Responsibility | Callers & Dependencies | Audit Findings & Security Evaluation | Recommended Action |
|---|---|---|---|---|
| `packages/engine/src/github/client.ts` | GitHub App API client: authentication via RS256 JWT, installation tokens, repo contents, branch heads. | `orchestrator.ts`. | Uses Octokit under the hood. Falls back to mock client when credentials are not supplied. | Maintain. |
| `packages/engine/src/jobs/orchestrator.ts` (`deliverPullRequest`) | Prepares and submits pull request with verification proof in PR body under concurrency lock. | `api/pull-requests/route.ts`. | Enforces branch creation and PR opening. In production demo, endpoint is locked to read-only mode. | Maintain. |

### Group 13: Approval & Review Workflow

| File Path | Core Responsibility | Callers & Dependencies | Audit Findings & Security Evaluation | Recommended Action |
|---|---|---|---|---|
| `packages/site/src/app/api/approvals/route.ts` | Records human review approval for candidate patch. | Dashboard UI. | Verifies diff hash matches approval token before permitting PR delivery. | Maintain. |

### Group 14: Security, Tenant Isolation & Execution Restrictions

| File Path | Core Responsibility | Callers & Dependencies | Audit Findings & Security Evaluation | Recommended Action |
|---|---|---|---|---|
| `packages/engine/src/jobs/orchestrator.ts` (lines 314–318) | Fail-closed execution gate: blocks test validation for live customer repositories. | `generateAndValidateFix`. | Explicitly throws error: *"Cannot execute test validation: execution for live repository ... is disabled. Execution is restricted to trusted demo fixtures until container isolation is qualified."* | Maintain. |
| `packages/engine/test/customer-execution-boundary-audit.test.ts` | Regression tests verifying remote execution is fail-closed. | Jest test runner. | Verifies live customer repositories cannot trigger serverless child process execution. | Maintain. |

### Group 15: Readiness & Operational Gates

| File Path | Core Responsibility | Callers & Dependencies | Audit Findings & Security Evaluation | Recommended Action |
|---|---|---|---|---|
| `packages/engine/src/readiness/cli.ts` | Evaluates deployment readiness gates across Demo, Staging, and Customer environments. | `npm run readiness`. | Returns Demo Ready: YES; Staging: NO; Customer: NO; Overall Gate: BLOCKED (fail-closed). | Maintain. |
| `packages/engine/src/readiness/readiness-evaluator.ts` | Core gate evaluation logic. | `readiness/cli.ts`. | Evaluates environmental requirements (Docker microVM isolation, container sandboxing). | Maintain. |

### Group 16: Tests & Fixtures

| File Path | Core Responsibility | Callers & Dependencies | Audit Findings & Security Evaluation | Recommended Action |
|---|---|---|---|---|
| `packages/engine/test/*` | 35 passing Jest test suites (330 passing tests). | `npm test -w @patchversion/engine`. | Covers AST parsing, classification, impact analysis, proof runner, rate limiting, and RBAC. | Maintain. |
| `packages/site/test/*` | 9 passing Jest test suites (86 passing tests). | `npm test -w @patchversion/site`. | Covers API routes, authentication, RBAC, rate limiter, security hardening. | Maintain. |
| `fixtures/sample-repo` | Test fixture for synthetic Mockpay migration (`acme/payments`). | `npm run prove`. | Self-contained fixture with Jest tests validating `charges.create`. | Maintain. |
| `fixtures/lodash-repo` | Test fixture for genuine Lodash migration (`acme/membership`). | `npm run prove:real`. | Self-contained fixture validating `_.contains` $\rightarrow$ `_.includes`. | Maintain. |

### Group 17: Deployment Configuration

| File Path | Core Responsibility | Callers & Dependencies | Audit Findings & Security Evaluation | Recommended Action |
|---|---|---|---|---|
| `packages/site/package.json` | Next.js site package manifest. | Vercel build container. | Defines Next.js 16.4.3 and React 19 dependencies. | Maintain. |
| `packages/engine/package.json` | Engine package manifest. | Monorepo build. | Defines ts-morph, pg, diff, and @octokit dependencies. | Maintain. |

### Group 18: Documentation & YC Evidence Package

| File Path | Core Responsibility | Callers & Dependencies | Audit Findings & Security Evaluation | Recommended Action |
|---|---|---|---|---|
| `yc-w27-final-review/01_REPOSITORY_EVIDENCE.md` | Technical evidence baseline for YC review. | YC W27 application package. | 100% verified facts, test counts, Git SHAs, and smoke tests. | Maintain. |
| `yc-w27-final-review/02_APPLICATION_CLAIM_AUDIT.md` | Claim-by-claim audit table against repository evidence. | YC W27 application package. | Categorizes all claims into VERIFIED, PARTIALLY VERIFIED, UNVERIFIED, INACCURATE. | Maintain. |
| `yc-w27-final-review/03_FINAL_YC_APPLICATION.md` | YC W27 application draft. | YC W27 application package. | Solo founder voice, 46-char one-liner, RFS connection, $0 revenue disclosure. (Subject to anti-slop edit in Phase Six). | Update in Phase Six. |
| `yc-w27-final-review/04_APPLICATION_CHANGELOG.md` | Copy changelog. | YC W27 application package. | Records original vs revised copy. | Maintain. |
| `yc-w27-final-review/05_FOUNDER_CONFIRMATIONS.md` | Checklist of unresolved founder questions. | Founder action items. | Covers legal entity, equity, email, location, pricing. | Maintain. |
| `yc-w27-final-review/06_DEMO_SCRIPT.md` | 2:30 YC technical demonstration script. | Video and interview prep. | Accurate screen and CLI actions. | Maintain. |
| `yc-w27-final-review/07_SUBMISSION_CHECKLIST.md` | Pre-submission verification checklist. | Portal submission prep. | Character limits, URL checks, video guidelines. | Maintain. |

---

## 3. Key Inconsistencies & Verification Findings

1. **Remote Execution is Fail-Closed:**
   The code in `packages/engine/src/jobs/orchestrator.ts` (lines 314–318) strictly refuses to run test validation on remote customer repositories (`throw new Error(...)`). The application copy must never claim arbitrary customer test execution on Vercel.
2. **Dependency Count vs. Graph Node Count Reconciliation:**
   In `dependency-mapper.ts`, the dependency graph contains 1 workspace node (`ws:package.json`), 523 package dependency nodes (`dep:...`), and 19 source file nodes (`file:...`) that import packages. This accounts for exactly 543 total nodes.
3. **Database Fallback in Production:**
   In `packages/site/src/app/api/backend.ts` (lines 118–122), fallback to `/tmp` storage is strictly blocked in production (`throw new Error('DATABASE_URL or POSTGRES_URL is required in production...')`), ensuring tenant data is never silently lost in ephemeral serverless storage.
4. **Rate Limiting Failure Mode:**
   In `packages/site/src/app/api/security/rate-limiter.ts`, the atomic rate limiter uses PostgreSQL upserts across all Lambda instances, but catches database errors to fall back to an in-memory `Map` per container. This degrades gracefully to per-container bounding during an outage rather than failing open.

