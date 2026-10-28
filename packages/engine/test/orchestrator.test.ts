import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { PatchversionDatabase } from '../src/db/database';
import { GitHubClient } from '../src/github/client';
import { WorkflowOrchestrator } from '../src/jobs/orchestrator';

describe('WorkflowOrchestrator - Complete End-to-End Vertical Slice', () => {
  jest.setTimeout(180_000);
  let tmpDir: string;
  let db: PatchversionDatabase;
  let github: GitHubClient;
  let orchestrator: WorkflowOrchestrator;
  let tenantId: string;
  let userId: string;
  let repoId: string;

  beforeAll(() => {
    const fixtureRepoPath = path.resolve(__dirname, '../../../fixtures/sample-repo');
    const pkg = JSON.parse(fs.readFileSync(path.join(fixtureRepoPath, 'package.json'), 'utf-8'));
    const firstDep = Object.keys(pkg.dependencies ?? {})[0];
    if (!firstDep || !fs.existsSync(path.join(fixtureRepoPath, 'node_modules', firstDep))) {
      const { resolveNpmInvocation } = require('../src/npm-cli');
      const { execFileSync } = require('child_process');
      const npm = resolveNpmInvocation(['install', '--install-links', '--no-audit', '--no-fund']);
      execFileSync(npm.command, npm.args, { cwd: fixtureRepoPath, stdio: 'pipe', shell: npm.shell });
    }
  });

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `test-orch-${crypto.randomBytes(6).toString('hex')}`);
    db = new PatchversionDatabase(tmpDir);
    github = new GitHubClient(null); // Mock GitHub provider
    orchestrator = new WorkflowOrchestrator(db, github);

    const tenant = db.createTenant('Acme Payments');
    tenantId = tenant.id;

    const user = db.createUser(tenantId, 'engineer@acmepayments.com', 'admin');
    userId = user.id;

    const inst = db.saveInstallation(tenantId, 9999, 'acme-payments');

    const fixtureRepoPath = path.resolve(__dirname, '../../../fixtures/sample-repo');
    const repo = db.saveRepository(tenantId, inst.id, {
      githubRepoId: 8888,
      fullName: 'acme-payments/checkout-service',
      owner: 'acme-payments',
      name: 'checkout-service',
      defaultBranch: 'main',
      isPrivate: false,
      localPath: fixtureRepoPath,
    });
    repoId = repo.id;
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  test('executes complete workflow from scan to PR creation with human approval gating', async () => {
    // 1. Scan Repository
    const findings = await orchestrator.scanRepository(tenantId, repoId);
    expect(findings.length).toBeGreaterThan(0);
    const finding = findings[0];
    expect(finding.packageName).toBe('mockpay');
    expect(finding.isBreaking).toBe(true);
    expect(finding.status).toBe('open');

    // 2. Candidate Patch & Isolated Validation
    const { patch, validation } = await orchestrator.generateAndValidateFix(tenantId, finding.id);
    expect(patch.diffContent).toContain('payment_method: source');
    expect(patch.diffHash).toBeDefined();
    expect(validation.status).toBe('passed');
    expect(validation.proof?.baselineResult.exitCode).toBe(0);
    expect(validation.proof?.redResult.exitCode).not.toBe(0);
    expect(validation.proof?.greenResult.exitCode).toBe(0);

    // 3. PR Delivery MUST FAIL before explicit human approval
    await expect(orchestrator.deliverPullRequest(tenantId, patch.id, userId)).rejects.toThrow(
      /lacks valid explicit human approval/i,
    );

    // 4. Stale approval rejection: approving with wrong hash is rejected
    expect(() => {
      orchestrator.approvePatch(tenantId, patch.id, userId, 'tampered_hash_value');
    }).toThrow(/diff hash mismatch/i);

    // 5. Explicit Approval with exact diff hash succeeds
    const approval = orchestrator.approvePatch(tenantId, patch.id, userId, patch.diffHash);
    expect(approval.status).toBe('active');
    expect(approval.diffHashAtApproval).toBe(patch.diffHash);

    // 6. Deliver Genuine GitHub Pull Request
    const prRecord = await orchestrator.deliverPullRequest(tenantId, patch.id, userId);
    expect(prRecord).not.toBeNull();
    expect(prRecord.githubPrNumber).toBeGreaterThan(0);
    expect(prRecord.githubPrUrl).toContain('https://github.com/acme-payments/checkout-service/pull/');
    expect(prRecord.branchName).toBe('patchversion/mockpay-2.0.0');
    expect(prRecord.status).toBe('open');

    // 7. Duplicate PR Prevention: delivering again returns the existing PR
    const secondDelivery = await orchestrator.deliverPullRequest(tenantId, patch.id, userId);
    expect(secondDelivery.id).toBe(prRecord.id);
    expect(secondDelivery.githubPrNumber).toBe(prRecord.githubPrNumber);

    // 8. Cross-Tenant Authorization Denial
    const otherTenant = db.createTenant('Malicious Tenant');
    const attacker = db.createUser(otherTenant.id, 'attacker@evil.com');
    await expect(orchestrator.deliverPullRequest(otherTenant.id, patch.id, attacker.id)).rejects.toThrow();
  });
});
