import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Pool, PoolClient } from 'pg';

export const MIGRATION_ADVISORY_LOCK_ID = 74928103;

export interface MigrationFile {
  version: string;
  name: string;
  filePath: string;
  sql: string;
  checksum: string;
}

export interface AppliedMigration {
  version: string;
  name: string;
  checksum: string;
  applied_at: string;
}

export interface MigrationReport {
  success: boolean;
  applied: string[];
  alreadyApplied: string[];
  currentVersion: string | null;
  totalAvailable: number;
}

export interface MigrationStatusReport {
  currentVersion: string | null;
  appliedCount: number;
  pendingCount: number;
  applied: AppliedMigration[];
  pending: string[];
}

export interface SchemaIntegrityReport {
  ok: boolean;
  currentVersion: string | null;
  missingTables: string[];
  tableCount: number;
  expectedTables: string[];
}

export const CANONICAL_TABLES = [
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
  'rate_limits',
  'lifecycle_capability_replays',
  'schema_migrations',
];

/**
 * Resolves the directory containing versioned .sql migration files,
 * supporting both dev/ts-node and compiled dist execution modes.
 */
export function resolveMigrationsDir(customDir?: string): string {
  if (customDir && fs.existsSync(customDir)) {
    return customDir;
  }
  // Candidate 1: Local ./migrations relative to current file
  const localDir = path.resolve(__dirname, 'migrations');
  if (fs.existsSync(localDir)) {
    return localDir;
  }
  // Candidate 2: Running from dist/db, check src/db/migrations
  const srcDbDir = path.resolve(__dirname, '../../src/db/migrations');
  if (fs.existsSync(srcDbDir)) {
    return srcDbDir;
  }
  // Candidate 3: Running from engine root
  const rootSrcDir = path.resolve(process.cwd(), 'packages/engine/src/db/migrations');
  if (fs.existsSync(rootSrcDir)) {
    return rootSrcDir;
  }
  return localDir;
}

/**
 * Loads all .sql migration files from the migrations directory in sorted order.
 */
export function loadMigrationFiles(customDir?: string): MigrationFile[] {
  const dir = resolveMigrationsDir(customDir);
  if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
    return [];
  }

  const files = fs
    .readdirSync(/*turbopackIgnore: true*/ dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  return files.map((fileName) => {
    const match = fileName.match(/^(\d+)_(.+)\.sql$/);
    const version = match ? match[1] : fileName.replace('.sql', '');
    const name = match ? match[2] : fileName;
    const filePath = path.join(/*turbopackIgnore: true*/ dir, fileName);
    const sql = fs.readFileSync(/*turbopackIgnore: true*/ filePath, 'utf8');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');

    return {
      version,
      name,
      filePath,
      sql,
      checksum,
    };
  });
}

/**
 * Ensures the schema_migrations tracking table exists.
 */
export async function ensureMigrationTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(64) PRIMARY KEY,
      name TEXT NOT NULL,
      checksum VARCHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

/**
 * Executes pending SQL migrations in transactional sequence with concurrency protection.
 */
export async function runMigrations(
  pool: Pool,
  customDir?: string,
): Promise<MigrationReport> {
  const files = loadMigrationFiles(customDir);
  const client = await pool.connect();

  try {
    // Acquire session-level advisory lock to serialize concurrent migrations
    await client.query('SELECT pg_advisory_lock($1);', [MIGRATION_ADVISORY_LOCK_ID]);

    try {
      await ensureMigrationTable(client);

      const res = await client.query<AppliedMigration>(
        'SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version ASC;',
      );
      const appliedMap = new Map<string, AppliedMigration>();
      for (const row of res.rows) {
        appliedMap.set(row.version, row);
      }

      const appliedVersions: string[] = [];
      const alreadyAppliedVersions: string[] = [];

      for (const mig of files) {
        const existing = appliedMap.get(mig.version);
        if (existing) {
          // Verify checksum hasn't been corrupted or altered
          if (existing.checksum !== mig.checksum) {
            throw new Error(
              `Migration checksum mismatch for version ${mig.version} (${mig.name}). ` +
                `Database recorded ${existing.checksum}, but migration file has ${mig.checksum}.`,
            );
          }
          alreadyAppliedVersions.push(mig.version);
          continue;
        }

        // Execute unapplied migration in its own isolated transaction
        await client.query('BEGIN;');
        try {
          await client.query(mig.sql);
          await client.query(
            'INSERT INTO schema_migrations (version, name, checksum, applied_at) VALUES ($1, $2, $3, NOW());',
            [mig.version, mig.name, mig.checksum],
          );
          await client.query('COMMIT;');
          appliedVersions.push(mig.version);
        } catch (err) {
          await client.query('ROLLBACK;');
          throw new Error(
            `Failed executing migration ${mig.version} (${mig.name}): ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      const latestVersion =
        appliedVersions.length > 0
          ? appliedVersions[appliedVersions.length - 1]
          : alreadyAppliedVersions.length > 0
            ? alreadyAppliedVersions[alreadyAppliedVersions.length - 1]
            : null;

      return {
        success: true,
        applied: appliedVersions,
        alreadyApplied: alreadyAppliedVersions,
        currentVersion: latestVersion,
        totalAvailable: files.length,
      };
    } finally {
      await client.query('SELECT pg_advisory_unlock($1);', [MIGRATION_ADVISORY_LOCK_ID]);
    }
  } finally {
    client.release();
  }
}

/**
 * Returns the current migration status and lists pending migrations.
 */
export async function getMigrationStatus(
  pool: Pool,
  customDir?: string,
): Promise<MigrationStatusReport> {
  const files = loadMigrationFiles(customDir);
  const client = await pool.connect();

  try {
    await ensureMigrationTable(client);

    const res = await client.query<AppliedMigration>(
      'SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version ASC;',
    );
    const applied = res.rows;
    const appliedSet = new Set(applied.map((a) => a.version));

    const pending = files
      .filter((f) => !appliedSet.has(f.version))
      .map((f) => `${f.version}_${f.name}`);

    const currentVersion = applied.length > 0 ? applied[applied.length - 1].version : null;

    return {
      currentVersion,
      appliedCount: applied.length,
      pendingCount: pending.length,
      applied,
      pending,
    };
  } finally {
    client.release();
  }
}

/**
 * Verifies that all expected canonical tables exist and that schema_migrations is populated.
 */
export async function verifySchemaIntegrity(
  pool: Pool,
  targetSchema = 'public',
): Promise<SchemaIntegrityReport> {
  const client = await pool.connect();

  try {
    const res = await client.query<{ table_name: string }>(
      `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1;
      `,
      [targetSchema],
    );

    const existingTables = new Set(res.rows.map((r) => r.table_name));
    const missingTables = CANONICAL_TABLES.filter((t) => !existingTables.has(t));

    let currentVersion: string | null = null;
    if (existingTables.has('schema_migrations')) {
      const vRes = await client.query<{ version: string }>(
        'SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;',
      );
      if (vRes.rows.length > 0) {
        currentVersion = vRes.rows[0].version;
      }
    }

    return {
      ok: missingTables.length === 0,
      currentVersion,
      missingTables,
      tableCount: existingTables.size,
      expectedTables: CANONICAL_TABLES,
    };
  } finally {
    client.release();
  }
}
