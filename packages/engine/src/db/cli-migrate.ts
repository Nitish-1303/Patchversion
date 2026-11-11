#!/usr/bin/env node

import { createRequire } from 'module';
import { Pool } from 'pg';
import { runMigrations, getMigrationStatus, verifySchemaIntegrity } from './migration-runner';

const guardRequire = createRequire(__filename);
const { resolveOperatorDatabaseTarget, redact, secretsInDatabaseUrl } = guardRequire(
  '../../../../scripts/hosted-db-guard.js',
) as {
  resolveOperatorDatabaseTarget: (env: NodeJS.ProcessEnv) => {
    ok: boolean;
    reason: string;
    kind?: string;
    connectionString?: string;
  };
  redact: (value: string, secrets?: string[]) => string;
  secretsInDatabaseUrl: (value: string) => string[];
};

export const STATUS_DDL_ACK = 'PATCHVERSION_ACK_STATUS_DDL';

export function redactCliError(err: unknown, secrets: string[] = []): string {
  const message = err instanceof Error ? err.message : String(err);
  return redact(message, secrets);
}

function commandLabel(command: string): string {
  if (command === 'status') return 'db:status';
  if (command === 'verify') return 'db:verify';
  return 'db:migrate';
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'up';
  const label = commandLabel(command);

  if (command === 'status' && process.env[STATUS_DDL_ACK] !== '1') {
    console.error(
      '[db:status] Refusing to run. db:status creates schema_migrations when that table is missing. ' +
        'Set PATCHVERSION_ACK_STATUS_DDL=1 to acknowledge that DDL and run the command intentionally.',
    );
    process.exitCode = 1;
    return;
  }

  const target = resolveOperatorDatabaseTarget(process.env);
  if (!target.ok || !target.connectionString) {
    console.error(`[${label}] Refusing database target: ${target.reason}. No connection was opened.`);
    process.exitCode = 1;
    return;
  }

  const secrets = secretsInDatabaseUrl(target.connectionString);
  const pool = new Pool({
    connectionString: target.connectionString,
    connectionTimeoutMillis: 5000,
  });

  try {
    if (command === 'status') {
      console.log('[db:status] Checking database migration status. This creates schema_migrations when the table is missing.');
      const status = await getMigrationStatus(pool);
      console.log(`Current version: ${status.currentVersion || 'None'}`);
      console.log(`Applied migrations: ${status.appliedCount}`);
      console.log(`Pending migrations: ${status.pendingCount}`);
      if (status.pending.length > 0) {
        console.log('Pending:');
        for (const pending of status.pending) {
          console.log(`  - ${pending}`);
        }
      }
      const integrity = await verifySchemaIntegrity(pool);
      console.log(`Schema integrity: ${integrity.ok ? 'OK' : 'INCOMPLETE'}`);
      if (!integrity.ok) {
        console.warn(`Missing tables: ${integrity.missingTables.join(', ')}`);
        process.exitCode = 1;
      }
      return;
    }

    if (command === 'verify') {
      console.log('[db:verify] Verifying schema tables and migration history...');
      const integrity = await verifySchemaIntegrity(pool);
      if (!integrity.ok) {
        console.error(`[db:verify] FAILED: Missing tables: ${integrity.missingTables.join(', ')}`);
        process.exitCode = 1;
      } else {
        console.log(`[db:verify] PASSED: All ${integrity.expectedTables.length} tables present. Version: ${integrity.currentVersion}`);
      }
      return;
    }

    console.log('[db:migrate] Executing pending PostgreSQL migrations...');
    const result = await runMigrations(pool);
    console.log(`[db:migrate] Migrations completed. Total available: ${result.totalAvailable}`);
    console.log(`  - Newly applied: ${result.applied.length > 0 ? result.applied.join(', ') : 'None (up to date)'}`);
    console.log(`  - Already applied: ${result.alreadyApplied.length}`);
    console.log(`  - Current version: ${result.currentVersion || 'None'}`);

    const integrity = await verifySchemaIntegrity(pool);
    if (!integrity.ok) {
      console.error(`[db:migrate] WARNING: Schema verification failed after migration. Missing: ${integrity.missingTables.join(', ')}`);
      process.exitCode = 1;
    } else {
      console.log('[db:migrate] Schema integrity verified. Database is ready.');
    }
  } catch (err) {
    console.error(`[${label}] Error: ${redactCliError(err, secrets)}`);
    process.exitCode = 1;
  } finally {
    try {
      await pool.end();
    } catch (err) {
      console.error(`[${label}] Error closing connection: ${redactCliError(err, secrets)}`);
    }
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`[db:migrate] Error: ${redactCliError(err)}`);
    process.exitCode = 1;
  });
}
