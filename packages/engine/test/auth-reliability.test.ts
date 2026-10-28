import fs from 'fs';
import path from 'path';
import os from 'os';
import { PatchversionDatabase } from '../src/db/database';

describe('Auth Reliability & Stateless Sessions', () => {
  let tmpDirA: string;
  let tmpDirB: string;

  beforeEach(() => {
    tmpDirA = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-test-db-a-'));
    tmpDirB = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-test-db-b-'));
    process.env.PATCHVERSION_SESSION_SECRET = 'test-secret-32-chars-long-123456';
  });

  afterEach(() => {
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

  test('rejects expired token', () => {
    const db = new PatchversionDatabase(tmpDirA);
    const tenant = db.createTenant('Acme Corp');
    const user = db.createUser(tenant.id, 'alice@acme.com');

    // Create session that expired 1 hour ago
    const session = db.createSession(user.id, -1);
    const resolved = db.getSession(session.token);
    expect(resolved).toBeNull();
  });

  test('revokeSession prevents subsequent token verification', () => {
    const db = new PatchversionDatabase(tmpDirA);
    const tenant = db.createTenant('Acme Corp');
    const user = db.createUser(tenant.id, 'alice@acme.com');
    const session = db.createSession(user.id);

    expect(db.getSession(session.token)).not.toBeNull();
    const revoked = db.revokeSession(session.token);
    expect(revoked).toBe(true);
    expect(db.getSession(session.token)).toBeNull();
  });
});

describe('Watch Targets & Tenant Isolation', () => {
  let tmpDir: string;
  let db: PatchversionDatabase;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-test-targets-'));
    db = new PatchversionDatabase(tmpDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch { /* ignore */ }
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
    db.createUser(tenant.id, 'alice@acme.com');
    const inst = db.saveInstallation(tenant.id, 1, 'acme');
    const repo = db.saveRepository(tenant.id, inst.id, {
      githubRepoId: 100,
      fullName: 'acme/service',
      owner: 'acme',
      name: 'service',
      defaultBranch: 'main',
      isPrivate: false,
    });

    const pr = db.savePullRequest(tenant.id, {
      repositoryId: repo.id,
      findingId: 'finding_1',
      patchId: 'patch_1',
      approvalId: 'appr_1',
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
});
