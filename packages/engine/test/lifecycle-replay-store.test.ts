import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { Pool } from 'pg';

const { assertDisposableLocalDatabase } = createRequire(__filename)(
  '../../../scripts/hosted-db-guard.js',
) as { assertDisposableLocalDatabase: (value: string) => string };
import { runMigrations } from '../src/db/migration-runner';
import { WorkerExecutionService } from '../src/sandbox/worker-service';
import {
  createJobSignature,
  ExecutionJob,
} from '../src/sandbox/execution-provider';
import {
  LIFECYCLE_CAPABILITY_HEADER,
  createLifecycleCapability,
} from '../src/sandbox/lifecycle-capability';
import {
  MemoryLifecycleReplayStore,
  PostgresLifecycleReplayStore,
  LifecycleReplayStoreUnavailableError,
  type ILifecycleReplayStore,
  type LifecycleReplayRecord,
} from '../src/sandbox/lifecycle-replay-store';

const secret = 'worker-test-signing-secret-key-32b';
const token = 'worker-bearer-token-123';

function record(overrides?: Partial<LifecycleReplayRecord>): LifecycleReplayRecord {
  return {
    jti: crypto.randomBytes(16).toString('hex'),
    tenantId: 'tenant_replay_a',
    jobId: 'job_replay_1',
    op: 'cancel',
    exp: Date.now() + 60_000,
    ...overrides,
  };
}

describe('Durable lifecycle replay store', () => {
  it('consumes a mutating jti once and treats repeats as replay', async () => {
    const store = new MemoryLifecycleReplayStore();
    const rec = record();
    expect(await store.consumeMutatingJti(rec)).toBe('consumed');
    expect(await store.consumeMutatingJti(rec)).toBe('replay');
    expect(await store.consumeMutatingJti({ ...rec, op: 'cleanup' })).toBe('replay');
  });

  it('allows only one concurrent consume of the same jti', async () => {
    const store = new MemoryLifecycleReplayStore(25);
    const rec = record();
    const results = await Promise.all([
      store.consumeMutatingJti(rec),
      store.consumeMutatingJti(rec),
      store.consumeMutatingJti(rec),
    ]);
    expect(results.filter((r) => r === 'consumed')).toHaveLength(1);
    expect(results.filter((r) => r === 'replay')).toHaveLength(2);
  });

  it('shares consume state across worker instances', async () => {
    const shared = new MemoryLifecycleReplayStore();
    const workerA = new WorkerExecutionService({
      signingSecret: secret,
      authToken: token,
      replayStore: shared,
    });
    const workerB = new WorkerExecutionService({
      signingSecret: secret,
      authToken: token,
      replayStore: shared,
    });
    const portA = await workerA.start(0);
    const portB = await workerB.start(0);
    try {
      const unsigned: Omit<ExecutionJob, 'signature'> = {
        jobId: `job_xinst_${crypto.randomBytes(4).toString('hex')}`,
        tenantId: 'tenant_replay_a',
        repoId: 'r',
        repoFullName: 'o/r',
        sourceLocation: 'fixtures/sample-repo',
        changeId: 'c',
        commands: [
          {
            executable: process.platform === 'win32' ? 'cmd.exe' : 'echo',
            args: process.platform === 'win32' ? ['/c', 'echo x'] : ['x'],
          },
        ],
        nonce: crypto.randomBytes(16).toString('hex'),
        expiresAt: Date.now() + 60_000,
      };
      const job: ExecutionJob = { ...unsigned, signature: createJobSignature(unsigned, secret) };
      const submit = await fetch(`http://127.0.0.1:${portA}/v1/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(job),
      });
      expect((await submit.json()).status).toBe('completed');

      const jti = crypto.randomBytes(16).toString('hex');
      const cap = createLifecycleCapability(
        { tenantId: job.tenantId, jobId: job.jobId, op: 'cancel', jti },
        secret,
      );
      const headers = {
        Authorization: `Bearer ${token}`,
        [LIFECYCLE_CAPABILITY_HEADER]: cap,
      };
      const first = await fetch(`http://127.0.0.1:${portA}/v1/jobs/${job.jobId}/cancel`, {
        method: 'POST',
        headers,
      });
      expect(first.status).toBe(200);
      const second = await fetch(`http://127.0.0.1:${portB}/v1/jobs/${job.jobId}/cancel`, {
        method: 'POST',
        headers,
      });
      expect(second.status).toBe(403);
      expect((await second.json()).reason).toBe('replay');
    } finally {
      await workerA.stop();
      await workerB.stop();
    }
  }, 25000);

  it('rejects mutating ops when the replay store fails', async () => {
    const failing: ILifecycleReplayStore = {
      async consumeMutatingJti() {
        throw new LifecycleReplayStoreUnavailableError('simulated db failure');
      },
    };
    const worker = new WorkerExecutionService({
      signingSecret: secret,
      authToken: token,
      replayStore: failing,
    });
    const port = await worker.start(0);
    try {
      const unsigned: Omit<ExecutionJob, 'signature'> = {
        jobId: `job_dbfail_${crypto.randomBytes(4).toString('hex')}`,
        tenantId: 'tenant_replay_a',
        repoId: 'r',
        repoFullName: 'o/r',
        sourceLocation: 'fixtures/sample-repo',
        changeId: 'c',
        commands: [
          {
            executable: process.platform === 'win32' ? 'cmd.exe' : 'echo',
            args: process.platform === 'win32' ? ['/c', 'echo f'] : ['f'],
          },
        ],
        nonce: crypto.randomBytes(16).toString('hex'),
        expiresAt: Date.now() + 60_000,
      };
      const job: ExecutionJob = { ...unsigned, signature: createJobSignature(unsigned, secret) };
      await fetch(`http://127.0.0.1:${port}/v1/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(job),
      });
      const res = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          [LIFECYCLE_CAPABILITY_HEADER]: createLifecycleCapability(
            { tenantId: job.tenantId, jobId: job.jobId, op: 'cancel' },
            secret,
          ),
        },
      });
      expect(res.status).toBe(403);
      expect((await res.json()).reason).toBe('replay_unavailable');
      const status = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          [LIFECYCLE_CAPABILITY_HEADER]: createLifecycleCapability(
            { tenantId: job.tenantId, jobId: job.jobId, op: 'status' },
            secret,
          ),
        },
      });
      expect(status.status).toBe(200);
      expect((await status.json()).status).not.toBe('cancelled');
    } finally {
      await worker.stop();
    }
  }, 25000);

  it('allows only one concurrent HTTP cancel of the same jti', async () => {
    const store = new MemoryLifecycleReplayStore(20);
    const worker = new WorkerExecutionService({
      signingSecret: secret,
      authToken: token,
      replayStore: store,
    });
    const port = await worker.start(0);
    try {
      const unsigned: Omit<ExecutionJob, 'signature'> = {
        jobId: `job_conc_${crypto.randomBytes(4).toString('hex')}`,
        tenantId: 'tenant_replay_a',
        repoId: 'r',
        repoFullName: 'o/r',
        sourceLocation: 'fixtures/sample-repo',
        changeId: 'c',
        commands: [
          {
            executable: process.platform === 'win32' ? 'cmd.exe' : 'echo',
            args: process.platform === 'win32' ? ['/c', 'echo c'] : ['c'],
          },
        ],
        nonce: crypto.randomBytes(16).toString('hex'),
        expiresAt: Date.now() + 60_000,
      };
      const job: ExecutionJob = { ...unsigned, signature: createJobSignature(unsigned, secret) };
      await fetch(`http://127.0.0.1:${port}/v1/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(job),
      });
      const jti = crypto.randomBytes(16).toString('hex');
      const headers = {
        Authorization: `Bearer ${token}`,
        [LIFECYCLE_CAPABILITY_HEADER]: createLifecycleCapability(
          { tenantId: job.tenantId, jobId: job.jobId, op: 'cancel', jti },
          secret,
        ),
      };
      const responses = await Promise.all([
        fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}/cancel`, { method: 'POST', headers }),
        fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}/cancel`, { method: 'POST', headers }),
      ]);
      const statuses = responses.map((r) => r.status).sort();
      expect(statuses).toEqual([200, 403]);
      const denied = responses.find((r) => r.status === 403)!;
      expect((await denied.json()).reason).toBe('replay');
    } finally {
      await worker.stop();
    }
  }, 25000);

  it('fails closed constructing a worker without a replay store', () => {
    expect(
      () =>
        new WorkerExecutionService({
          signingSecret: secret,
          authToken: token,
        } as never),
    ).toThrow(/durable lifecycle replay store/i);
  });

  it('does not consume an expired capability even if the store would accept it', async () => {
    const store = new MemoryLifecycleReplayStore();
    const worker = new WorkerExecutionService({
      signingSecret: secret,
      authToken: token,
      replayStore: store,
    });
    const port = await worker.start(0);
    try {
      const jobId = `job_expstore_${crypto.randomBytes(4).toString('hex')}`;
      const tenantId = 'tenant_replay_a';
      const unsigned: Omit<ExecutionJob, 'signature'> = {
        jobId,
        tenantId,
        repoId: 'r',
        repoFullName: 'o/r',
        sourceLocation: 'fixtures/sample-repo',
        changeId: 'c',
        commands: [
          {
            executable: process.platform === 'win32' ? 'cmd.exe' : 'echo',
            args: process.platform === 'win32' ? ['/c', 'echo e'] : ['e'],
          },
        ],
        nonce: crypto.randomBytes(16).toString('hex'),
        expiresAt: Date.now() + 60_000,
      };
      const job: ExecutionJob = { ...unsigned, signature: createJobSignature(unsigned, secret) };
      await fetch(`http://127.0.0.1:${port}/v1/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(job),
      });
      const claims = {
        v: 1 as const,
        iss: 'trypatchbay-control-plane',
        aud: 'trypatchbay-worker',
        tenantId,
        jobId,
        op: 'cancel',
        exp: Date.now() - 5_000,
        jti: crypto.randomBytes(16).toString('hex'),
      };
      const encoded = Buffer.from(JSON.stringify(claims)).toString('base64url');
      const mac = crypto.createHmac('sha256', secret).update(encoded, 'utf8').digest('base64url');
      const res = await fetch(`http://127.0.0.1:${port}/v1/jobs/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          [LIFECYCLE_CAPABILITY_HEADER]: `pvcap1.${encoded}.${mac}`,
        },
      });
      expect(res.status).toBe(403);
      expect((await res.json()).reason).toBe('expired');
      await expect(store.consumeMutatingJti({ ...claims, op: 'cancel' })).rejects.toBeInstanceOf(
        LifecycleReplayStoreUnavailableError,
      );
    } finally {
      await worker.stop();
    }
  }, 25000);

  it('keeps 002 migration DDL aligned with schema.sql', () => {
    const migration = fs.readFileSync(
      path.join(__dirname, '../src/db/migrations/002_lifecycle_capability_replay.sql'),
      'utf8',
    );
    const schema = fs.readFileSync(path.join(__dirname, '../src/db/schema.sql'), 'utf8');
    const table =
      /CREATE TABLE IF NOT EXISTS lifecycle_capability_replays \([\s\S]*?\);/;
    const index =
      /CREATE INDEX IF NOT EXISTS idx_lifecycle_capability_replays_expires_at_ms\s+ON lifecycle_capability_replays \(expires_at_ms\);/;
    const migTable = migration.match(table)?.[0];
    const schemaTable = schema.match(table)?.[0];
    expect(migTable).toBeDefined();
    expect(schemaTable).toBe(migTable);
    expect(migration.match(index)?.[0]).toBe(schema.match(index)?.[0]);
  });
});

const connectionString = assertDisposableLocalDatabase(
  process.env.DATABASE_URL || process.env.POSTGRES_URL || '',
);
const describeLive = connectionString ? describe : describe.skip;

function poolForSchema(schemaName: string): Pool {
  return new Pool({
    connectionString,
    options: `-c search_path=${schemaName}`,
    max: 8,
    connectionTimeoutMillis: 5_000,
  });
}

describeLive('PostgreSQL lifecycle replay (live)', () => {
  let admin: Pool;
  let schema: string;
  let poolA: Pool;
  let poolB: Pool;
  let storeA: PostgresLifecycleReplayStore;
  let storeB: PostgresLifecycleReplayStore;

  beforeAll(async () => {
    if (!connectionString) return;
    admin = new Pool({ connectionString });
    schema = `lifecycle_replay_${crypto.randomBytes(4).toString('hex')}`;
    await admin.query(`CREATE SCHEMA ${schema}`);
    poolA = poolForSchema(schema);
    poolB = poolForSchema(schema);
    const bootstrap = await poolA.connect();
    try {
      await bootstrap.query(`
        CREATE TABLE lifecycle_capability_replays (
          jti VARCHAR(128) PRIMARY KEY,
          tenant_id VARCHAR(128) NOT NULL,
          job_id VARCHAR(128) NOT NULL,
          op VARCHAR(32) NOT NULL,
          expires_at_ms BIGINT NOT NULL,
          consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT lifecycle_capability_replays_op_check CHECK (op IN ('cancel', 'cleanup'))
        )
      `);
    } finally {
      bootstrap.release();
    }
    storeA = new PostgresLifecycleReplayStore({ pool: poolA });
    storeB = new PostgresLifecycleReplayStore({ pool: poolB });
  });

  afterAll(async () => {
    if (poolA) await poolA.end();
    if (poolB) await poolB.end();
    if (admin && schema) {
      await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await admin.end();
    }
  });

  it('persists tenant, job, op, and expiry and rejects duplicates', async () => {
    const rec = record({ op: 'cleanup', exp: Date.now() + 45_000 });
    expect(await storeA.consumeMutatingJti(rec)).toBe('consumed');
    const rows = await poolB.query<{
      tenant_id: string;
      job_id: string;
      op: string;
      expires_at_ms: string;
    }>(
      `SELECT tenant_id, job_id, op, expires_at_ms FROM lifecycle_capability_replays WHERE jti = $1`,
      [rec.jti],
    );
    expect(rows.rowCount).toBe(1);
    expect(rows.rows[0].tenant_id).toBe(rec.tenantId);
    expect(rows.rows[0].job_id).toBe(rec.jobId);
    expect(rows.rows[0].op).toBe('cleanup');
    expect(Number(rows.rows[0].expires_at_ms)).toBe(rec.exp);
    expect(await storeB.consumeMutatingJti(rec)).toBe('replay');
    expect(await storeA.consumeMutatingJti({ ...rec, tenantId: 'tenant_other' })).toBe('replay');
  });

  it('lets only one concurrent INSERT win across two independent connections', async () => {
    const rec = record();
    const results = await Promise.all([
      storeA.consumeMutatingJti(rec),
      storeB.consumeMutatingJti(rec),
      storeA.consumeMutatingJti(rec),
      storeB.consumeMutatingJti(rec),
    ]);
    expect(results.filter((r) => r === 'consumed')).toHaveLength(1);
    expect(results.filter((r) => r === 'replay')).toHaveLength(3);
    const count = await poolA.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM lifecycle_capability_replays WHERE jti = $1`,
      [rec.jti],
    );
    expect(count.rows[0].n).toBe('1');
  });

  it('rejects expired records without inserting a row', async () => {
    const rec = record({ exp: Date.now() - 1_000 });
    await expect(storeA.consumeMutatingJti(rec)).rejects.toBeInstanceOf(
      LifecycleReplayStoreUnavailableError,
    );
    const rows = await poolB.query(`SELECT 1 FROM lifecycle_capability_replays WHERE jti = $1`, [rec.jti]);
    expect(rows.rowCount).toBe(0);
  });

  it('fails closed on connection outage and does not cancel the job', async () => {
    const dead = new PostgresLifecycleReplayStore({
      connectionString: 'postgres://127.0.0.1:1/does_not_exist',
      poolConfig: { connectionTimeoutMillis: 400, idleTimeoutMillis: 400 },
    });
    await expect(dead.consumeMutatingJti(record())).rejects.toBeInstanceOf(
      LifecycleReplayStoreUnavailableError,
    );

    const worker = new WorkerExecutionService({
      signingSecret: secret,
      authToken: token,
      replayStore: dead,
    });
    const port = await worker.start(0);
    try {
      const unsigned: Omit<ExecutionJob, 'signature'> = {
        jobId: `job_pgfail_${crypto.randomBytes(4).toString('hex')}`,
        tenantId: 'tenant_replay_a',
        repoId: 'r',
        repoFullName: 'o/r',
        sourceLocation: 'fixtures/sample-repo',
        changeId: 'c',
        commands: [
          {
            executable: process.platform === 'win32' ? 'cmd.exe' : 'echo',
            args: process.platform === 'win32' ? ['/c', 'echo p'] : ['p'],
          },
        ],
        nonce: crypto.randomBytes(16).toString('hex'),
        expiresAt: Date.now() + 60_000,
      };
      const job: ExecutionJob = { ...unsigned, signature: createJobSignature(unsigned, secret) };
      await fetch(`http://127.0.0.1:${port}/v1/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(job),
      });
      const cancel = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          [LIFECYCLE_CAPABILITY_HEADER]: createLifecycleCapability(
            { tenantId: job.tenantId, jobId: job.jobId, op: 'cancel' },
            secret,
          ),
        },
      });
      expect(cancel.status).toBe(403);
      expect((await cancel.json()).reason).toBe('replay_unavailable');
      const status = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          [LIFECYCLE_CAPABILITY_HEADER]: createLifecycleCapability(
            { tenantId: job.tenantId, jobId: job.jobId, op: 'status' },
            secret,
          ),
        },
      });
      expect(status.status).toBe(200);
      expect((await status.json()).status).not.toBe('cancelled');
    } finally {
      await worker.stop();
      await dead.close();
    }
  }, 25000);

  it('consumes once across two worker instances with independent pools', async () => {
    const workerA = new WorkerExecutionService({
      signingSecret: secret,
      authToken: token,
      replayStore: storeA,
    });
    const workerB = new WorkerExecutionService({
      signingSecret: secret,
      authToken: token,
      replayStore: storeB,
    });
    const portA = await workerA.start(0);
    const portB = await workerB.start(0);
    try {
      const unsigned: Omit<ExecutionJob, 'signature'> = {
        jobId: `job_two_pg_${crypto.randomBytes(4).toString('hex')}`,
        tenantId: 'tenant_replay_a',
        repoId: 'r',
        repoFullName: 'o/r',
        sourceLocation: 'fixtures/sample-repo',
        changeId: 'c',
        commands: [
          {
            executable: process.platform === 'win32' ? 'cmd.exe' : 'echo',
            args: process.platform === 'win32' ? ['/c', 'echo t'] : ['t'],
          },
        ],
        nonce: crypto.randomBytes(16).toString('hex'),
        expiresAt: Date.now() + 60_000,
      };
      const job: ExecutionJob = { ...unsigned, signature: createJobSignature(unsigned, secret) };
      const submitA = await fetch(`http://127.0.0.1:${portA}/v1/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(job),
      });
      expect((await submitA.json()).status).toBe('completed');
      const unsignedB = {
        ...unsigned,
        nonce: crypto.randomBytes(16).toString('hex'),
      };
      const jobB: ExecutionJob = { ...unsignedB, signature: createJobSignature(unsignedB, secret) };
      const submitB = await fetch(`http://127.0.0.1:${portB}/v1/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(jobB),
      });
      expect((await submitB.json()).status).toBe('completed');
      const jti = crypto.randomBytes(16).toString('hex');
      const headers = {
        Authorization: `Bearer ${token}`,
        [LIFECYCLE_CAPABILITY_HEADER]: createLifecycleCapability(
          { tenantId: job.tenantId, jobId: job.jobId, op: 'cancel', jti },
          secret,
        ),
      };
      const responses = await Promise.all([
        fetch(`http://127.0.0.1:${portA}/v1/jobs/${job.jobId}/cancel`, { method: 'POST', headers }),
        fetch(`http://127.0.0.1:${portB}/v1/jobs/${job.jobId}/cancel`, { method: 'POST', headers }),
      ]);
      const statuses = responses.map((r) => r.status).sort();
      expect(statuses[0]).toBe(200);
      expect(statuses[1]).toBe(403);
      const denied = responses.find((r) => r.status === 403)!;
      expect((await denied.json()).reason).toBe('replay');
    } finally {
      await workerA.stop();
      await workerB.stop();
    }
  }, 25000);

  it('fails closed when the replay table is missing', async () => {
    const missingSchema = `lifecycle_missing_${crypto.randomBytes(4).toString('hex')}`;
    await admin.query(`CREATE SCHEMA ${missingSchema}`);
    const missingPool = poolForSchema(missingSchema);
    const missingStore = new PostgresLifecycleReplayStore({ pool: missingPool });
    await expect(missingStore.consumeMutatingJti(record())).rejects.toBeInstanceOf(
      LifecycleReplayStoreUnavailableError,
    );
    await missingPool.end();
    await admin.query(`DROP SCHEMA IF EXISTS ${missingSchema} CASCADE`);
  });
});

describeLive('PostgreSQL lifecycle replay migrations (live)', () => {
  it('applies 001+002 on a clean schema and is idempotent', async () => {
    const schemaName = `lifecycle_mig_clean_${crypto.randomBytes(4).toString('hex')}`;
    const adminPool = new Pool({ connectionString });
    await adminPool.query(`CREATE SCHEMA ${schemaName}`);
    const pool = poolForSchema(schemaName);
    try {
      const first = await runMigrations(pool);
      expect(first.success).toBe(true);
      expect(first.applied).toEqual(expect.arrayContaining(['001', '002']));
      expect(first.currentVersion).toBe('002');
      const tables = await pool.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = $1 AND table_name = 'lifecycle_capability_replays'`,
        [schemaName],
      );
      expect(tables.rowCount).toBe(1);
      const second = await runMigrations(pool);
      expect(second.applied).toHaveLength(0);
      expect(second.alreadyApplied).toEqual(expect.arrayContaining(['001', '002']));
      expect(second.currentVersion).toBe('002');
    } finally {
      await pool.end();
      await adminPool.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
      await adminPool.end();
    }
  });

  it('applies 002 onto an existing 001 schema', async () => {
    const schemaName = `lifecycle_mig_exist_${crypto.randomBytes(4).toString('hex')}`;
    const adminPool = new Pool({ connectionString });
    await adminPool.query(`CREATE SCHEMA ${schemaName}`);
    const pool = poolForSchema(schemaName);
    try {
      const initialSql = fs.readFileSync(
        path.join(__dirname, '../src/db/migrations/001_initial_schema.sql'),
        'utf8',
      );
      await pool.query(initialSql);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(64) PRIMARY KEY,
          name TEXT NOT NULL,
          checksum VARCHAR(64) NOT NULL,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      const checksum = crypto.createHash('sha256').update(initialSql).digest('hex');
      await pool.query(
        `INSERT INTO schema_migrations (version, name, checksum) VALUES ('001', 'initial_schema', $1)`,
        [checksum],
      );
      const before = await pool.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = $1 AND table_name = 'lifecycle_capability_replays'`,
        [schemaName],
      );
      expect(before.rowCount).toBe(0);
      const report = await runMigrations(pool);
      expect(report.alreadyApplied).toContain('001');
      expect(report.applied).toEqual(['002']);
      expect(report.currentVersion).toBe('002');
      const after = await pool.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = $1 AND table_name = 'lifecycle_capability_replays'`,
        [schemaName],
      );
      expect(after.rowCount).toBe(1);
    } finally {
      await pool.end();
      await adminPool.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
      await adminPool.end();
    }
  });
});

