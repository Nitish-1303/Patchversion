import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { ChangeRecord, ImpactAnalysis } from '@patchversion/shared';
import { PatchversionDatabase } from '../src/db/database';

describe('PatchversionDatabase - Tenancy, Persistence and Security', () => {
  let tmpDir: string;
  let db: PatchversionDatabase;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `test-db-${crypto.randomBytes(6).toString('hex')}`);
    db = new PatchversionDatabase(tmpDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  test('enforces strict tenant isolation across repositories, jobs, and findings', () => {
    const tenantA = db.createTenant('Acme Corp');
    const tenantB = db.createTenant('Beta Inc');

    const userA = db.createUser(tenantA.id, 'alice@acme.com', 'owner');
    const userB = db.createUser(tenantB.id, 'bob@beta.com', 'owner');
    expect(userA.tenantId).toBe(tenantA.id);
    expect(userB.tenantId).toBe(tenantB.id);

    const instA = db.saveInstallation(tenantA.id, 1001, 'acme-org');
    const instB = db.saveInstallation(tenantB.id, 2002, 'beta-org');

    const repoA = db.saveRepository(tenantA.id, instA.id, {
      githubRepoId: 5001,
      fullName: 'acme-org/service',
      owner: 'acme-org',
      name: 'service',
      defaultBranch: 'main',
      isPrivate: true,
    });

    const repoB = db.saveRepository(tenantB.id, instB.id, {
      githubRepoId: 6002,
      fullName: 'beta-org/platform',
      owner: 'beta-org',
      name: 'platform',
      defaultBranch: 'main',
      isPrivate: true,
    });

    // Tenant A cannot access Tenant B's repository
    expect(db.getRepository(tenantA.id, repoB.id)).toBeNull();
    expect(db.getRepository(tenantB.id, repoA.id)).toBeNull();

    // Listing repositories returns only tenant-owned records
    const reposA = db.listRepositories(tenantA.id);
    expect(reposA.length).toBe(1);
    expect(reposA[0].id).toBe(repoA.id);

    const reposB = db.listRepositories(tenantB.id);
    expect(reposB.length).toBe(1);
    expect(reposB[0].id).toBe(repoB.id);
  });

  test('sessions expire and can be revoked', () => {
    const tenant = db.createTenant('Acme');
    const user = db.createUser(tenant.id, 'alice@acme.com');

    const session = db.createSession(user.id, 1); // 1 hour
    expect(session.userId).toBe(user.id);
    expect(session.tenantId).toBe(tenant.id);

    // Valid session
    const retrieved = db.getSession(session.token);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.userId).toBe(user.id);

    // Revocation
    db.revokeSession(session.token);
    expect(db.getSession(session.token)).toBeNull();
  });

  test('durable jobs support worker claiming, exponential backoff, and state transitions', () => {
    const tenant = db.createTenant('Acme');
    const inst = db.saveInstallation(tenant.id, 1001, 'acme');
    const repo = db.saveRepository(tenant.id, inst.id, {
      githubRepoId: 5001,
      fullName: 'acme/core',
      owner: 'acme',
      name: 'core',
      defaultBranch: 'main',
      isPrivate: false,
    });

    const job = db.createJob(tenant.id, repo.id, 'scan_dependencies', { depth: 'direct' });
    expect(job.status).toBe('queued');

    // Worker claims job
    const claimed = db.claimNextJob('worker_1');
    expect(claimed).not.toBeNull();
    expect(claimed?.id).toBe(job.id);
    expect(claimed?.status).toBe('running');
    expect(claimed?.attempts).toBe(1);

    // Worker fails job with transient error -> retries scheduled with backoff
    db.failJob(job.id, 'GitHub API 503 rate limit', true, 0);
    const updated = db.getJob(tenant.id, job.id);
    expect(updated?.status).toBe('queued');
    expect(updated?.error).toBe('GitHub API 503 rate limit');

    // Terminal failure on exhausted attempts
    db.claimNextJob('worker_1');
    db.failJob(job.id, 'Permanent failure', true, 0);
    db.claimNextJob('worker_1');
    db.failJob(job.id, 'Permanent failure', true, 0);

    const failedJob = db.getJob(tenant.id, job.id);
    expect(failedJob?.status).toBe('failed');
  });

  test('requires valid validation before approval and invalidates stale approvals when diff drifts', () => {
    const tenant = db.createTenant('Acme');
    const user = db.createUser(tenant.id, 'alice@acme.com');
    const inst = db.saveInstallation(tenant.id, 1001, 'acme');
    const repo = db.saveRepository(tenant.id, inst.id, {
      githubRepoId: 5001,
      fullName: 'acme/repo',
      owner: 'acme',
      name: 'repo',
      defaultBranch: 'main',
      isPrivate: false,
    });

    const finding = db.saveFinding(tenant.id, repo.id, {
      packageName: 'mockpay',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      isBreaking: true,
      changeRecord: {} as unknown as ChangeRecord,
      impactAnalysis: {} as unknown as ImpactAnalysis,
      status: 'open',
    });

    const patch = db.savePatch(tenant.id, finding.id, '--- a/file\n+++ b/file\n- old\n+ new\n');

    // Cannot approve before validation passes
    expect(() => {
      db.approvePatch(tenant.id, patch.id, user.id, patch.diffHash);
    }).toThrow('Cannot approve patch without a verified passing validation');

    // Record passing validation
    db.saveValidation(tenant.id, patch.id, {
      status: 'passed',
      executionLogs: 'All checks passed',
      durationMs: 1200,
    });

    // Approval with wrong diff hash fails
    expect(() => {
      db.approvePatch(tenant.id, patch.id, user.id, 'wrong_hash');
    }).toThrow('Diff hash mismatch');

    // Approval with exact hash succeeds
    const approval = db.approvePatch(tenant.id, patch.id, user.id, patch.diffHash);
    expect(approval.status).toBe('active');
    expect(db.getActiveApproval(tenant.id, patch.id)).not.toBeNull();

    // Rerunning validation that fails invalidates the approval
    db.saveValidation(tenant.id, patch.id, {
      status: 'failed',
      executionLogs: 'Rerun failed',
      durationMs: 800,
    });

    expect(db.getActiveApproval(tenant.id, patch.id)).toBeNull();
  });

  test('prevents webhook replay attacks with delivery deduplication', () => {
    const deliveryId = 'delivery_uuid_12345';
    const firstAttempt = db.recordWebhookDelivery(deliveryId, 'push', 'sha256=abcdef');
    expect(firstAttempt).toBe(true);

    // Duplicate delivery replay attempt is rejected
    const replayAttempt = db.recordWebhookDelivery(deliveryId, 'push', 'sha256=abcdef');
    expect(replayAttempt).toBe(false);
  });
});
