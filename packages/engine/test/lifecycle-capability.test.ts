import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { WorkerExecutionService } from '../src/sandbox/worker-service';
import { MemoryLifecycleReplayStore } from '../src/sandbox/lifecycle-replay-store';
import {
  createJobSignature,
  ExecutionJob,
  ExpiringNonceStore,
  LocalTrustedFixtureProvider,
  executionJobStorageKey,
  verifyJobSignature,
} from '../src/sandbox/execution-provider';
import {
  LIFECYCLE_CAPABILITY_HEADER,
  createLifecycleCapability,
  verifyLifecycleCapability,
  type LifecycleOp,
} from '../src/sandbox/lifecycle-capability';

describe('Signed lifecycle capabilities', () => {
  const secret = 'worker-test-signing-secret-key-32b';
  const token = 'worker-bearer-token-123';
  const victimTenant = 'tenant_owner_1';
  const attackerTenant = 'tenant_attacker';
  let worker: WorkerExecutionService;
  let port: number;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifecycle-cap-'));
    worker = new WorkerExecutionService({
      signingSecret: secret,
      authToken: token,
      replayStore: new MemoryLifecycleReplayStore(),
    });
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

  function cap(jobId: string, op: LifecycleOp, tenantId = victimTenant, extra?: { exp?: number; jti?: string }) {
    return createLifecycleCapability({ tenantId, jobId, op, ...extra }, secret);
  }

  function headers(jobId: string, op: LifecycleOp, tenantId = victimTenant, extra?: { exp?: number; jti?: string }) {
    return {
      Authorization: `Bearer ${token}`,
      [LIFECYCLE_CAPABILITY_HEADER]: cap(jobId, op, tenantId, extra),
    };
  }

  async function submitJob(jobId: string, tenantId = victimTenant): Promise<ExecutionJob> {
    const unsigned: Omit<ExecutionJob, 'signature'> = {
      jobId,
      tenantId,
      repoId: 'repo_cap',
      repoFullName: 'org/repo',
      sourceLocation: 'fixtures/sample-repo',
      changeId: 'chg_cap',
      commands: [
        {
          executable: process.platform === 'win32' ? 'cmd.exe' : 'echo',
          args: process.platform === 'win32' ? ['/c', 'echo cap_ok'] : ['cap_ok'],
        },
      ],
      nonce: crypto.randomBytes(16).toString('hex'),
      expiresAt: Date.now() + 60_000,
    };
    const job: ExecutionJob = { ...unsigned, signature: createJobSignature(unsigned, secret) };
    const res = await fetch(`http://127.0.0.1:${port}/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(job),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe('completed');
    return job;
  }

  const families: Array<{ method: string; suffix: string; op: LifecycleOp }> = [
    { method: 'GET', suffix: '', op: 'status' },
    { method: 'GET', suffix: '/status', op: 'status' },
    { method: 'POST', suffix: '/cancel', op: 'cancel' },
    { method: 'GET', suffix: '/artifacts', op: 'artifacts' },
    { method: 'DELETE', suffix: '', op: 'cleanup' },
  ];

  it('accepts a valid scoped capability on each lifecycle family', async () => {
    const job = await submitJob(`job_valid_${crypto.randomBytes(4).toString('hex')}`);
    const statusRes = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}`, {
      headers: headers(job.jobId, 'status'),
    });
    expect(statusRes.status).toBe(200);
    expect((await statusRes.json()).tenantId).toBe(victimTenant);

    const artifactsRes = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}/artifacts`, {
      headers: headers(job.jobId, 'artifacts'),
    });
    expect(artifactsRes.status).toBe(200);

    const cancelRes = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}/cancel`, {
      method: 'POST',
      headers: headers(job.jobId, 'cancel'),
    });
    expect(cancelRes.status).toBe(200);

    const deleteRes = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}`, {
      method: 'DELETE',
      headers: headers(job.jobId, 'cleanup'),
    });
    expect(deleteRes.status).toBe(200);
  }, 25000);

  it('rejects bearer + victim ids without a capability on all four families', async () => {
    const job = await submitJob(`job_nocap_${crypto.randomBytes(4).toString('hex')}`);
    for (const family of families) {
      const res = await fetch(
        `http://127.0.0.1:${port}/v1/jobs/${job.jobId}${family.suffix}?tenantId=${victimTenant}`,
        { method: family.method, headers: { Authorization: `Bearer ${token}` } },
      );
      expect(res.status).toBe(403);
      expect((await res.json()).reason).toBe('missing_capability');
    }
  }, 25000);

  it('rejects tenant, job, and operation mismatches', async () => {
    const job = await submitJob(`job_scope_${crypto.randomBytes(4).toString('hex')}`);
    const otherJob = `job_other_${crypto.randomBytes(4).toString('hex')}`;

    const tenantMismatch = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}`, {
      headers: headers(job.jobId, 'status', attackerTenant),
    });
    expect(tenantMismatch.status).toBe(404);

    const queryMismatch = await fetch(
      `http://127.0.0.1:${port}/v1/jobs/${job.jobId}?tenantId=${attackerTenant}`,
      { headers: headers(job.jobId, 'status') },
    );
    expect(queryMismatch.status).toBe(403);
    expect((await queryMismatch.json()).reason).toBe('scope_mismatch');

    const jobMismatch = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}`, {
      headers: headers(otherJob, 'status'),
    });
    expect(jobMismatch.status).toBe(403);
    expect((await jobMismatch.json()).reason).toBe('scope_mismatch');

    const opMismatch = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}/cancel`, {
      method: 'POST',
      headers: headers(job.jobId, 'status'),
    });
    expect(opMismatch.status).toBe(403);
    expect((await opMismatch.json()).reason).toBe('scope_mismatch');
  }, 25000);

  it('rejects expired capabilities', async () => {
    const job = await submitJob(`job_exp_${crypto.randomBytes(4).toString('hex')}`);
    const claims = {
      v: 1,
      iss: 'trypatchbay-control-plane',
      aud: 'trypatchbay-worker',
      tenantId: victimTenant,
      jobId: job.jobId,
      op: 'status',
      exp: Date.now() - 1000,
      jti: crypto.randomBytes(16).toString('hex'),
    };
    const encoded = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const mac = crypto.createHmac('sha256', secret).update(encoded, 'utf8').digest('base64url');
    const res = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        [LIFECYCLE_CAPABILITY_HEADER]: `pvcap1.${encoded}.${mac}`,
      },
    });
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe('expired');
  }, 25000);

  it('rejects tampered payload and hmac', async () => {
    const job = await submitJob(`job_tamp_${crypto.randomBytes(4).toString('hex')}`);
    const tokenCap = cap(job.jobId, 'status');
    const parts = tokenCap.split('.');
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    claims.tenantId = attackerTenant;
    const tamperedPayload = `${parts[0]}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.${parts[2]}`;
    const tampered = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}`, {
      headers: { Authorization: `Bearer ${token}`, [LIFECYCLE_CAPABILITY_HEADER]: tamperedPayload },
    });
    expect(tampered.status).toBe(403);
    expect((await tampered.json()).reason).toBe('invalid_signature');

    const badMac = `${parts[0]}.${parts[1]}.${Buffer.from('deadbeef').toString('base64url')}`;
    const macRes = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}`, {
      headers: { Authorization: `Bearer ${token}`, [LIFECYCLE_CAPABILITY_HEADER]: badMac },
    });
    expect(macRes.status).toBe(403);
    expect((await macRes.json()).reason).toBe('invalid_signature');
  }, 25000);

  it('rejects missing and malformed capabilities', async () => {
    const job = await submitJob(`job_mal_${crypto.randomBytes(4).toString('hex')}`);
    const missing = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(missing.status).toBe(403);

    const malformed = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}`, {
      headers: { Authorization: `Bearer ${token}`, [LIFECYCLE_CAPABILITY_HEADER]: 'not-a-cap' },
    });
    expect(malformed.status).toBe(403);
    expect((await malformed.json()).reason).toBe('malformed_capability');

    const querySmuggle = await fetch(
      `http://127.0.0.1:${port}/v1/jobs/${job.jobId}?capability=${encodeURIComponent(cap(job.jobId, 'status'))}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(querySmuggle.status).toBe(403);

    const capWithoutBearer = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}`, {
      headers: { [LIFECYCLE_CAPABILITY_HEADER]: cap(job.jobId, 'status') },
    });
    expect(capWithoutBearer.status).toBe(401);
  }, 25000);

  it('revokes a jti and rejects subsequent use', async () => {
    const job = await submitJob(`job_rev_${crypto.randomBytes(4).toString('hex')}`);
    const jti = crypto.randomBytes(16).toString('hex');
    const hdrs = headers(job.jobId, 'status', victimTenant, { jti });
    const first = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}`, { headers: hdrs });
    expect(first.status).toBe(200);
    worker.revokeLifecycleJti(jti);
    const second = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}`, { headers: hdrs });
    expect(second.status).toBe(403);
    expect((await second.json()).reason).toBe('revoked');
  }, 25000);

  it('allows read replay until expiry and rejects mutating replay of the same jti', async () => {
    const job = await submitJob(`job_replay_${crypto.randomBytes(4).toString('hex')}`);
    const statusJti = crypto.randomBytes(16).toString('hex');
    const statusHdrs = headers(job.jobId, 'status', victimTenant, { jti: statusJti });
    const first = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}`, { headers: statusHdrs });
    const second = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}`, { headers: statusHdrs });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const artJti = crypto.randomBytes(16).toString('hex');
    const artHdrs = headers(job.jobId, 'artifacts', victimTenant, { jti: artJti });
    expect(
      (await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}/artifacts`, { headers: artHdrs })).status,
    ).toBe(200);
    expect(
      (await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}/artifacts`, { headers: artHdrs })).status,
    ).toBe(200);

    const cancelJti = crypto.randomBytes(16).toString('hex');
    const cancelHdrs = headers(job.jobId, 'cancel', victimTenant, { jti: cancelJti });
    expect(
      (
        await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}/cancel`, {
          method: 'POST',
          headers: cancelHdrs,
        })
      ).status,
    ).toBe(200);
    const cancelReplay = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}/cancel`, {
      method: 'POST',
      headers: cancelHdrs,
    });
    expect(cancelReplay.status).toBe(403);
    expect((await cancelReplay.json()).reason).toBe('replay');

    const cleanupJti = crypto.randomBytes(16).toString('hex');
    const cleanupHdrs = headers(job.jobId, 'cleanup', victimTenant, { jti: cleanupJti });
    expect(
      (await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}`, { method: 'DELETE', headers: cleanupHdrs }))
        .status,
    ).toBe(200);
    const cleanupReplay = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}`, {
      method: 'DELETE',
      headers: cleanupHdrs,
    });
    expect(cleanupReplay.status).toBe(403);
    expect((await cleanupReplay.json()).reason).toBe('replay');
  }, 25000);

  it('cannot cross tenants on any of the four families', async () => {
    const job = await submitJob(`job_xtenant_${crypto.randomBytes(4).toString('hex')}`, victimTenant);
    for (const family of [
      { method: 'GET', suffix: '', op: 'status' as const },
      { method: 'POST', suffix: '/cancel', op: 'cancel' as const },
      { method: 'GET', suffix: '/artifacts', op: 'artifacts' as const },
      { method: 'DELETE', suffix: '', op: 'cleanup' as const },
    ]) {
      const res = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}${family.suffix}`, {
        method: family.method,
        headers: headers(job.jobId, family.op, attackerTenant),
      });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(JSON.stringify(body)).not.toContain(victimTenant);
    }
    const stillOwned = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}`, {
      headers: headers(job.jobId, 'status'),
    });
    expect(stillOwned.status).toBe(200);
  }, 25000);

  it('does not accept a job HMAC as a lifecycle capability', async () => {
    const job = await submitJob(`job_hmac_${crypto.randomBytes(4).toString('hex')}`);
    const res = await fetch(`http://127.0.0.1:${port}/v1/jobs/${job.jobId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        [LIFECYCLE_CAPABILITY_HEADER]: job.signature,
      },
    });
    expect(res.status).toBe(403);
  }, 25000);

  it('create/verify helpers bind tenant, job, op, and expiry', () => {
    const tokenCap = createLifecycleCapability(
      { tenantId: 't1', jobId: 'j1', op: 'status', jti: 'jti12345aaaa' },
      secret,
    );
    const ok = verifyLifecycleCapability(tokenCap, secret, { tenantId: 't1', jobId: 'j1', op: 'status' });
    expect(ok.valid).toBe(true);
    expect(verifyLifecycleCapability(tokenCap, secret, { op: 'cancel' }).valid).toBe(false);
    const missing = verifyLifecycleCapability(undefined, secret);
    expect(missing.valid).toBe(false);
    if (!missing.valid) expect(missing.reason).toBe('missing_capability');
    expect(() =>
      createLifecycleCapability({ tenantId: 't1', jobId: 'j1', op: 'status' }, 'short'),
    ).toThrow(/signing secret/i);
  });

  it('composite storage keys prevent cross-tenant jobId clobber', async () => {
    const provider = new LocalTrustedFixtureProvider(secret);
    const sharedJobId = `job_shared_${crypto.randomBytes(4).toString('hex')}`;
    const make = (tenantId: string): ExecutionJob => {
      const raw: Omit<ExecutionJob, 'signature'> = {
        jobId: sharedJobId,
        tenantId,
        repoId: 'r',
        repoFullName: 'o/r',
        sourceLocation: 'fixtures/sample-repo',
        changeId: 'c',
        commands: [
          {
            executable: process.platform === 'win32' ? 'cmd.exe' : 'echo',
            args: process.platform === 'win32' ? ['/c', 'echo k'] : ['k'],
          },
        ],
        nonce: crypto.randomBytes(16).toString('hex'),
        expiresAt: Date.now() + 60_000,
      };
      return { ...raw, signature: createJobSignature(raw, secret) };
    };
    const a = make('tenant_a');
    const b = make('tenant_b');
    expect((await provider.submitJob(a)).status).toBe('completed');
    expect((await provider.submitJob(b)).status).toBe('completed');
    expect((await provider.getJobStatus(sharedJobId, 'tenant_a'))?.tenantId).toBe('tenant_a');
    expect((await provider.getJobStatus(sharedJobId, 'tenant_b'))?.tenantId).toBe('tenant_b');
    expect(executionJobStorageKey('tenant_a', sharedJobId)).not.toBe(
      executionJobStorageKey('tenant_b', sharedJobId),
    );
  }, 25000);

  it('includes networkPolicy and limits in submit HMAC (F5)', () => {
    const raw: Omit<ExecutionJob, 'signature'> = {
      jobId: 'job_f5',
      tenantId: 'tenant_f5',
      repoId: 'r',
      repoFullName: 'o/r',
      sourceLocation: 'fixtures/sample-repo',
      changeId: 'c',
      commands: [],
      nonce: 'nonce_f5_unique',
      expiresAt: Date.now() + 60_000,
      networkPolicy: 'none',
      limits: { timeoutMs: 1000 },
    };
    const signed: ExecutionJob = { ...raw, signature: createJobSignature(raw, secret) };
    expect(verifyJobSignature(signed, secret).valid).toBe(true);
    const mutatedPolicy: ExecutionJob = {
      ...signed,
      networkPolicy: 'restricted-egress',
    };
    expect(verifyJobSignature(mutatedPolicy, secret).valid).toBe(false);
    const mutatedLimits: ExecutionJob = {
      ...signed,
      limits: { timeoutMs: 999999 },
    };
    expect(verifyJobSignature(mutatedLimits, secret).valid).toBe(false);
  });

  it('expires submit nonces (F6)', () => {
    const store = new ExpiringNonceStore();
    store.add('n1', Date.now() - 1);
    expect(store.has('n1')).toBe(false);
    store.add('n2', Date.now() + 60_000);
    expect(store.has('n2')).toBe(true);
  });
});
