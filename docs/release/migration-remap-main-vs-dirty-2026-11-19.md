# Migration Remap — Main Lineage vs Dirty `fix/p0-…`

## Main lineage (PR #45 / `agent/p0-product-completion`)

1. `001_initial_schema`
2. `002_lifecycle_capability_replay`
3. `003_billing_and_rls`
4. `004_restricted_roles_and_rls`
5. `005_github_hardening` (`last_event_at`, `oauth_states`, unique `users.github_user_id`)

## Dirty feat lineage (`Patchversion` @ `3c54282`)

1. `001_initial_schema`
2. `002_billing_and_rls` ← **collides with main lifecycle version number**
3. `003_restricted_roles_and_rls`
4. `004_github_hardening`
5. (no lifecycle migration in that tree)

## Rules

- Fresh main DBs: apply 001→005 in order.
- Existing main DBs already at 002: apply 003→005 only.
- Dirty DBs that recorded `002` as billing: **do not** point at main migration directory without a founder-approved remap (checksum/version conflict). Prefer new environments for main-lineage verification.
- Agents must not run production migrations.

## Verification (non-prod)

- Unit: `packages/engine/test/postgres-migration.test.ts`
- Live CI: `postgres-live.integration.test.ts`, `lifecycle-replay-store.test.ts` (expect latest version dynamically)
