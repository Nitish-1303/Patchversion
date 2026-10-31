import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { PatchversionDatabase } from '../src/db/database';
import { GitHubClient, OfflineMockTransport } from '../src';
import { WorkflowOrchestrator } from '../src/jobs/orchestrator';

describe('Audit: Tenant Isolation and Approval Integrity', () => {
  let tmpDir: string;
  let db: PatchversionDatabase;
  let orchestrator: WorkflowOrchestrator;
  let tenantA: string;
  let userA: string;
  let repoA: string;
  let tenantB: string;
  let userB: string;
  let repoB: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `test-sec-audit-${crypto.randomBytes(6).toString('hex')}`);
    db = new PatchversionDatabase(tmpDir);
    const github = new GitHubClient(null, new OfflineMockTransport());
    orchestrator = new WorkflowOrchestrator(db, github);

    // Tenant A setup
    const tA = db.createTenant('Tenant Alpha');
    tenantA = tA.id;
    userA = db.createUser(tenantA, 'alice@alpha.com').id;
    const instA = db.saveInstallation(tenantA, 11111, 'alpha-org');
    repoA = db.saveRepository(tenantA, instA.id, {
      id: 'repo_alpha',
      githubRepoId: 101,
      fullName: 'alpha-org/payments',
      owner: 'alpha-org',
      name: 'payments',
      defaultBranch: 'main',
      isPrivate: true,
      isDemo: true,
    }).id;

    // Tenant B setup (Attacker)
    const tB = db.createTenant('Tenant Bravo (Attacker)');
    tenantB = tB.id;
    userB = db.createUser(tenantB, 'bob@bravo.com').id;
    const instB = db.saveInstallation(tenantB, 22222, 'bravo-org');
    repoB = db.saveRepository(tenantB, instB.id, {
      id: 'repo_bravo',
      githubRepoId: 202,
      fullName: 'bravo-org/core',
      owner: 'bravo-org',
      name: 'core',
      defaultBranch: 'main',
      isPrivate: true,
      isDemo: true,
    }).id;
    expect(repoB).toBeDefined();
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  test('1. Cross-tenant repository access is strictly blocked', async () => {
    // Tenant B cannot retrieve Tenant A repository
    const crossRepo = db.getRepository(tenantB, repoA);
    expect(crossRepo).toBeNull();

    // Tenant B cannot scan Tenant A repository
    await expect(orchestrator.scanRepositoryWithDependencyMap(tenantB, repoA)).rejects.toThrow(
      /Repository repo_alpha not found for tenant/i,
    );
  });

  test('2. Cross-tenant finding access is strictly blocked', async () => {
    const findingA = db.saveFinding(tenantA, repoA, {
      packageName: 'mockpay',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      isBreaking: true,
      changeRecord: { id: 'c1', packageName: 'mockpay', ecosystem: 'npm', fromVersion: '1.0.0', toVersion: '2.0.0', detectedAt: '', source: 'registry', sourceUrl: '', rawNotes: '', classification: { isBreaking: true, confidence: 1, affectedExports: [], reason: '' }, severity: 'breaking' },
      impactAnalysis: { changeId: 'c1', repoId: repoA, affectedCallSites: [], unaffectedCallSites: [], coveragePercent: 0, analyzedAt: '' },
      status: 'open',
    });

    // Tenant B cannot query Tenant A finding
    const loadedByB = db.getFinding(tenantB, findingA.id);
    expect(loadedByB).toBeNull();

    // Tenant B cannot trigger fix generation for Tenant A finding
    await expect(orchestrator.generateAndValidateFix(tenantB, findingA.id)).rejects.toThrow(
      /Finding .* not found/i,
    );
  });

  test('3. Cross-tenant patch access is strictly blocked', async () => {
    const findingA = db.saveFinding(tenantA, repoA, {
      packageName: 'mockpay',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      isBreaking: true,
      changeRecord: { id: 'c1', packageName: 'mockpay', ecosystem: 'npm', fromVersion: '1.0.0', toVersion: '2.0.0', detectedAt: '', source: 'registry', sourceUrl: '', rawNotes: '', classification: { isBreaking: true, confidence: 1, affectedExports: [], reason: '' }, severity: 'breaking' },
      impactAnalysis: { changeId: 'c1', repoId: repoA, affectedCallSites: [], unaffectedCallSites: [], coveragePercent: 0, analyzedAt: '' },
      status: 'open',
    });

    const diff = '--- a/file.js\n+++ b/file.js\n';
    const patchA = db.savePatch(tenantA, findingA.id, diff);

    // Tenant B cannot query Tenant A patch
    const patchLoadedByB = db.getPatch(tenantB, patchA.id);
    expect(patchLoadedByB).toBeNull();
  });

  test('4. Cross-tenant approval attempts are rejected', async () => {
    const findingA = db.saveFinding(tenantA, repoA, {
      packageName: 'mockpay',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      isBreaking: true,
      changeRecord: { id: 'c1', packageName: 'mockpay', ecosystem: 'npm', fromVersion: '1.0.0', toVersion: '2.0.0', detectedAt: '', source: 'registry', sourceUrl: '', rawNotes: '', classification: { isBreaking: true, confidence: 1, affectedExports: [], reason: '' }, severity: 'breaking' },
      impactAnalysis: { changeId: 'c1', repoId: repoA, affectedCallSites: [], unaffectedCallSites: [], coveragePercent: 0, analyzedAt: '' },
      status: 'open',
    });

    const diff = '--- a/file.js\n+++ b/file.js\n';
    const patchA = db.savePatch(tenantA, findingA.id, diff);
    db.saveValidation(tenantA, patchA.id, {
      status: 'passed',
      executionLogs: 'Tests passed',
      durationMs: 50,
    });

    // User B in Tenant B tries to approve Tenant A's patch
    expect(() => {
      orchestrator.approvePatch(tenantB, patchA.id, userB, patchA.diffHash);
    }).toThrow(/Patch .* not found/i);
  });

  test('5. Approval hash mismatch is strictly rejected', async () => {
    const findingA = db.saveFinding(tenantA, repoA, {
      packageName: 'mockpay',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      isBreaking: true,
      changeRecord: { id: 'c1', packageName: 'mockpay', ecosystem: 'npm', fromVersion: '1.0.0', toVersion: '2.0.0', detectedAt: '', source: 'registry', sourceUrl: '', rawNotes: '', classification: { isBreaking: true, confidence: 1, affectedExports: [], reason: '' }, severity: 'breaking' },
      impactAnalysis: { changeId: 'c1', repoId: repoA, affectedCallSites: [], unaffectedCallSites: [], coveragePercent: 0, analyzedAt: '' },
      status: 'open',
    });

    const diff = '--- a/file.js\n+++ b/file.js\n';
    const patchA = db.savePatch(tenantA, findingA.id, diff);

    // Tampered hash rejection
    expect(() => {
      orchestrator.approvePatch(tenantA, patchA.id, userA, '0000000000000000000000000000000000000000000000000000000000000000');
    }).toThrow(/diff hash mismatch/i);
  });

  test('6. Approval replay protection: approving with old hash after patch regeneration is rejected', async () => {
    const findingA = db.saveFinding(tenantA, repoA, {
      packageName: 'mockpay',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      isBreaking: true,
      changeRecord: { id: 'c1', packageName: 'mockpay', ecosystem: 'npm', fromVersion: '1.0.0', toVersion: '2.0.0', detectedAt: '', source: 'registry', sourceUrl: '', rawNotes: '', classification: { isBreaking: true, confidence: 1, affectedExports: [], reason: '' }, severity: 'breaking' },
      impactAnalysis: { changeId: 'c1', repoId: repoA, affectedCallSites: [], unaffectedCallSites: [], coveragePercent: 0, analyzedAt: '' },
      status: 'open',
    });

    const diff1 = '--- a/file.js\n+++ b/file.js\n-old();\n+new();\n';
    const patch1 = db.savePatch(tenantA, findingA.id, diff1);
    const oldHash = patch1.diffHash;

    // Patch is regenerated with different content
    const diff2 = '--- a/file.js\n+++ b/file.js\n-old();\n+v2();\n';
    const patch2 = db.savePatch(tenantA, findingA.id, diff2, undefined, patch1.id);
    db.saveValidation(tenantA, patch2.id, {
      status: 'passed',
      executionLogs: 'Tests passed',
      durationMs: 50,
    });

    // Old hash approval replay against regenerated patch MUST fail
    expect(() => {
      orchestrator.approvePatch(tenantA, patch2.id, userA, oldHash);
    }).toThrow(/diff hash mismatch/i);

    // Current hash approval succeeds
    const approval = orchestrator.approvePatch(tenantA, patch2.id, userA, patch2.diffHash);
    expect(approval.status).toBe('active');
  });

  test('7. Session revocation prevents unauthorized actions immediately', async () => {
    const session = db.createSession(userA);
    expect(db.getSession(session.token)).toBeDefined();

    // Revoke session using token
    db.revokeSession(session.token);
    expect(db.isSessionRevoked(session.id)).toBe(true);

    // getSession returns null after revocation
    expect(db.getSession(session.token)).toBeNull();
  });

  test('8. Patch mutation after approval: validation rerun invalidates existing approval', async () => {
    const findingA = db.saveFinding(tenantA, repoA, {
      packageName: 'mockpay',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      isBreaking: true,
      changeRecord: { id: 'c1', packageName: 'mockpay', ecosystem: 'npm', fromVersion: '1.0.0', toVersion: '2.0.0', detectedAt: '', source: 'registry', sourceUrl: '', rawNotes: '', classification: { isBreaking: true, confidence: 1, affectedExports: [], reason: '' }, severity: 'breaking' },
      impactAnalysis: { changeId: 'c1', repoId: repoA, affectedCallSites: [], unaffectedCallSites: [], coveragePercent: 0, analyzedAt: '' },
      status: 'open',
    });

    const diff = '--- a/file.js\n+++ b/file.js\n';
    const patch = db.savePatch(tenantA, findingA.id, diff);
    db.saveValidation(tenantA, patch.id, {
      status: 'passed',
      executionLogs: 'Tests passed',
      durationMs: 50,
    });
    const approval = orchestrator.approvePatch(tenantA, patch.id, userA, patch.diffHash);
    expect(approval.status).toBe('active');

    // A rerun of validation that fails must invalidate the active approval
    db.saveValidation(tenantA, patch.id, {
      status: 'failed',
      executionLogs: 'Validation rerun failed',
      durationMs: 100,
    });

    const activeApproval = db.getActiveApproval(tenantA, patch.id);
    expect(activeApproval).toBeNull();
  });
});
