#!/usr/bin/env node

import { Pool } from 'pg';
import { runMigrations, getMigrationStatus, verifySchemaIntegrity } from './migration-runner';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'up';

  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    'postgres://postgres:postgres@localhost:5432/patchversion';

  const pool = new Pool({ connectionString });

  try {
    if (command === 'status') {
      console.log('[db:status] Checking database migration status...');
      const status = await getMigrationStatus(pool);
      console.log(`Current version: ${status.currentVersion || 'None'}`);
      console.log(`Applied migrations: ${status.appliedCount}`);
      console.log(`Pending migrations: ${status.pendingCount}`);
      if (status.pending.length > 0) {
        console.log('Pending:');
        for (const p of status.pending) {
          console.log(`  - ${p}`);
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

    // Default: 'up'
    console.log('[db:migrate] Executing pending PostgreSQL migrations...');
    const result = await runMigrations(pool);
    console.log(`[db:migrate] Migrations completed. Total available: ${result.totalAvailable}`);
    console.log(`  - Newly applied: ${result.applied.length > 0 ? result.applied.join(', ') : 'None (up to date)'}`);
    console.log(`  - Already applied: ${result.alreadyApplied.length}`);
    console.log(`  - Current version: ${result.currentVersion || 'None'}`);

    const integrity = await verifySchemaIntegrity(pool);
    if (!integrity.ok) {
      console.error(`[db:migrate] WARNING: Schema verification failed after migration! Missing: ${integrity.missingTables.join(', ')}`);
      process.exitCode = 1;
    } else {
      console.log('[db:migrate] Schema integrity verified. Database is ready.');
    }
  } catch (err) {
    console.error('[db:migrate] Error executing migrations:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}
