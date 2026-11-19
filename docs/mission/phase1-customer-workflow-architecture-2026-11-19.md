# Phase 1 — Customer Workflow Architecture (as implemented)

**HEAD:** `2354670` on `agent/p0-product-completion`  
**Intent:** Describe the **actual** wired path, including where it stops for real customers.

```text
[Browser]
   │
   ├─ Marketing /docs /pricing          (site pages)
   │
   ├─ GitHub OAuth
   │     GET  /api/auth/github/login
   │     GET  /api/auth/github/callback  → session cookie
   │     (demo login only if ALLOW_DEMO_GITHUB_LOGIN + non-prod)
   │
   ├─ GitHub App install
   │     POST /api/github/onboarding → installUrl + onboarding state
   │     GitHub → /api/github/callback
   │     Webhooks → /api/github/webhook (signature + idempotency)
   │
   ├─ Repository selection
   │     GET /api/repos
   │       if App configured: listInstallationRepositories → saveRepository
   │       demo tenant: filter / fixture rules
   │
   ├─ Scan + findings
   │     POST /api/scan
   │       authorizeTenantRepository(revalidateRemote=false)
   │       orchestrator.scanRepositoryWithDependencyMap
   │         fixture/localPath → local scanner
   │         else → GitHub Contents API remote scan
   │       for each finding: generateAndValidateFix
   │         trusted fixture → may execute / synthesize proof
   │         live customer repo → FAIL CLOSED (no qualified isolation)
   │
   ├─ Approval
   │     /api/approvals → DB active approval + diffHash
   │
   └─ Draft PR
         POST /api/pull-requests { patchId }
           orchestrator.deliverPullRequest
             requires: approval + passed validation + active installation
             github.createBranch + createPullRequest (draft)
             ⚠ does NOT commit patch blobs/trees — PR can be empty of code changes
```

## Hard stop for external customers (today)

```text
Scan findings often from fixture known-changes (mockpay/lodash), not live registry
        ↓
Private/customer repo scan may read files via App token
        ↓
generateAndValidateFix
        ↓
isTrustedFixture? ──no──► throw (execution disabled until qualified isolation)
        ↓
No passing ValidationRecord
        ↓
deliverPullRequest refused (“patch does not have a verified passing validation”)

Even if validation existed:
createBranch(baseSha) → createPullRequest(draft) without committing patch → empty diff PR
```

Therefore the advertised loop **auth → authorize → migrate → isolated evidence → real draft PR** is **not complete** for arbitrary external private repositories, even when GitHub App APIs are coded.

Explorer corroboration: [Map customer journey](3fba6fdf-fafb-4bd3-b856-5ac275d3224a), [Audit mocks/stubs](2b069f8d-66fe-4dcc-92c6-650c62ee4ceb).

## Fixture / demo bypass (not customer production)

```text
patchbay-demo/checkout-service or permitted localPath
  → LocalTrustedFixtureProvider / local process / synthesized proof
  → can reach deliverPullRequest only if GitHub configured + approval
```

## Billing side path (orthogonal)

```text
/api/billing/checkout
  → PayPal URL or Stripe Checkout if keys present
  → else { demo: true } preview fallback
/api/billing/webhook → plan update (signature required when secrets set)
```

Quota/plan columns exist in migrations 003+; live paid enforcement for external customers is **UNVERIFIED**.

## Security boundaries (must preserve)

| Boundary | Current posture |
|---|---|
| Untrusted code in Next.js | Must remain forbidden; suites not run in app process for customers |
| `isQualifiedIsolationActive()` | Hard `false` |
| OAuth consume missing table | Fail-closed `false` |
| Webhook signatures | Required when secrets configured |
| Tenant RLS | SQL in 003/004 on PR branch; not production-applied |
