'use strict';

const { Client } = require('pg');
const { redact, resolveDatabaseTarget, secretsInDatabaseUrl } = require('./hosted-db-guard');

const READ_ONLY_QUERIES = [
  "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations'",
  "SELECT 1 FROM public.schema_migrations WHERE version = '002' LIMIT 1",
  "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lifecycle_capability_replays'",
];

const SESSION_STATEMENTS = [
  'SET default_transaction_read_only = on',
  'SHOW default_transaction_read_only',
  'BEGIN READ ONLY',
  'ROLLBACK',
];

const ALLOWED_SQL = new Set([...SESSION_STATEMENTS, ...READ_ONLY_QUERIES]);

function canonicalIdentity(value) {
  try {
    const parsed = new URL(String(value).replace(/^postgres:\/\//i, 'postgresql://'));
    const params = [...parsed.searchParams.entries()]
      .map(([key, item]) => `${key.toLowerCase()}=${item}`)
      .sort()
      .join('&');
    return [
      parsed.protocol,
      decodeURIComponent(parsed.username),
      decodeURIComponent(parsed.password),
      parsed.hostname.toLowerCase(),
      parsed.port || '5432',
      decodeURIComponent(parsed.pathname),
      params,
    ].join('\n');
  } catch {
    return `raw:${String(value).trim()}`;
  }
}

function resolveCheckTarget(env) {
  const database = String(env.DATABASE_URL || '');
  const postgres = String(env.POSTGRES_URL || '');
  const databasePresent = database.trim() !== '';
  const postgresPresent = postgres.trim() !== '';
  if (!databasePresent && !postgresPresent) {
    return { status: 'BLOCKED', reason: 'missing-url' };
  }
  if (databasePresent && postgresPresent && canonicalIdentity(database) !== canonicalIdentity(postgres)) {
    return { status: 'BLOCKED', reason: 'ambiguous-url' };
  }
  const chosen = databasePresent ? database : postgres;
  const decision = resolveDatabaseTarget(chosen);
  if (decision.kind === 'hosted') {
    return { status: 'HOSTED', reason: 'explicit-hosted', connectionString: chosen };
  }
  return { status: 'BLOCKED', reason: decision.reason || 'ambiguous-target' };
}

function blockedReport(reason) {
  return {
    exitCode: 3,
    stdout: `db:check-002: BLOCKED reason=${reason}\n`,
    stderr: '',
  };
}

async function guardedQuery(client, sql) {
  if (!ALLOWED_SQL.has(sql)) {
    throw new Error('Refusing unexpected SQL during db:check-002.');
  }
  return client.query(sql);
}

async function runCheck(env, clientFactory) {
  const decision = resolveCheckTarget(env);
  if (decision.status !== 'HOSTED') {
    return blockedReport(decision.reason);
  }

  const secrets = secretsInDatabaseUrl(decision.connectionString);
  let client;
  try {
    client = clientFactory(decision.connectionString);
    await client.connect();
    await guardedQuery(client, 'SET default_transaction_read_only = on');
    const mode = await guardedQuery(client, 'SHOW default_transaction_read_only');
    const readOnly = mode.rows[0] && mode.rows[0].default_transaction_read_only;
    if (readOnly !== 'on') {
      return {
        exitCode: 1,
        stdout: '',
        stderr: 'db:check-002: Server did not accept read-only mode. Aborting without further queries.\n',
      };
    }

    await guardedQuery(client, 'BEGIN READ ONLY');
    try {
      const migrationsTable = await guardedQuery(client, READ_ONLY_QUERIES[0]);
      let applied = false;
      if (migrationsTable.rowCount > 0) {
        const version = await guardedQuery(client, READ_ONLY_QUERIES[1]);
        applied = version.rowCount > 0;
      }
      const replayTable = await guardedQuery(client, READ_ONLY_QUERIES[2]);
      const tablePresent = replayTable.rowCount > 0;
      return {
        exitCode: applied ? 0 : 2,
        stdout:
          `db:check-002: HOSTED target=hosted migration_002=${applied ? 'applied' : 'absent'} ` +
          `lifecycle_capability_replays=${tablePresent ? 'present' : 'absent'}\n`,
        stderr: '',
      };
    } finally {
      await guardedQuery(client, 'ROLLBACK');
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      exitCode: 1,
      stdout: '',
      stderr: `db:check-002: ${redact(message, secrets)}\n`,
    };
  } finally {
    if (client) {
      try {
        await client.end();
      } catch {
        // The connection may already be closed after a refused handshake.
      }
    }
  }
}

function defaultClientFactory(connectionString) {
  return new Client({
    connectionString,
    connectionTimeoutMillis: 10000,
    statement_timeout: 8000,
    query_timeout: 8000,
  });
}

async function main() {
  const result = await runCheck(process.env, defaultClientFactory);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}

if (require.main === module) {
  main().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`db:check-002: ${redact(message)}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  READ_ONLY_QUERIES,
  SESSION_STATEMENTS,
  ALLOWED_SQL,
  resolveCheckTarget,
  runCheck,
};
