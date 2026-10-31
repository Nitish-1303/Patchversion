/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { POST as webhookPost } from '../src/app/api/github/webhook/route';
import { POST as packagesPost } from '../src/app/api/packages/route';
import { POST as scanPost } from '../src/app/api/scan/route';
import { GitHubClient } from '@patchversion/engine';
import { getDatabase, setGitHubClient, getGitHubClient, ensureDemoTenantAndUser } from '../src/app/api/backend';

describe('Webhook Installation Deletion and Watch Target Hardening', () => {
  let tmpDir: string;
  let sessionToken: string;
  const tenantId = 'ten_webhook_test_tenant';
  const userId = 'usr_webhook_test_user';
  const webhookSecret = 'test-webhook-secret-value-12345';

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patchbay-webhook-hardening-test-'));
    process.env.PATCHVERSION_STATE_DIR = tmpDir;
    process.env.PATCHVERSION_SESSION_SECRET = 'test-secret-at-least-32-chars-long-for-testing';
    process.env.GITHUB_APP_ID = '12345';
    process.env.GITHUB_APP_PRIVATE_KEY = 'test-key';
    process.env.GITHUB_APP_WEBHOOK_SECRET = webhookSecret;

    setGitHubClient(new GitHubClient({
      appId: '12345',
      privateKey: 'test-key',
      webhookSecret,
    }));

    await ensureDemoTenantAndUser();
    const db = getDatabase();

    await db.createTenant('Webhook Tenant', tenantId);
    await db.createUser(tenantId, 'webhook-dev@example.com', 'owner', 'webhook-dev', undefined, userId);
    const session = await db.createSession(userId);
    sessionToken = session.token;
  });

  afterAll(() => {
    delete process.env.PATCHVERSION_STATE_DIR;
    delete process.env.GITHUB_WEBHOOK_SECRET;
    delete process.env.GITHUB_APP_ID;
    delete process.env.GITHUB_APP_PRIVATE_KEY;
    delete process.env.GITHUB_APP_WEBHOOK_SECRET;
    setGitHubClient(null);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createSignature(payload: string): string {
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(Buffer.from(payload, 'utf8'));
    return `sha256=${hmac.digest('hex')}`;
  }

  function createWebhookRequest(
    deliveryId: string,
    event: string,
    payloadObj: object,
    signatureOverride?: string,
  ): NextRequest {
    const payloadStr = JSON.stringify(payloadObj);
    const signature = signatureOverride ?? createSignature(payloadStr);

    return new NextRequest(new URL('/api/github/webhook', 'http://localhost:3000'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-delivery': deliveryId,
        'x-github-event': event,
        'x-hub-signature-256': signature,
      },
      body: payloadStr,
    });
  }

  function createAuthedPackagesRequest(bodyObj: object): NextRequest {
    return new NextRequest(new URL('/api/packages', 'http://localhost:3000'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(bodyObj),
    });
  }

  describe('GitHub Webhook installation.deleted', () => {
    const githubInstallationId = 778899;

    beforeEach(async () => {
      const db = getDatabase();
      await db.saveInstallation(tenantId, githubInstallationId, 'test-corp');
    });

    test('1. Valid deletion event persists the deleted tombstone status', async () => {
      const db = getDatabase();
      const preInst = await db.getInstallationByGithubId(githubInstallationId);
      expect(preInst?.status).toBe('active');

      const req = createWebhookRequest('del_test_valid_01', 'installation', {
        action: 'deleted',
        installation: { id: githubInstallationId },
      });

      const res = await webhookPost(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('accepted');

      const postInst = await db.getInstallationByGithubId(githubInstallationId);
      expect(postInst?.status).toBe('deleted');
    });

    test('2. Repeated deletion event is idempotent and safe', async () => {
      const db = getDatabase();
      // First deletion
      const req1 = createWebhookRequest('del_test_repeat_01', 'installation', {
        action: 'deleted',
        installation: { id: githubInstallationId },
      });
      const res1 = await webhookPost(req1);
      expect(res1.status).toBe(200);

      // Second deletion (simulating retried webhook delivery)
      const req2 = createWebhookRequest('del_test_repeat_02', 'installation', {
        action: 'deleted',
        installation: { id: githubInstallationId },
      });
      const res2 = await webhookPost(req2);
      expect(res2.status).toBe(200);

      const postInst = await db.getInstallationByGithubId(githubInstallationId);
      expect(postInst?.status).toBe('deleted');
    });

    test('3. Invalid signature causes 401 and zero database mutation', async () => {
      const db = getDatabase();
      // Reset installation to active
      await db.updateInstallationStatus(tenantId, githubInstallationId, 'active');

      const req = createWebhookRequest(
        'del_test_invalid_sig',
        'installation',
        { action: 'deleted', installation: { id: githubInstallationId } },
        'sha256=invalidhexsignature000000000000000000000000000000000000000000000000',
      );

      const res = await webhookPost(req);
      expect(res.status).toBe(401);

      const postInst = await db.getInstallationByGithubId(githubInstallationId);
      expect(postInst?.status).toBe('active');
    });

    test('4. Unknown installation ID is handled safely without error', async () => {
      const unknownId = 11223344;
      const req = createWebhookRequest('del_test_unknown_inst', 'installation', {
        action: 'deleted',
        installation: { id: unknownId },
      });

      const res = await webhookPost(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('accepted');
    });

    test('5. Persistence failure does not produce a false successful response', async () => {
      const db = getDatabase();
      const originalUpdate = db.updateInstallationStatus;
      // Force database operation to reject
      db.updateInstallationStatus = jest.fn().mockImplementation(() => {
        throw new Error('Database disk I/O error');
      });

      try {
        const req = createWebhookRequest('del_test_db_fail', 'installation', {
          action: 'deleted',
          installation: { id: githubInstallationId },
        });

        const res = await webhookPost(req);
        // Must fail with 500 status rather than false 200 success
        expect(res.status).toBe(500);
        const data = await res.json();
        expect(data.error).toMatch(/Webhook processing failed/);
      } finally {
        db.updateInstallationStatus = originalUpdate;
      }
    });
  });

  describe('Packages Watch-Target Error Handling', () => {
    const realFetch = global.fetch;

    afterEach(() => {
      global.fetch = realFetch;
    });

    test('proves updateWatchTarget is awaited and fully resolved in error handler', async () => {
      // Mock fetch to simulate registry timeout
      global.fetch = jest.fn().mockRejectedValue(new Error('Request aborted: Registry timeout after 5000ms'));

      const req = createAuthedPackagesRequest({
        packageName: 'express-test-pkg',
        ecosystem: 'npm',
        currentVersion: '4.18.0',
      });

      const res = await packagesPost(req);
      expect(res.status).toBe(504);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Registry request timed out after 5000ms');

      // Crucial: package must be a resolved object, NOT an empty object or pending promise
      expect(data.package).toBeDefined();
      expect(data.package).not.toBeNull();
      expect(data.package.packageName).toBe('express-test-pkg');
      expect(data.package.status).toBe('error');
      expect(data.package.lastError).toBe('Registry request timed out after 5000ms');

      // Verify the persisted state in DB also reflects the error status
      const db = getDatabase();
      const inDb = await db.getWatchTarget(tenantId, 'express-test-pkg');
      expect(inDb).not.toBeNull();
      expect(inDb?.status).toBe('error');
    });

    test('database failure in error handler does not mask registry error or produce false success', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Registry connection refused'));

      const db = getDatabase();
      const originalUpdate = db.updateWatchTarget;
      // Force persistence to fail
      db.updateWatchTarget = jest.fn().mockRejectedValue(new Error('DB connection closed'));

      try {
        const req = createAuthedPackagesRequest({
          packageName: 'koa-test-pkg',
          ecosystem: 'npm',
          currentVersion: '2.14.0',
        });

        const res = await packagesPost(req);
        // Must still report error (504) and success: false, not 200 or unhandled crash
        expect(res.status).toBe(504);
        const data = await res.json();
        expect(data.success).toBe(false);
        expect(data.error).toBe('Registry connection refused');
        expect(data.package).toBeNull();
      } finally {
        db.updateWatchTarget = originalUpdate;
      }
    });

    test('enforces RBAC on POST /api/packages: unprivileged member receives 403', async () => {
      const db = getDatabase();
      const memberUserId = 'usr_member_test_only';
      await db.createUser(tenantId, 'member@example.com', 'member', 'member-dev', undefined, memberUserId);
      const memberSession = await db.createSession(memberUserId);

      const req = new NextRequest(new URL('/api/packages', 'http://localhost:3000'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberSession.token}`,
        },
        body: JSON.stringify({
          packageName: 'react',
        }),
      });

      const res = await packagesPost(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe('FORBIDDEN_INSUFFICIENT_ROLE');
    });
  });

  describe('Scan API Isolation and Execution Safety Gate', () => {
    test('POST /api/scan on a live customer repository refuses unisolated execution and does not execute code', async () => {
      const db = getDatabase();
      const inst = await db.saveInstallation(tenantId, 888777, 'live-customer-org');
      const liveRepo = await db.saveRepository(tenantId, inst.id, {
        githubRepoId: 99112233,
        fullName: 'live-customer-org/billing-service',
        owner: 'live-customer-org',
        name: 'billing-service',
        defaultBranch: 'main',
        isPrivate: true,
        isDemo: false,
      });

      // Seed a finding on this live repo
      const finding = await db.saveFinding(tenantId, liveRepo.id, {
        packageName: 'mockpay',
        fromVersion: '1.0.0',
        toVersion: '2.0.0',
        isBreaking: true,
        changeRecord: {
          id: 'change_mock_scan_test',
          packageName: 'mockpay',
          ecosystem: 'npm',
          fromVersion: '1.0.0',
          toVersion: '2.0.0',
          detectedAt: new Date().toISOString(),
          source: 'registry',
          sourceUrl: 'https://registry.npmjs.org/mockpay',
          rawNotes: 'v2 notes',
          classification: { isBreaking: true, confidence: 1.0, affectedExports: [], reason: 'breaking change' },
          severity: 'breaking',
        },
        impactAnalysis: {
          changeId: 'change_mock_scan_test',
          repoId: liveRepo.id,
          affectedCallSites: [],
          unaffectedCallSites: [],
          coveragePercent: 0,
          analyzedAt: new Date().toISOString(),
        },
        status: 'open',
      });

      // Mock GitHub file fetch so scanRepository doesn't fail on network
      const gh = getGitHubClient();
      jest.spyOn(gh, 'getInstallationToken').mockResolvedValue('ghs_mocktoken');
      jest.spyOn(gh, 'getRepositoryFileContent').mockResolvedValue(JSON.stringify({
        dependencies: { mockpay: '1.0.0' },
      }));

      const req = new NextRequest('http://localhost:3000/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ repositoryId: liveRepo.id }),
      });

      const res = await scanPost(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.repositoryId).toBe(liveRepo.id);

      // Verify that the finding was processed but execution was explicitly refused
      const fixResult = data.results.find((r: { finding: { id: string } }) => r.finding.id === finding.id);
      expect(fixResult).toBeDefined();
      expect(fixResult.error).toMatch(/execution for live repository "live-customer-org\/billing-service" is disabled/i);
      expect(fixResult.validation).toBeUndefined();
    });
  });
});
