# trypatchbay product completion audit

**Reviewed:** 2026-10-28
**Source baseline:** `7c471eb` (`main`, merged PR #20)
**Release decision:** Not ready for production use

This matrix records behavior verified in the repository. A module or screen is
not treated as evidence that the hosted capability exists.

| Capability | Current status | Evidence and limitation |
| --- | --- | --- |
| Public website and documentation | Implemented (page delivery only) | Vercel production deployment `dpl_HXJ3RgDT2MCv9KQCWFZnXMUsffdk` is READY for main commit `7c471eb`. The homepage and `/dashboard` return HTTP 200; the dashboard displays its unavailable state. This does not verify a backend workflow. |
| Current main CI | Passed | GitHub Actions run `40646311978` on `7c471eb` passed typecheck (including audit and lint), tests, fixture proof, and build. It does not verify hosted authentication, repository access, or isolated customer execution. |
| Required main checks | Missing | GitHub reports `main` is not protected and has no required status checks. The successful CI run is not enforced as a merge gate. |
| Homepage fixture illustration | Implemented as a labeled local example | It describes the bundled fixture workflow. It is not an account workflow or live repository result. |
| Dashboard account data | Unavailable | Authentication and persistent account state do not exist. This change makes `/dashboard` state that explicitly and loads no fixture, repository, activity, or pull request records. |
| Sign-in and onboarding | Unavailable | Routes explain that authentication, GitHub installation, and repository authorization are not implemented. |
| Contact and newsletter forms | Local-only | They prevent submission and show that no message or signup is sent or stored. |
| npm release watcher | Partial, local module | It can query npm registry metadata and update the file-backed store when invoked. No hosted scheduler, durable job queue, retry policy, or dashboard synchronization exists. Release notes are not collected. |
| Contract probes | Partial, local module | Probe code exists, but there is no hosted scheduler or production service using it. |
| Dependency usage mapping and classification | Partial engine capability | AST mapping and heuristic classification exist. Coverage is limited and is not a general repository analysis service. |
| Patch generation | Partial engine capability | Deterministic rename transformations exist; the model path is a stub. Customer repositories are refused by the current unisolated execution policy. |
| Fixture proof | Implemented for bundled fixtures | CI exercises the recorded fixture. Local child processes have no isolation; this is not evidence that arbitrary repositories can be run safely. |
| Isolated execution | Missing; release gate | Docker mode is blocked as unverified. No customer repository may be executed by this prototype. |
| State persistence | Partial, local files | The engine stores JSON files on the local filesystem. There is no database, tenant boundary, hosted artifact store, or migration system. |
| GitHub webhook receiver | Partial local prototype | It verifies raw-body HMAC when configured and caps request size, then logs summaries. It is not connected to a deployed route, does not enqueue work, and lacks replay protection and idempotent processing. |
| GitHub App and repository access | Missing | No installation flow, account mapping, repository selection, token lifecycle, or permission checks exist. |
| Pull request delivery | Missing | The engine prepares local PR text; it does not push a branch or create a GitHub pull request. |
| Hosted jobs and recovery | Missing | No durable queue, worker, retry/recovery lifecycle, cancellation, or dead-letter handling exists. |
| Billing | Missing | The pricing page states paid-only intent and that the product is not available to purchase. No checkout or entitlement system exists. |
| Monitoring and operations | Missing | No application health endpoint, production worker, alerting, backup, restore, or incident runbook is present. |
| Runtime configuration | Partial | `ANTHROPIC_API_KEY` is read by the engine config, but the model path is a stub. `NODE_ENV` only affects the local webhook receiver's fail-closed check. There is no production environment schema or `.env.example`. |
| CI tests before this change | Partial | PR #19 run `40630297352` passed 140 engine tests in 14 suites, typecheck, fixture proof, and build. Site/shared scripts previously contained no meaningful tests; this change adds those checks. |
| Earlier PR #19 CI regressions | Resolved on `main` | The six failures in run `40629594809` were copy-guard assertions after accurate limitation copy changed. The limitation wording was restored, and the later run above passed without removing the assertions. |
| Dependency audit | High/critical clear; 7 low findings | `npm audit --audit-level=high` completed successfully. All reported findings are in the Jest test-tool chain through `deepmerge`; the current GitHub advisory has no patched version listed. This is development tooling, not a production runtime package. |

## Changes in this review

- Upgrade the site from Next.js 14 to 16.4.3 and require Node.js 20.9 or newer.
- Update Actions to current first-party Node 24 action versions, grant read-only
  repository permissions, and disable persisted checkout credentials.
- Add a real site component suite and shared design-token tests; replace the
  previous no-op site/shared test scripts.
- Add ESLint to the CI commands.
- Remove the hardcoded fixture dashboard from `/dashboard`. The route now
  reports that account-backed access is unavailable and loads no sample data.
- Add keyboard interaction coverage for the existing workflow tabs.
- Correct security documentation and engine comments that described planned
  GitHub behavior as if it were deployed.
- Align shared color and typography tokens with the existing light navy and
  lavender site palette.

## Current candidate changes (not yet merged)

- Reject configuration that disables the fixture-only execution gate or
  replaces trusted fixture roots outside the test runtime. This does not add
  an isolation boundary.
- Correct the security page's dashboard statement and add regression coverage.

## Remaining release blockers

1. Authentication and tenant authorization, including a selected identity/session provider.
2. A provisioned persistent database, schema/migrations, backups, and retention policy.
3. A durable queue and separate worker deployment for long-running jobs.
4. A verified isolation service and adversarial security review before arbitrary repository code can run.
5. A registered GitHub App, authorized test installation, and disposable test repository for real repository and pull-request verification.
6. Application observability, alerts, health/readiness checks, and operational recovery procedures.
7. End-to-end tests for authorization, tenant isolation, job recovery, approvals, and genuine PR delivery.

No production secrets, paid services, DNS, deployment settings, or external
resources were changed. The remaining blockers need infrastructure choices,
credentials, and security validation; the fixture workflow is not a substitute.

The `deepmerge` advisory is tracked at
[GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4).
