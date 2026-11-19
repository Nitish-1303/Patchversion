-- Migration 003: Restricted Roles and Hardened Row Level Security (RLS)
-- Resolves RLS context impersonation vulnerability by introducing a cryptographically
-- verified, transaction-bound tenant and admin context mechanism.
-- Replaces untrusted caller-settable GUCs ('app.is_admin', 'app.current_tenant_id')
-- with SECURITY DEFINER verification functions and strict execution grants.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Internal Security Context Table
-- Stores server cryptographic HMAC key. Strictly inaccessible to application role.
CREATE TABLE IF NOT EXISTS _patchbay_security_context (
  key VARCHAR(64) PRIMARY KEY,
  secret TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure default key exists if not yet synced by application server
INSERT INTO _patchbay_security_context (key, secret)
VALUES ('tenant_context_key', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- Revoke all direct permissions on security secrets from public and patchbay_app
REVOKE ALL ON _patchbay_security_context FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'patchbay_app') THEN
    REVOKE ALL ON _patchbay_security_context FROM patchbay_app;
  END IF;
END
$$;

-- 2. Context Verification Functions (SECURITY DEFINER)

-- Sets trusted tenant context using server-generated HMAC token
CREATE OR REPLACE FUNCTION patchbay_set_tenant_context(p_tenant_id TEXT, p_auth_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_secret TEXT;
  v_expected_token TEXT;
  v_sig TEXT;
BEGIN
  IF p_tenant_id IS NULL OR trim(p_tenant_id) = '' THEN
    RAISE EXCEPTION 'Tenant ID cannot be empty';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id) THEN
    RAISE EXCEPTION 'Tenant % does not exist', p_tenant_id;
  END IF;

  SELECT secret INTO v_secret FROM _patchbay_security_context WHERE key = 'tenant_context_key';
  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'Security context key is not initialized';
  END IF;

  v_expected_token := encode(hmac('tenant:' || p_tenant_id, v_secret, 'sha256'), 'hex');
  IF p_auth_token IS NULL OR p_auth_token <> v_expected_token THEN
    RAISE EXCEPTION 'Unauthorized: Invalid tenant authorization token';
  END IF;

  v_sig := encode(hmac(p_tenant_id || ':' || txid_current()::text, v_secret, 'sha256'), 'hex');

  PERFORM set_config('patchbay.trusted_tenant_id', p_tenant_id, true);
  PERFORM set_config('patchbay.trusted_context_sig', v_sig, true);
END;
$$;

-- Sets trusted tenant context from an active user session token
CREATE OR REPLACE FUNCTION patchbay_set_session_context(p_session_token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id VARCHAR(128);
  v_user_id VARCHAR(128);
  v_secret TEXT;
  v_sig TEXT;
BEGIN
  IF p_session_token IS NULL OR trim(p_session_token) = '' THEN
    RAISE EXCEPTION 'Session token cannot be empty';
  END IF;

  SELECT s.tenant_id, s.user_id INTO v_tenant_id, v_user_id
  FROM sessions s
  WHERE s.token = p_session_token
    AND s.expires_at > NOW()
    AND NOT EXISTS (
      SELECT 1 FROM revoked_sessions r WHERE r.session_id = s.id
    )
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Invalid, expired, or revoked session token';
  END IF;

  SELECT secret INTO v_secret FROM _patchbay_security_context WHERE key = 'tenant_context_key';
  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'Security context key is not initialized';
  END IF;

  v_sig := encode(hmac(v_tenant_id || ':' || txid_current()::text, v_secret, 'sha256'), 'hex');

  PERFORM set_config('patchbay.trusted_tenant_id', v_tenant_id, true);
  PERFORM set_config('patchbay.trusted_user_id', v_user_id, true);
  PERFORM set_config('patchbay.trusted_context_sig', v_sig, true);

  RETURN v_tenant_id;
END;
$$;

-- Sets trusted admin context using server-generated HMAC token
CREATE OR REPLACE FUNCTION patchbay_set_admin_context(p_admin_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_secret TEXT;
  v_expected_token TEXT;
  v_sig TEXT;
BEGIN
  SELECT secret INTO v_secret FROM _patchbay_security_context WHERE key = 'tenant_context_key';
  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'Security context key is not initialized';
  END IF;

  v_expected_token := encode(hmac('admin:trusted_server_operation', v_secret, 'sha256'), 'hex');
  IF p_admin_token IS NULL OR p_admin_token <> v_expected_token THEN
    RAISE EXCEPTION 'Unauthorized: Invalid admin authorization token';
  END IF;

  v_sig := encode(hmac('admin:' || txid_current()::text, v_secret, 'sha256'), 'hex');

  PERFORM set_config('patchbay.trusted_admin', 'true', true);
  PERFORM set_config('patchbay.trusted_admin_sig', v_sig, true);
END;
$$;

-- Evaluates whether the current transaction has cryptographically verified admin privileges
CREATE OR REPLACE FUNCTION patchbay_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_admin TEXT;
  v_sig TEXT;
  v_secret TEXT;
BEGIN
  v_admin := current_setting('patchbay.trusted_admin', true);
  IF v_admin IS NULL OR v_admin <> 'true' THEN
    RETURN false;
  END IF;

  v_sig := NULLIF(current_setting('patchbay.trusted_admin_sig', true), '');
  IF v_sig IS NULL THEN
    RETURN false;
  END IF;

  SELECT secret INTO v_secret FROM _patchbay_security_context WHERE key = 'tenant_context_key';
  IF v_secret IS NULL THEN
    RETURN false;
  END IF;

  IF v_sig = encode(hmac('admin:' || txid_current()::text, v_secret, 'sha256'), 'hex') THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Evaluates the cryptographically verified tenant ID for the current transaction
CREATE OR REPLACE FUNCTION patchbay_current_tenant_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_tenant TEXT;
  v_sig TEXT;
  v_secret TEXT;
BEGIN
  v_tenant := NULLIF(current_setting('patchbay.trusted_tenant_id', true), '');
  IF v_tenant IS NULL THEN
    RETURN NULL;
  END IF;

  v_sig := NULLIF(current_setting('patchbay.trusted_context_sig', true), '');
  IF v_sig IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT secret INTO v_secret FROM _patchbay_security_context WHERE key = 'tenant_context_key';
  IF v_secret IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_sig = encode(hmac(v_tenant || ':' || txid_current()::text, v_secret, 'sha256'), 'hex') THEN
    RETURN v_tenant;
  END IF;

  RETURN NULL;
END;
$$;

-- 3. Execution Permissions on Helper Functions
REVOKE EXECUTE ON FUNCTION patchbay_set_tenant_context(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION patchbay_set_session_context(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION patchbay_set_admin_context(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION patchbay_is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION patchbay_current_tenant_id() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'patchbay_app') THEN
    GRANT EXECUTE ON FUNCTION patchbay_set_tenant_context(TEXT, TEXT) TO patchbay_app;
    GRANT EXECUTE ON FUNCTION patchbay_set_session_context(TEXT) TO patchbay_app;
    GRANT EXECUTE ON FUNCTION patchbay_set_admin_context(TEXT) TO patchbay_app;
    GRANT EXECUTE ON FUNCTION patchbay_is_admin() TO patchbay_app;
    GRANT EXECUTE ON FUNCTION patchbay_current_tenant_id() TO patchbay_app;
  END IF;
END
$$;

-- 4. Re-create All RLS Policies using Hardened Verification Functions

-- TENANTS
DROP POLICY IF EXISTS tenants_isolation ON tenants;
CREATE POLICY tenants_isolation ON tenants
  FOR ALL
  USING (
    patchbay_is_admin()
    OR id = patchbay_current_tenant_id()
  )
  WITH CHECK (
    patchbay_is_admin()
    OR id = patchbay_current_tenant_id()
  );

-- USERS
DROP POLICY IF EXISTS users_tenant_isolation ON users;
CREATE POLICY users_tenant_isolation ON users
  FOR ALL
  USING (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  )
  WITH CHECK (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  );

-- SESSIONS
DROP POLICY IF EXISTS sessions_tenant_isolation ON sessions;
CREATE POLICY sessions_tenant_isolation ON sessions
  FOR ALL
  USING (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  )
  WITH CHECK (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  );

-- INSTALLATIONS
DROP POLICY IF EXISTS installations_tenant_isolation ON installations;
CREATE POLICY installations_tenant_isolation ON installations
  FOR ALL
  USING (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  )
  WITH CHECK (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  );

-- REPOSITORIES
DROP POLICY IF EXISTS repositories_tenant_isolation ON repositories;
CREATE POLICY repositories_tenant_isolation ON repositories
  FOR ALL
  USING (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  )
  WITH CHECK (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  );

-- JOBS
DROP POLICY IF EXISTS jobs_tenant_isolation ON jobs;
CREATE POLICY jobs_tenant_isolation ON jobs
  FOR ALL
  USING (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  )
  WITH CHECK (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  );

-- FINDINGS
DROP POLICY IF EXISTS findings_tenant_isolation ON findings;
CREATE POLICY findings_tenant_isolation ON findings
  FOR ALL
  USING (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  )
  WITH CHECK (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  );

-- PATCHES
DROP POLICY IF EXISTS patches_tenant_isolation ON patches;
CREATE POLICY patches_tenant_isolation ON patches
  FOR ALL
  USING (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  )
  WITH CHECK (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  );

-- VALIDATIONS
DROP POLICY IF EXISTS validations_tenant_isolation ON validations;
CREATE POLICY validations_tenant_isolation ON validations
  FOR ALL
  USING (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  )
  WITH CHECK (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  );

-- APPROVALS
DROP POLICY IF EXISTS approvals_tenant_isolation ON approvals;
CREATE POLICY approvals_tenant_isolation ON approvals
  FOR ALL
  USING (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  )
  WITH CHECK (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  );

-- PULL_REQUESTS
DROP POLICY IF EXISTS pull_requests_tenant_isolation ON pull_requests;
CREATE POLICY pull_requests_tenant_isolation ON pull_requests
  FOR ALL
  USING (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  )
  WITH CHECK (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  );

-- ONBOARDING_STATES
DROP POLICY IF EXISTS onboarding_states_tenant_isolation ON onboarding_states;
CREATE POLICY onboarding_states_tenant_isolation ON onboarding_states
  FOR ALL
  USING (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  )
  WITH CHECK (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  );

-- DELIVERY_CLAIMS
DROP POLICY IF EXISTS delivery_claims_tenant_isolation ON delivery_claims;
CREATE POLICY delivery_claims_tenant_isolation ON delivery_claims
  FOR ALL
  USING (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  )
  WITH CHECK (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  );

-- WATCH_TARGETS
DROP POLICY IF EXISTS watch_targets_tenant_isolation ON watch_targets;
CREATE POLICY watch_targets_tenant_isolation ON watch_targets
  FOR ALL
  USING (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  )
  WITH CHECK (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  );

-- TENANT_DELIVERY_LOCKS
DROP POLICY IF EXISTS tenant_delivery_locks_isolation ON tenant_delivery_locks;
CREATE POLICY tenant_delivery_locks_isolation ON tenant_delivery_locks
  FOR ALL
  USING (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  )
  WITH CHECK (
    patchbay_is_admin()
    OR tenant_id = patchbay_current_tenant_id()
  );

-- Final safety lockdown: re-assert that the secret table is inaccessible
-- to the application role regardless of any GRANT ALL ON ALL TABLES that
-- may have been issued for schema setup or test scaffolding.
REVOKE ALL ON _patchbay_security_context FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'patchbay_app') THEN
    REVOKE ALL ON _patchbay_security_context FROM patchbay_app;
  END IF;
END
$$;
