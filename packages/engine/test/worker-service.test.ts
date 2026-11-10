import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import {
  WorkerExecutionService,
  authorizationMatchesWorkerBearer,
} from '../src/sandbox/worker-service';
import { createJobSignature, ExecutionJob } from '../src/sandbox/execution-provider';

describe('WorkerExecutionService (Remote Isolated Runner Protocol)', () => {
  let worker: WorkerExecutionService;
  let port: number;
  let tmpDir: string;
  const secret = 'worker-test-signing-secret-key-32b';
  const token = 'worker-bearer-token-123';

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'worker-service-test-'));
    worker = new WorkerExecutionService({
      signingSecret: secret,
      authToken: token,
    });
    // Start on ephemeral port 0
    port = await worker.start(0);
  });

  afterAll(async () => {
    await worker.stop();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('responds to GET /health with 200 and worker metadata', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.worker).toBe('trypatchbay-local-fixture-worker');
    expect(data.isolationQualified).toBe(false);
  });

  const unauthorizedBody = { error: 'Unauthorized: invalid or missing worker bearer token' };

  async function expectUnauthorized(
    headers?: Record<string, string>,
    path = '/v1/fleet/health',
  ): Promise<void> {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, { headers });
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual(unauthorizedBody);
  }

  it('rejects unauthenticated requests when authToken is configured', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: 'test-job' }),
    });
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual(unauthorizedBody);
  });

  it('accepts a valid worker bearer token', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/v1/fleet/health`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe('unqualified');
  });

  it('rejects missing, malformed, invalid, truncated, prefix-padded, and unequal-length bearers', async () => {
    await expectUnauthorized();
    await expectUnauthorized({});
    await expectUnauthorized({ Authorization: '' });
    await expectUnauthorized({ Authorization: 'Bearer' });
    await expectUnauthorized({ Authorization: 'Bearer ' });
    await expectUnauthorized({ Authorization: `bearer ${token}` });
    await expectUnauthorized({ Authorization: `Basic ${token}` });
    await expectUnauthorized({ Authorization: token });
    await expectUnauthorized({ Authorization: `Bearer ${token}x` });
    await expectUnauthorized({ Authorization: `Bearer  ${token}` });
    await expectUnauthorized({ Authorization: `xBearer ${token}` });
    await expectUnauthorized({ Authorization: `Bearer ${token.slice(0, -1)}` });
    await expectUnauthorized({ Authorization: `Bearer ${token}${token}` });
    const sameLengthWrong = `Bearer ${'x'.repeat(token.length)}`;
    await expectUnauthorized({ Authorization: sameLengthWrong });
    await expectUnauthorized(
      { Authorization: `Bearer ${token.slice(0, -1)}` },
      '/v1/jobs/job_anything?tenantId=tenant_remote_1',
    );
  });

  it('accepts and processes valid signed execution jobs', async () => {
    // Test implementation
    const unsignedJob: Omit<ExecutionJob, 'signature'> = {
      jobId: 'job_remote_001',
      tenantId: 'tenant_remote_1',
      repoId: 'repo_remote_1',
      repoFullName: 'org/repo',
      sourceLocation: 'fixtures/sample-repo',
      changeId: 'chg_remote_1',
      commands: [
        {
          executable: process.platform === 'win32' ? 'cmd.exe' : 'echo',
          args: process.platform === 'win32' ? ['/c', 'echo worker_ok'] : ['worker_ok'],
        },
      ],
      nonce: crypto.randomBytes(16).toString('hex'),
      expiresAt: Date.now() + 60000,
    };

    const signature = createJobSignature(unsignedJob, secret);
    const job: ExecutionJob = { ...unsignedJob, signature };

    const res = await fetch(`http://127.0.0.1:${port}/v1/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(job),
    });

    expect(res.status).toBe(200);
    const result = await res.json();
    if (result.status === 'rejected') {
      console.log('REJECTED REASON:', result.reason);
    }
    expect(result.jobId).toBe('job_remote_001');
    expect(result.status).toBe('completed');

    // Query status
    const statusRes = await fetch(
      `http://127.0.0.1:${port}/v1/jobs/job_remote_001?tenantId=tenant_remote_1`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    expect(statusRes.status).toBe(200);
    const statusData = await statusRes.json();
    expect(statusData.status).toBe('completed');

    const artifactsRes = await fetch(
      `http://127.0.0.1:${port}/v1/jobs/job_remote_001/artifacts?tenantId=tenant_remote_1`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    expect(artifactsRes.status).toBe(200);
    const artifacts = await artifactsRes.json();
    expect(artifacts.stdout).toContain('worker_ok');
    expect(artifacts.signature).toBeTruthy();
    expect(artifacts.tenantId).toBe('tenant_remote_1');
  }, 25000);

  it('fails closed on missing, empty, malformed, or wrong tenantId for artifacts', async () => {
    const unsignedJob: Omit<ExecutionJob, 'signature'> = {
      jobId: 'job_tenant_gate_001',
      tenantId: 'tenant_remote_1',
      repoId: 'repo_remote_1',
      repoFullName: 'org/repo',
      sourceLocation: 'fixtures/sample-repo',
      changeId: 'chg_tenant_gate',
      commands: [
        {
          executable: process.platform === 'win32' ? 'cmd.exe' : 'echo',
          args: process.platform === 'win32' ? ['/c', 'echo tenant_gate'] : ['tenant_gate'],
        },
      ],
      nonce: crypto.randomBytes(16).toString('hex'),
      expiresAt: Date.now() + 60000,
    };
    const job: ExecutionJob = { ...unsignedJob, signature: createJobSignature(unsignedJob, secret) };
    const submit = await fetch(`http://127.0.0.1:${port}/v1/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(job),
    });
    expect((await submit.json()).status).toBe('completed');

    const missing = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}/artifacts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(missing.status).toBe(400);

    const empty = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}/artifacts?tenantId=`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(empty.status).toBe(400);

    const malformed = await fetch(
      `http://127.0.0.1:${port}/v1/jobs/${job.jobId}/artifacts?tenantId=${encodeURIComponent('../evil')}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    expect(malformed.status).toBe(400);

    const wrong = await fetch(
      `http://127.0.0.1:${port}/v1/jobs/${job.jobId}/artifacts?tenantId=tenant_other`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    expect(wrong.status).toBe(404);

    const same = await fetch(
      `http://127.0.0.1:${port}/v1/jobs/${job.jobId}/artifacts?tenantId=tenant_remote_1`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    expect(same.status).toBe(200);
    const body = await same.json();
    expect(body.tenantId).toBe('tenant_remote_1');
  }, 25000);

  it('fails closed on missing, empty, malformed, or wrong tenantId for status, cancel, and DELETE', async () => {
    const headers = { Authorization: `Bearer ${token}` };
    const unsignedJob: Omit<ExecutionJob, 'signature'> = {
      jobId: 'job_lifecycle_gate_001',
      tenantId: 'tenant_remote_1',
      repoId: 'repo_remote_1',
      repoFullName: 'org/repo',
      sourceLocation: 'fixtures/sample-repo',
      changeId: 'chg_lifecycle_gate',
      commands: [
        {
          executable: process.platform === 'win32' ? 'cmd.exe' : 'echo',
          args: process.platform === 'win32' ? ['/c', 'echo lifecycle_gate'] : ['lifecycle_gate'],
        },
      ],
      nonce: crypto.randomBytes(16).toString('hex'),
      expiresAt: Date.now() + 60000,
    };
    const job: ExecutionJob = { ...unsignedJob, signature: createJobSignature(unsignedJob, secret) };
    const submit = await fetch(`http://127.0.0.1:${port}/v1/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(job),
    });
    expect((await submit.json()).status).toBe('completed');

    const notFoundBody = { error: `Job ${job.jobId} not found` };
    const ops: Array<{ method: string; path: string }> = [
      { method: 'GET', path: `/v1/jobs/${job.jobId}` },
      { method: 'GET', path: `/v1/jobs/${job.jobId}/status` },
      { method: 'POST', path: `/v1/jobs/${job.jobId}/cancel` },
      { method: 'DELETE', path: `/v1/jobs/${job.jobId}` },
    ];

    for (const op of ops) {
      const missing = await fetch(`http://127.0.0.1:${port}${op.path}`, { method: op.method, headers });
      expect(missing.status).toBe(400);
      await expect(missing.json()).resolves.toEqual({
        error: 'tenantId query parameter is required and must be a valid tenant identifier',
      });

      const empty = await fetch(`http://127.0.0.1:${port}${op.path}?tenantId=`, {
        method: op.method,
        headers,
      });
      expect(empty.status).toBe(400);

      const malformed = await fetch(
        `http://127.0.0.1:${port}${op.path}?tenantId=${encodeURIComponent('../evil')}`,
        { method: op.method, headers },
      );
      expect(malformed.status).toBe(400);

      const wrong = await fetch(`http://127.0.0.1:${port}${op.path}?tenantId=tenant_other`, {
        method: op.method,
        headers,
      });
      expect(wrong.status).toBe(404);
      const wrongBody = await wrong.json();
      expect(wrongBody).toEqual(notFoundBody);
      expect(JSON.stringify(wrongBody)).not.toContain('tenant_remote_1');
    }

    const ownerStatus = await fetch(
      `http://127.0.0.1:${port}/v1/jobs/${job.jobId}?tenantId=tenant_remote_1`,
      { headers },
    );
    expect(ownerStatus.status).toBe(200);
    expect((await ownerStatus.json()).tenantId).toBe('tenant_remote_1');

    const ownerArtifacts = await fetch(
      `http://127.0.0.1:${port}/v1/jobs/${job.jobId}/artifacts?tenantId=tenant_remote_1`,
      { headers },
    );
    expect(ownerArtifacts.status).toBe(200);

    const wrongCancel = await fetch(
      `http://127.0.0.1:${port}/v1/jobs/${job.jobId}/cancel?tenantId=tenant_other`,
      { method: 'POST', headers },
    );
    expect(wrongCancel.status).toBe(404);

    const ownerCancel = await fetch(
      `http://127.0.0.1:${port}/v1/jobs/${job.jobId}/cancel?tenantId=tenant_remote_1`,
      { method: 'POST', headers },
    );
    expect(ownerCancel.status).toBe(200);
    expect(await ownerCancel.json()).toEqual({ cancelled: true });

    const repeatCancel = await fetch(
      `http://127.0.0.1:${port}/v1/jobs/${job.jobId}/cancel?tenantId=tenant_remote_1`,
      { method: 'POST', headers },
    );
    expect(repeatCancel.status).toBe(200);
    expect(await repeatCancel.json()).toEqual({ cancelled: true });

    const wrongDelete = await fetch(
      `http://127.0.0.1:${port}/v1/jobs/${job.jobId}?tenantId=tenant_other`,
      { method: 'DELETE', headers },
    );
    expect(wrongDelete.status).toBe(404);
    const stillThere = await fetch(
      `http://127.0.0.1:${port}/v1/jobs/${job.jobId}?tenantId=tenant_remote_1`,
      { headers },
    );
    expect(stillThere.status).toBe(200);

    const ownerDelete = await fetch(
      `http://127.0.0.1:${port}/v1/jobs/${job.jobId}?tenantId=tenant_remote_1`,
      { method: 'DELETE', headers },
    );
    expect(ownerDelete.status).toBe(200);
    expect(await ownerDelete.json()).toEqual({ deleted: true });

    const repeatDelete = await fetch(
      `http://127.0.0.1:${port}/v1/jobs/${job.jobId}?tenantId=tenant_remote_1`,
      { method: 'DELETE', headers },
    );
    expect(repeatDelete.status).toBe(404);
    expect(await repeatDelete.json()).toEqual(notFoundBody);

    const unknownJob = await fetch(
      `http://127.0.0.1:${port}/v1/jobs/job_does_not_exist?tenantId=tenant_remote_1`,
      { headers },
    );
    expect(unknownJob.status).toBe(404);
    expect(await unknownJob.json()).toEqual({ error: 'Job job_does_not_exist not found' });
  }, 25000);
});

describe('authorizationMatchesWorkerBearer', () => {
  const token = 'worker-bearer-token-123';
  const expected = `Bearer ${token}`;

  it('accepts only the exact Bearer token string', () => {
    expect(authorizationMatchesWorkerBearer(expected, token)).toBe(true);
  });

  it('rejects missing, non-string, empty, and malformed credentials', () => {
    expect(authorizationMatchesWorkerBearer(undefined, token)).toBe(false);
    expect(authorizationMatchesWorkerBearer(['Bearer', token], token)).toBe(false);
    expect(authorizationMatchesWorkerBearer(expected, '')).toBe(false);
    expect(authorizationMatchesWorkerBearer('', token)).toBe(false);
    expect(authorizationMatchesWorkerBearer('Bearer', token)).toBe(false);
    expect(authorizationMatchesWorkerBearer(`bearer ${token}`, token)).toBe(false);
    expect(authorizationMatchesWorkerBearer(`Basic ${token}`, token)).toBe(false);
  });

  it('rejects invalid, truncated, prefix-padded, and unequal-length credentials', () => {
    expect(authorizationMatchesWorkerBearer(`Bearer ${'x'.repeat(token.length)}`, token)).toBe(false);
    expect(authorizationMatchesWorkerBearer(`Bearer ${token.slice(0, -1)}`, token)).toBe(false);
    expect(authorizationMatchesWorkerBearer(`Bearer ${token}x`, token)).toBe(false);
    expect(authorizationMatchesWorkerBearer(`Bearer  ${token}`, token)).toBe(false);
    expect(authorizationMatchesWorkerBearer(`x${expected}`, token)).toBe(false);
    expect(authorizationMatchesWorkerBearer(`${expected} `, token)).toBe(false);
    expect(authorizationMatchesWorkerBearer(`Bearer ${token}${token}`, token)).toBe(false);
  });
});
