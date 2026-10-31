/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { GET as scanGet, POST as scanPost } from '../src/app/api/scan/route';
import { getDatabase, ensureDemoTenantAndUser, DEMO_REPO_ID, _resetInstancesForTest } from '../src/app/api/backend';

describe('/api/scan API Routes (Repository Scanning & Dependency Mapping)', () => {
  jest.setTimeout(60000);
  let tmpDir: string;
  let demoSessionToken: string;
  let otherTenantSessionToken: string;
  let otherTenantId: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patchbay-scan-api-test-'));
    process.env.PATCHVERSION_STATE_DIR = tmpDir;
    process.env.PATCHVERSION_SESSION_SECRET = 'test-secret-at-least-32-chars-long-for-testing';

    _resetInstancesForTest();
    await ensureDemoTenantAndUser();
    const db = getDatabase();

    // Authenticated session for demo tenant/user
    const demoUser = await db.getUserByEmail('developer@trypatchbay.dev');
    if (!demoUser) throw new Error('Demo user not found');
    const demoSession = await db.createSession(demoUser.id);
    demoSessionToken = demoSession.token;

    // Second tenant to verify tenant isolation
    otherTenantId = 'ten_other_workspace';
    const otherUserId = 'usr_other_dev';
    await db.createTenant('Other Workspace', otherTenantId);
    await db.createUser(otherTenantId, 'other@example.com', 'owner', 'other-dev', undefined, otherUserId);
    const otherSession = await db.createSession(otherUserId);
    otherTenantSessionToken = otherSession.token;
  });

  afterAll(() => {
    _resetInstancesForTest();
    delete process.env.PATCHVERSION_STATE_DIR;
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5 });
    } catch {
      // Windows lock tolerance
    }
  });

  function createAuthedRequest(url: string, method: string, token: string, body?: object): NextRequest {
    return new NextRequest(new URL(url, 'http://localhost:3000'), {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  describe('GET /api/scan', () => {
    test('rejects unauthenticated requests with 401', async () => {
      const req = new NextRequest(new URL('/api/scan?repositoryId=demo', 'http://localhost:3000'), {
        method: 'GET',
      });
      const res = await scanGet(req);
      expect(res.status).toBe(401);
    });

    test('rejects request with missing repositoryId query parameter with 400', async () => {
      const req = createAuthedRequest('/api/scan', 'GET', demoSessionToken);
      const res = await scanGet(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('repositoryId is required');
    });

    test('returns 404 for non-existent repository', async () => {
      const req = createAuthedRequest('/api/scan?repositoryId=non-existent-repo-id', 'GET', demoSessionToken);
      const res = await scanGet(req);
      expect(res.status).toBe(404);
    });

    test('returns 200 with scan: null when repository has not been scanned yet', async () => {
      const req = createAuthedRequest(`/api/scan?repositoryId=${DEMO_REPO_ID}`, 'GET', demoSessionToken);
      const res = await scanGet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.repositoryId).toBe(DEMO_REPO_ID);
      expect(data.scan).toBeNull();
    });
  });

  describe('POST /api/scan', () => {
    test('rejects unauthenticated scan request with 401', async () => {
      const req = new NextRequest(new URL('/api/scan', 'http://localhost:3000'), {
        method: 'POST',
        body: JSON.stringify({ repositoryId: DEMO_REPO_ID }),
      });
      const res = await scanPost(req);
      expect(res.status).toBe(401);
    });

    test('rejects request with missing repositoryId with 400', async () => {
      const req = createAuthedRequest('/api/scan', 'POST', demoSessionToken, {});
      const res = await scanPost(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('repositoryId is required');
    });

    test('rejects request for non-existent repository with 404', async () => {
      const req = createAuthedRequest('/api/scan', 'POST', demoSessionToken, {
        repositoryId: 'fake-unknown-repo-id',
      });
      const res = await scanPost(req);
      expect(res.status).toBe(404);
    });

    test('executes full scan and dependency mapping on demo repository', async () => {
      const req = createAuthedRequest('/api/scan', 'POST', demoSessionToken, {
        repositoryId: DEMO_REPO_ID,
      });

      const res = await scanPost(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.repositoryId).toBe(DEMO_REPO_ID);
      expect(data.scan).toBeDefined();

      const scan = data.scan;
      expect(scan.packageManager).toBe('npm');
      expect(scan.projectType).toBe('single-package');
      expect(scan.totalDependencies).toBeGreaterThan(0);
      expect(scan.directCount).toBeGreaterThan(0);
      expect(Array.isArray(scan.dependencies)).toBe(true);
      expect(Array.isArray(scan.graph.nodes)).toBe(true);
      expect(Array.isArray(scan.graph.edges)).toBe(true);

      // Verify mockpay dependency was mapped
      const mockpay = scan.dependencies.find((d: { name: string }) => d.name === 'mockpay');
      expect(mockpay).toBeDefined();
      expect(mockpay.importingFiles.length).toBeGreaterThan(0);

      // Verify findings and candidate patches generated
      expect(data.findingsCount).toBeGreaterThan(0);
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.results.length).toBeGreaterThan(0);
      expect(data.results[0].patch).toBeDefined();
      expect(data.results[0].validation).toBeDefined();
    });

    test('GET /api/scan subsequently retrieves the persisted scan result', async () => {
      const req = createAuthedRequest(`/api/scan?repositoryId=${DEMO_REPO_ID}`, 'GET', demoSessionToken);
      const res = await scanGet(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.scan).toBeDefined();
      expect(data.scan.repositoryId).toBe(DEMO_REPO_ID);
      expect(data.scan.totalDependencies).toBeGreaterThan(0);
    });

    test('enforces tenant isolation: another tenant cannot access repository scan without permission', async () => {
      const db = getDatabase();
      const inst = await db.saveInstallation(otherTenantId, 55555, 'isolated-corp', 'User');
      const privateRepo = await db.saveRepository(otherTenantId, inst.id, {
        id: 'repo_private_1',
        githubRepoId: 88888,
        fullName: 'private/tenant-b-only',
        owner: 'private',
        name: 'tenant-b-only',
        defaultBranch: 'main',
        isPrivate: true,
      });

      // Tenant B (otherTenantSessionToken) can access its own repository
      const authedReqB = createAuthedRequest(`/api/scan?repositoryId=${privateRepo.id}`, 'GET', otherTenantSessionToken);
      const resB = await scanGet(authedReqB);
      expect(resB.status).toBe(200);

      // Tenant A (demoSessionToken) tries to GET Tenant B's private repository scan and is rejected with 404
      const req = createAuthedRequest(`/api/scan?repositoryId=${privateRepo.id}`, 'GET', demoSessionToken);
      const res = await scanGet(req);
      expect(res.status).toBe(404);
    });
  });
});
