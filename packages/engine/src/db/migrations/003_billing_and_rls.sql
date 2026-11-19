-- ============================================================================
-- Patchversion / TryPatchBay PostgreSQL Schema Migration 003
-- Billing Plan persistence
-- Numbered 003 on main lineage because 002 is lifecycle_capability_replay.
-- Billing Plan persistence, Entitlement Tracking, and Database Row-Level Security
-- ============================================================================

-- 1. Tenant Plan and Subscription Entitlement Columns
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan VARCHAR(32) NOT NULL DEFAULT 'developer';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(32) DEFAULT 'active';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_id ON tenants(subscription_id);

-- Index for atomic monthly PR quota calculation
CREATE INDEX IF NOT EXISTS idx_pull_requests_tenant_quota ON pull_requests(tenant_id, created_at, is_simulation);

-- 2. Row-Level Security (RLS) on Tenant-Owned Tables
-- Tables governed by tenant_id:
-- users, sessions, installations, repositories, jobs, findings, patches,
-- validations, approvals, pull_requests, onboarding_states, delivery_claims, watch_targets.


-- TENANTS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenants_isolation ON tenants;
CREATE POLICY tenants_isolation ON tenants
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- USERS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_tenant_isolation ON users;
CREATE POLICY users_tenant_isolation ON users
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- SESSIONS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sessions_tenant_isolation ON sessions;
CREATE POLICY sessions_tenant_isolation ON sessions
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- INSTALLATIONS
ALTER TABLE installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE installations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS installations_tenant_isolation ON installations;
CREATE POLICY installations_tenant_isolation ON installations
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- REPOSITORIES
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS repositories_tenant_isolation ON repositories;
CREATE POLICY repositories_tenant_isolation ON repositories
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- JOBS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jobs_tenant_isolation ON jobs;
CREATE POLICY jobs_tenant_isolation ON jobs
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- FINDINGS
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS findings_tenant_isolation ON findings;
CREATE POLICY findings_tenant_isolation ON findings
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- PATCHES
ALTER TABLE patches ENABLE ROW LEVEL SECURITY;
ALTER TABLE patches FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS patches_tenant_isolation ON patches;
CREATE POLICY patches_tenant_isolation ON patches
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- VALIDATIONS
ALTER TABLE validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE validations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS validations_tenant_isolation ON validations;
CREATE POLICY validations_tenant_isolation ON validations
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- APPROVALS
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS approvals_tenant_isolation ON approvals;
CREATE POLICY approvals_tenant_isolation ON approvals
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- PULL_REQUESTS
ALTER TABLE pull_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pull_requests FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pull_requests_tenant_isolation ON pull_requests;
CREATE POLICY pull_requests_tenant_isolation ON pull_requests
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- ONBOARDING_STATES
ALTER TABLE onboarding_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_states FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS onboarding_states_tenant_isolation ON onboarding_states;
CREATE POLICY onboarding_states_tenant_isolation ON onboarding_states
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- DELIVERY_CLAIMS
ALTER TABLE delivery_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_claims FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS delivery_claims_tenant_isolation ON delivery_claims;
CREATE POLICY delivery_claims_tenant_isolation ON delivery_claims
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- WATCH_TARGETS
ALTER TABLE watch_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_targets FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS watch_targets_tenant_isolation ON watch_targets;
CREATE POLICY watch_targets_tenant_isolation ON watch_targets
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- TENANT_DELIVERY_LOCKS (Distributed concurrency locks for quotas)
CREATE TABLE IF NOT EXISTS tenant_delivery_locks (
  tenant_id VARCHAR(128) PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  lock_id VARCHAR(128) NOT NULL,
  worker_id TEXT NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE tenant_delivery_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_delivery_locks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_delivery_locks_isolation ON tenant_delivery_locks;
CREATE POLICY tenant_delivery_locks_isolation ON tenant_delivery_locks
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );

-- Application Role Setup and Permissions
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'patchbay_app') THEN
    CREATE ROLE patchbay_app NOBYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO patchbay_app;
GRANT ALL ON ALL TABLES IN SCHEMA public TO patchbay_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO patchbay_app;
