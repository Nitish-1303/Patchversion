import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { WorkerExecutionService } from '../src/sandbox/worker-service';
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

  it('rejects unauthenticated requests when authToken is configured', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: 'test-job' }),
    });
    expect(res.status).toBe(401);
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
    const statusRes = await fetch(`http://127.0.0.1:${port}/v1/jobs/job_remote_001`, {
      headers: { Authorization: `Bearer ${token}` },
    });
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
});
