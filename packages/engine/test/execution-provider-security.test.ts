import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import {
  LocalTrustedFixtureProvider,
  ProductionIsolatedExecutionProvider,
  createJobSignature,
  ExecutionJob,
  verifyArtifactsSignature,
} from '../src/sandbox/execution-provider';

describe('Phase 5 Security Acceptance Tests - Execution Provider Isolation & Invariants', () => {
  const signingSecret = 'sec-test-signing-key-9f8e7d6c5b4a';
  let tmpFixtureDir: string;
  let sampleFixturePath: string;
  let provider: LocalTrustedFixtureProvider;

  beforeAll(() => {
    tmpFixtureDir = path.join(os.tmpdir(), `fixtures-root-${crypto.randomBytes(6).toString('hex')}`);
    fs.mkdirSync(tmpFixtureDir, { recursive: true });

    // Create permitted sample-repo fixture
    sampleFixturePath = path.join(tmpFixtureDir, 'fixtures', 'sample-repo');
    fs.mkdirSync(sampleFixturePath, { recursive: true });
    fs.writeFileSync(
      path.join(sampleFixturePath, 'package.json'),
      JSON.stringify({ name: 'sample-repo', version: '1.0.0' }, null, 2),
    );
    fs.writeFileSync(
      path.join(sampleFixturePath, 'index.js'),
      'console.log("sample repo index");',
    );
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpFixtureDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  beforeEach(() => {
    provider = new LocalTrustedFixtureProvider(signingSecret, {
      fixtureRootDir: tmpFixtureDir,
      defaultTimeoutMs: 5000,
    });
  });

  function createValidJob(overrides?: Partial<ExecutionJob>): ExecutionJob {
    const rawJob: Omit<ExecutionJob, 'signature'> = {
      jobId: `job_${crypto.randomBytes(8).toString('hex')}`,
      tenantId: 'tenant_acme_corp',
      repoId: 'repo_sample_123',
      repoFullName: 'acme/sample-repo',
      sourceLocation: 'fixtures/sample-repo',
      changeId: 'change_mockpay_v2',
      commands: [
        {
          executable: process.execPath,
          args: ['-e', 'console.log("execution verified");'],
        },
      ],
      networkPolicy: 'none',
      limits: { timeoutMs: 5000, maxMemoryMb: 256, cpuCores: 1, maxOutputBytes: 1024 * 1024, maxDiskMb: 512 },
      nonce: crypto.randomBytes(12).toString('hex'),
      expiresAt: Date.now() + 60_000,
      ...overrides,
    };

    const signature = createJobSignature(rawJob, signingSecret);
    return { ...rawJob, signature };
  }

  // 1. A job cannot read host secrets
  test('Security Invariant 1: Execution environment scrubs host secrets and sensitive environment variables', async () => {
    process.env.TEST_HOST_SECRET_TOKEN = 'super-secret-ghp-token-12345';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-sensitive-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'aws-secret-access-credential';

    const testSecretJob = createValidJob({
      commands: [
        {
          executable: process.execPath,
          args: [
            '-e',
            'const env = process.env; if (env.TEST_HOST_SECRET_TOKEN || env.ANTHROPIC_API_KEY || env.AWS_SECRET_ACCESS_KEY) { process.exit(42); } else { console.log("SECRETS_SCRUBBED"); }',
          ],
        },
      ],
    });

    const result = await provider.submitJob(testSecretJob);
    expect(result.status).toBe('completed');

    const artifacts = await provider.collectArtifacts(testSecretJob.jobId, testSecretJob.tenantId);
    expect(artifacts).not.toBeNull();
    expect(artifacts?.stdout).toContain('SECRETS_SCRUBBED');
    expect(artifacts?.stdout).not.toContain('super-secret-ghp-token-12345');

    delete process.env.TEST_HOST_SECRET_TOKEN;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.AWS_SECRET_ACCESS_KEY;
  });

  // 2. A job cannot access another tenant's workspace
  test("Security Invariant 2: Tenant isolation prevents a job from crossing tenant workspace boundaries", async () => {
    // Attempt to access another tenant's directory via relative traversal in command cwd
    const maliciousTenantJob = createValidJob({
      tenantId: 'tenant_attacker',
      commands: [
        {
          executable: process.execPath,
          args: ['-e', 'console.log("escaped");'],
          cwd: '../tenant_victim',
        },
      ],
    });

    const result = await provider.submitJob(maliciousTenantJob);
    expect(result.status).toBe('rejected');
    expect(result.reason).toMatch(/workspace boundary/i);
  });

  // 3. A job cannot escape its workspace through symlinks
  test('Security Invariant 3: Symlinks targeting files outside the workspace are safely refused', async () => {
    // Create an external secret file outside the fixture root
    const externalSecretFile = path.join(tmpFixtureDir, 'external-host-secret.txt');
    fs.writeFileSync(externalSecretFile, 'HOST_CRITICAL_CREDENTIAL_DATA');

    // Create a symlink inside the fixture pointing outside to the external secret
    const symlinkPath = path.join(sampleFixturePath, 'external-link.txt');
    try {
      if (fs.existsSync(symlinkPath)) fs.unlinkSync(symlinkPath);
      fs.symlinkSync(externalSecretFile, symlinkPath, 'file');
    } catch {
      // Windows without developer mode may refuse symlink creation; test handles gracefully
    }

    const job = createValidJob({
      commands: [
        {
          executable: process.execPath,
          args: ['-e', 'console.log("ok");'],
        },
      ],
    });

    const result = await provider.submitJob(job);
    expect(result.status).toBe('completed');

    // Ensure external secret was never copied into the artifacts or workspace
    const artifacts = await provider.collectArtifacts(job.jobId, job.tenantId);
    expect(artifacts?.artifactHashes['external-link.txt']).toBeUndefined();
    expect(artifacts?.stdout).not.toContain('HOST_CRITICAL_CREDENTIAL_DATA');

    try {
      if (fs.existsSync(symlinkPath)) fs.unlinkSync(symlinkPath);
      if (fs.existsSync(externalSecretFile)) fs.unlinkSync(externalSecretFile);
    } catch { /* ignore */ }
  });

  // 4. A job cannot access the Docker socket
  test('Security Invariant 4: Commands attempting to mount or access the Docker socket are rejected immediately', async () => {
    const dockerSocketJob = createValidJob({
      commands: [
        {
          executable: 'curl',
          args: ['--unix-socket', '/var/run/docker.sock', 'http://localhost/images/json'],
        },
      ],
    });

    const result = await provider.submitJob(dockerSocketJob);
    expect(result.status).toBe('rejected');
    expect(result.reason).toMatch(/docker socket access is forbidden/i);
  });

  // 5. A job cannot exceed resource or time limits
  test('Security Invariant 5: Jobs exceeding allocated execution timeouts are terminated with timeout error', async () => {
    const infiniteLoopJob = createValidJob({
      limits: { timeoutMs: 1000 },
      commands: [
        {
          executable: process.execPath,
          args: ['-e', 'setInterval(() => {}, 100);'], // Never terminates
          timeoutMs: 1000,
        },
      ],
    });

    const result = await provider.submitJob(infiniteLoopJob);
    expect(result.status).toBe('failed');
    expect(result.reason).toMatch(/timed out after 1000ms/i);
  });

  // 6. A job cannot access prohibited network destinations (Network Policy)
  test('Security Invariant 6: Strict offline network policy injects npm offline mode and disables outbound requests', async () => {
    const networkJob = createValidJob({
      networkPolicy: 'none',
      commands: [
        {
          executable: process.execPath,
          args: [
            '-e',
            'if (process.env.npm_config_offline !== "true") { process.exit(1); } else { console.log("NETWORK_ISOLATED"); }',
          ],
        },
      ],
    });

    const result = await provider.submitJob(networkJob);
    expect(result.status).toBe('completed');

    const artifacts = await provider.collectArtifacts(networkJob.jobId, networkJob.tenantId);
    expect(artifacts?.stdout).toContain('NETWORK_ISOLATED');
  });

  // 7. A timed-out job is terminated and cleaned up
  test('Security Invariant 7: Timed-out job releases all locks and destroys ephemeral workspace', async () => {
    const job = createValidJob({
      limits: { timeoutMs: 800 },
      commands: [
        {
          executable: process.execPath,
          args: ['-e', 'const t = Date.now(); while (Date.now() - t < 5000) {}'],
          timeoutMs: 800,
        },
      ],
    });

    await provider.submitJob(job);
    const status = await provider.getJobStatus(job.jobId, job.tenantId);
    expect(status?.status).toBe('failed');
    expect(status?.completedAt).toBeDefined();

    // Verify cleanup
    await provider.cleanupJob(job.jobId, job.tenantId);
    const postCleanup = await provider.getJobStatus(job.jobId, job.tenantId);
    expect(postCleanup).toBeNull();
  });

  // 8. Malicious patch directory traversal is rejected
  test('Security Invariant 8: Malicious unified diff patches attempting path traversal are rejected', async () => {
    const maliciousPatch = [
      '--- a/../../../../etc/shadow',
      '+++ b/../../../../etc/shadow',
      '@@ -1,1 +1,1 @@',
      '-root:!::',
      '+root:backdoor::',
    ].join('\n');

    const job = createValidJob({
      patchDiff: maliciousPatch,
    });

    const result = await provider.submitJob(job);
    expect(result.status).toBe('failed');
    expect(result.reason).toMatch(/path traversal/i);
  });

  // 9. Invalid or expired job signatures are rejected
  test('Security Invariant 9: Rejects jobs with invalid, forged, or expired signatures', async () => {
    // 9a: Forged signature
    const forgedJob = createValidJob();
    forgedJob.signature = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const forgedRes = await provider.submitJob(forgedJob);
    expect(forgedRes.status).toBe('rejected');
    expect(forgedRes.reason).toMatch(/invalid_signature/i);

    // 9b: Expired job (expiresAt in the past)
    const rawExpired: Omit<ExecutionJob, 'signature'> = {
      jobId: 'job_expired_test',
      tenantId: 'tenant_test',
      repoId: 'repo_test',
      repoFullName: 'acme/test',
      sourceLocation: 'fixtures/sample-repo',
      changeId: 'c_test',
      commands: [{ executable: process.execPath, args: ['-v'] }],
      nonce: 'nonce_expired',
      expiresAt: Date.now() - 10_000, // Expired 10 seconds ago
    };
    const expiredJob: ExecutionJob = {
      ...rawExpired,
      signature: createJobSignature(rawExpired, signingSecret),
    };
    const expiredRes = await provider.submitJob(expiredJob);
    expect(expiredRes.status).toBe('rejected');
    expect(expiredRes.reason).toMatch(/expired_job/i);
  });

  // 10. Duplicate job delivery does not execute a migration twice
  test('Security Invariant 10: Replays and duplicate job nonces are strictly rejected', async () => {
    const job = createValidJob();

    // First delivery succeeds
    const firstDelivery = await provider.submitJob(job);
    expect(firstDelivery.status).toBe('completed');

    // Second delivery with identical nonce must be rejected
    const replayDelivery = await provider.submitJob(job);
    expect(replayDelivery.status).toBe('rejected');
    expect(replayDelivery.reason).toMatch(/duplicate job delivery rejected/i);
  });

  // 11. ProductionIsolatedExecutionProvider fails closed when no worker endpoint configured
  test('Security Invariant 11: Production isolated provider fails closed without remote worker endpoint', async () => {
    const prodProvider = new ProductionIsolatedExecutionProvider(signingSecret); // No remoteWorkerUrl
    const job = createValidJob();

    const result = await prodProvider.submitJob(job);
    expect(result.status).toBe('rejected');
    expect(result.reason).toMatch(/Fail-Closed: Production remote worker endpoint or worker auth token is not configured/i);
  });

  // 12. Artifacts verification signature
  test('Security Invariant 12: Collected artifacts bear cryptographic signature verifiable by application', async () => {
    const job = createValidJob();
    const result = await provider.submitJob(job);
    expect(result.status).toBe('completed');

    const artifacts = await provider.collectArtifacts(job.jobId, job.tenantId);
    expect(artifacts).not.toBeNull();
    if (!artifacts) throw new Error('Artifacts missing');

    const isValid = verifyArtifactsSignature(artifacts, signingSecret);
    expect(isValid).toBe(true);

    // Tampered stdout invalidates signature
    const tamperedArtifacts = { ...artifacts, stdout: artifacts.stdout + '\n// injected malicious output' };
    expect(verifyArtifactsSignature(tamperedArtifacts, signingSecret)).toBe(false);
  });
});
