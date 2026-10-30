-- ============================================================================
-- Patchversion / TryPatchBay PostgreSQL Schema
-- Strict multi-tenant isolation, parent-child referential integrity,
-- unique business constraints, and distributed concurrency protection.
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
  id VARCHAR(128) PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  email TEXT NOT NULL,
  password_hash TEXT,
  role VARCHAR(32) NOT NULL DEFAULT 'member',
  github_user_id TEXT,
  github_login TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_users_tenant_email ON users(tenant_id, email);

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON sessions(tenant_id);

CREATE TABLE IF NOT EXISTS revoked_sessions (
  session_id VARCHAR(128) PRIMARY KEY,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS installations (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  github_installation_id BIGINT NOT NULL UNIQUE,
  account_login TEXT NOT NULL,
  account_type VARCHAR(32) NOT NULL DEFAULT 'User',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_installations_tenant ON installations(tenant_id);

CREATE TABLE IF NOT EXISTS repositories (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  installation_id VARCHAR(128) NOT NULL REFERENCES installations(id) ON DELETE RESTRICT,
  github_repo_id BIGINT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  default_branch TEXT NOT NULL DEFAULT 'main',
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(32) NOT NULL DEFAULT 'connected',
  local_path TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repositories_tenant ON repositories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_repositories_full_name ON repositories(tenant_id, full_name);

CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  repository_id VARCHAR(128) NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  type VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'queued',
  payload JSONB NOT NULL,
  result JSONB,
  error TEXT,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_run_after ON jobs(status, run_after);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant ON jobs(tenant_id);

CREATE TABLE IF NOT EXISTS findings (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  repository_id VARCHAR(128) NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  from_version TEXT NOT NULL,
  to_version TEXT NOT NULL,
  is_breaking BOOLEAN NOT NULL DEFAULT FALSE,
  change_record JSONB NOT NULL,
  impact_analysis JSONB NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  source_analysis_performed BOOLEAN,
  analysis_mode VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_findings_tenant_repo_package_versions UNIQUE (tenant_id, repository_id, package_name, from_version, to_version)
);

CREATE INDEX IF NOT EXISTS idx_findings_tenant_repo ON findings(tenant_id, repository_id);

CREATE TABLE IF NOT EXISTS patches (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  finding_id VARCHAR(128) NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  diff_content TEXT NOT NULL,
  diff_hash TEXT NOT NULL,
  lockfile_updates TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'generated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patches_tenant_finding ON patches(tenant_id, finding_id);

CREATE TABLE IF NOT EXISTS validations (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  patch_id VARCHAR(128) NOT NULL REFERENCES patches(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'passed',
  proof JSONB,
  execution_logs TEXT NOT NULL,
  duration_ms INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validations_tenant_patch ON validations(tenant_id, patch_id);

CREATE TABLE IF NOT EXISTS approvals (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  patch_id VARCHAR(128) NOT NULL REFERENCES patches(id) ON DELETE CASCADE,
  approved_by_user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  diff_hash_at_approval TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invalidated_at TIMESTAMPTZ,
  invalidation_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_approvals_tenant_patch_status ON approvals(tenant_id, patch_id, status);

CREATE TABLE IF NOT EXISTS pull_requests (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  repository_id VARCHAR(128) NOT NULL REFERENCES repositories(id) ON DELETE RESTRICT,
  finding_id VARCHAR(128) NOT NULL REFERENCES findings(id) ON DELETE RESTRICT,
  patch_id VARCHAR(128) NOT NULL REFERENCES patches(id) ON DELETE RESTRICT UNIQUE,
  approval_id VARCHAR(128) NOT NULL REFERENCES approvals(id) ON DELETE RESTRICT,
  github_pr_number INT NOT NULL,
  github_pr_url TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  is_draft BOOLEAN DEFAULT TRUE,
  is_simulation BOOLEAN DEFAULT FALSE,
  delivery_blocked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pull_requests_tenant ON pull_requests(tenant_id);

CREATE TABLE IF NOT EXISTS onboarding_states (
  id VARCHAR(128) PRIMARY KEY,
  token VARCHAR(128) NOT NULL UNIQUE,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_account TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  installation_id BIGINT
);

CREATE INDEX IF NOT EXISTS idx_onboarding_states_token ON onboarding_states(token);

CREATE TABLE IF NOT EXISTS delivery_claims (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patch_id VARCHAR(128) NOT NULL REFERENCES patches(id) ON DELETE CASCADE UNIQUE,
  worker_id TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_delivery_claims_patch ON delivery_claims(patch_id);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id VARCHAR(128) PRIMARY KEY,
  delivery_id TEXT NOT NULL UNIQUE,
  event TEXT NOT NULL,
  signature TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(32) NOT NULL DEFAULT 'processed'
);

CREATE TABLE IF NOT EXISTS watch_targets (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  ecosystem VARCHAR(32) NOT NULL DEFAULT 'npm',
  current_version TEXT NOT NULL,
  latest_version TEXT NOT NULL,
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(32) NOT NULL DEFAULT 'up_to_date',
  is_demo BOOLEAN DEFAULT FALSE,
  notes TEXT,
  last_error TEXT,
  source VARCHAR(32) NOT NULL DEFAULT 'registry',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_watch_targets_tenant_package UNIQUE (tenant_id, package_name)
);
