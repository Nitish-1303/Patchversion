import { createTwoFilesPatch } from 'diff';
import {
  applyUnifiedDiffToContents,
  discoverSupportedMigrations,
  assertMonthlyPrQuotaAvailable,
  QuotaExceededError,
  monthlyPrQuotaForPlan,
  GitHubClient,
  OfflineMockTransport,
  WorkflowOrchestrator,
} from '../src';
import { PatchversionDatabase } from '../src/db/database';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('P0 B14 — discoverSupportedMigrations from repo evidence only', () => {
  test('emits lodash finding only when lodash is present at a migratable version', () => {
    const withLodash = discoverSupportedMigrations([
      { name: 'lodash', version: '3.10.1' },
      { name: 'react', version: '18.2.0' },
    ]);
    expect(withLodash.some((c) => c.packageName === 'lodash')).toBe(true);
    expect(withLodash.some((c) => c.packageName === 'mockpay')).toBe(false);
  });

  test('emits no findings for empty or unrelated dependencies', () => {
    expect(discoverSupportedMigrations([])).toEqual([]);
    expect(
      discoverSupportedMigrations([
        { name: 'left-pad', version: '1.3.0' },
        { name: 'lodash', version: '4.17.21' }, // already on target side of rule
      ]),
    ).toEqual([]);
  });

  test('does not invent mockpay when absent from repository deps', () => {
    const changes = discoverSupportedMigrations([{ name: 'axios', version: '0.27.2' }]);
    expect(changes.every((c) => c.packageName !== 'mockpay')).toBe(true);
    expect(changes.some((c) => c.packageName === 'axios')).toBe(true);
  });
});

describe('P0 B13 — applyUnifiedDiffToContents + commitPatchToBranch', () => {
  const original = "export function charge() {\n  return mockpay.charges.create({ source: token });\n}\n";
  const updated = "export function charge() {\n  return mockpay.charges.create({ payment_method: token });\n}\n";
  const diff = createTwoFilesPatch('a/src/createCharge.js', 'b/src/createCharge.js', original, updated);

  test('applies unified diff and rejects empty/no-op', () => {
    const applied = applyUnifiedDiffToContents({ 'src/createCharge.js': original }, diff);
    expect(applied.success).toBe(true);
    expect(applied.files[0]?.content).toContain('payment_method');

    const empty = applyUnifiedDiffToContents({ 'src/createCharge.js': original }, '');
    expect(empty.success).toBe(false);

    const noop = applyUnifiedDiffToContents(
      { 'src/createCharge.js': updated },
      createTwoFilesPatch('a/src/createCharge.js', 'b/src/createCharge.js', updated, updated),
    );
    expect(noop.success).toBe(false);
  });

  test('commitPatchToBranch creates blob/tree/commit and advances branch head', async () => {
    const transport = new OfflineMockTransport();
    const baseSha = 'baseaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const blobSha = 'blobbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const treeSha = 'treecccccccccccccccccccccccccccccccccccc';
    const commitSha = 'commitdddddddddddddddddddddddddddddddddd';

    transport.get('/repos/acme/app/contents/src/createCharge.js', async () => {
      return new Response(
        JSON.stringify({
          content: Buffer.from(original, 'utf8').toString('base64'),
          encoding: 'base64',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    transport.get(`/repos/acme/app/git/commits/${baseSha}`, async () => {
      return new Response(JSON.stringify({ sha: baseSha, tree: { sha: 'basetreeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    transport.post('/repos/acme/app/git/blobs', async () => {
      return new Response(JSON.stringify({ sha: blobSha }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    transport.post('/repos/acme/app/git/trees', async (_url, init) => {
      const body = JSON.parse(String(init?.body || '{}'));
      expect(body.tree?.length).toBe(1);
      expect(body.tree[0].path).toBe('src/createCharge.js');
      return new Response(JSON.stringify({ sha: treeSha }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    transport.post('/repos/acme/app/git/commits', async (_url, init) => {
      const body = JSON.parse(String(init?.body || '{}'));
      expect(body.parents).toEqual([baseSha]);
      expect(body.tree).toBe(treeSha);
      return new Response(JSON.stringify({ sha: commitSha }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    transport.patch('/repos/acme/app/git/refs/heads/patchversion/mockpay-2.0.0', async (_url, init) => {
      const body = JSON.parse(String(init?.body || '{}'));
      expect(body.sha).toBe(commitSha);
      return new Response(JSON.stringify({ ref: 'refs/heads/patchversion/mockpay-2.0.0' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const github = new GitHubClient(null, transport);
    const result = await github.commitPatchToBranch({
      owner: 'acme',
      repo: 'app',
      branch: 'patchversion/mockpay-2.0.0',
      baseSha,
      unifiedDiff: diff,
      message: 'fix(mockpay): rename source to payment_method',
      token: 'token',
    });
    expect(result.commitSha).toBe(commitSha);
    expect(result.files[0]?.path).toBe('src/createCharge.js');
  });
});

describe('P0 B8 — monthly PR quota enforcement', () => {
  test('developer plan allows one PR then rejects', () => {
    expect(monthlyPrQuotaForPlan('developer')).toBe(1);
    expect(() => assertMonthlyPrQuotaAvailable({ plan: 'developer', usedThisMonth: 0 })).not.toThrow();
    expect(() => assertMonthlyPrQuotaAvailable({ plan: 'developer', usedThisMonth: 1 })).toThrow(QuotaExceededError);
  });

  test('paid plans are unlimited', () => {
    expect(() => assertMonthlyPrQuotaAvailable({ plan: 'repository', usedThisMonth: 999 })).not.toThrow();
    expect(() => assertMonthlyPrQuotaAvailable({ plan: 'organization', usedThisMonth: 999 })).not.toThrow();
  });

  test('deliverPullRequest refuses when developer quota exhausted', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-quota-'));
    const db = new PatchversionDatabase(tmpDir);
    const transport = new OfflineMockTransport();
    const github = new GitHubClient(null, transport);
    const orchestrator = new WorkflowOrchestrator(db, github);

    const tenantId = 'ten_quota';
    const userId = 'usr_quota';
    db.createTenant('Quota Tenant', tenantId);
    db.updateTenantPlan(tenantId, 'developer');
    db.createUser(tenantId, 'quota@example.com', 'owner', undefined, undefined, userId);
    const inst = db.saveInstallation(tenantId, 1, 'acme');
    db.saveRepository(tenantId, inst.id, {
      id: 'repo_q',
      githubRepoId: 1,
      fullName: 'acme/app',
      owner: 'acme',
      name: 'app',
      defaultBranch: 'main',
      isPrivate: false,
      isDemo: true,
    });
    // Seed prior finding/patch/approval so an existing non-simulation PR can be recorded
    const oldFinding = db.saveFinding(tenantId, 'repo_q', {
      id: 'finding_old',
      packageName: 'lodash',
      fromVersion: '3.10.1',
      toVersion: '4.0.0',
      isBreaking: true,
      changeRecord: {
        id: 'c_old',
        packageName: 'lodash',
        ecosystem: 'npm',
        fromVersion: '3.10.1',
        toVersion: '4.0.0',
        detectedAt: new Date().toISOString(),
        source: 'registry',
        sourceUrl: 'https://example.com',
        rawNotes: 'break',
        classification: { isBreaking: true, confidence: 1, reason: 'break', affectedExports: [] },
        severity: 'breaking',
      },
      impactAnalysis: {
        changeId: 'c_old',
        repoId: 'repo_q',
        affectedCallSites: [],
        unaffectedCallSites: [],
        coveragePercent: 0,
        analyzedAt: new Date().toISOString(),
      },
      status: 'pr_created',
    });
    const oldPatch = db.savePatch(tenantId, oldFinding.id, '--- a/a.js\n+++ b/a.js\n@@\n-a\n+b\n', undefined, 'patch_old');
    db.saveValidation(tenantId, oldPatch.id, {
      status: 'passed',
      proof: {
        id: 'proof_old',
        changeId: 'c_old',
        repoId: 'repo_q',
        baselineResult: { passed: 1, failed: 0, total: 1, output: '', exitCode: 0 },
        redResult: { passed: 0, failed: 1, total: 1, output: '', exitCode: 1 },
        greenResult: { passed: 1, failed: 0, total: 1, output: '', exitCode: 0 },
        fixDiff: oldPatch.diffContent,
        fixedFiles: ['a.js'],
        coverageVerified: 0,
        coverageTotal: 0,
        unverifiable: [],
        producedAt: new Date().toISOString(),
        sandboxType: 'local-process',
        durationMs: 1,
        executionProvenance: 'fixture-verified',
      },
      executionLogs: 'ok',
      durationMs: 1,
    });
    const oldApproval = await orchestrator.approvePatch(tenantId, oldPatch.id, userId, oldPatch.diffHash);
    db.savePullRequest(tenantId, {
      repositoryId: 'repo_q',
      findingId: oldFinding.id,
      patchId: oldPatch.id,
      approvalId: oldApproval.id,
      githubPrNumber: 1,
      githubPrUrl: 'https://github.com/acme/app/pull/1',
      branchName: 'patchversion/old',
      commitSha: 'sha1',
      isDraft: true,
      isSimulation: false,
    });

    const finding = db.saveFinding(tenantId, 'repo_q', {
      id: 'finding_new',
      packageName: 'mockpay',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      isBreaking: true,
      changeRecord: {
        id: 'c1',
        packageName: 'mockpay',
        ecosystem: 'npm',
        fromVersion: '1.0.0',
        toVersion: '2.0.0',
        detectedAt: new Date().toISOString(),
        source: 'registry',
        sourceUrl: 'https://example.com',
        rawNotes: 'break',
        classification: { isBreaking: true, confidence: 1, reason: 'break', affectedExports: [] },
        severity: 'breaking',
      },
      impactAnalysis: {
        changeId: 'c1',
        repoId: 'repo_q',
        affectedCallSites: [],
        unaffectedCallSites: [],
        coveragePercent: 0,
        analyzedAt: new Date().toISOString(),
      },
      status: 'validated',
    });
    const patch = db.savePatch(tenantId, finding.id, '--- a/x\n+++ b/x\n@@\n-a\n+b\n');
    db.saveValidation(tenantId, patch.id, {
      status: 'passed',
      proof: {
        id: 'proof1',
        changeId: 'c1',
        repoId: 'repo_q',
        baselineResult: { passed: 1, failed: 0, total: 1, output: '', exitCode: 0 },
        redResult: { passed: 0, failed: 1, total: 1, output: '', exitCode: 1 },
        greenResult: { passed: 1, failed: 0, total: 1, output: '', exitCode: 0 },
        fixDiff: patch.diffContent,
        fixedFiles: ['x'],
        coverageVerified: 0,
        coverageTotal: 0,
        unverifiable: [],
        producedAt: new Date().toISOString(),
        sandboxType: 'local-process',
        durationMs: 1,
        executionProvenance: 'fixture-verified',
      },
      executionLogs: 'ok',
      durationMs: 1,
    });
    await orchestrator.approvePatch(tenantId, patch.id, userId, patch.diffHash);

    await expect(orchestrator.deliverPullRequest(tenantId, patch.id, userId)).rejects.toBeInstanceOf(
      QuotaExceededError,
    );

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
