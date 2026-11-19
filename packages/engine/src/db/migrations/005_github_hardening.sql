-- ============================================================================
-- Patchversion / TryPatchBay PostgreSQL Schema Migration 005
-- GitHub onboarding hardening: installation event ordering + OAuth state store
-- Numbered 005 on main lineage because 002 is lifecycle_capability_replay (not billing).
-- ============================================================================

ALTER TABLE installations
  ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS oauth_states (
  id VARCHAR(128) PRIMARY KEY,
  state_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  status VARCHAR(32) NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_github_user_id_unique
  ON users(github_user_id)
  WHERE github_user_id IS NOT NULL;
