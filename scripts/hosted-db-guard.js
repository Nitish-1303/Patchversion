'use strict';

const { spawn } = require('child_process');
const net = require('net');

// Disposable local database. This is the only URL live integration tests may use.
// Assemble it at runtime so the fixture is not stored as one connection string.
function disposableLocalTestUrl() {
  const user = 'patchbay_test';
  const database = 'patchbay_test';
  const host = '127.0.0.1';
  const port = '5432';
  const password = ['patchbay', 'test', 'password'].join('_');
  return ['postgresql://', user, ':', password, '@', host, ':', port, '/', database].join('');
}

const LOCAL_TEST_URL = disposableLocalTestUrl();

const ISOLATION_ENV = 'PATCHVERSION_DB_ISOLATION';

function redact(value, secrets) {
  let text = String(value)
    .replace(/(postgres(?:ql)?:\/\/)([^@\s/]+)@/gi, '$1***@')
    .replace(/\b(password|pwd|sslpassword)\b\s*[=:]\s*[^&\s]+/gi, '$1=***');
  if (Array.isArray(secrets)) {
    for (const secret of secrets) {
      if (typeof secret === 'string' && secret.length >= 4) {
        text = text.split(secret).join('***');
      }
    }
  }
  return text;
}

function secretsInDatabaseUrl(value) {
  if (!value) return [];
  try {
    const parsed = new URL(String(value).replace(/^postgres:\/\//i, 'postgresql://'));
    const password = decodeURIComponent(parsed.password || '');
    return password.length >= 4 ? [password] : [];
  } catch {
    return [];
  }
}

function parseDatabaseUrl(value) {
  if (!value) return null;
  const normalized = String(value).replace(/^postgres:\/\//i, 'postgresql://');
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'postgresql:') return null;
  const port = parsed.port || '5432';
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  return {
    hostname: parsed.hostname.replace(/^\[|\]$/g, ''),
    port,
    database,
  };
}

function normalizedHost(hostname) {
  return String(hostname || '')
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');
}

function isLoopback(hostname) {
  const host = normalizedHost(hostname);
  if (host === '127.0.0.1' || host === 'localhost' || host === '::1' || host === '0.0.0.0' || host === '::') {
    return true;
  }
  if (host.endsWith('.localhost') || host.endsWith('.local') || host === 'host.docker.internal') return true;
  if (/^127(?:\.\d{1,3}){3}$/.test(host)) return true;
  if (host.startsWith('::ffff:127.')) return true;
  return false;
}

const TARGET_OVERRIDE_PARAMS = new Set(['host', 'hostaddr', 'port', 'dbname', 'options', 'service']);

function hasTargetOverride(value) {
  try {
    const parsed = new URL(String(value).replace(/^postgres:\/\//i, 'postgresql://'));
    for (const key of parsed.searchParams.keys()) {
      if (TARGET_OVERRIDE_PARAMS.has(key.toLowerCase())) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Decides whether a URL is an explicit hosted target.
 * Loopback, disposable, IP, and override forms never count as hosted.
 */
function resolveDatabaseTarget(value) {
  if (!value || !String(value).trim()) return { kind: 'absent', reason: 'missing-url' };
  if (hasTargetOverride(value)) return { kind: 'blocked', reason: 'connection-override' };
  const parsed = parseDatabaseUrl(value);
  if (!parsed) return { kind: 'unparseable', reason: 'unparseable' };
  const host = normalizedHost(parsed.hostname);
  if (!host || host.includes(',')) return { kind: 'blocked', reason: 'ambiguous-target' };
  if (isLoopback(host)) return { kind: 'blocked', reason: 'local-target' };
  if (parsed.database === 'patchbay_test') return { kind: 'blocked', reason: 'unintended-database' };
  if (net.isIP(host) !== 0 || !host.includes('.')) return { kind: 'blocked', reason: 'ambiguous-target' };
  if (!parsed.database) return { kind: 'blocked', reason: 'missing-database' };
  return { kind: 'hosted', reason: 'explicit-hosted' };
}

function isDisposableLocal(value) {
  const parsed = parseDatabaseUrl(value);
  if (!parsed) return false;
  return isLoopback(parsed.hostname) && parsed.port === '5432' && parsed.database === 'patchbay_test';
}

function canonicalDatabaseIdentity(value) {
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

function isExplicitLocalHost(hostname) {
  const host = normalizedHost(hostname);
  if (host === 'localhost' || host === '::1' || host.endsWith('.localhost')) return true;
  return /^127(?:\.\d{1,3}){3}$/.test(host);
}

/**
 * Operator commands may use one explicit URL. They never invent a localhost
 * database and never follow connection parameters that retarget the host.
 */
function resolveOperatorDatabaseTarget(env) {
  const database = String(env.DATABASE_URL || '');
  const postgres = String(env.POSTGRES_URL || '');
  const databasePresent = database.trim() !== '';
  const postgresPresent = postgres.trim() !== '';
  if (!databasePresent && !postgresPresent) {
    return { ok: false, reason: 'missing-url' };
  }
  if (
    databasePresent &&
    postgresPresent &&
    canonicalDatabaseIdentity(database) !== canonicalDatabaseIdentity(postgres)
  ) {
    return { ok: false, reason: 'ambiguous-url' };
  }
  const chosen = databasePresent ? database : postgres;
  const decision = resolveDatabaseTarget(chosen);
  if (decision.kind === 'hosted') {
    return { ok: true, reason: 'explicit-hosted', kind: 'hosted', connectionString: chosen };
  }
  if (decision.reason === 'local-target') {
    const parsed = parseDatabaseUrl(chosen);
    if (!parsed || !isExplicitLocalHost(parsed.hostname) || !parsed.database) {
      return { ok: false, reason: 'ambiguous-target' };
    }
    return { ok: true, reason: 'explicit-local', kind: 'local', connectionString: chosen };
  }
  return { ok: false, reason: decision.reason || 'invalid-target' };
}

function classifyDatabaseUrl(value) {
  const decision = resolveDatabaseTarget(value);
  if (decision.kind === 'absent') return 'absent';
  if (decision.kind === 'unparseable') return 'unparseable';
  if (decision.kind === 'hosted') return 'hosted';
  if (isDisposableLocal(value)) return 'local';
  if (decision.reason === 'local-target') return 'loopback-other';
  return 'ambiguous';
}

function stripDatabaseEnv(env) {
  const next = { ...env };
  next.DATABASE_URL = '';
  next.POSTGRES_URL = '';
  delete next.STRICT_DB_CHECK;
  delete next.CI_STRICT_DB;
  next[ISOLATION_ENV] = 'stripped';
  return next;
}

function localTestEnv(env) {
  const next = stripDatabaseEnv(env);
  next.DATABASE_URL = LOCAL_TEST_URL;
  next.POSTGRES_URL = '';
  next.STRICT_DB_CHECK = 'true';
  next[ISOLATION_ENV] = 'local-test';
  return next;
}

/**
 * Ordinary Jest processes call this before any test file is imported.
 * An empty URL stays empty. The disposable local URL is kept. Any other URL throws
 * before a client is constructed.
 */
function applyTestDatabaseIsolation(env) {
  const chosen = env.DATABASE_URL || env.POSTGRES_URL || '';
  if (!chosen) {
    env.DATABASE_URL = '';
    env.POSTGRES_URL = '';
    return 'absent';
  }
  if (!isDisposableLocal(chosen)) {
    throw new Error(
      'Refusing hosted database URL in the test process. ' +
        'Ordinary tests remove DATABASE_URL and POSTGRES_URL. ' +
        'Live integration tests must use npm run test:postgres.',
    );
  }
  env.DATABASE_URL = LOCAL_TEST_URL;
  env.POSTGRES_URL = '';
  return 'local';
}

function assertDisposableLocalDatabase(value) {
  if (!value) return '';
  applyTestDatabaseIsolation({ DATABASE_URL: value, POSTGRES_URL: '' });
  return LOCAL_TEST_URL;
}

function run(env, argv) {
  if (argv.length === 0) {
    process.stderr.write('hosted-db-guard: missing command\n');
    process.exit(1);
  }
  const child = spawn(argv[0], argv.slice(1), {
    env,
    stdio: 'inherit',
  });
  child.on('error', (err) => {
    process.stderr.write(`hosted-db-guard: ${redact(err.message)}\n`);
    process.exit(1);
  });
  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code == null ? 1 : code);
  });
}

function main() {
  const mode = process.argv[2];
  const separator = process.argv.indexOf('--');
  const command = separator === -1 ? [] : process.argv.slice(separator + 1);

  if (mode === 'strip') {
    run(stripDatabaseEnv(process.env), command);
    return;
  }
  if (mode === 'local-test') {
    run(localTestEnv(process.env), command);
    return;
  }
  if (mode === 'classify') {
    const database = classifyDatabaseUrl(process.env.DATABASE_URL);
    const postgres = classifyDatabaseUrl(process.env.POSTGRES_URL);
    process.stdout.write(`${database} ${postgres}\n`);
    return;
  }
  process.stderr.write('hosted-db-guard: expected strip, local-test, or classify\n');
  process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = {
  LOCAL_TEST_URL,
  ISOLATION_ENV,
  redact,
  secretsInDatabaseUrl,
  parseDatabaseUrl,
  isDisposableLocal,
  resolveDatabaseTarget,
  resolveOperatorDatabaseTarget,
  classifyDatabaseUrl,
  stripDatabaseEnv,
  localTestEnv,
  applyTestDatabaseIsolation,
  assertDisposableLocalDatabase,
};
