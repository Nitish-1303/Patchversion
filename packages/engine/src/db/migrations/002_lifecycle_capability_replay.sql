-- Durable, unique mutating lifecycle-capability replay records.
-- No FK to tenants: execution-worker tenant ids are capability claims,
-- not necessarily rows in the control-plane tenant table.
-- Do not apply this to production from this increment; operators apply via db:migrate.

CREATE TABLE IF NOT EXISTS lifecycle_capability_replays (
  jti VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL,
  job_id VARCHAR(128) NOT NULL,
  op VARCHAR(32) NOT NULL,
  expires_at_ms BIGINT NOT NULL,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lifecycle_capability_replays_op_check CHECK (op IN ('cancel', 'cleanup'))
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_capability_replays_expires_at_ms
  ON lifecycle_capability_replays (expires_at_ms);
