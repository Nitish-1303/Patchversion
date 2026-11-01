/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { POST as approvalsPost } from '../src/app/api/approvals/route';
import { POST as pullRequestsPost } from '../src/app/api/pull-requests/route';
import { POST as packagesPost } from '../src/app/api/packages/route';
import {
  getDatabase,
  _resetInstancesForTest,
  setPostgresStore,
} from '../src/app/api/backend';
import { RateLimiter } from '../src/app/api/security/rate-limiter';
import { PostgresStore } from '@patchversion/engine';

describe('RBAC, Mutation Authorization and Rate Limiting Verification', () => {
  let tmpDir: string;
  const tenantIdA = 'ten_tenant_alpha';
  const tenantIdB = 'ten_tenant_bravo';

  let ownerTokenA: string;
  let adminTokenA: string;
  let memberTokenA: string;
  let reviewerTokenA: string;
  let ownerTokenB: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-rbac-auth-test-'));
    process.env.PATCHVERSION_STATE_DIR = tmpDir;
    process.env.PATCHVERSION_SESSION_SECRET = 'test-secret-at-least-32-chars-long-rbac-tests-12345';
    _resetInstancesForTest();

    const db = getDatabase();

    // Tenant A
    await db.createTenant('Tenant Alpha', tenantIdA);
    const ownerA = await db.createUser(tenantIdA, 'owner.a@example.com', 'owner');
    const adminA = await db.createUser(tenantIdA, 'admin.a@example.com', 'admin');
    const memberA = await db.createUser(tenantIdA, 'member.a@example.com', 'member');
    const reviewerA = await db.createUser(tenantIdA, 'reviewer.a@example.com', 'reviewer');

    ownerTokenA = (await db.createSession(ownerA.id)).token;
    adminTokenA = (await db.createSession(adminA.id)).token;
    memberTokenA = (await db.createSession(memberA.id)).token;
    reviewerTokenA = (await db.createSession(reviewerA.id)).token;

    // Tenant B (for cross-tenant tests)
    await db.createTenant('Tenant Bravo', tenantIdB);
    const ownerB = await db.createUser(tenantIdB, 'owner.b@example.com', 'owner');
    ownerTokenB = (await db.createSession(ownerB.id)).token;
  });

  afterAll(() => {
    _resetInstancesForTest();
    delete process.env.PATCHVERSION_STATE_DIR;
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  beforeEach(() => {
    RateLimiter.resetForTest();
  });

  function createAuthedReq(url: string, method: string, token?: string, body?: object): NextRequest {
    return new NextRequest(new URL(url, 'http://localhost:3000'), {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  describe('RBAC on POST /api/approvals', () => {
    test('rejects unauthenticated request with 401', async () => {
      const req = createAuthedReq('/api/approvals', 'POST', undefined, { patchId: 'p1', diffHash: 'h1' });
      const res = await approvalsPost(req);
      expect(res.status).toBe(401);
    });

    test('rejects member with 403 FORBIDDEN_INSUFFICIENT_ROLE', async () => {
      const req = createAuthedReq('/api/approvals', 'POST', memberTokenA, { patchId: 'p1', diffHash: 'h1' });
      const res = await approvalsPost(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe('FORBIDDEN_INSUFFICIENT_ROLE');
    });

    test('rejects reviewer with 403 FORBIDDEN_INSUFFICIENT_ROLE', async () => {
      const req = createAuthedReq('/api/approvals', 'POST', reviewerTokenA, { patchId: 'p1', diffHash: 'h1' });
      const res = await approvalsPost(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe('FORBIDDEN_INSUFFICIENT_ROLE');
    });

    test('permits admin and owner past RBAC check', async () => {
      // Admin: passes RBAC check (returns 400 because patch does not exist, not 403)
      const reqAdmin = createAuthedReq('/api/approvals', 'POST', adminTokenA, { patchId: 'non_existent', diffHash: 'dummy' });
      const resAdmin = await approvalsPost(reqAdmin);
      expect(resAdmin.status).toBe(400); // 400 from orchestrator, NOT 403 from RBAC

      // Owner: passes RBAC check
      const reqOwner = createAuthedReq('/api/approvals', 'POST', ownerTokenA, { patchId: 'non_existent', diffHash: 'dummy' });
      const resOwner = await approvalsPost(reqOwner);
      expect(resOwner.status).toBe(400); // 400 from orchestrator, NOT 403 from RBAC
    });

    test('enforces cross-tenant isolation: Tenant B owner cannot approve Tenant A patch', async () => {
      const db = getDatabase();
      const instA = await db.saveInstallation(tenantIdA, 111, 'org-a');
      const repoA = await db.saveRepository(tenantIdA, instA.id, {
        id: 'repo_a_test',
        fullName: 'org-a/repo',
        owner: 'org-a',
        name: 'repo',
        defaultBranch: 'main',
        githubRepoId: 111,
        isPrivate: false,
      });
      const findingA = await db.saveFinding(tenantIdA, repoA.id, {
        packageName: 'test-pkg',
        fromVersion: '1.0.0',
        toVersion: '2.0.0',
        isBreaking: true,
        changeRecord: {
          id: 'cr_a',
          packageName: 'test-pkg',
          ecosystem: 'npm',
          fromVersion: '1.0.0',
          toVersion: '2.0.0',
          detectedAt: new Date().toISOString(),
          source: 'registry',
          severity: 'breaking',
          classification: { isBreaking: true, confidence: 1.0, affectedExports: [], reason: 'test' },
          sourceUrl: 'https://example.com',
          rawNotes: 'test notes',
        },
        impactAnalysis: {
          changeId: 'cr_a',
          repoId: repoA.id,
          affectedCallSites: [],
          unaffectedCallSites: [],
          coveragePercent: 100,
          analyzedAt: new Date().toISOString(),
        },
        status: 'open',
      });
      const patchA = await db.savePatch(tenantIdA, findingA.id, '--- a/f\n+++ b/f\n@@ -1 +1 @@\n-a\n+b\n');
      const diffHash = patchA.diffHash;

      // Tenant B owner attempts to approve Tenant A's patch
      const crossReq = createAuthedReq('/api/approvals', 'POST', ownerTokenB, {
        patchId: patchA.id,
        diffHash,
      });
      const res = await approvalsPost(crossReq);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/not found/i);
    });
  });

  describe('RBAC on POST /api/pull-requests', () => {
    test('rejects unauthenticated request with 401', async () => {
      const req = createAuthedReq('/api/pull-requests', 'POST', undefined, { patchId: 'p1' });
      const res = await pullRequestsPost(req);
      expect(res.status).toBe(401);
    });

    test('rejects member with 403 FORBIDDEN_INSUFFICIENT_ROLE', async () => {
      const req = createAuthedReq('/api/pull-requests', 'POST', memberTokenA, { patchId: 'p1' });
      const res = await pullRequestsPost(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe('FORBIDDEN_INSUFFICIENT_ROLE');
    });

    test('rejects reviewer with 403 FORBIDDEN_INSUFFICIENT_ROLE', async () => {
      const req = createAuthedReq('/api/pull-requests', 'POST', reviewerTokenA, { patchId: 'p1' });
      const res = await pullRequestsPost(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe('FORBIDDEN_INSUFFICIENT_ROLE');
    });

    test('permits admin and owner past RBAC check', async () => {
      const reqAdmin = createAuthedReq('/api/pull-requests', 'POST', adminTokenA, { patchId: 'non_existent' });
      const resAdmin = await pullRequestsPost(reqAdmin);
      expect(resAdmin.status).toBe(400); // 400 from orchestrator, NOT 403

      const reqOwner = createAuthedReq('/api/pull-requests', 'POST', ownerTokenA, { patchId: 'non_existent' });
      const resOwner = await pullRequestsPost(reqOwner);
      expect(resOwner.status).toBe(400); // 400 from orchestrator, NOT 403
    });
  });

  describe('RBAC on POST /api/packages', () => {
    test('rejects unauthenticated request with 401', async () => {
      const req = createAuthedReq('/api/packages', 'POST', undefined, { packageName: 'lodash' });
      const res = await packagesPost(req);
      expect(res.status).toBe(401);
    });

    test('rejects member with 403 FORBIDDEN_INSUFFICIENT_ROLE', async () => {
      const req = createAuthedReq('/api/packages', 'POST', memberTokenA, { packageName: 'lodash' });
      const res = await packagesPost(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe('FORBIDDEN_INSUFFICIENT_ROLE');
    });

    test('rejects reviewer with 403 FORBIDDEN_INSUFFICIENT_ROLE', async () => {
      const req = createAuthedReq('/api/packages', 'POST', reviewerTokenA, { packageName: 'lodash' });
      const res = await packagesPost(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe('FORBIDDEN_INSUFFICIENT_ROLE');
    });

    test('permits admin and owner to watch packages', async () => {
      const reqAdmin = createAuthedReq('/api/packages', 'POST', adminTokenA, { packageName: 'mockpay' });
      const resAdmin = await packagesPost(reqAdmin);
      expect(resAdmin.status).toBe(200);

      const reqOwner = createAuthedReq('/api/packages', 'POST', ownerTokenA, { packageName: 'mockpay' });
      const resOwner = await packagesPost(reqOwner);
      expect(resOwner.status).toBe(200);
    });
  });

  describe('Distributed Database-Backed Rate Limiting', () => {
    test('operates atomically when connected to PostgreSQL store mock', async () => {
      const mockQuery = jest.fn();
      const mockStore = {
        query: mockQuery,
      } as unknown as PostgresStore;

      setPostgresStore(mockStore);

      try {
        const now = Date.now();
        // Mock DB returns count = 1
        mockQuery.mockResolvedValueOnce([{ count: 1, first_attempt_at: now }]);

        const r1 = await RateLimiter.checkAndIncrement('test_key', 5, 60000);
        expect(r1.allowed).toBe(true);
        expect(r1.remaining).toBe(4);
        expect(mockQuery).toHaveBeenCalledTimes(1);

        // Mock DB returns count = 6 (exceeded)
        mockQuery.mockResolvedValueOnce([{ count: 6, first_attempt_at: now }]);
        const r2 = await RateLimiter.checkAndIncrement('test_key', 5, 60000);
        expect(r2.allowed).toBe(false);
        expect(r2.remaining).toBe(0);

        // isRateLimited queries DB directly
        mockQuery.mockResolvedValueOnce([{ count: 6, first_attempt_at: now }]);
        const isLimited = await RateLimiter.isRateLimited('test_key', 5, 60000);
        expect(isLimited).toBe(true);
      } finally {
        setPostgresStore(null);
      }
    });

    test('falls back gracefully to memory store when PostgreSQL query fails', async () => {
      const mockStore = {
        query: jest.fn().mockRejectedValue(new Error('PostgreSQL connection timeout')),
      } as unknown as PostgresStore;

      setPostgresStore(mockStore);

      try {
        // Query fails, falls back to memory store without crashing
        const res = await RateLimiter.checkAndIncrement('fallback_key', 3, 60000);
        expect(res.allowed).toBe(true);
        expect(res.remaining).toBe(2);
      } finally {
        setPostgresStore(null);
      }
    });
  });
});
