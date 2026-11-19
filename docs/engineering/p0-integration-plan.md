# P0 Integration Plan — Dirty WIP → `agent/p0-product-completion`

**Source tree:** `C:\Users\NITISH\Downloads\Patchversion` (dirty `fix/p0-…` @ `3c54282`)  
**Target:** `Patchversion-main-p0` / `agent/p0-product-completion`  
**Do not** force-push or discard source WIP.

## Migration renumber map (canonical)

| Source (dirty/P0) | Target on main lineage |
|---|---|
| keep | `001_initial_schema.sql` |
| keep | `002_lifecycle_capability_replay.sql` (main) |
| `002_billing_and_rls.sql` | **`003_billing_and_rls.sql`** |
| `003_restricted_roles_and_rls.sql` | **`004_restricted_roles_and_rls.sql`** |
| `004_github_hardening.sql` | **`005_github_hardening.sql`** |

**Never** apply dirty-numbered migrations onto a DB that already tracked main `002_lifecycle`, and never copy dirty `schema_migrations` rows into a main-lineage database without an explicit remap plan.

## Day 2–3 status (2026-11-19)

Ported onto main lineage (committed on `agent/p0-product-completion`):

- GitHub modules: oauth-security, repository-authorization, webhook-security, webhook-processor
- Companion APIs: `getAppInstallation`, `getInstallationAccess`, `revokeRepository*`, OAuth state, billing tenant plan, GitHub user link helpers
- Site routes: webhook, OAuth, scan authz, billing Stripe/PayPal verification
- Migrations renumbered to `003`/`004`/`005`
- Fail-closed OAuth consume + demo-login gating

PR: https://github.com/Nitish-1303/Patchversion/pull/45 — **founder merges**; no agent deploy.

## Acceptance

- CI green on branch (including postgres-live after dynamic version asserts)
- Fail-closed `isQualifiedIsolationActive()` unchanged
- Customer readiness remains NOT_CUSTOMER_READY until live GitHub workflow verified
