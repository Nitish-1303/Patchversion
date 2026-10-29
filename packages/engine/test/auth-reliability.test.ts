import fs from 'fs';
import path from 'path';
import os from 'os';
import { PatchversionDatabase } from '../src/db/database';
import { WorkflowOrchestrator } from '../src/jobs/orchestrator';
import { GitHubClient } from '../src/github/client';

describe('Auth Reliability & Stateless Sessions', () => {
  let tmpDirA: string;
  let tmpDirB: string;
  const originalEnv = process.env;

  beforeEach(() => {
    tmpDirA = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-test-db-a-'));
    tmpDirB = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-test-db-b-'));
    process.env = { ...originalEnv };
    process.env.PATCHVERSION_SESSION_SECRET = 'test-secret-at-least-32-chars-long-123456';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env = originalEnv;
    try {
      fs.rmSync(tmpDirA, { recursive: true, force: true });
      fs.rmSync(tmpDirB, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  test('createSession emits signed v1 token format', () => {
    const db = new PatchversionDatabase(tmpDirA);
    const tenant = db.createTenant('Acme Corp');
    const user = db.createUser(tenant.id, 'alice@acme.com', 'admin');

    const session = db.createSession(user.id);
    expect(session.token).toMatch(/^v1\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/);
    expect(session.userId).toBe(user.id);
    expect(session.tenantId).toBe(tenant.id);
  });

  test('stateless session verification across isolated serverless DB instances', () => {
    // Instance A creates the session
    const dbA = new PatchversionDatabase(tmpDirA);
    const tenantA = dbA.createTenant('Acme Corp', 'ten_shared');
    const userA = dbA.createUser(tenantA.id, 'alice@acme.com', 'admin', undefined, undefined, 'usr_shared');
    const session = dbA.createSession(userA.id);

    // Instance B is in a completely different directory with no shared data files
    const dbB = new PatchversionDatabase(tmpDirB);
    const resolvedSession = dbB.getSession(session.token);

    expect(resolvedSession).not.toBeNull();
    expect(resolvedSession?.userId).toBe('usr_shared');
    expect(resolvedSession?.tenantId).toBe('ten_shared');
    expect(resolvedSession?.token).toBe(session.token);
  });

  test('rejects tampered token signature', () => {
    const db = new PatchversionDatabase(tmpDirA);
    const tenant = db.createTenant('Acme Corp');
    const user = db.createUser(tenant.id, 'alice@acme.com');
    const session = db.createSession(user.id);

    const parts = session.token.split('.');
    const tamperedSig = parts[2].slice(0, -4) + 'zzzz';
    const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSig}`;

    const resolved = db.getSession(tamperedToken);
    expect(resolved).toBeNull();
  });

  test('rejects tampered token payload', () => {
    const db = new PatchversionDatabase(tmpDirA);
    const tenant = db.createTenant('Acme Corp');
    const user = db.createUser(tenant.id, 'alice@acme.com');
    const session = db.createSession(user.id);

    const parts = session.token.split('.');
    // decode payload, change userId, re-encode without signature recalculation
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    payload.userId = 'usr_attacker';
    const tamperedBody = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedBody}.${parts[2]}`;

    const resolved = db.getSession(tamperedToken);
    expect(resolved).toBeNull();
  });

  test('rejects malformed and non-JSON tokens safely', () => {
    const db = new PatchversionDatabase(tmpDirA);
    expect(db.getSession('')).toBeNull();
    expect(db.getSession('random_garbage_string')).toBeNull();
    expect(db.getSession('v1.onlyonepart')).toBeNull();
    expect(db.getSession('v1.invalid_base64!@#.signature')).toBeNull();

    const notJsonBody = Buffer.from('this is not json').toString('base64url');
    expect(db.getSession(`v1.${notJsonBody}.invalidsig`)).toBeNull();
  });

  test('rejects expired token', () => {
    const db = new PatchversionDatabase(tmpDirA);
    const tenant = db.createTenant('Acme Corp');
    const user = db.createUser(tenant.id, 'alice@acme.com');

    // Create session that expired 1 hour ago
    const session = db.createSession(user.id, -1);
    const resolved = db.getSession(session.token);
    expect(resolved).toBeNull();
  });

  test('revocation is enforced within same storage instance', () => {
    const db = new PatchversionDatabase(tmpDirA);
    const tenant = db.createTenant('Acme Corp');
    const user = db.createUser(tenant.id, 'alice@acme.com');
    const session = db.createSession(user.id);

    expect(db.getSession(session.token)).not.toBeNull();
    const revoked = db.revokeSession(session.token);
    expect(revoked).toBe(true);
    expect(db.getSession(session.token)).toBeNull();
  });

  test('documents that revocation is local without shared database infrastructure', () => {
    // Instance A creates and revokes the session in its local directory
    const dbA = new PatchversionDatabase(tmpDirA);
    const tenant = dbA.createTenant('Acme', 'ten_1');
    const user = dbA.createUser(tenant.id, 'alice@acme.com', 'admin', undefined, undefined, 'usr_1');
    const session = dbA.createSession(user.id);
    dbA.revokeSession(session.token);
    expect(dbA.getSession(session.token)).toBeNull();

    // Isolated Instance B without shared disk validates the stateless token cryptographically,
    // demonstrating why an external distributed revocation store is required for cross-container revocation
    const dbB = new PatchversionDatabase(tmpDirB);
    const sessionOnB = dbB.getSession(session.token);
    expect(sessionOnB).not.toBeNull();
  });

  test('production environment refuses to sign without configured secret', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.PATCHVERSION_SESSION_SECRET;

    const db = new PatchversionDatabase(tmpDirA);
    const tenant = db.createTenant('Acme Corp');
    const user = db.createUser(tenant.id, 'alice@acme.com');

    expect(() => db.createSession(user.id)).toThrow(
      /SECURITY VIOLATION: PATCHVERSION_SESSION_SECRET is required in production environments/
    );
  });

  test('production environment refuses short secrets under 32 characters', () => {
    process.env.NODE_ENV = 'production';
    process.env.PATCHVERSION_SESSION_SECRET = 'too-short-secret';

    const db = new PatchversionDatabase(tmpDirA);
    const tenant = db.createTenant('Acme Corp');
    const user = db.createUser(tenant.id, 'alice@acme.com');

    expect(() => db.createSession(user.id)).toThrow(
      /SECURITY VIOLATION: PATCHVERSION_SESSION_SECRET must be at least 32 characters/
    );
  });

  test('concurrent session creations produce unique valid tokens without race conditions', async () => {
    const db = new PatchversionDatabase(tmpDirA);
    const tenant = db.createTenant('Acme Corp');
    const user = db.createUser(tenant.id, 'alice@acme.com');

    const sessionPromises = Array.from({ length: 20 }, () => Promise.resolve(db.createSession(user.id)));
    const sessions = await Promise.all(sessionPromises);

    const tokenSet = new Set(sessions.map(s => s.token));
    expect(tokenSet.size).toBe(20);

    for (const session of sessions) {
      const resolved = db.getSession(session.token);
      expect(resolved).not.toBeNull();
      expect(resolved?.userId).toBe(user.id);
    }
  });
});

describe('Tenant Isolation & Cross-Tenant Security', () => {
  let tmpDir: string;
  let db: PatchversionDatabase;
  let orchestrator: WorkflowOrchestrator;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-test-tenant-iso-'));
    process.env.PATCHVERSION_SESSION_SECRET = 'test-secret-at-least-32-chars-long-123456';
    db = new PatchversionDatabase(tmpDir);
    const github = new GitHubClient(null);
    orchestrator = new WorkflowOrchestrator(db, github);
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  test('cross-tenant resource isolation prevents unauthorized access', async () => {
    const tenantA = db.createTenant('Tenant Alpha');
    const userA = db.createUser(tenantA.id, 'alice@alpha.com');
    const instA = db.saveInstallation(tenantA.id, 101, 'alpha-org');
    const repoA = db.saveRepository(tenantA.id, instA.id, {
      githubRepoId: 1001,
      fullName: 'alpha-org/payments',
      owner: 'alpha-org',
      name: 'payments',
      defaultBranch: 'main',
      isPrivate: false,
    });

    const tenantB = db.createTenant('Tenant Beta');
    const userB = db.createUser(tenantB.id, 'bob@beta.com');

    // Tenant B cannot read Tenant A's repository
    expect(db.getRepository(tenantB.id, repoA.id)).toBeNull();

    // Tenant B cannot list Tenant A's repositories
    const tenantBRepos = db.listRepositories(tenantB.id);
    expect(tenantBRepos).toHaveLength(0);

    // Create finding and patch in Tenant A
    const findingA = db.saveFinding(tenantA.id, repoA.id, {
      packageName: 'mockpay',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      isBreaking: true,
      status: 'open',
      changeRecord: {
        id: 'cr_1',
        packageName: 'mockpay',
        ecosystem: 'npm',
        fromVersion: '1.0.0',
        toVersion: '2.0.0',
        detectedAt: new Date().toISOString(),
        source: 'registry',
        sourceUrl: 'https://registry.npmjs.org/mockpay',
        rawNotes: 'Breaking change',
        classification: {
          isBreaking: true,
          confidence: 1.0,
          affectedExports: [],
          reason: 'Breaking change',
        },
        severity: 'breaking',
      },
      impactAnalysis: {
        changeId: 'cr_1',
        repoId: repoA.id,
        affectedCallSites: [],
        unaffectedCallSites: [],
        potentialCallSites: [],
        coveragePercent: 100,
        analyzedAt: new Date().toISOString(),
      },
    });
    const patchA = db.savePatch(tenantA.id, findingA.id, 'diff content');

    // Tenant B cannot read Tenant A's finding or patch
    expect(db.getFinding(tenantB.id, findingA.id)).toBeNull();
    expect(db.getPatch(tenantB.id, patchA.id)).toBeNull();

    // Tenant B cannot deliver PR for Tenant A's patch
    await expect(
      orchestrator.deliverPullRequest(tenantB.id, patchA.id, userB.id)
    ).rejects.toThrow();

    // User A cannot deliver PR under Tenant B's context
    await expect(
      orchestrator.deliverPullRequest(tenantB.id, patchA.id, userA.id)
    ).rejects.toThrow(/Unauthorized/);
  });

  test('tenant-isolated package watch targets', () => {
    const tenant1 = db.createTenant('Tenant 1');
    const tenant2 = db.createTenant('Tenant 2');

    db.saveWatchTarget(tenant1.id, {
      packageName: 'lodash',
      ecosystem: 'npm',
      currentVersion: '3.10.1',
      latestVersion: '4.17.21',
      lastCheckedAt: new Date().toISOString(),
      status: 'upgrade_available',
      source: 'registry',
    });

    const t1Targets = db.listWatchTargets(tenant1.id);
    const t2Targets = db.listWatchTargets(tenant2.id);

    expect(t1Targets).toHaveLength(1);
    expect(t1Targets[0].packageName).toBe('lodash');
    expect(t2Targets).toHaveLength(0);
  });

  test('updateWatchTarget updates in-place and sets updatedAt', () => {
    const tenant = db.createTenant('Acme');
    db.saveWatchTarget(tenant.id, {
      packageName: 'mockpay',
      ecosystem: 'npm',
      currentVersion: '1.0.0',
      latestVersion: '1.0.0',
      lastCheckedAt: new Date().toISOString(),
      status: 'up_to_date',
      source: 'fixture-demo',
      isDemo: true,
    });

    const updated = db.updateWatchTarget(tenant.id, 'mockpay', {
      latestVersion: '2.0.0',
      status: 'upgrade_available',
      notes: 'Breaking change fixture',
    });

    expect(updated).not.toBeNull();
    expect(updated?.latestVersion).toBe('2.0.0');
    expect(updated?.status).toBe('upgrade_available');
    expect(updated?.isDemo).toBe(true);
    expect(updated?.notes).toBe('Breaking change fixture');
  });

  test('savePullRequest preserves simulation and draft metadata', () => {
    const tenant = db.createTenant('Acme');
    const user = db.createUser(tenant.id, 'alice@acme.com');
    const inst = db.saveInstallation(tenant.id, 1, 'acme');
    const repo = db.saveRepository(tenant.id, inst.id, {
      githubRepoId: 100,
      fullName: 'acme/service',
      owner: 'acme',
      name: 'service',
      defaultBranch: 'main',
      isPrivate: false,
    });

    const finding = db.saveFinding(tenant.id, repo.id, {
      packageName: 'mockpay',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      isBreaking: true,
      status: 'open',
      changeRecord: {
        id: 'cr_1',
        packageName: 'mockpay',
        ecosystem: 'npm',
        fromVersion: '1.0.0',
        toVersion: '2.0.0',
        detectedAt: new Date().toISOString(),
        source: 'registry',
        sourceUrl: 'https://registry.npmjs.org/mockpay',
        rawNotes: 'Breaking change',
        classification: {
          isBreaking: true,
          confidence: 1.0,
          affectedExports: [],
          reason: 'Breaking change',
        },
        severity: 'breaking',
      },
      impactAnalysis: {
        changeId: 'cr_1',
        repoId: repo.id,
        affectedCallSites: [],
        unaffectedCallSites: [],
        potentialCallSites: [],
        coveragePercent: 100,
        analyzedAt: new Date().toISOString(),
      },
    });
    const patch = db.savePatch(tenant.id, finding.id, 'diff content');
    db.saveValidation(tenant.id, patch.id, {
      status: 'passed',
      executionLogs: 'baseline ok',
      durationMs: 120,
    });
    const approval = db.approvePatch(tenant.id, patch.id, user.id, patch.diffHash);

    const pr = db.savePullRequest(tenant.id, {
      repositoryId: repo.id,
      findingId: finding.id,
      patchId: patch.id,
      approvalId: approval.id,
      githubPrNumber: 42,
      githubPrUrl: 'https://github.com/acme/service/pull/42',
      branchName: 'patchversion/mockpay-2.0.0',
      commitSha: 'sha_12345',
      isDraft: true,
      isSimulation: true,
      deliveryBlockedReason: 'No live credentials configured.',
    });

    expect(pr.isDraft).toBe(true);
    expect(pr.isSimulation).toBe(true);
    expect(pr.deliveryBlockedReason).toBe('No live credentials configured.');

    const retrieved = db.getPullRequest(tenant.id, pr.id);
    expect(retrieved?.isDraft).toBe(true);
    expect(retrieved?.isSimulation).toBe(true);
  });

  test('verifyWebhookSignature validates genuine HMAC and rejects invalid signatures', () => {
    const crypto = require('crypto');
    const secret = 'webhook-test-secret-12345';
    const client = new GitHubClient({
      appId: '123',
      privateKey: 'dummy',
      webhookSecret: secret,
    });

    const body = Buffer.from(JSON.stringify({ action: 'ping', zen: 'Keep it logically awesome.' }), 'utf8');
    const validSig = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
    const invalidSig = 'sha256=' + 'a'.repeat(64);

    expect(client.verifyWebhookSignature(body, validSig)).toBe(true);
    expect(client.verifyWebhookSignature(body, invalidSig)).toBe(false);
    expect(client.verifyWebhookSignature(body, undefined)).toBe(false);
    expect(client.verifyWebhookSignature(body, 'invalid_prefix')).toBe(false);
    expect(client.verifyWebhookSignature(body, 'sha256=short')).toBe(false);
    expect(client.verifyWebhookSignature(body, 'sha256=' + 'z'.repeat(64))).toBe(false);
  });

  test('verifyWebhookSignature fails closed when secret is absent or empty', () => {
    const client = new GitHubClient({
      appId: '123',
      privateKey: 'dummy',
      webhookSecret: '',
    });
    const body = Buffer.from('{"hello":"world"}', 'utf8');
    const validShapeSig = 'sha256=' + 'a'.repeat(64);

    const prevEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      expect(client.verifyWebhookSignature(body, validShapeSig)).toBe(false);

      process.env.NODE_ENV = 'development';
      // Fails closed in all environments without secret
      expect(client.verifyWebhookSignature(body, validShapeSig)).toBe(false);
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });
});
