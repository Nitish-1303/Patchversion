import { createRequire } from 'module';
import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import net from 'net';
import os from 'os';
import path from 'path';
import { Client } from 'pg';

const load = createRequire(__filename);
const guard = load('../../../scripts/hosted-db-guard.js') as {
  LOCAL_TEST_URL: string;
  applyTestDatabaseIsolation: (env: NodeJS.ProcessEnv) => string;
  assertDisposableLocalDatabase: (value: string) => string;
  classifyDatabaseUrl: (value: string) => string;
  redact: (value: string, secrets?: string[]) => string;
  resolveDatabaseTarget: (value: string) => { kind: string; reason: string };
  stripDatabaseEnv: (env: NodeJS.ProcessEnv) => NodeJS.ProcessEnv;
  localTestEnv: (env: NodeJS.ProcessEnv) => NodeJS.ProcessEnv;
};
const check = load('../../../scripts/db-check-002.js') as {
  READ_ONLY_QUERIES: string[];
  SESSION_STATEMENTS: string[];
  ALLOWED_SQL: Set<string>;
  resolveCheckTarget: (env: NodeJS.ProcessEnv) => { status: string; reason: string; connectionString?: string };
  runCheck: (
    env: NodeJS.ProcessEnv,
    clientFactory: (connectionString: string) => FakeClient,
  ) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
};

type FakeClient = {
  connect: () => Promise<void>;
  query: (sql: string) => Promise<{ rows: Array<Record<string, string>>; rowCount: number }>;
  end: () => Promise<void>;
};

const repoRoot = path.resolve(__dirname, '../../..');
const HOSTED_URL = 'postgresql://poison-user:poison-secret@ep-example.neon.tech/neondb';

function exposesSecret(text: string): boolean {
  return text.includes('poison-secret') || text.includes('credential-do-not-print') || text.includes('patchbay_test_password');
}

function run(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  cwd = repoRoot,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('exit', (code) => resolve({ code: code == null ? 1 : code, stdout, stderr }));
  });
}

async function listen(): Promise<{ port: number; hits: () => number; close: () => Promise<void> }> {
  const hits: net.Socket[] = [];
  const server = net.createServer((socket) => {
    hits.push(socket);
    socket.end();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('listener did not bind');
  return {
    port: address.port,
    hits: () => hits.length,
    close: () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}

describe('hosted database isolation', () => {
  test('marker-unset ordinary test process has no database url', () => {
    expect(process.env.DATABASE_URL || '').toBe('');
    expect(process.env.POSTGRES_URL || '').toBe('');
  });

  test('refuses a hosted URL before any connection and does not reveal it', async () => {
    const listener = await listen();
    try {
      expect(() => guard.applyTestDatabaseIsolation({ DATABASE_URL: HOSTED_URL })).toThrow(/Refusing hosted database URL/);
      try {
        guard.applyTestDatabaseIsolation({ DATABASE_URL: HOSTED_URL });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        expect(message).not.toContain('poison-secret');
        expect(message).not.toContain('ep-example');
        expect(message).not.toContain('neon.tech');
      }
      expect(listener.hits()).toBe(0);
    } finally {
      await listener.close();
    }
  });

  test('ordinary strip removes hosted URLs so a connector does not dial', async () => {
    const listener = await listen();
    const poison = `postgresql://poison-user:poison-secret@127.0.0.1:${listener.port}/neondb`;
    const connector = `
      const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
      if (!url) process.exit(0);
      const parsed = new URL(url.replace(/^postgres:/, 'postgresql:'));
      const socket = require('net').connect(Number(parsed.port || 5432), parsed.hostname);
      socket.on('connect', () => { socket.end(); process.exit(0); });
      socket.on('error', () => process.exit(3));
    `;
    try {
      const blocked = await run('node', ['scripts/hosted-db-guard.js', 'strip', '--', 'node', '-e', connector], {
        ...process.env,
        DATABASE_URL: poison,
        POSTGRES_URL: poison,
      });
      expect(blocked.code).toBe(0);
      expect(listener.hits()).toBe(0);

      const control = await run('node', ['-e', connector], {
        ...process.env,
        DATABASE_URL: poison,
        POSTGRES_URL: '',
      });
      expect(control.code).toBe(0);
      expect(listener.hits()).toBe(1);
    } finally {
      await listener.close();
    }
  });

  test('npm test strips a poisoned database URL before Jest starts', async () => {
    const listener = await listen();
    const poison = `postgresql://poison-user:poison-secret@127.0.0.1:${listener.port}/neondb`;
    try {
      const result = await run(
        'npm',
        ['test', '-w', '@patchversion/engine', '--', 'test/hosted-db-isolation.test.ts', '-t', 'marker-unset'],
        { ...process.env, DATABASE_URL: poison, POSTGRES_URL: poison },
      );
      expect(result.code).toBe(0);
      expect(exposesSecret(result.stdout + result.stderr)).toBe(false);
      expect(listener.hits()).toBe(0);
    } finally {
      await listener.close();
    }
  }, 60000);

  test('live test launcher replaces a hosted URL with the disposable local database', async () => {
    const result = await run(
      'node',
      [
        'scripts/hosted-db-guard.js',
        'local-test',
        '--',
        'node',
        '-e',
        `const u = new URL(process.env.DATABASE_URL);
         if (u.hostname !== '127.0.0.1' || u.port !== '5432' || u.pathname !== '/patchbay_test') process.exit(2);
         if (process.env.POSTGRES_URL) process.exit(3);
         if (process.env.STRICT_DB_CHECK !== 'true') process.exit(4);
         if ((process.env.DATABASE_URL || '').includes('poison-secret')) process.exit(5);
         process.exit(0);`,
      ],
      { ...process.env, DATABASE_URL: HOSTED_URL, POSTGRES_URL: HOSTED_URL },
    );
    expect(result.code).toBe(0);
    expect(exposesSecret(result.stdout + result.stderr)).toBe(false);
  });

  test('ordinary commands strip database URLs and do not call migration CLIs', () => {
    const root = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    const site = JSON.parse(fs.readFileSync(path.join(repoRoot, 'packages/site/package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    const engine = JSON.parse(fs.readFileSync(path.join(repoRoot, 'packages/engine/package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    for (const name of ['test', 'build', 'lint', 'prove', 'prove:real', 'readiness', 'typecheck']) {
      expect(root.scripts[name]).toContain('hosted-db-guard.js strip');
      expect(root.scripts[name]).not.toMatch(/db:(migrate|status|verify)|cli-migrate|db-check-002/);
    }
    expect(root.scripts['test:postgres']).toContain('hosted-db-guard.js local-test');
    expect(root.scripts['test:postgres']).toContain('npm run test:postgres -w @patchversion/engine');
    expect(root.scripts['db:check-002']).toBe('node scripts/db-check-002.js');
    expect(engine.scripts['test:postgres']).toContain('hosted-db-guard.js local-test');
    expect(engine.scripts['test:postgres']).toContain('test/postgres-live.integration.test.ts');
    expect(engine.scripts['test:postgres']).toContain('test/lifecycle-replay-store.test.ts');
    expect(engine.scripts['test:postgres']).not.toContain('durable-job-queue');
    for (const name of ['dev', 'build', 'start', 'test']) {
      expect(site.scripts[name]).toContain('hosted-db-guard.js strip');
      expect(site.scripts[name]).not.toMatch(/db:(migrate|status|verify)|cli-migrate/);
    }
    const workflow = fs.readFileSync(path.join(repoRoot, '.github/workflows/ci.yml'), 'utf8');
    expect(workflow).not.toMatch(/db:(migrate|status|verify)|cli-migrate|db-check-002/);
    for (const file of ['scripts/cloud-agent-install.sh', 'scripts/cloud-agent-start.sh']) {
      const source = fs.readFileSync(path.join(repoRoot, file), 'utf8');
      expect(source).not.toMatch(/db:(migrate|status|verify)|cli-migrate|db-check-002/);
      expect(source).toContain('export DATABASE_URL=');
      expect(source).toContain('export POSTGRES_URL=');
    }
    expect([...check.ALLOWED_SQL].every((sql) => check.SESSION_STATEMENTS.includes(sql) || /^\s*SELECT\b/i.test(sql))).toBe(true);
    expect([...check.ALLOWED_SQL].join('\n')).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE)\b/i);
    expect(exposesSecret(guard.redact('postgresql://user:poison-secret@example.test/db'))).toBe(false);
    expect(guard.classifyDatabaseUrl(HOSTED_URL)).toBe('hosted');
    expect(guard.classifyDatabaseUrl(guard.LOCAL_TEST_URL)).toBe('local');
    expect(guard.classifyDatabaseUrl('postgresql://user:secret@10.1.2.3/neondb')).toBe('ambiguous');
    expect(guard.classifyDatabaseUrl('postgresql://user:secret@0.0.0.0/neondb')).toBe('loopback-other');
    expect(guard.stripDatabaseEnv({ DATABASE_URL: HOSTED_URL, POSTGRES_URL: HOSTED_URL }).DATABASE_URL).toBe('');
    expect(guard.assertDisposableLocalDatabase('')).toBe('');
  });

  test('direct jest fails closed before opening a database connection', async () => {
    const listener = await listen();
    const poison = `postgresql://poison-user:poison-secret@127.0.0.1:${listener.port}/neondb`;
    try {
      const result = await run(
        path.join(repoRoot, 'node_modules/.bin/jest'),
        ['--runInBand', '--forceExit', 'test/hosted-db-isolation.test.ts', '-t', 'marker-unset'],
        { ...process.env, DATABASE_URL: poison, POSTGRES_URL: poison },
        path.join(repoRoot, 'packages/engine'),
      );
      expect(result.code).not.toBe(0);
      expect(exposesSecret(result.stdout + result.stderr)).toBe(false);
      expect(result.stdout + result.stderr).toContain('Refusing hosted database URL');
      expect(listener.hits()).toBe(0);
    } finally {
      await listener.close();
    }
  }, 60000);

  test('an empty database variable is not refilled from a Next.js env file', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-env-'));
    fs.writeFileSync(
      path.join(dir, '.env'),
      'DATABASE_URL=postgresql://poison-user:poison-secret@ep-example.neon.tech/neondb\nPOSTGRES_URL=postgresql://poison-user:poison-secret@ep-example.neon.tech/neondb\n',
    );
    const script = `
      const { loadEnvConfig } = require('@next/env');
      loadEnvConfig(process.argv[1], true, { info() {}, error() {} });
      const text = (process.env.DATABASE_URL || '') + '\\n' + (process.env.POSTGRES_URL || '');
      if (text.includes('poison-secret') || text.includes('neon.tech')) process.exit(2);
      if ((process.env.DATABASE_URL || '') !== '' || (process.env.POSTGRES_URL || '') !== '') process.exit(3);
      process.exit(0);
    `;
    try {
      const result = await run('node', ['scripts/hosted-db-guard.js', 'strip', '--', 'node', '-e', script, dir], {
        ...process.env,
        DATABASE_URL: HOSTED_URL,
        POSTGRES_URL: HOSTED_URL,
      });
      expect(result.code).toBe(0);
      expect(exposesSecret(result.stdout + result.stderr)).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('db:check-002 target gate', () => {
  const hosted = 'postgresql://poison-user:poison-secret@ep-example.neon.tech/neondb';

  test('missing, local, disposable, and ambiguous targets are blocked before a client exists', async () => {
    const listener = await listen();
    const cases = [
      { env: { DATABASE_URL: '', POSTGRES_URL: '' }, reason: 'missing-url' },
      { env: { DATABASE_URL: guard.LOCAL_TEST_URL, POSTGRES_URL: '' }, reason: 'local-target' },
      { env: { DATABASE_URL: `postgresql://patchbay_test:credential-do-not-print@127.0.0.1:${listener.port}/patchbay_test`, POSTGRES_URL: '' }, reason: 'local-target' },
      { env: { DATABASE_URL: 'postgresql://user:credential-do-not-print@localhost/neondb', POSTGRES_URL: '' }, reason: 'local-target' },
      { env: { DATABASE_URL: 'not a database url', POSTGRES_URL: '' }, reason: 'unparseable' },
      { env: { DATABASE_URL: 'postgresql://user:credential-do-not-print@10.1.2.3/neondb', POSTGRES_URL: '' }, reason: 'ambiguous-target' },
      { env: { DATABASE_URL: hosted, POSTGRES_URL: guard.LOCAL_TEST_URL }, reason: 'ambiguous-url' },
      { env: { DATABASE_URL: `${hosted}?host=127.0.0.1`, POSTGRES_URL: '' }, reason: 'connection-override' },
      { env: { DATABASE_URL: 'postgresql://user:credential-do-not-print@ep-example.neon.tech/patchbay_test', POSTGRES_URL: '' }, reason: 'unintended-database' },
    ];
    try {
      for (const item of cases) {
        let constructed = 0;
        const decision = check.resolveCheckTarget(item.env);
        expect(decision.status).toBe('BLOCKED');
        expect(decision.reason).toBe(item.reason);
        const result = await check.runCheck(item.env, () => {
          constructed += 1;
          throw new Error('client must not be constructed');
        });
        expect(constructed).toBe(0);
        expect(result.exitCode).toBe(3);
        expect(result.stdout).toContain(`BLOCKED reason=${item.reason}`);
        expect(result.stdout).not.toMatch(/PASS/i);
        expect(result.stdout).not.toContain('migration_002=');
        expect(exposesSecret(result.stdout + result.stderr)).toBe(false);
      }
      expect(listener.hits()).toBe(0);
    } finally {
      await listener.close();
    }
  });

  test('a production-like URL is classified hosted and this audit does not connect to it', () => {
    const decision = check.resolveCheckTarget({ DATABASE_URL: hosted, POSTGRES_URL: hosted });
    expect(decision.status).toBe('HOSTED');
    expect(decision.reason).toBe('explicit-hosted');
    expect(guard.resolveDatabaseTarget(hosted).kind).toBe('hosted');
    expect(exposesSecret(JSON.stringify({ status: decision.status, reason: decision.reason }))).toBe(false);
  });

  test('hosted inspection uses a fake client and only read-only statements', async () => {
    const queries: string[] = [];
    const result = await check.runCheck({ DATABASE_URL: hosted, POSTGRES_URL: '' }, () => ({
      connect: async () => undefined,
      query: async (sql: string) => {
        queries.push(sql);
        if (sql.startsWith('SHOW')) return { rows: [{ default_transaction_read_only: 'on' }], rowCount: 1 };
        return { rows: [{}], rowCount: 1 };
      },
      end: async () => undefined,
    }));
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('HOSTED target=hosted');
    expect(result.stdout).toContain('migration_002=applied');
    expect(result.stdout).not.toMatch(/\bPASS\b/);
    expect(queries).toEqual([
      'SET default_transaction_read_only = on',
      'SHOW default_transaction_read_only',
      'BEGIN READ ONLY',
      ...check.READ_ONLY_QUERIES,
      'ROLLBACK',
    ]);
    expect(exposesSecret(result.stdout + result.stderr)).toBe(false);
  });

  test('read-only rejection issues no SELECT', async () => {
    const queries: string[] = [];
    const result = await check.runCheck({ DATABASE_URL: hosted, POSTGRES_URL: '' }, () => ({
      connect: async () => undefined,
      query: async (sql: string) => {
        queries.push(sql);
        if (sql.startsWith('SHOW')) return { rows: [{ default_transaction_read_only: 'off' }], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      },
      end: async () => undefined,
    }));
    expect(result.exitCode).toBe(1);
    expect(queries).toEqual(['SET default_transaction_read_only = on', 'SHOW default_transaction_read_only']);
    expect(result.stderr).toContain('read-only');
  });

  test('connection failures redact credentials', async () => {
    const result = await check.runCheck({ DATABASE_URL: hosted, POSTGRES_URL: '' }, () => ({
      connect: async () => {
        throw new Error(`password authentication failed for postgresql://poison-user:poison-secret@ep-example.neon.tech/neondb password=poison-secret`);
      },
      query: async () => ({ rows: [], rowCount: 0 }),
      end: async () => undefined,
    }));
    expect(result.exitCode).toBe(1);
    expect(exposesSecret(result.stdout + result.stderr)).toBe(false);
    expect(result.stderr).toContain('***');
  });
});

const localPostgres = (() => {
  try {
    const ready = spawnSync('pg_isready', ['-q', '-h', '127.0.0.1', '-p', '5432'], { stdio: 'ignore' });
    return ready.status === 0;
  } catch {
    return false;
  }
})();

(localPostgres ? describe : describe.skip)('db:check-002 against disposable local postgres', () => {
  async function publicTables(): Promise<string[]> {
    const client = new Client({ connectionString: guard.LOCAL_TEST_URL, connectionTimeoutMillis: 3000 });
    await client.connect();
    try {
      const rows = await client.query<{ name: string }>(
        `SELECT table_schema || '.' || table_name AS name
         FROM information_schema.tables
         WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
         ORDER BY 1`,
      );
      return rows.rows.map((row) => row.name);
    } finally {
      await client.end();
    }
  }

  test('a localhost process reports BLOCKED and does not change schema', async () => {
    const before = await publicTables();
    const result = await run('node', ['scripts/db-check-002.js'], {
      ...process.env,
      DATABASE_URL: guard.LOCAL_TEST_URL,
      POSTGRES_URL: '',
      npm_lifecycle_event: '',
    });
    const after = await publicTables();
    const output = result.stdout + result.stderr;
    expect(result.code).toBe(3);
    expect(output).toContain('BLOCKED reason=local-target');
    expect(output).not.toMatch(/PASS/i);
    expect(output).not.toContain('migration_002=');
    expect(exposesSecret(output)).toBe(false);
    expect(after).toEqual(before);
  });
});
