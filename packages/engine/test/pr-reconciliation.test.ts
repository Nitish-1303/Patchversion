import fs from 'fs';
import path from 'path';
import os from 'os';
import { PatchversionDatabase } from '../src/db/database';
import { GitHubClient, CreatedPullRequest } from '../src/github/client';
import { OfflineMockTransport } from '../src';
import { WorkflowOrchestrator } from '../src/jobs/orchestrator';

describe('GitHub PR Reconciliation & Crash Recovery', () => {
  let tmpDir: string;
  let db: PatchversionDatabase;
  let github: GitHubClient;
  let orchestrator: WorkflowOrchestrator;

  const tenantId = 'ten_reconcile_test';
  const userId = 'usr_reconcile_test';
  const repoId = 'repo_reconcile_test';
  const findingId = 'finding_reconcile_test';
  const patchId = 'patch_reconcile_test';

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patchbay-pr-reconcile-test-'));
    db = new PatchversionDatabase(tmpDir);

    const mockTransport = new OfflineMockTransport();

    mockTransport.get('/repos/acme-org/payment-service/pulls', async () => {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    mockTransport.get('/repos/acme-org/payment-service/commits/main', async () => {
      return new Response(
        JSON.stringify({ sha: 'base_sha_acme_main_456' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });

    mockTransport.post('/repos/acme-org/payment-service/git/refs', async () => {
      return new Response(
        JSON.stringify({ ref: 'refs/heads/patchversion/mockpay-2.0.0' }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      );
    });

    mockTransport.post('/repos/acme-org/payment-service/pulls', async () => {
      return new Response(
        JSON.stringify({
          number: 501,
          url: 'https://api.github.com/repos/acme-org/payment-service/pulls/501',
          html_url: 'https://github.com/acme-org/payment-service/pull/501',
          head: { sha: 'commit_sha_501', ref: 'patchversion/mockpay-2.0.0' },
          title: 'fix(mockpay): upgrade to 2.0.0',
          body: 'Automated fix',
          state: 'open',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      );
    });

    github = new GitHubClient(null, mockTransport); // mock client with offline transport
    orchestrator = new WorkflowOrchestrator(db, github);

    db.createTenant('Reconcile Tenant', tenantId);
    db.createUser(tenantId, 'reconcile@example.com', 'owner', 'reconcile-user', undefined, userId);

    const inst = db.saveInstallation(tenantId, 55555, 'acme-org');
    db.saveRepository(tenantId, inst.id, {
      id: repoId,
      githubRepoId: 99001,
      fullName: 'acme-org/payment-service',
      owner: 'acme-org',
      name: 'payment-service',
      defaultBranch: 'main',
      isPrivate: false,
      isDemo: true,
    });

    const change = {
      id: 'change_mock_1_2',
      packageName: 'mockpay',
      ecosystem: 'npm' as const,
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      detectedAt: new Date().toISOString(),
      source: 'registry' as const,
      sourceUrl: 'https://example.com/mockpay',
      rawNotes: 'Breaking API change',
      classification: {
        isBreaking: true,
        confidence: 1.0,
        affectedExports: ['charges.create'],
        reason: 'Breaking API change',
      },
      severity: 'breaking' as const,
    };

    db.saveFinding(tenantId, repoId, {
      id: findingId,
      packageName: 'mockpay',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      isBreaking: true,
      changeRecord: change,
      impactAnalysis: {
        changeId: change.id,
        repoId,
        affectedCallSites: [],
        unaffectedCallSites: [],
        coveragePercent: 100,
        analyzedAt: new Date().toISOString(),
      },
      status: 'validated',
    });

    const sampleDiff = '--- a/index.js\n+++ b/index.js\n@@ -1,1 +1,1 @@\n-old\n+new\n';
    const patch = db.savePatch(tenantId, findingId, sampleDiff, undefined, patchId);

    db.saveValidation(tenantId, patch.id, {
      status: 'passed',
      proof: {
        id: 'proof_mock',
        changeId: change.id,
        repoId,
        baselineResult: { passed: 1, failed: 0, total: 1, output: 'PASS', exitCode: 0 },
        redResult: { passed: 0, failed: 1, total: 1, output: 'FAIL', exitCode: 1 },
        greenResult: { passed: 1, failed: 0, total: 1, output: 'PASS', exitCode: 0 },
        fixDiff: sampleDiff,
        fixedFiles: ['index.js'],
        coverageVerified: 1,
        coverageTotal: 1,
        unverifiable: [],
        producedAt: new Date().toISOString(),
        sandboxType: 'local-process',
        durationMs: 100,
      },
      executionLogs: 'Validation passed',
      durationMs: 100,
    });

    // Human approves the patch
    orchestrator.approvePatch(tenantId, patch.id, userId, patch.diffHash);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('post-PR-creation crash recovery: recovers and adopts existing GitHub PR without duplicate creation', async () => {
    const branchName = 'patchversion/mockpay-2.0.0';
    // Simulate GitHub already having the PR created prior to local crash
    const preExistingGitHubPr: CreatedPullRequest = {
      number: 442,
      url: 'https://api.github.com/repos/acme-org/payment-service/pulls/442',
      htmlUrl: 'https://github.com/acme-org/payment-service/pull/442',
      branch: branchName,
      commitSha: 'sha_preexisting_commit_123',
      title: 'fix(mockpay): upgrade to 2.0.0',
      body: 'Verified automated fix',
      state: 'open',
      isDraft: true,
      isSimulation: false,
    };
    github.registerMockPullRequest('acme-org', 'payment-service', branchName, preExistingGitHubPr);

    // Call deliverPullRequest on fresh/crashed database (no local PR record exists yet)
    expect(db.getPullRequestByFinding(tenantId, findingId)).toBeNull();

    const delivered = await orchestrator.deliverPullRequest(tenantId, patchId, userId);

    expect(delivered).toBeDefined();
    expect(delivered.githubPrNumber).toBe(442);
    expect(delivered.githubPrUrl).toBe('https://github.com/acme-org/payment-service/pull/442');
    expect(delivered.branchName).toBe(branchName);
    expect(delivered.commitSha).toBe('sha_preexisting_commit_123');

    // Confirms it was idempotently saved into the database
    const saved = db.getPullRequestByFinding(tenantId, findingId);
    expect(saved).not.toBeNull();
    expect(saved?.githubPrNumber).toBe(442);
  });

  test('rejects reconciliation if existing GitHub PR branch does not match expected branch', async () => {
    const branchName = 'patchversion/mockpay-2.0.0';
    // Register mock PR with wrong branch name
    const corruptedPr: CreatedPullRequest = {
      number: 999,
      url: 'https://api.github.com/repos/acme-org/payment-service/pulls/999',
      htmlUrl: 'https://github.com/acme-org/payment-service/pull/999',
      branch: 'unrelated/wrong-branch',
      commitSha: 'sha_corrupted',
      title: 'Wrong PR',
      body: 'Wrong branch',
      state: 'open',
    };
    github.registerMockPullRequest('acme-org', 'payment-service', branchName, corruptedPr);

    await expect(orchestrator.deliverPullRequest(tenantId, patchId, userId)).rejects.toThrow(
      /Mismatched PR branch on GitHub/,
    );
  });

  test('concurrency protection: concurrent deliveries lock and second caller fails or waits for idempotency', async () => {
    // Both callers try to deliver the same approved patch concurrently
    const promise1 = orchestrator.deliverPullRequest(tenantId, patchId, userId);
    const promise2 = orchestrator.deliverPullRequest(tenantId, patchId, userId);

    const results = await Promise.allSettled([promise1, promise2]);
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    // Exactly one should succeed, while the other is rejected for concurrency lock
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    if (rejected[0].status === 'rejected') {
      expect(rejected[0].reason.message).toMatch(/already in progress/i);
    }

    // Subsequent sequential call returns the existing PR record idempotently
    const secondCall = await orchestrator.deliverPullRequest(tenantId, patchId, userId);
    expect(secondCall.githubPrNumber).toBeGreaterThan(0);
  });

  test('rejects reconciliation if existing GitHub PR base branch does not match expected base branch', async () => {
    const branchName = 'patchversion/mockpay-2.0.0';
    const corruptedBasePr: CreatedPullRequest = {
      number: 888,
      url: 'https://api.github.com/repos/acme-org/payment-service/pulls/888',
      htmlUrl: 'https://github.com/acme-org/payment-service/pull/888',
      branch: branchName,
      baseBranch: 'develop', // Expected 'main'
      commitSha: 'sha_corrupted_base',
      title: 'Wrong Base PR',
      body: 'Wrong base branch',
      state: 'open',
    };
    github.registerMockPullRequest('acme-org', 'payment-service', branchName, corruptedBasePr);

    await expect(orchestrator.deliverPullRequest(tenantId, patchId, userId)).rejects.toThrow(
      /Mismatched PR base branch on GitHub/,
    );
  });

  test('adopting a closed GitHub PR sets deliveryBlockedReason to Closed on GitHub', async () => {
    const branchName = 'patchversion/mockpay-2.0.0';
    const closedPr: CreatedPullRequest = {
      number: 777,
      url: 'https://api.github.com/repos/acme-org/payment-service/pulls/777',
      htmlUrl: 'https://github.com/acme-org/payment-service/pull/777',
      branch: branchName,
      baseBranch: 'main',
      commitSha: 'sha_closed_pr',
      title: 'Closed PR',
      body: 'Already closed on GitHub',
      state: 'closed',
    };
    github.registerMockPullRequest('acme-org', 'payment-service', branchName, closedPr);

    const delivered = await orchestrator.deliverPullRequest(tenantId, patchId, userId);
    expect(delivered.githubPrNumber).toBe(777);
    expect(delivered.deliveryBlockedReason).toBe('Closed on GitHub');
  });

  test('delivery blocks if GitHub App installation has been deleted', async () => {
    // Reconfigure repo to live (non-demo) with active GitHub configuration
    const inst = db.saveInstallation(tenantId, 55555, 'acme-org');
    db.saveRepository(tenantId, inst.id, {
      id: 'repo_live_deleted_inst',
      githubRepoId: 99002,
      fullName: 'acme-org/live-service',
      owner: 'acme-org',
      name: 'live-service',
      defaultBranch: 'main',
      isPrivate: false,
      isDemo: false,
    });
    github.setConfig({ appId: '12345', privateKey: 'test-key', webhookSecret: 'test-sec' });

    // Mark installation deleted
    db.updateInstallationStatus(tenantId, 55555, 'deleted');

    await expect(orchestrator.deliverPullRequest(tenantId, patchId, userId)).rejects.toThrow(
      /GitHub App installation is not active or has been deleted/,
    );
  });

  test('scanning remote repo blocks if GitHub App installation has been deleted', async () => {
    const inst = db.saveInstallation(tenantId, 88888, 'scan-org');
    db.saveRepository(tenantId, inst.id, {
      id: 'repo_remote_scan_deleted_inst',
      githubRepoId: 99003,
      fullName: 'scan-org/remote-service',
      owner: 'scan-org',
      name: 'remote-service',
      defaultBranch: 'main',
      isPrivate: false,
      isDemo: false,
    });

    db.updateInstallationStatus(tenantId, 88888, 'deleted');

    await expect(orchestrator.scanRepository(tenantId, 'repo_remote_scan_deleted_inst')).rejects.toThrow(
      /GitHub App installation is not active or has been deleted/,
    );
  });
});
