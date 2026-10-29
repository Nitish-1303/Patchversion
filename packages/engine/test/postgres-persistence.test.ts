import fs from 'fs';
import path from 'path';
import os from 'os';
import { Pool } from 'pg';
import { migrateJsonToPostgres } from '../src/db/migrator';
import { PatchversionDatabase } from '../src/db/database';
import { PostgresStore } from '../src/db/postgres-store';

describe('PostgreSQL Persistence & State Migration', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patchbay-pg-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('schema.sql defines all required tables, foreign keys, and constraints', () => {
    const schemaPath = path.resolve(__dirname, '../src/db/schema.sql');
    expect(fs.existsSync(schemaPath)).toBe(true);

    const sql = fs.readFileSync(schemaPath, 'utf8');

    // Required tables
    const expectedTables = [
      'tenants',
      'users',
      'sessions',
      'revoked_sessions',
      'installations',
      'repositories',
      'jobs',
      'findings',
      'patches',
      'validations',
      'approvals',
      'pull_requests',
      'onboarding_states',
      'delivery_claims',
      'webhook_deliveries',
      'watch_targets',
    ];

    for (const table of expectedTables) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }

    // Critical constraints
    expect(sql).toContain('REFERENCES tenants(id) ON DELETE RESTRICT');
    expect(sql).toContain('github_installation_id BIGINT NOT NULL UNIQUE');
    expect(sql).toContain('github_repo_id BIGINT NOT NULL UNIQUE');
    expect(sql).toContain('uq_findings_tenant_repo_package_versions');
    expect(sql).toContain('token VARCHAR(128) NOT NULL UNIQUE');
  });

  test('migrateJsonToPostgres creates backup and executes transactional migration', async () => {
    // 1. Initialize a populated test database
    const db = new PatchversionDatabase(tmpDir);
    const tenant = db.createTenant('Migration Tenant', 'ten_mig_1');
    const user = db.createUser(tenant.id, 'mig@example.com', 'owner', 'mig-user', undefined, 'usr_mig_1');
    const session = db.createSession(user.id);
    db.revokeSession(session.token);

    const inst = db.saveInstallation(tenant.id, 991122, 'mig-org');
    db.saveRepository(tenant.id, inst.id, {
      id: 'repo_mig_1',
      githubRepoId: 5544,
      fullName: 'mig-org/mig-repo',
      owner: 'mig-org',
      name: 'mig-repo',
      defaultBranch: 'main',
      isPrivate: false,
    });

    const dbJsonPath = path.join(tmpDir, 'patchversion-db.json');
    expect(fs.existsSync(dbJsonPath)).toBe(true);

    // 2. Mock PostgreSQL pool & client
    const executedQueries: string[] = [];
    const mockClient = {
      query: jest.fn(async (text: string) => {
        executedQueries.push(typeof text === 'string' ? text.trim() : '');
        return { rows: [] };
      }),
      release: jest.fn(),
    };

    const mockPool = {
      connect: jest.fn(async () => mockClient),
    } as unknown as Pool;

    // 3. Run migration
    const result = await migrateJsonToPostgres(dbJsonPath, mockPool);

    expect(result.success).toBe(true);
    expect(fs.existsSync(result.backupPath)).toBe(true);
    expect(result.backupPath).toContain('.backup.json');

    // Verify transaction boundaries
    expect(executedQueries[0]).toBe('BEGIN');
    expect(executedQueries[executedQueries.length - 1]).toBe('COMMIT');

    // Verify insertion queries executed for all populated models
    expect(result.tableCounts['tenants']).toBeGreaterThanOrEqual(1);
    expect(result.tableCounts['users']).toBeGreaterThanOrEqual(1);
    expect(result.tableCounts['installations']).toBeGreaterThanOrEqual(1);
    expect(result.tableCounts['repositories']).toBeGreaterThanOrEqual(1);
    expect(result.tableCounts['revoked_sessions']).toBeGreaterThanOrEqual(1);
    expect(result.totalRecordsMigrated).toBeGreaterThan(0);
    expect(mockClient.release).toHaveBeenCalled();
  });

  test('migrateJsonToPostgres rolls back and preserves backup on query error', async () => {
    const db = new PatchversionDatabase(tmpDir);
    db.createTenant('Rollback Tenant', 'ten_rb_1');
    const dbJsonPath = path.join(tmpDir, 'patchversion-db.json');

    const executedQueries: string[] = [];
    const mockClient = {
      query: jest.fn(async (text: string) => {
        executedQueries.push(typeof text === 'string' ? text.trim() : '');
        if (text.includes('INSERT INTO tenants')) {
          throw new Error('Database connection failed during insert');
        }
        return { rows: [] };
      }),
      release: jest.fn(),
    };

    const mockPool = {
      connect: jest.fn(async () => mockClient),
    } as unknown as Pool;

    await expect(migrateJsonToPostgres(dbJsonPath, mockPool)).rejects.toThrow(
      'Database connection failed during insert',
    );

    // Rollback must have been executed
    expect(executedQueries).toContain('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();

    // Verify backup file was preserved
    const files = fs.readdirSync(tmpDir);
    const backupFile = files.find(f => f.endsWith('.backup.json'));
    expect(backupFile).toBeDefined();
  });

  test('two independently instantiated PostgresStore clients verify immediate cross-instance session revocation', async () => {
    // Shared simulated in-memory PostgreSQL state
    const sharedTables = {
      tenants: new Map<string, Record<string, unknown>>(),
      users: new Map<string, Record<string, unknown>>(),
      sessions: new Map<string, Record<string, unknown>>(),
      revoked_sessions: new Set<string>(),
    };

    const handleQuery = async (text: string, params: unknown[] = []) => {
      const q = text.trim();
      // SELECT FROM users
      if (q.includes('FROM users WHERE id = $1')) {
        const userId = params[0] as string;
        return { rows: [{ id: userId, tenant_id: 'ten_test_123', email: 'test@example.com', role: 'owner' }] };
      }
      // INSERT INTO sessions
      if (q.includes('INSERT INTO sessions')) {
        const [id, userId, tenantId, token, expiresAt, createdAt] = params as string[];
        sharedTables.sessions.set(token, {
          id,
          user_id: userId,
          tenant_id: tenantId,
          token,
          expires_at: expiresAt,
          created_at: createdAt,
        });
        return { rows: [] };
      }
      // SELECT FROM sessions
      if (q.includes('FROM sessions WHERE token = $1')) {
        const token = params[0] as string;
        const row = sharedTables.sessions.get(token);
        return { rows: row ? [row] : [] };
      }
      // DELETE FROM sessions
      if (q.includes('DELETE FROM sessions')) {
        const token = params[0] as string;
        sharedTables.sessions.delete(token);
        return { rows: [] };
      }
      // INSERT INTO revoked_sessions
      if (q.includes('INSERT INTO revoked_sessions')) {
        const sessionId = params[0] as string;
        sharedTables.revoked_sessions.add(sessionId);
        return { rows: [] };
      }
      // SELECT FROM revoked_sessions
      if (q.includes('FROM revoked_sessions WHERE session_id = $1')) {
        const sessionId = params[0] as string;
        const isRevoked = sharedTables.revoked_sessions.has(sessionId);
        return { rows: isRevoked ? [{ session_id: sessionId }] : [] };
      }
      return { rows: [] };
    };

    const mockPool = {
      connect: jest.fn(async () => ({
        query: jest.fn(handleQuery),
        release: jest.fn(),
      })),
      query: jest.fn(handleQuery),
      end: jest.fn(async () => {}),
    } as unknown as Pool;

    // Instantiate two independent clients against the same shared PostgreSQL pool
    const clientInstance1 = new PostgresStore({ pool: mockPool });
    const clientInstance2 = new PostgresStore({ pool: mockPool });

    // Client 1 creates a session
    const session = await clientInstance1.createSession('usr_test_123');
    expect(session.token).toBeDefined();

    // Client 2 can read the active session and confirms it is NOT revoked
    const fetchedByClient2 = await clientInstance2.getSession(session.token);
    expect(fetchedByClient2).not.toBeNull();
    const isRevokedBefore = await clientInstance2.isSessionRevoked(session.id);
    expect(isRevokedBefore).toBe(false);

    // Client 1 revokes the session in the shared PostgreSQL database
    const revoked = await clientInstance1.revokeSession(session.token);
    expect(revoked).toBe(true);

    // Client 2 immediately queries the database and observes the revocation without local cache delay
    const isRevokedAfter = await clientInstance2.isSessionRevoked(session.id);
    expect(isRevokedAfter).toBe(true);

    // Client 2 getting session rejects revoked session
    const fetchedAfterRevocation = await clientInstance2.getSession(session.token);
    expect(fetchedAfterRevocation).toBeNull();
  });
});
