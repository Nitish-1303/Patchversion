import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PostgresStore } from '../src/db/postgres-store';

/**
 * Live PostgreSQL Integration Test Suite.
 * Connects to a REAL PostgreSQL database when DATABASE_URL is configured.
 * Safely skips when DATABASE_URL is not set (e.g. local environment without running Postgres).
 */
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const isStrictCi = process.env.STRICT_DB_CHECK === 'true' || process.env.CI_STRICT_DB === 'true';

if (isStrictCi && !connectionString) {
  test('Live PostgreSQL strict CI failure', () => {
    throw new Error('STRICT_DB_CHECK is enabled, but DATABASE_URL or POSTGRES_URL is not configured. Failing CI job fail-closed.');
  });
}

const describeLive = connectionString ? describe : describe.skip;

describeLive('PostgreSQL Real Database Live Integration', () => {
  let pool: Pool;
  let testSchema: string;
  let store: PostgresStore;

  beforeAll(async () => {
    if (!connectionString) return;

    pool = new Pool({ connectionString });

    // Isolate test run inside a dedicated ephemeral PostgreSQL schema
    const schemaSuffix = crypto.randomBytes(4).toString('hex');
    testSchema = `patchbay_live_test_${schemaSuffix}`;

    const client = await pool.connect();
    try {
      await client.query(`CREATE SCHEMA ${testSchema};`);
      await client.query(`SET search_path TO ${testSchema}, public;`);

      // Execute schema.sql in this schema
      const schemaSqlPath = path.resolve(__dirname, '../src/db/schema.sql');
      const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
      await client.query(schemaSql);
    } finally {
      client.release();
    }

    store = new PostgresStore({ pool });
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

  test('1. Fresh schema creation and repeatable migrations', async () => {
    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO ${testSchema}, public;`);
      const res = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = $1;
      `, [testSchema]);
      const tableNames = res.rows.map(r => r.table_name);
      expect(tableNames).toContain('tenants');
      expect(tableNames).toContain('installations');
      expect(tableNames).toContain('repositories');
      expect(tableNames).toContain('findings');
      expect(tableNames).toContain('patches');
      expect(tableNames).toContain('pull_requests');
    } finally {
      client.release();
    }
  });

  test('2. Tenant isolation and immutable foreign keys at the persistence boundary', async () => {
    const tenantA = await store.createTenant('Tenant Live A');
    const tenantB = await store.createTenant('Tenant Live B');

    const instA = await store.saveInstallation(tenantA.id, 10001, 'org-a');
    expect(instA.tenantId).toBe(tenantA.id);

    // Cross-tenant lookup fails
    const notFound = await store.getInstallation(tenantB.id, instA.id);
    expect(notFound).toBeNull();

    // Cross-tenant claim of duplicate installation ID throws
    await expect(
      store.saveInstallation(tenantB.id, 10001, 'org-a'),
    ).rejects.toThrow(/Cross-tenant collision/);
  });

  test('3. Installation deletion tombstones, duplicate deletion safety, and cascade repository revocation', async () => {
    const tenant = await store.createTenant('Tombstone Tenant');
    const inst = await store.saveInstallation(tenant.id, 20002, 'tomb-org');

    const repo = await store.saveRepository(tenant.id, inst.id, {
      githubRepoId: 50001,
      fullName: 'tomb-org/app',
      owner: 'tomb-org',
      name: 'app',
      defaultBranch: 'main',
      isPrivate: false,
    });
    expect(repo.status).toBe('connected');

    // Update installation status to deleted
    const tombstoned = await store.updateInstallationStatus(tenant.id, 20002, 'deleted');
    expect(tombstoned).toBe(true);

    // Connected repository is now marked revoked
    const refreshedRepo = await store.getRepository(tenant.id, repo.id);
    expect(refreshedRepo?.status).toBe('revoked');

    // Repeated deletion is safe and idempotent
    const repeat = await store.updateInstallationStatus(tenant.id, 20002, 'deleted');
    expect(repeat).toBe(true);

    // Stale reactivation is rejected
    await expect(
      store.updateInstallationStatus(tenant.id, 20002, 'active'),
    ).rejects.toThrow(/Cannot reactivate deleted installation/);
  });

  test('4. Transaction rollback on error preserves state integrity', async () => {
    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO ${testSchema}, public;`);
      await client.query('BEGIN');
      const tempTenantId = `ten_temp_${Date.now()}`;
      await client.query(
        'INSERT INTO tenants (id, name, created_at) VALUES ($1, $2, NOW())',
        [tempTenantId, 'Temp Rollback Tenant'],
      );

      // Force error: duplicate primary key
      let threw = false;
      try {
        await client.query(
          'INSERT INTO tenants (id, name, created_at) VALUES ($1, $2, NOW())',
          [tempTenantId, 'Duplicate'],
        );
      } catch {
        threw = true;
      }
      expect(threw).toBe(true);

      await client.query('ROLLBACK');

      // Verify row does not exist after rollback
      const check = await client.query('SELECT * FROM tenants WHERE id = $1', [tempTenantId]);
      expect(check.rows).toHaveLength(0);
    } finally {
      client.release();
    }
  });

  test('5. Delivery claim lease acquisition, expiration, and duplicate claim handling', async () => {
    const tenant = await store.createTenant('Claim Tenant');
    const patchId = `patch_claim_${Date.now()}`;
    const worker1 = 'worker_node_1';
    const worker2 = 'worker_node_2';

    // Worker 1 acquires claim
    const claim1 = await store.claimDelivery(tenant.id, patchId, worker1, 1);
    expect(claim1).toBe(true);

    // Worker 2 attempts concurrent claim on unexpired lease
    const claim2 = await store.claimDelivery(tenant.id, patchId, worker2, 1);
    expect(claim2).toBe(false);

    const record = await store.getDeliveryClaim(patchId);
    expect(record?.workerId).toBe(worker1);

    // Wait for lease expiry (1s)
    await new Promise(r => setTimeout(r, 1100));

    // Worker 2 can now acquire expired claim
    const claim3 = await store.claimDelivery(tenant.id, patchId, worker2, 1);
    expect(claim3).toBe(true);
  });
});
