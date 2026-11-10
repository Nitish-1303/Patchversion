import {
  loadMigrationFiles,
  runMigrations,
  getMigrationStatus,
  verifySchemaIntegrity,
  MIGRATION_ADVISORY_LOCK_ID,
  CANONICAL_TABLES,
} from '../src/db/migration-runner';
import { Pool } from 'pg';

describe('PostgreSQL Versioned Schema Migrations & Advisory Locking', () => {
  test('loadMigrationFiles discovers and parses canonical migration files with valid SHA-256 checksums', () => {
    const files = loadMigrationFiles();
    expect(files.length).toBeGreaterThanOrEqual(1);

    const initial = files.find((f) => f.version === '001');
    expect(initial).toBeDefined();
    expect(initial?.name).toBe('initial_schema');
    expect(initial?.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(initial?.sql).toContain('CREATE TABLE IF NOT EXISTS tenants');
    expect(initial?.sql).toContain('CREATE TABLE IF NOT EXISTS users');
    expect(initial?.sql).toContain('CREATE TABLE IF NOT EXISTS watch_targets');
    const replay = files.find((f) => f.version === '002');
    expect(replay).toBeDefined();
    expect(replay?.name).toBe('lifecycle_capability_replay');
    expect(replay?.sql).toContain('CREATE TABLE IF NOT EXISTS lifecycle_capability_replays');
  });

  test('runMigrations acquires advisory lock, applies pending migrations, and records migration history', async () => {
    const queries: { sql: string; params?: unknown[] }[] = [];
    let advisoryLockAcquired = false;
    let advisoryLockReleased = false;

    const mockClient = {
      query: jest.fn(async (text: string, params?: unknown[]) => {
        queries.push({ sql: text, params });

        if (text.includes('pg_advisory_lock')) {
          advisoryLockAcquired = true;
          return { rows: [] };
        }
        if (text.includes('pg_advisory_unlock')) {
          advisoryLockReleased = true;
          return { rows: [] };
        }
        if (text.includes('SELECT version, name, checksum, applied_at FROM schema_migrations')) {
          // No migrations applied yet
          return { rows: [] };
        }
        return { rows: [] };
      }),
      release: jest.fn(),
    };

    const mockPool = {
      connect: jest.fn(async () => mockClient),
    } as unknown as Pool;

    const report = await runMigrations(mockPool);

    expect(mockPool.connect).toHaveBeenCalled();
    expect(advisoryLockAcquired).toBe(true);
    expect(advisoryLockReleased).toBe(true);
    expect(report.success).toBe(true);
    expect(report.applied).toContain('001');
    expect(report.alreadyApplied).toHaveLength(0);

    // Verify advisory lock ID
    const lockQuery = queries.find((q) => q.sql.includes('pg_advisory_lock'));
    expect(lockQuery?.params).toEqual([MIGRATION_ADVISORY_LOCK_ID]);

    // Verify transaction wrapping
    const beginIndex = queries.findIndex((q) => q.sql === 'BEGIN;');
    const commitIndex = queries.findIndex((q) => q.sql === 'COMMIT;');
    expect(beginIndex).toBeGreaterThan(-1);
    expect(commitIndex).toBeGreaterThan(beginIndex);
  });

  test('runMigrations detects already-applied migrations and is idempotent', async () => {
    const files = loadMigrationFiles();
    const initial = files.find((f) => f.version === '001')!;

    const mockClient = {
      query: jest.fn(async (text: string) => {
        if (text.includes('SELECT version, name, checksum, applied_at FROM schema_migrations')) {
          return {
            rows: [
              {
                version: '001',
                name: 'initial_schema',
                checksum: initial.checksum,
                applied_at: new Date().toISOString(),
              },
            ],
          };
        }
        return { rows: [] };
      }),
      release: jest.fn(),
    };

    const mockPool = {
      connect: jest.fn(async () => mockClient),
    } as unknown as Pool;

    const report = await runMigrations(mockPool);

    expect(report.success).toBe(true);
    expect(report.applied).toEqual(['002']);
    expect(report.alreadyApplied).toContain('001');
    expect(report.currentVersion).toBe('002');
  });

  test('runMigrations fails fail-closed and throws error on checksum tampering', async () => {
    const mockClient = {
      query: jest.fn(async (text: string) => {
        if (text.includes('SELECT version, name, checksum, applied_at FROM schema_migrations')) {
          return {
            rows: [
              {
                version: '001',
                name: 'initial_schema',
                checksum: 'tampered_checksum_00000000000000000000000000000000000000000000000000000000',
                applied_at: new Date().toISOString(),
              },
            ],
          };
        }
        return { rows: [] };
      }),
      release: jest.fn(),
    };

    const mockPool = {
      connect: jest.fn(async () => mockClient),
    } as unknown as Pool;

    await expect(runMigrations(mockPool)).rejects.toThrow(/Migration checksum mismatch/);
  });

  test('getMigrationStatus accurately reports applied and pending migrations', async () => {
    const mockClient = {
      query: jest.fn(async (text: string) => {
        if (text.includes('SELECT version, name, checksum, applied_at FROM schema_migrations')) {
          return {
            rows: [
              {
                version: '001',
                name: 'initial_schema',
                checksum: 'fake_checksum',
                applied_at: new Date().toISOString(),
              },
            ],
          };
        }
        return { rows: [] };
      }),
      release: jest.fn(),
    };

    const mockPool = {
      connect: jest.fn(async () => mockClient),
    } as unknown as Pool;

    const status = await getMigrationStatus(mockPool);
    expect(status.currentVersion).toBe('001');
    expect(status.appliedCount).toBe(1);
    expect(status.pendingCount).toBe(1);
    expect(status.pending.some((p) => p.startsWith('002_'))).toBe(true);
  });

  test('verifySchemaIntegrity reports missing tables when schema is incomplete', async () => {
    const mockClient = {
      query: jest.fn(async (text: string) => {
        if (text.includes('FROM information_schema.tables')) {
          // Return only 2 tables, missing the rest
          return {
            rows: [{ table_name: 'tenants' }, { table_name: 'users' }],
          };
        }
        return { rows: [] };
      }),
      release: jest.fn(),
    };

    const mockPool = {
      connect: jest.fn(async () => mockClient),
    } as unknown as Pool;

    const integrity = await verifySchemaIntegrity(mockPool);
    expect(integrity.ok).toBe(false);
    expect(integrity.missingTables).toContain('repositories');
    expect(integrity.missingTables).toContain('schema_migrations');
    expect(integrity.expectedTables).toEqual(CANONICAL_TABLES);
  });

  test('verifySchemaIntegrity reports ok: true when all canonical tables exist', async () => {
    const mockClient = {
      query: jest.fn(async (text: string) => {
        if (text.includes('FROM information_schema.tables')) {
          return {
            rows: CANONICAL_TABLES.map((t) => ({ table_name: t })),
          };
        }
        if (text.includes('SELECT version FROM schema_migrations')) {
          return { rows: [{ version: '001' }] };
        }
        return { rows: [] };
      }),
      release: jest.fn(),
    };

    const mockPool = {
      connect: jest.fn(async () => mockClient),
    } as unknown as Pool;

    const integrity = await verifySchemaIntegrity(mockPool);
    expect(integrity.ok).toBe(true);
    expect(integrity.missingTables).toHaveLength(0);
    expect(integrity.currentVersion).toBe('001');
  });
});
