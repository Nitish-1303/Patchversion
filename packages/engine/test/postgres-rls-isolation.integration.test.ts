import { Pool } from 'pg';
import crypto from 'crypto';
import { PostgresStore } from '../src/db/postgres-store';

/**
 * PostgreSQL Row-Level Security (RLS) Tenant Isolation Integration Test.
 * Connects to live PostgreSQL database when DATABASE_URL or POSTGRES_URL is configured.
 * Safely skips when no database is configured.
 */
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const isStrictCi = process.env.STRICT_DB_CHECK === 'true' || process.env.CI_STRICT_DB === 'true';

if (isStrictCi && !connectionString) {
  test('PostgreSQL RLS strict CI failure', () => {
    throw new Error('STRICT_DB_CHECK is enabled, but DATABASE_URL or POSTGRES_URL is not configured.');
  });
}

const describeLive = connectionString ? describe : describe.skip;

describeLive('PostgreSQL Row-Level Security (RLS) Cross-Tenant Isolation', () => {
  let pool: Pool;
  let testSchema: string;
  let store: PostgresStore;
  const tenantA = 'tenant_alpha_001';
  const tenantB = 'tenant_beta_002';

  beforeAll(async () => {
    if (!connectionString) return;

    pool = new Pool({ connectionString });
    const suffix = crypto.randomBytes(4).toString('hex');
    testSchema = `patchbay_rls_test_${suffix}`;

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

    // Seed test tenants as admin
    await store.createTenant('Tenant Alpha', tenantA);
    await store.createTenant('Tenant Beta', tenantB);
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

  test('RLS policy prevents cross-tenant reads on repositories table', async () => {
    // Admin inserts a repository for Tenant A and Tenant B
    const adminClient = await pool.connect();
    try {
      await adminClient.query("SELECT set_config('app.is_admin', 'true', true);");
      await adminClient.query(
        `INSERT INTO repositories (id, tenant_id, github_repo_id, full_name, owner, name, default_branch, is_private, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        ['repo_alpha_1', tenantA, 1001, 'alpha/repo', 'alpha', 'repo', 'main', false],
      );
      await adminClient.query(
        `INSERT INTO repositories (id, tenant_id, github_repo_id, full_name, owner, name, default_branch, is_private, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        ['repo_beta_1', tenantB, 2002, 'beta/repo', 'beta', 'repo', 'main', false],
      );
    } finally {
      adminClient.release();
    }

    // Query under Tenant A transaction
    await store.withTenantTransaction(tenantA, async (client) => {
      const res = await client.query('SELECT id, tenant_id FROM repositories');
      expect(res.rows.length).toBe(1);
      expect(res.rows[0].id).toBe('repo_alpha_1');
      expect(res.rows[0].tenant_id).toBe(tenantA);

      // Explicit WHERE for Tenant B returns 0 rows
      const crossTenantQuery = await client.query('SELECT * FROM repositories WHERE tenant_id = $1', [tenantB]);
      expect(crossTenantQuery.rows.length).toBe(0);
    });

    // Query under Tenant B transaction
    await store.withTenantTransaction(tenantB, async (client) => {
      const res = await client.query('SELECT id, tenant_id FROM repositories');
      expect(res.rows.length).toBe(1);
      expect(res.rows[0].id).toBe('repo_beta_1');
      expect(res.rows[0].tenant_id).toBe(tenantB);
    });
  });

  test('RLS policy blocks cross-tenant UPDATE and DELETE attempts', async () => {
    await store.withTenantTransaction(tenantA, async (client) => {
      // Attempt to modify Tenant B's repository
      const updateResult = await client.query(
        "UPDATE repositories SET default_branch = 'hacked' WHERE id = 'repo_beta_1'",
      );
      expect(updateResult.rowCount).toBe(0);

      // Attempt to delete Tenant B's repository
      const deleteResult = await client.query(
        "DELETE FROM repositories WHERE id = 'repo_beta_1'",
      );
      expect(deleteResult.rowCount).toBe(0);
    });

    // Verify Tenant B's data remains untouched
    await store.withTenantTransaction(tenantB, async (client) => {
      const res = await client.query("SELECT default_branch FROM repositories WHERE id = 'repo_beta_1'");
      expect(res.rows[0].default_branch).toBe('main');
    });
  });

  test('RLS policy rejects cross-tenant INSERT spoofing with policy violation', async () => {
    await store.withTenantTransaction(tenantA, async (client) => {
      // Tenant A attempts to insert a row masquerading as Tenant B
      let errorThrown = false;
      try {
        await client.query(
          `INSERT INTO repositories (id, tenant_id, github_repo_id, full_name, owner, name, default_branch, is_private, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
          ['repo_spoofed', tenantB, 3003, 'spoofed/repo', 'spoofed', 'repo', 'main', false],
        );
      } catch (err: unknown) {
        errorThrown = true;
        const message = (err as Error).message;
        expect(message).toMatch(/row-level security policy/i);
      }
      expect(errorThrown).toBe(true);
    });
  });
});
