# P0 Integration Plan — Dirty WIP → `agent/p0-product-completion`

**Source tree:** `C:\Users\NITISH\Downloads\Patchversion` (dirty `fix/p0-…`)  
**Target:** this worktree @ `3668ba3`  
**Do not** force-push or discard source WIP.

## Migration renumber map

| Source (dirty/P0) | Target on main lineage |
|---|---|
| keep | `001_initial_schema.sql` |
| keep | `002_lifecycle_capability_replay.sql` (main) |
| `002_billing_and_rls.sql` | **`003_billing_and_rls.sql`** |
| `003_restricted_roles_and_rls.sql` | **`004_restricted_roles_and_rls.sql`** |
| `004_github_hardening.sql` | **`005_github_hardening.sql`** |

## Commits to replay (content)

- `e94b775` Plan & Features tab  
- `f1f6c1f` P0 billing/RLS/pricing honesty  
- `e8491ae` PR quota + live RLS role tests  
- Uncommitted: GitHub oauth/webhook/repo-auth modules + Stripe webhook security + site route wiring + P0-1 isolation (already on main)

## Acceptance

- CI green on branch  
- Fail-closed `isQualifiedIsolationActive()` unchanged  
- PR opened to `main` — **founder merges**  
- No production deploy from agents  

## 2026-11-19 progress

Copied into this worktree (uncommitted):

- GitHub modules: `oauth-security`, `repository-authorization`, `webhook-security`, `webhook-processor`
- `stripe-webhook-security.ts`
- Migrations renumbered to `003`/`004`/`005`
- Engine `index.ts` exports for GitHub modules

**Blocked on companion APIs still only in dirty tree** (must port carefully onto `3668ba3`, not blind overwrite):

- `GitHubClient.getAppInstallation` / `getInstallationAccess`
- `IPersistenceStore.revokeRepository` / `revokeRepositoryByGithubId`
- Related `postgres-store` / `database` / site route wiring from dirty WIP

Next implementation step: extract those methods from dirty tree and merge onto main’s store/client without regressing PRs #38–#44.
