import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { PatchversionDatabase } from '../src/db/database';
import { GitHubClient, OfflineMockTransport } from '../src';
import { WorkflowOrchestrator } from '../src/jobs/orchestrator';
import {
  LocalTrustedFixtureProvider,
  ProductionIsolatedExecutionProvider,
  UnavailableExecutionProvider,
  createJobSignature,
  type IExecutionProvider,
  type IDisposableWorkspace,
  type WorkspaceProvisionOptions,
} from '../src/sandbox/execution-provider';
import {
  resolveExecutionProvider,
  isQualifiedIsolationActive,
  isIndependentlyQualifiedIsolation,
  TEST_DOUBLE_ISOLATED_PROVIDER_NAME,
  assertStrongSigningSecret,
} from '../src/sandbox/provider-adapter';
import { MicroVMFleetProvider } from '../src/sandbox/microvm-fleet-provider';
import { WorkerExecutionService } from '../src/sandbox/worker-service';

/**
 * Hostile R-EXEC cases documented here:
 * - Env flags / health JSON / sandboxMode cannot enable customer execution.
 * - Unavailable isolation fails closed (no host SandboxRunner fallback).
 * - Default fleet HMAC secrets are refused.
 * - Worker auth is mandatory; unauthenticated workers do not start.
 * - Fixture jobs stay labeled fixture-verified.
 * - Test double proves injection without spawning customer suites.
 * Cannot be implemented locally: Firecracker/KVM, netns, cgroups, one microVM per job.
 */

class IsolatedExecutionTestDouble implements IExecutionProvider {
  readonly name = TEST_DOUBLE_ISOLATED_PROVIDER_NAME;
  readonly type = 'microvm' as const;
  readonly independentlyQualified = true;
  createWorkspaceCalls = 0;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async createWorkspace(_options?: WorkspaceProvisionOptions): Promise<IDisposableWorkspace> {
    this.createWorkspaceCalls += 1;
    void _options;
    return {
      workspaceId: 'test-double-no-spawn',
      isCleanedUp: false,
      async execute() {
        throw new Error('Test double must not spawn customer commands');
      },
      async applyPatch() {
        return { success: false, changedFiles: [], error: 'test-double-no-patch' };
      },
      async cleanup() {
        /* no-op */
      },
    };
  }
}

class FakeQualifiedNamedWrong implements IExecutionProvider {
  readonly name = 'microvm-fleet-provider';
  readonly type = 'microvm' as const;
  readonly independentlyQualified = true;
  async isAvailable(): Promise<boolean> {
    return true;
  }
  async createWorkspace(): Promise<IDisposableWorkspace> {
    throw new Error('must not be selected');
  }
}

describe('R-EXEC fail-closed isolation (local, unqualified)', () => {
  const signingSecret = 'r-exec-unique-signing-secret-32';
  let tmpDir: string;
  let db: PatchversionDatabase;
  let tenantId: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `r-exec-${crypto.randomBytes(6).toString('hex')}`);
    db = new PatchversionDatabase(tmpDir);
    tenantId = db.createTenant('R-EXEC Corp').id;
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  function saveCustomerFinding() {
    const inst = db.saveInstallation(tenantId, 4242, 'customer-org');
    const repo = db.saveRepository(tenantId, inst.id, {
      id: `repo_${crypto.randomBytes(3).toString('hex')}`,
      githubRepoId: 88001,
      fullName: 'customer-org/payments-api',
      owner: 'customer-org',
      name: 'payments-api',
      defaultBranch: 'main',
      isPrivate: true,
      isDemo: false,
      localPath: '/tmp/untrusted-customer-clone',
    });
    const finding = db.saveFinding(tenantId, repo.id, {
      packageName: 'lodash',
      fromVersion: '3.10.1',
      toVersion: '4.17.21',
      isBreaking: true,
      changeRecord: {
        id: 'c_lodash_rexec',
        packageName: 'lodash',
        ecosystem: 'npm',
        fromVersion: '3.10.1',
        toVersion: '4.17.21',
        detectedAt: '',
        source: 'registry',
        sourceUrl: '',
        rawNotes: '',
        classification: { isBreaking: true, confidence: 1, affectedExports: [], reason: '' },
        severity: 'breaking',
      },
      impactAnalysis: {
        changeId: 'c_lodash_rexec',
        repoId: repo.id,
        affectedCallSites: [],
        unaffectedCallSites: [],
        coveragePercent: 0,
        analyzedAt: '',
      },
      status: 'open',
    });
    return finding;
  }

  test('unavailable isolation fails closed and does not spawn customer jobs', async () => {
    const github = new GitHubClient(null, new OfflineMockTransport());
    const orchestrator = new WorkflowOrchestrator(db, github);
    const finding = saveCustomerFinding();

    await expect(orchestrator.generateAndValidateFix(tenantId, finding.id)).rejects.toThrow(
      /execution for live repository "customer-org\/payments-api" is disabled/i,
    );
  });

  test('env flags cannot enable customer execution or qualify isolation', async () => {
    process.env.QUALIFIED_ISOLATION_BACKEND = 'firecracker';
    process.env.MICROVM_FLEET_URL = 'https://fleet.example.internal';
    process.env.PATCHVERSION_SANDBOX_MODE = 'microvm';
    process.env.MICROVM_SIGNING_SECRET = signingSecret;

    try {
      expect(isQualifiedIsolationActive()).toBe(false);
      const provider = resolveExecutionProvider();
      expect(provider).toBeInstanceOf(UnavailableExecutionProvider);
      expect(provider.type).toBe('unavailable');

      const github = new GitHubClient(null, new OfflineMockTransport());
      const orchestrator = new WorkflowOrchestrator(db, github, undefined, {
        executionProvider: resolveExecutionProvider(),
      });
      const finding = saveCustomerFinding();
      await expect(orchestrator.generateAndValidateFix(tenantId, finding.id)).rejects.toThrow(
        /execution for live repository/i,
      );
    } finally {
      delete process.env.QUALIFIED_ISOLATION_BACKEND;
      delete process.env.MICROVM_FLEET_URL;
      delete process.env.PATCHVERSION_SANDBOX_MODE;
      delete process.env.MICROVM_SIGNING_SECRET;
    }
  });

  test('test double is the only injectable independently qualified provider and still does not run customer suites', async () => {
    const double = new IsolatedExecutionTestDouble();
    expect(isIndependentlyQualifiedIsolation(double)).toBe(true);

    const rejected = resolveExecutionProvider({ independentlyQualifiedProvider: new FakeQualifiedNamedWrong() });
    expect(rejected).toBeInstanceOf(UnavailableExecutionProvider);

    const selected = resolveExecutionProvider({ independentlyQualifiedProvider: double });
    expect(selected.name).toBe(TEST_DOUBLE_ISOLATED_PROVIDER_NAME);

    const github = new GitHubClient(null, new OfflineMockTransport());
    const orchestrator = new WorkflowOrchestrator(db, github, undefined, {
      executionProvider: selected,
    });
    const finding = saveCustomerFinding();
    await expect(orchestrator.generateAndValidateFix(tenantId, finding.id)).rejects.toThrow(
      /test double cannot run customer suites/i,
    );
  });

  test('default HMAC secrets are refused', () => {
    expect(() => assertStrongSigningSecret('trypatchbay-default-fleet-signing-secret')).toThrow(
      /Forbidden default fleet HMAC secret/i,
    );
    expect(() => new LocalTrustedFixtureProvider('trypatchbay-default-fleet-signing-secret')).toThrow(
      /Forbidden default fleet HMAC secret/i,
    );
    expect(() =>
      new MicroVMFleetProvider({
        signingSecret: 'dev-worker-signing-secret-key-32b',
        emulateLocalMicroVM: true,
      }),
    ).toThrow(/Forbidden default fleet HMAC secret/i);
    expect(() =>
      createJobSignature(
        {
          jobId: 'j',
          tenantId: 't',
          repoId: 'r',
          repoFullName: 'o/r',
          sourceLocation: 'fixtures/sample-repo',
          changeId: 'c',
          commands: [],
          nonce: 'n',
          expiresAt: Date.now() + 1000,
        },
        'trypatchbay-default-fleet-signing-secret',
      ),
    ).toThrow(/Forbidden default fleet HMAC secret/i);
  });

  test('worker auth is mandatory; fleet health is unqualified and authenticated', async () => {
    expect(() => new WorkerExecutionService({ signingSecret, authToken: '' } as never)).toThrow(
      /WORKER_AUTH_TOKEN/i,
    );
    expect(
      () =>
        new MicroVMFleetProvider({
          signingSecret,
          fleetEndpoint: 'http://127.0.0.1:9',
        }),
    ).toThrow(/auth token/i);

    const worker = new WorkerExecutionService({
      signingSecret,
      authToken: 'mandatory-worker-token-16',
    });
    const port = await worker.start(0);
    try {
      const unauth = await fetch(`http://127.0.0.1:${port}/v1/fleet/health`);
      expect(unauth.status).toBe(401);

      const auth = await fetch(`http://127.0.0.1:${port}/v1/fleet/health`, {
        headers: { Authorization: 'Bearer mandatory-worker-token-16' },
      });
      expect(auth.status).toBe(200);
      const health = await auth.json();
      expect(health.isolationQualified).toBe(false);
      expect(health.provider).toBe('local-trusted-fixture-worker');
      expect(health.status).toBe('unqualified');
    } finally {
      await worker.stop();
    }
  });

  test('production isolated provider rejects missing worker token even with a URL', async () => {
    const prod = new ProductionIsolatedExecutionProvider(signingSecret, 'http://127.0.0.1:9');
    const result = await prod.submitJob({
      jobId: 'j1',
      tenantId: 't1',
      repoId: 'r1',
      repoFullName: 'o/r',
      sourceLocation: 'https://github.com/o/r',
      changeId: 'c',
      commands: [],
      nonce: 'n1',
      expiresAt: Date.now() + 60_000,
      signature: '00',
    });
    expect(result.status).toBe('rejected');
    expect(result.reason).toMatch(/worker auth token is not configured/i);
  });

  test('artifacts are tenant-bound', async () => {
    const tmpFixtureDir = path.join(os.tmpdir(), `r-exec-fx-${crypto.randomBytes(4).toString('hex')}`);
    fs.mkdirSync(path.join(tmpFixtureDir, 'fixtures', 'sample-repo'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpFixtureDir, 'fixtures', 'sample-repo', 'package.json'),
      JSON.stringify({ name: 'sample-repo', version: '1.0.0' }),
    );
    const provider = new LocalTrustedFixtureProvider(signingSecret, { fixtureRootDir: tmpFixtureDir });
    const unsigned = {
      jobId: `job_${crypto.randomBytes(4).toString('hex')}`,
      tenantId: 'tenant_a',
      repoId: 'repo_a',
      repoFullName: 'org/a',
      sourceLocation: 'fixtures/sample-repo',
      changeId: 'chg',
      commands: [
        {
          executable: process.platform === 'win32' ? 'cmd.exe' : 'echo',
          args: process.platform === 'win32' ? ['/c', 'echo tenant_ok'] : ['tenant_ok'],
        },
      ],
      nonce: crypto.randomBytes(16).toString('hex'),
      expiresAt: Date.now() + 60_000,
    };
    const job = { ...unsigned, signature: createJobSignature(unsigned, signingSecret) };
    const sub = await provider.submitJob(job);
    expect(sub.status).toBe('completed');
    const mine = await provider.collectArtifacts(job.jobId, 'tenant_a');
    expect(mine?.tenantId).toBe('tenant_a');
    const other = await provider.collectArtifacts(job.jobId, 'tenant_b');
    expect(other).toBeNull();
    fs.rmSync(tmpFixtureDir, { recursive: true, force: true });
  });

  test('trusted fixture provider is explicit and never selected by default', () => {
    expect(resolveExecutionProvider().name).toBe('unavailable-execution-provider');
    const fixture = resolveExecutionProvider({
      allowTrustedFixtureProvider: true,
      signingSecret,
    });
    expect(fixture).toBeInstanceOf(LocalTrustedFixtureProvider);
  });
});
