import { createRequire } from 'module';
import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { redactCliError } from '../src/db/cli-migrate';
import { assertDirectWorkerStartup, authorizationMatchesWorkerBearer } from '../src/sandbox/worker-service';

const load = createRequire(__filename);
const guard = load('../../../scripts/hosted-db-guard.js') as {
  LOCAL_TEST_URL: string;
  resolveOperatorDatabaseTarget: (env: NodeJS.ProcessEnv) => {
    ok: boolean;
    reason: string;
    kind?: string;
    connectionString?: string;
  };
};

const repoRoot = path.resolve(__dirname, '../../..');
const HOSTED_URL = 'postgresql://poison-user:poison-secret@ep-example.neon.tech/neondb';
const AUTH_TOKEN = 'worker-token-explicit-16';

function exposesSecret(text: string): boolean {
  return (
    text.includes('poison-secret') ||
    text.includes('credential-do-not-print') ||
    text.includes('patchbay_test_password') ||
    /postgres(?:ql)?:\/\/[^/\s]*:[^/\s@]*@/i.test(text)
  );
}

function run(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: repoRoot, env, stdio: ['ignore', 'pipe', 'pipe'] });
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
    socket.destroy();
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

const CATALOG_SQL =
  "SELECT n.nspname || '.' || c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND c.relkind = 'r' ORDER BY 1";

// The default CI test job has no PostgreSQL. A catalog snapshot is only
// meaningful when the disposable local server is actually accepting connections.
function catalog(): string | null {
  const ready = spawnSync('pg_isready', ['-q', '-h', '127.0.0.1', '-p', '5432'], { encoding: 'utf8' });
  if (ready.error || ready.status !== 0) return null;
  const url = new URL(guard.LOCAL_TEST_URL);
  const password = decodeURIComponent(url.password);
  const env: NodeJS.ProcessEnv = { ...process.env, PGPASSWORD: password };
  delete env.DATABASE_URL;
  delete env.POSTGRES_URL;
  const result = spawnSync(
    'psql',
    [
      '-h', url.hostname,
      '-p', url.port || '5432',
      '-U', decodeURIComponent(url.username),
      '-d', decodeURIComponent(url.pathname.replace(/^\//, '')),
      '-v', 'ON_ERROR_STOP=1',
      '-Atc', CATALOG_SQL,
    ],
    { encoding: 'utf8', env },
  );
  if (result.status !== 0) {
    const detail = `${result.stderr || ''}${result.stdout || ''}`.split(password).join('***');
    throw new Error(`catalog read failed status=${result.status ?? 'null'} ${detail}`);
  }
  return result.stdout;
}

function expectCatalogUnchanged(before: string | null): void {
  if (before === null) return;
  expect(catalog()).toBe(before);
}

describe('direct database entry points', () => {
  beforeAll(() => {
    const compiled = spawnSync('npx', ['tsc', '-p', 'packages/engine/tsconfig.json', '--pretty', 'false'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    if (compiled.status !== 0) {
      throw new Error(compiled.stdout + compiled.stderr);
    }
  }, 120000);

  test('migration CLI without a target fails closed and does not invent localhost', async () => {
    const before = catalog();
    const result = await run('node', ['packages/engine/dist/db/cli-migrate.js', 'up'], {
      ...process.env,
      DATABASE_URL: '',
      POSTGRES_URL: '',
    });
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain('missing-url');
    expect(result.stderr).toContain('No connection was opened');
    expect(result.stdout + result.stderr).not.toContain('localhost:5432/patchversion');
    expect(exposesSecret(result.stdout + result.stderr)).toBe(false);
    expectCatalogUnchanged(before);
  });

  test('malformed, override, and disagreeing targets do not connect elsewhere', async () => {
    const explicit = await listen();
    const elsewhere = await listen();
    const before = catalog();
    const secret = 'credential-do-not-print';
    const cases = [
      { DATABASE_URL: 'not a database url', POSTGRES_URL: '' },
      {
        DATABASE_URL: `postgresql://patchbay_test:${secret}@127.0.0.1:${explicit.port}/patchbay_test?host=127.0.0.1&port=${elsewhere.port}`,
        POSTGRES_URL: '',
      },
      {
        DATABASE_URL: `postgresql://patchbay_test:${secret}@127.0.0.1:${explicit.port}/patchbay_test`,
        POSTGRES_URL: `postgresql://patchbay_test:${secret}@127.0.0.1:${elsewhere.port}/patchbay_test`,
      },
      { DATABASE_URL: `postgresql://patchbay_test:${secret}@0.0.0.0:${explicit.port}/patchbay_test`, POSTGRES_URL: '' },
    ];
    try {
      for (const item of cases) {
        const result = await run('node', ['packages/engine/dist/db/cli-migrate.js', 'up'], {
          ...process.env,
          DATABASE_URL: item.DATABASE_URL,
          POSTGRES_URL: item.POSTGRES_URL,
        });
        expect(result.code).not.toBe(0);
        expect(result.stderr).toContain('No connection was opened');
        expect(exposesSecret(result.stdout + result.stderr)).toBe(false);
      }
      expect(explicit.hits()).toBe(0);
      expect(elsewhere.hits()).toBe(0);
      expectCatalogUnchanged(before);
    } finally {
      await explicit.close();
      await elsewhere.close();
    }
  });

  test('an explicit local target is not redirected to another port', async () => {
    const explicit = await listen();
    const elsewhere = await listen();
    const secret = 'credential-do-not-print';
    try {
      const result = await run('node', ['packages/engine/dist/db/cli-migrate.js', 'verify'], {
        ...process.env,
        DATABASE_URL: `postgresql://patchbay_test:${secret}@127.0.0.1:${explicit.port}/patchbay_test`,
        POSTGRES_URL: '',
      });
      expect(result.code).not.toBe(0);
      expect(explicit.hits()).toBeGreaterThan(0);
      expect(elsewhere.hits()).toBe(0);
      expect(exposesSecret(result.stdout + result.stderr)).toBe(false);
      expect(result.stdout + result.stderr).not.toContain(`127.0.0.1:${elsewhere.port}`);
    } finally {
      await explicit.close();
      await elsewhere.close();
    }
  }, 15000);

  test('connection errors redact userinfo and the raw connection string', () => {
    const message = redactCliError(
      new Error('connect failed postgresql://poison-user:poison-secret@ep-example.neon.tech/neondb password=poison-secret'),
      ['poison-secret'],
    );
    expect(exposesSecret(message)).toBe(false);
    expect(message).toContain('***');
  });

  test('a hosted operator target is accepted without opening a connection', () => {
    const decision = guard.resolveOperatorDatabaseTarget({ DATABASE_URL: HOSTED_URL, POSTGRES_URL: HOSTED_URL });
    expect(decision.ok).toBe(true);
    expect(decision.kind).toBe('hosted');
    expect(decision.connectionString).toBe(HOSTED_URL);
  });

  test('db:status without DDL acknowledgement does not connect', async () => {
    const explicit = await listen();
    const before = catalog();
    try {
      const result = await run('node', ['packages/engine/dist/db/cli-migrate.js', 'status'], {
        ...process.env,
        DATABASE_URL: `postgresql://patchbay_test:credential-do-not-print@127.0.0.1:${explicit.port}/patchbay_test`,
        POSTGRES_URL: '',
        PATCHVERSION_ACK_STATUS_DDL: '',
      });
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain('schema_migrations');
      expect(result.stderr).toContain('PATCHVERSION_ACK_STATUS_DDL=1');
      expect(explicit.hits()).toBe(0);
      expect(exposesSecret(result.stdout + result.stderr)).toBe(false);
      expectCatalogUnchanged(before);
    } finally {
      await explicit.close();
    }
  });

  test('direct worker startup without authorization fails closed', async () => {
    const explicit = await listen();
    const secret = 'credential-do-not-print';
    try {
      expect(() =>
        assertDirectWorkerStartup({
          WORKER_AUTH_TOKEN: AUTH_TOKEN,
          DATABASE_URL: `postgresql://patchbay_test:${secret}@127.0.0.1:${explicit.port}/patchbay_test`,
        }),
      ).toThrow(/PATCHVERSION_ALLOW_WORKER_DATABASE=1/);

      const result = await run('node', ['packages/engine/dist/sandbox/worker-service.js'], {
        ...process.env,
        WORKER_AUTH_TOKEN: AUTH_TOKEN,
        WORKER_SIGNING_SECRET: 'worker-signing-secret-at-least-32-chars',
        DATABASE_URL: `postgresql://patchbay_test:${secret}@127.0.0.1:${explicit.port}/patchbay_test`,
        POSTGRES_URL: '',
        PATCHVERSION_ALLOW_WORKER_DATABASE: '',
      });
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain('PATCHVERSION_ALLOW_WORKER_DATABASE=1');
      expect(explicit.hits()).toBe(0);
      expect(exposesSecret(result.stdout + result.stderr)).toBe(false);
    } finally {
      await explicit.close();
    }
  });

  test('authorized worker startup still rejects a malformed database target', () => {
    expect(() =>
      assertDirectWorkerStartup({
        WORKER_AUTH_TOKEN: AUTH_TOKEN,
        PATCHVERSION_ALLOW_WORKER_DATABASE: '1',
        DATABASE_URL: 'not a database url',
      }),
    ).toThrow(/unparseable/);
    expect(authorizationMatchesWorkerBearer(`Bearer ${AUTH_TOKEN}`, AUTH_TOKEN)).toBe(true);
    expect(authorizationMatchesWorkerBearer('Bearer wrong-token-value', AUTH_TOKEN)).toBe(false);
  });

  test('routine scripts strip hosted credentials and do not acknowledge status DDL', () => {
    const packages = ['package.json', 'packages/engine/package.json', 'packages/site/package.json', 'packages/shared/package.json'];
    const explicitDatabase = new Set([
      'db:check-002',
      'db:migrate',
      'db:status',
      'db:verify',
      'test:postgres',
    ]);
    for (const file of packages) {
      const body = JSON.parse(fs.readFileSync(path.join(repoRoot, file), 'utf8')) as { scripts: Record<string, string> };
      for (const [name, script] of Object.entries(body.scripts)) {
        expect(script).not.toContain('PATCHVERSION_ACK_STATUS_DDL');
        expect(script).not.toContain('PATCHVERSION_ALLOW_WORKER_DATABASE');
        if (explicitDatabase.has(name)) continue;
        expect(script).toContain('hosted-db-guard.js strip');
        expect(script).not.toMatch(/cli-migrate|db:status|db:migrate|db:verify/);
      }
    }
    const root = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
    expect(root.scripts['db:migrate']).toContain('hosted-db-guard.js strip');
    expect(root.scripts['db:status']).toContain('hosted-db-guard.js strip');
    expect(root.scripts['db:verify']).toContain('hosted-db-guard.js strip');
    expect(root.scripts['test:postgres']).toContain('hosted-db-guard.js local-test');
    const workflow = fs.readFileSync(path.join(repoRoot, '.github/workflows/ci.yml'), 'utf8');
    expect(workflow).not.toMatch(/db:status|cli-migrate|PATCHVERSION_ACK_STATUS_DDL|PATCHVERSION_ALLOW_WORKER_DATABASE/);
    const cli = fs.readFileSync(path.join(repoRoot, 'packages/engine/src/db/cli-migrate.ts'), 'utf8');
    expect(cli).not.toContain('localhost:5432/patchversion');
    const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
    expect(readme).toContain('raw `node` or `psql`');
    expect(readme).toContain('PATCHVERSION_ACK_STATUS_DDL=1');
  });
});
