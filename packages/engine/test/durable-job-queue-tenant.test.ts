/**
 * Tenant ownership for durable JobRecord queue (claim/complete/fail).
 * Execution-job HTTP lifecycle is a different system and is not changed here.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import { Pool } from 'pg';

const { assertDisposableLocalDatabase } = createRequire(__filename)(
  '../../../scripts/hosted-db-guard.js',
) as { assertDisposableLocalDatabase: (value: string) => string };
import { PatchversionDatabase } from '../src/db/database';
import { PostgresStore } from '../src/db/postgres-store';
import type { JobRecord } from '@patchversion/shared';

type JobMapHolder = { data: { jobs: Record<string, JobRecord> } };

function seedFileRepo(db: PatchversionDatabase, tenantName: string, githubRepoId: number) {
  const tenant = db.createTenant(tenantName);
  const inst = db.saveInstallation(tenant.id, githubRepoId, tenantName.toLowerCase());
  const repo = db.saveRepository(tenant.id, inst.id, {
    githubRepoId,
    fullName: `${tenantName.toLowerCase()}/core`,
    owner: tenantName.toLowerCase(),
    name: 'core',
    defaultBranch: 'main',
    isPrivate: false,
  });
  return { tenant, repo };
}

describe('durable job queue tenant ownership (file store)', () => {
  let tmpDir: string;
  let db: PatchversionDatabase;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-job-tenant-'));
    db = new PatchversionDatabase(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('missing and malformed tenant cannot claim, complete, or fail', () => {
    const { tenant, repo } = seedFileRepo(db, 'Acme', 5001);
    const job = db.createJob(tenant.id, repo.id, 'scan_dependencies', { depth: 'direct' });

    expect(db.claimNextJob('', 'worker_1')).toBeNull();
    expect(db.claimNextJob('   ', 'worker_1')).toBeNull();
    expect(db.claimNextJob('../evil', 'worker_1')).toBeNull();
    expect(db.getJob(tenant.id, job.id)?.status).toBe('queued');

    expect(() => db.completeJob('', job.id, { ok: true })).toThrow(/not found/);
    expect(() => db.completeJob('../evil', job.id, { ok: true })).toThrow(/not found/);
    expect(() => db.failJob('', job.id, 'nope')).toThrow(/not found/);
    expect(db.getJob(tenant.id, job.id)?.status).toBe('queued');
  });

  test('cross-tenant claim/complete/fail cannot mutate another tenant job', () => {
    const a = seedFileRepo(db, 'Alpha', 6101);
    const b = seedFileRepo(db, 'Bravo', 6102);
    const jobA = db.createJob(a.tenant.id, a.repo.id, 'scan_dependencies', { k: 'a' });
    const jobB = db.createJob(b.tenant.id, b.repo.id, 'scan_dependencies', { k: 'b' });

    expect(db.claimNextJob(a.tenant.id, 'worker_a')?.id).toBe(jobA.id);
    expect(db.getJob(b.tenant.id, jobB.id)?.status).toBe('queued');
    expect(db.claimNextJob(a.tenant.id, 'worker_a')).toBeNull();

    expect(() => db.completeJob(b.tenant.id, jobA.id, { stolen: true })).toThrow(/not found/);
    expect(() => db.failJob(b.tenant.id, jobA.id, 'stolen')).toThrow(/not found/);
    expect(db.getJob(a.tenant.id, jobA.id)?.status).toBe('running');
    expect(db.getJob(a.tenant.id, jobA.id)?.result).toBeUndefined();

    db.completeJob(a.tenant.id, jobA.id, { ok: true });
    expect(db.getJob(a.tenant.id, jobA.id)?.status).toBe('completed');

    const claimedB = db.claimNextJob(b.tenant.id, 'worker_b');
    expect(claimedB?.id).toBe(jobB.id);
  });

  test('valid owner can claim, complete, retry, and fail; repeats are idempotent for complete', () => {
    const { tenant, repo } = seedFileRepo(db, 'Acme', 7001);
    const job = db.createJob(tenant.id, repo.id, 'scan_dependencies', { depth: 'direct' });

    const claimed = db.claimNextJob(tenant.id, 'worker_1');
    expect(claimed?.status).toBe('running');
    expect(claimed?.attempts).toBe(1);

    db.failJob(tenant.id, job.id, 'GitHub API 503 rate limit', true, 0);
    expect(db.getJob(tenant.id, job.id)?.status).toBe('queued');

    db.claimNextJob(tenant.id, 'worker_1');
    db.completeJob(tenant.id, job.id, { findingsCount: 0 });
    db.completeJob(tenant.id, job.id, { findingsCount: 0, repeated: true });
    const done = db.getJob(tenant.id, job.id);
    expect(done?.status).toBe('completed');
    expect((done?.result as { repeated?: boolean }).repeated).toBe(true);
  });

  test('expired lease for this tenant is recovered; other tenant leases are not touched', () => {
    const a = seedFileRepo(db, 'Alpha', 8101);
    const b = seedFileRepo(db, 'Bravo', 8102);
    const jobA = db.createJob(a.tenant.id, a.repo.id, 'scan_dependencies', { k: 'a' });
    const jobB = db.createJob(b.tenant.id, b.repo.id, 'scan_dependencies', { k: 'b' });

    expect(db.claimNextJob(a.tenant.id, 'worker_a')?.id).toBe(jobA.id);
    expect(db.claimNextJob(b.tenant.id, 'worker_b')?.id).toBe(jobB.id);

    const jobs = (db as unknown as JobMapHolder).data.jobs;
    const stale = new Date(Date.now() - 601_000).toISOString();
    jobs[jobA.id].lockedAt = stale;
    jobs[jobB.id].lockedAt = stale;

    expect(db.claimNextJob(a.tenant.id, 'worker_a')).toBeNull();
    expect(db.getJob(a.tenant.id, jobA.id)?.status).toBe('queued');
    expect(db.getJob(b.tenant.id, jobB.id)?.status).toBe('running');

    const reclaimed = db.claimNextJob(a.tenant.id, 'worker_a');
    expect(reclaimed?.id).toBe(jobA.id);
    expect(reclaimed?.attempts).toBe(2);
    expect(db.getJob(b.tenant.id, jobB.id)?.status).toBe('running');
  });
});

const connectionString = assertDisposableLocalDatabase(
  process.env.DATABASE_URL || process.env.POSTGRES_URL || '',
);
const describePg = connectionString ? describe : describe.skip;

describePg('durable job queue tenant ownership (postgres)', () => {
  let pool: Pool;
  let testSchema: string;
  let store: PostgresStore;

  beforeAll(async () => {
    pool = new Pool({ connectionString });
    const schemaSuffix = crypto.randomBytes(4).toString('hex');
    testSchema = `patchbay_job_tenant_${schemaSuffix}`;
    pool.on('connect', (client) => {
      client.query(`SET search_path TO ${testSchema}, public;`);
    });
    const client = await pool.connect();
    try {
      await client.query(`CREATE SCHEMA ${testSchema};`);
      await client.query(`SET search_path TO ${testSchema}, public;`);
    } finally {
      client.release();
    }
    store = new PostgresStore({ pool, schema: testSchema });
    await store.runMigrations();
  });

  afterAll(async () => {
    if (!pool || !testSchema) return;
    const client = await pool.connect();
    try {
      await client.query(`DROP SCHEMA IF EXISTS ${testSchema} CASCADE;`);
    } finally {
      client.release();
      await pool.end();
    }
  });

  async function seedPg(name: string, githubRepoId: number) {
    const tenant = await store.createTenant(name);
    const inst = await store.saveInstallation(tenant.id, githubRepoId, name.toLowerCase());
    const repo = await store.saveRepository(tenant.id, inst.id, {
      githubRepoId,
      fullName: `${name.toLowerCase()}/core`,
      owner: name.toLowerCase(),
      name: 'core',
      defaultBranch: 'main',
      isPrivate: false,
    });
    return { tenant, repo };
  }

  async function insertQueuedJob(tenantId: string, repositoryId: string, suffix: string) {
    const id = `job_q_${suffix}`;
    await pool.query(
      `INSERT INTO jobs (id, tenant_id, repository_id, type, status, payload, attempts, max_attempts, run_after)
       VALUES ($1, $2, $3, 'scan_dependencies', 'queued', $4::jsonb, 0, 3, NOW())`,
      [id, tenantId, repositoryId, JSON.stringify({ suffix })],
    );
    return id;
  }

  test('missing tenant cannot claim; mismatch complete/fail throw; owner works', async () => {
    const a = await seedPg('PgAlpha', 9101);
    const b = await seedPg('PgBravo', 9102);
    const jobA = await insertQueuedJob(a.tenant.id, a.repo.id, 'a');
    const jobB = await insertQueuedJob(b.tenant.id, b.repo.id, 'b');

    expect(await store.claimNextJob('', 'worker_1')).toBeNull();
    expect(await store.claimNextJob('../evil', 'worker_1')).toBeNull();

    const claimedA = await store.claimNextJob(a.tenant.id, 'worker_a');
    expect(claimedA?.id).toBe(jobA);
    await expect(store.completeJob(b.tenant.id, jobA, { stolen: true })).rejects.toThrow(/not found/);
    await expect(store.failJob(b.tenant.id, jobA, 'stolen')).rejects.toThrow(/not found/);

    await store.completeJob(a.tenant.id, jobA, { ok: true });
    await store.completeJob(a.tenant.id, jobA, { ok: true, repeated: true });

    const claimedB = await store.claimNextJob(b.tenant.id, 'worker_b');
    expect(claimedB?.id).toBe(jobB);
  });

  test('expired postgres lease is recovered only for the claiming tenant', async () => {
    const a = await seedPg('PgLeaseA', 9201);
    const b = await seedPg('PgLeaseB', 9202);
    const jobA = await insertQueuedJob(a.tenant.id, a.repo.id, 'la');
    const jobB = await insertQueuedJob(b.tenant.id, b.repo.id, 'lb');

    expect((await store.claimNextJob(a.tenant.id, 'wa'))?.id).toBe(jobA);
    expect((await store.claimNextJob(b.tenant.id, 'wb'))?.id).toBe(jobB);

    await pool.query(`UPDATE jobs SET locked_at = NOW() - INTERVAL '11 minutes' WHERE id = $1 OR id = $2`, [jobA, jobB]);

    expect(await store.claimNextJob(a.tenant.id, 'wa')).toBeNull();
    const statusB = await pool.query('SELECT status FROM jobs WHERE id = $1', [jobB]);
    expect(statusB.rows[0].status).toBe('running');

    const reclaimed = await store.claimNextJob(a.tenant.id, 'wa');
    expect(reclaimed?.id).toBe(jobA);
    expect(reclaimed?.attempts).toBe(2);
  });
});
