import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import {
  MicroVMFleetProvider,
  MicroVMFleetUnavailableError,
  createJobSignature,
  verifyJobSignature,
  createArtifactsSignature,
  verifyArtifactsSignature,
  ExecutionJob,
  WorkerExecutionService,
  resolveExecutionProvider,
  isQualifiedIsolationActive,
} from '../src';

describe('Cloud MicroVM Fleet Provider - Enterprise Execution Boundary', () => {
  jest.setTimeout(25_000);
  const signingSecret = 'sec-microvm-signing-secret-token-64b';
  let tmpFixtureDir: string;
  let sampleFixturePath: string;

  beforeAll(() => {
    tmpFixtureDir = path.join(os.tmpdir(), `fixtures-fleet-${crypto.randomBytes(6).toString('hex')}`);
    fs.mkdirSync(tmpFixtureDir, { recursive: true });

    sampleFixturePath = path.join(tmpFixtureDir, 'fixtures', 'sample-repo');
    fs.mkdirSync(sampleFixturePath, { recursive: true });
    fs.writeFileSync(
      path.join(sampleFixturePath, 'package.json'),
      JSON.stringify({ name: 'sample-repo', version: '1.0.0' }, null, 2),
    );
    fs.writeFileSync(
      path.join(sampleFixturePath, 'index.js'),
      'console.log("microvm execution verified");',
    );
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpFixtureDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  function createSignedJob(overrides?: Partial<ExecutionJob>): ExecutionJob {
    const rawJob: Omit<ExecutionJob, 'signature'> = {
      jobId: `vm_job_${crypto.randomBytes(8).toString('hex')}`,
      tenantId: 'tenant_enterprise_corp',
      repoId: 'repo_microvm_101',
      repoFullName: 'enterprise/core-repo',
      sourceLocation: 'fixtures/sample-repo',
      changeId: 'change_v2_migration',
      commands: [
        {
          executable: process.execPath,
          args: ['-e', 'console.log("MICROVM_EXECUTION_OK");'],
        },
      ],
      networkPolicy: 'none',
      limits: { timeoutMs: 10_000, maxMemoryMb: 512, cpuCores: 1, maxOutputBytes: 1024 * 1024, maxDiskMb: 1024 },
      nonce: crypto.randomBytes(12).toString('hex'),
      expiresAt: Date.now() + 60_000,
      ...overrides,
    };

    const signature = createJobSignature(rawJob, signingSecret);
    return { ...rawJob, signature };
  }

  describe('1. Health Telemetry & Capacity Reporting', () => {
    it('reports healthy fleet telemetry in emulated mode', async () => {
      const fleet = new MicroVMFleetProvider({
        signingSecret,
        emulateLocalMicroVM: true,
        region: 'iad',
        maxConcurrency: 16,
      });

      const isUp = await fleet.isAvailable();
      expect(isUp).toBe(true);

      const health = await fleet.getFleetHealth();
      expect(health.status).toBe('unqualified');
      expect(health.provider).toBe('host-emulated-not-a-microvm');
      expect(health.isolationQualified).toBe(false);
      expect(health.region).toBe('iad');
      expect(health.maxCapacity).toBe(16);
      expect(health.availableCapacity).toBe(16);
      expect(health.egressPolicySupported).toContain('none');
      expect(health.memoryLimitsMb.default).toBe(512);
    });

    it('reports unavailable and fails closed when remote fleet is unconfigured', async () => {
      const fleet = new MicroVMFleetProvider({
        signingSecret,
        emulateLocalMicroVM: false,
      });

      const isUp = await fleet.isAvailable();
      expect(isUp).toBe(false);

      const health = await fleet.getFleetHealth();
      expect(health.status).toBe('unavailable');
    });
  });

  describe('2. Cryptographic Job Verification & Replay Protection', () => {
    it('accepts and completes a legitimately signed execution job', async () => {
      const fleet = new MicroVMFleetProvider({
        signingSecret,
        emulateLocalMicroVM: true,
        fixtureRootDir: tmpFixtureDir,
      });

      const job = createSignedJob();
      const submission = await fleet.submitJob(job);

      expect(submission.jobId).toBe(job.jobId);
      expect(submission.status).toBe('completed');

      const status = await fleet.getJobStatus(job.jobId);
      expect(status?.status).toBe('completed');
      expect(status?.exitCode).toBe(0);

      const artifacts = await fleet.collectArtifacts(job.jobId, job.tenantId);
      expect(artifacts).not.toBeNull();
      expect(artifacts?.stdout).toContain('MICROVM_EXECUTION_OK');
      expect(artifacts?.signature).toBeDefined();

      await fleet.cleanupJob(job.jobId);
      const afterCleanup = await fleet.getJobStatus(job.jobId);
      expect(afterCleanup).toBeNull();
    });

    it('rejects jobs with tampered or invalid signatures', async () => {
      const fleet = new MicroVMFleetProvider({
        signingSecret,
        emulateLocalMicroVM: true,
        fixtureRootDir: tmpFixtureDir,
      });

      const job = createSignedJob();
      job.signature = 'bad' + job.signature.slice(3);

      const submission = await fleet.submitJob(job);
      expect(submission.status).toBe('rejected');
      expect(submission.reason).toMatch(/signature rejected/i);
    });

    it('rejects expired execution jobs', async () => {
      const fleet = new MicroVMFleetProvider({
        signingSecret,
        emulateLocalMicroVM: true,
        fixtureRootDir: tmpFixtureDir,
      });

      const job = createSignedJob({
        expiresAt: Date.now() - 5_000,
      });

      const submission = await fleet.submitJob(job);
      expect(submission.status).toBe('rejected');
      expect(submission.reason).toMatch(/expired_job/i);
    });

    it('rejects duplicate nonces to prevent replay attacks', async () => {
      const fleet = new MicroVMFleetProvider({
        signingSecret,
        emulateLocalMicroVM: true,
        fixtureRootDir: tmpFixtureDir,
      });

      const sharedNonce = crypto.randomBytes(16).toString('hex');
      const job1 = createSignedJob({ nonce: sharedNonce });
      const job2 = createSignedJob({ nonce: sharedNonce });

      const sub1 = await fleet.submitJob(job1);
      expect(sub1.status).toBe('completed');

      const sub2 = await fleet.submitJob(job2);
      expect(sub2.status).toBe('rejected');
      expect(sub2.reason).toMatch(/nonce replay detected/i);
    });
  });

  describe('3. Artifact Integrity & Anti-Tampering', () => {
    it('verifies artifact signature and detects tampering', async () => {
      const fleet = new MicroVMFleetProvider({
        signingSecret,
        emulateLocalMicroVM: true,
        fixtureRootDir: tmpFixtureDir,
      });

      const job = createSignedJob();
      await fleet.submitJob(job);

      const artifacts = await fleet.collectArtifacts(job.jobId, job.tenantId);
      expect(artifacts).not.toBeNull();
      expect(verifyArtifactsSignature(artifacts!, signingSecret)).toBe(true);

      // Tampered payload verification MUST fail
      const tampered = { ...artifacts!, stdout: artifacts!.stdout + '\nMALICIOUS_INJECT' };
      expect(verifyArtifactsSignature(tampered, signingSecret)).toBe(false);

      await fleet.cleanupJob(job.jobId);
    });
  });

  describe('4. Security Boundaries, Secret Scrubbing & Fail-Closed Behavior', () => {
    it('fails closed when remote fleet is unconfigured and emulated mode is off', async () => {
      const fleet = new MicroVMFleetProvider({
        signingSecret,
        emulateLocalMicroVM: false,
      });

      const job = createSignedJob();
      const submission = await fleet.submitJob(job);
      expect(submission.status).toBe('rejected');
      expect(submission.reason).toMatch(/Fail-Closed/i);

      await expect(fleet.createWorkspace()).rejects.toThrow(MicroVMFleetUnavailableError);
    });

    it('scrubs ambient host environment variables and secrets inside microVM', async () => {
      process.env.MICROVM_TEST_SECRET = 'leak-token-sensitive-xyz-987';
      process.env.AWS_SECRET_ACCESS_KEY = 'aws-secret-should-be-scrubbed';

      const fleet = new MicroVMFleetProvider({
        signingSecret,
        emulateLocalMicroVM: true,
        fixtureRootDir: tmpFixtureDir,
      });

      const job = createSignedJob({
        commands: [
          {
            executable: process.execPath,
            args: [
              '-e',
              'const env = process.env; if (env.MICROVM_TEST_SECRET || env.AWS_SECRET_ACCESS_KEY) { process.exit(42); } else { console.log("SECRETS_SANITIZED_CLEAN"); }',
            ],
          },
        ],
      });

      const submission = await fleet.submitJob(job);
      expect(submission.status).toBe('completed');

      const artifacts = await fleet.collectArtifacts(job.jobId, job.tenantId);
      expect(artifacts?.stdout).toContain('SECRETS_SANITIZED_CLEAN');
      expect(artifacts?.stdout).not.toContain('leak-token-sensitive-xyz-987');

      delete process.env.MICROVM_TEST_SECRET;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      await fleet.cleanupJob(job.jobId);
    });

    it('rejects directory breakout attempts', async () => {
      const fleet = new MicroVMFleetProvider({
        signingSecret,
        emulateLocalMicroVM: true,
        fixtureRootDir: tmpFixtureDir,
      });

      const job = createSignedJob({
        commands: [
          {
            executable: process.execPath,
            args: ['-e', 'console.log("exploit");'],
            cwd: '../../../../../../windows',
          },
        ],
      });

      const submission = await fleet.submitJob(job);
      expect(submission.status).toBe('failed');
      expect(submission.reason).toMatch(/escapes workspace boundary/i);

      await fleet.cleanupJob(job.jobId);
    });
  });

  describe('5. Ephemeral MicroVM Workspace Interface', () => {
    it('provisions, executes commands, applies patch, and terminates workspace cleanly', async () => {
      const fleet = new MicroVMFleetProvider({
        signingSecret,
        emulateLocalMicroVM: true,
        fixtureRootDir: tmpFixtureDir,
      });

      const ws = await fleet.createWorkspace({
        repo: {
          sourceType: 'local-fixture',
          sourceLocation: 'fixtures/sample-repo',
          excludePatterns: [],
        },
        network: 'none',
      });

      expect(ws.workspaceId).toMatch(/^microvm_/);
      expect(ws.isCleanedUp).toBe(false);

      const execRes = await ws.execute({
        executable: process.execPath,
        args: ['-e', 'console.log("WORKSPACE_CMD_OK");'],
      });
      expect(execRes.exitCode).toBe(0);
      expect(execRes.stdout).toContain('WORKSPACE_CMD_OK');

      const patchRes = await ws.applyPatch(
        '--- a/package.json\n+++ b/package.json\n@@ -2,1 +2,1 @@\n-  "version": "1.0.0"\n+  "version": "1.0.1"\n',
      );
      expect(patchRes.success).toBe(true);

      await ws.cleanup();
      expect(ws.isCleanedUp).toBe(true);
      await expect(ws.execute({ executable: 'echo', args: ['done'] })).rejects.toThrow(/already been cleaned up/i);
    });
  });

  describe('6. Remote MicroVM Fleet Worker Service Integration', () => {
    let worker: WorkerExecutionService;
    let workerPort: number;
    const workerToken = 'fleet-auth-token-xyz-123';

    beforeAll(async () => {
      worker = new WorkerExecutionService({
        signingSecret,
        authToken: workerToken,
      });
      workerPort = await worker.start(0);
    });

    afterAll(async () => {
      await worker.stop();
    });

    it('queries remote fleet health probe on /v1/fleet/health', async () => {
      const remoteFleet = new MicroVMFleetProvider({
        fleetEndpoint: `http://127.0.0.1:${workerPort}`,
        authToken: workerToken,
        signingSecret,
      });

      const isUp = await remoteFleet.isAvailable();
      expect(isUp).toBe(true);

      const health = await remoteFleet.getFleetHealth();
      expect(health.status).toBe('unqualified');
      expect(health.provider).toBe('local-trusted-fixture-worker');
      expect(health.isolationQualified).toBe(false);
      expect(health.availableCapacity).toBe(0);
    });

    it('dispatches signed job to remote worker and collects verified artifacts', async () => {
      const remoteFleet = new MicroVMFleetProvider({
        fleetEndpoint: `http://127.0.0.1:${workerPort}`,
        authToken: workerToken,
        signingSecret,
      });

      const unsignedJob: Omit<ExecutionJob, 'signature'> = {
        jobId: `fleet_rem_${crypto.randomBytes(6).toString('hex')}`,
        tenantId: 'tenant_remote_fleet',
        repoId: 'repo_remote_fleet',
        repoFullName: 'org/remote-repo',
        sourceLocation: 'fixtures/sample-repo',
        changeId: 'change_remote',
        commands: [
          {
            executable: process.platform === 'win32' ? 'cmd.exe' : 'echo',
            args: process.platform === 'win32' ? ['/c', 'echo remote_fleet_ok'] : ['remote_fleet_ok'],
          },
        ],
        nonce: crypto.randomBytes(16).toString('hex'),
        expiresAt: Date.now() + 60_000,
      };

      const job: ExecutionJob = {
        ...unsignedJob,
        signature: createJobSignature(unsignedJob, signingSecret),
      };

      const sub = await remoteFleet.submitJob(job);
      expect(sub.jobId).toBe(job.jobId);
      expect(sub.status).toBe('completed');

      const status = await remoteFleet.getJobStatus(job.jobId);
      expect(status?.status).toBe('completed');

      const artifacts = await remoteFleet.collectArtifacts(job.jobId, job.tenantId);
      expect(artifacts).not.toBeNull();
      expect(artifacts?.stdout).toContain('remote_fleet_ok');
      expect(verifyArtifactsSignature(artifacts!, signingSecret)).toBe(true);

      await remoteFleet.cleanupJob(job.jobId);
    });
  });

  describe('7. Provider Adapter & Isolation Gate Resolution', () => {
    it('never treats environment variables as independent isolation qualification', () => {
      const originalBackend = process.env.QUALIFIED_ISOLATION_BACKEND;
      const originalFleet = process.env.MICROVM_FLEET_URL;

      delete process.env.QUALIFIED_ISOLATION_BACKEND;
      delete process.env.MICROVM_FLEET_URL;
      delete process.env.PATCHVERSION_SANDBOX_MODE;
      expect(isQualifiedIsolationActive()).toBe(false);

      process.env.MICROVM_FLEET_URL = 'https://fleet.trypatchbay.internal';
      expect(isQualifiedIsolationActive()).toBe(false);

      delete process.env.MICROVM_FLEET_URL;
      process.env.PATCHVERSION_SANDBOX_MODE = 'microvm';
      expect(isQualifiedIsolationActive()).toBe(false);

      process.env.QUALIFIED_ISOLATION_BACKEND = 'firecracker';
      expect(isQualifiedIsolationActive()).toBe(false);

      if (originalBackend) process.env.QUALIFIED_ISOLATION_BACKEND = originalBackend;
      else delete process.env.QUALIFIED_ISOLATION_BACKEND;
      if (originalFleet) process.env.MICROVM_FLEET_URL = originalFleet;
      else delete process.env.MICROVM_FLEET_URL;
      delete process.env.PATCHVERSION_SANDBOX_MODE;
    });

    it('does not resolve MicroVMFleetProvider from emulateLocal or env (fail-closed)', () => {
      const provider = resolveExecutionProvider({
        fleetConfig: {
          emulateLocalMicroVM: true,
          signingSecret,
        },
      });

      expect(provider.name).toBe('unavailable-execution-provider');
      expect(provider.type).toBe('unavailable');
    });

    it('resolves UnavailableExecutionProvider by default (fail-closed)', () => {
      const provider = resolveExecutionProvider();
      expect(provider.name).toBe('unavailable-execution-provider');
      expect(provider.type).toBe('unavailable');
    });
  });
});
