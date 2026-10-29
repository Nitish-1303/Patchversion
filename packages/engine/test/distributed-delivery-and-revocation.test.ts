import fs from 'fs';
import path from 'path';
import os from 'os';
import { PatchversionDatabase } from '../src/db/database';
import { ChangeRecord, ImpactAnalysis, PatchRecord } from '@patchversion/shared';

describe('Distributed Delivery Safety & Shared Session Revocation', () => {
  let tmpDir: string;
  let db1: PatchversionDatabase;
  let db2: PatchversionDatabase;
  const tenantId = 'ten_dist_test';
  const userId = 'usr_dist_test';

  const mockChange: ChangeRecord = {
    id: 'chg_1',
    packageName: 'mockpay',
    ecosystem: 'npm',
    fromVersion: '1.0.0',
    toVersion: '2.0.0',
    detectedAt: new Date().toISOString(),
    source: 'registry',
    sourceUrl: 'https://example.com',
    rawNotes: 'Breaking rename',
    classification: { isBreaking: true, confidence: 1.0, reason: 'rename' },
    severity: 'breaking',
  };

  const mockImpact: ImpactAnalysis = {
    changeId: 'chg_1',
    repoId: 'repo_1',
    affectedCallSites: [],
    unaffectedCallSites: [],
    coveragePercent: 100,
    analyzedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patchbay-dist-test-'));
    // db1 and db2 point to the exact same persistent directory (simulating 2 separate workers/instances)
    db1 = new PatchversionDatabase(tmpDir);
    db2 = new PatchversionDatabase(tmpDir);

    db1.createTenant('Distributed Tenant', tenantId);
    db1.createUser(tenantId, 'user@dist.test', 'owner', 'dist-user', undefined, userId);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('Shared Session Revocation Across Instances', () => {
    test('session revoked on instance 1 is immediately revoked on instance 2', () => {
      // Instance 1 creates a signed v1 session
      const session = db1.createSession(userId);
      expect(session).toBeDefined();

      // Instance 2 verifies session is valid
      const sessionFromDb2 = db2.getSession(session.token);
      expect(sessionFromDb2).not.toBeNull();
      expect(sessionFromDb2?.userId).toBe(userId);
      expect(sessionFromDb2?.tenantId).toBe(tenantId);

      // Instance 1 revokes the session
      const revoked = db1.revokeSession(session.token);
      expect(revoked).toBe(true);
      expect(db1.isSessionRevoked(session.id)).toBe(true);

      // Instance 2 must observe revocation immediately and reject authentication
      const checkFromDb2AfterRevoke = db2.getSession(session.token);
      expect(checkFromDb2AfterRevoke).toBeNull();
      expect(db2.isSessionRevoked(session.id)).toBe(true);
    });
  });

  describe('Distributed Delivery Claims', () => {
    let patch: PatchRecord;

    beforeEach(() => {
      const inst = db1.saveInstallation(tenantId, 554433, 'dist-org');
      const repo = db1.saveRepository(tenantId, inst.id, {
        id: 'repo_dist',
        githubRepoId: 887766,
        fullName: 'dist-org/dist-repo',
        owner: 'dist-org',
        name: 'dist-repo',
        defaultBranch: 'main',
        isPrivate: false,
      });

      const finding = db1.saveFinding(tenantId, repo.id, {
        id: 'finding_dist_1',
        packageName: 'mockpay',
        fromVersion: '1.0.0',
        toVersion: '2.0.0',
        isBreaking: true,
        status: 'open',
        changeRecord: mockChange,
        impactAnalysis: mockImpact,
      });

      patch = db1.savePatch(tenantId, finding.id, '--- diff\n+++ diff');
    });

    test('atomic delivery claim prevents concurrent execution across workers', () => {
      // Worker 1 claims delivery on db1
      const claim1 = db1.claimDelivery(tenantId, patch.id, 'worker-pod-1', 60);
      expect(claim1).toBe(true);

      // Worker 2 attempts concurrent claim on db2 for the same patch
      const claim2 = db2.claimDelivery(tenantId, patch.id, 'worker-pod-2', 60);
      expect(claim2).toBe(false);

      const activeClaim = db2.getDeliveryClaim(patch.id);
      expect(activeClaim).toBeDefined();
      expect(activeClaim?.workerId).toBe('worker-pod-1');
      expect(activeClaim?.status).toBe('active');
    });

    test('expired claim can be re-acquired by another worker after lease expiration', () => {
      // Worker 1 claims with negative TTL (already expired)
      const claim1 = db1.claimDelivery(tenantId, patch.id, 'worker-pod-1', -1);
      expect(claim1).toBe(true);

      // Worker 2 attempts to claim on db2; since worker 1 lease expired, worker 2 acquires it
      const claim2 = db2.claimDelivery(tenantId, patch.id, 'worker-pod-2', 60);
      expect(claim2).toBe(true);

      const activeClaim = db1.getDeliveryClaim(patch.id);
      expect(activeClaim?.workerId).toBe('worker-pod-2');
    });

    test('releasing claim on failure allows subsequent retry', () => {
      // Worker 1 claims delivery
      db1.claimDelivery(tenantId, patch.id, 'worker-pod-1', 60);

      // Delivery fails and releases claim
      db1.releaseDeliveryClaim(tenantId, patch.id, 'released');

      // Worker 2 can now claim for retry
      const retryClaim = db2.claimDelivery(tenantId, patch.id, 'worker-pod-2', 60);
      expect(retryClaim).toBe(true);
    });

    test('completed delivery prevents further delivery claims', () => {
      // Worker 1 claims delivery
      db1.claimDelivery(tenantId, patch.id, 'worker-pod-1', 60);

      // Validate, approve, and create PR to mark complete
      db1.saveValidation(tenantId, patch.id, {
        status: 'passed',
        executionLogs: 'Tests passed',
        durationMs: 120,
      });

      const approval = db1.approvePatch(tenantId, patch.id, userId, patch.diffHash);
      db1.savePullRequest(tenantId, {
        repositoryId: 'repo_dist',
        findingId: 'finding_dist_1',
        patchId: patch.id,
        approvalId: approval.id,
        githubPrNumber: 101,
        githubPrUrl: 'https://github.com/dist-org/dist-repo/pull/101',
        branchName: 'patchversion/mockpay-2.0.0',
        commitSha: 'sha_dist_101',
      });

      db1.releaseDeliveryClaim(tenantId, patch.id, 'completed');

      // Subsequent claim attempt on db2 must return false because PR is already delivered
      const subsequentClaim = db2.claimDelivery(tenantId, patch.id, 'worker-pod-2', 60);
      expect(subsequentClaim).toBe(false);
    });
  });
});
