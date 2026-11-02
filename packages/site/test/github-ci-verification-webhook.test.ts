/**
 * @jest-environment node
 */
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/github/webhook/route';
import { getDatabase, _resetInstancesForTest, ensureDemoTenantAndUser } from '../src/app/api/backend';
import { ChangeRecord } from '@patchversion/shared';

describe('GitHub CI Verification & PR Lifecycle Webhooks', () => {
  const secret = 'ci-webhook-secret-999';
  const originalEnv = process.env;
  let tmpDir: string;

  const mockChangeRecord = (pkg: string, fromV: string, toV: string): ChangeRecord => ({
    id: `chg_${pkg}_1`,
    packageName: pkg,
    ecosystem: 'npm',
    fromVersion: fromV,
    toVersion: toV,
    detectedAt: new Date().toISOString(),
    source: 'registry',
    sourceUrl: `https://www.npmjs.com/package/${pkg}`,
    rawNotes: 'Breaking API changes in new version',
    classification: { isBreaking: true, confidence: 1.0, reason: 'Major version upgrade' },
    severity: 'breaking',
  });

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patchbay-ci-test-'));
    process.env = {
      ...originalEnv,
      PATCHVERSION_STATE_DIR: tmpDir,
      GITHUB_APP_WEBHOOK_SECRET: secret,
    };
    _resetInstancesForTest();
    await ensureDemoTenantAndUser();
  });

  afterEach(() => {
    process.env = originalEnv;
    _resetInstancesForTest();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  function signPayload(body: string, s = secret): string {
    const hmac = crypto.createHmac('sha256', s).update(body).digest('hex');
    return `sha256=${hmac}`;
  }

  it('records validation proof and updates finding status to validated on check_run completion', async () => {
    const db = getDatabase();
    const tenant = await db.createTenant('CI Tenant', 'tenant_ci_1');
    const user = await db.createUser(tenant.id, 'ci@trypatchbay.dev');
    const inst = await db.saveInstallation(tenant.id, 99001, 'org');
    const repo = await db.saveRepository(tenant.id, inst.id, {
      githubRepoId: 99001,
      name: 'ci-repo',
      fullName: 'org/ci-repo',
      owner: 'org',
      defaultBranch: 'main',
      isPrivate: false,
    });

    const finding = await db.saveFinding(tenant.id, repo.id, {
      packageName: 'openai',
      fromVersion: '3.3.0',
      toVersion: '4.20.0',
      isBreaking: true,
      changeRecord: mockChangeRecord('openai', '3.3.0', '4.20.0'),
      status: 'open',
      impactAnalysis: {
        changeId: 'chg_openai_1',
        repoId: repo.id,
        affectedCallSites: [],
        unaffectedCallSites: [],
        coveragePercent: 100,
        analyzedAt: new Date().toISOString(),
      },
    });

    const patch = await db.savePatch(tenant.id, finding.id, '--- diff\n+++ diff');
    await db.saveValidation(tenant.id, patch.id, {
      status: 'passed',
      executionLogs: 'Pre-flight baseline',
      durationMs: 50,
    });
    const approval = await db.approvePatch(tenant.id, patch.id, user.id, patch.diffHash);

    const testCommitSha = 'commit-sha-abc-123';
    await db.savePullRequest(tenant.id, {
      repositoryId: repo.id,
      findingId: finding.id,
      patchId: patch.id,
      approvalId: approval.id,
      githubPrNumber: 42,
      githubPrUrl: 'https://github.com/org/ci-repo/pull/42',
      branchName: 'patchbay/upgrade-openai',
      commitSha: testCommitSha,
    });

    // Send check_run webhook
    const payload = {
      action: 'completed',
      check_run: {
        id: 998877,
        name: 'test-suite',
        head_sha: testCommitSha,
        conclusion: 'success',
        html_url: 'https://github.com/org/ci-repo/actions/runs/12345',
        completed_at: new Date().toISOString(),
      },
    };

    const bodyStr = JSON.stringify(payload);
    const signature = signPayload(bodyStr);

    const req = new NextRequest('http://localhost:3000/api/github/webhook', {
      method: 'POST',
      headers: {
        'x-github-delivery': 'delivery-ci-check-01',
        'x-github-event': 'check_run',
        'x-hub-signature-256': signature,
        'content-type': 'application/json',
      },
      body: bodyStr,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Verify validation record was created
    const validation = await db.getValidationByPatch(tenant.id, patch.id);
    expect(validation).not.toBeNull();
    expect(validation?.status).toBe('passed');
    expect((validation?.proof as unknown as { checkRunId?: number })?.checkRunId).toBe(998877);

    // Verify finding was marked validated
    const updatedFinding = await db.getFinding(tenant.id, finding.id);
    expect(updatedFinding?.status).toBe('validated');
  });

  it('updates pull request status to merged on pull_request closed webhook', async () => {
    const db = getDatabase();
    const tenant = await db.createTenant('PR Tenant', 'tenant_pr_1');
    const user = await db.createUser(tenant.id, 'pr@trypatchbay.dev');
    const inst = await db.saveInstallation(tenant.id, 99002, 'org');
    const repo = await db.saveRepository(tenant.id, inst.id, {
      githubRepoId: 99002,
      name: 'pr-repo',
      fullName: 'org/pr-repo',
      owner: 'org',
      defaultBranch: 'main',
      isPrivate: false,
    });

    const finding = await db.saveFinding(tenant.id, repo.id, {
      packageName: 'lodash',
      fromVersion: '3.0.0',
      toVersion: '4.0.0',
      isBreaking: true,
      changeRecord: mockChangeRecord('lodash', '3.0.0', '4.0.0'),
      status: 'open',
      impactAnalysis: {
        changeId: 'chg_lodash_1',
        repoId: repo.id,
        affectedCallSites: [],
        unaffectedCallSites: [],
        coveragePercent: 100,
        analyzedAt: new Date().toISOString(),
      },
    });

    const patch = await db.savePatch(tenant.id, finding.id, '--- a\n+++ b');
    await db.saveValidation(tenant.id, patch.id, {
      status: 'passed',
      executionLogs: 'Pre-flight baseline',
      durationMs: 50,
    });
    const approval = await db.approvePatch(tenant.id, patch.id, user.id, patch.diffHash);

    const prCommitSha = 'pr-merged-commit-sha-777';
    const prRecord = await db.savePullRequest(tenant.id, {
      repositoryId: repo.id,
      findingId: finding.id,
      patchId: patch.id,
      approvalId: approval.id,
      githubPrNumber: 101,
      githubPrUrl: 'https://github.com/org/pr-repo/pull/101',
      branchName: 'patchbay/upgrade-lodash',
      commitSha: prCommitSha,
    });

    // Send pull_request closed with merged = true
    const payload = {
      action: 'closed',
      pull_request: {
        number: 101,
        merged: true,
        head: { sha: prCommitSha },
      },
    };

    const bodyStr = JSON.stringify(payload);
    const signature = signPayload(bodyStr);

    const req = new NextRequest('http://localhost:3000/api/github/webhook', {
      method: 'POST',
      headers: {
        'x-github-delivery': 'delivery-pr-merged-01',
        'x-github-event': 'pull_request',
        'x-hub-signature-256': signature,
        'content-type': 'application/json',
      },
      body: bodyStr,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const updatedPr = await db.getPullRequest(tenant.id, prRecord.id);
    expect(updatedPr?.status).toBe('merged');
  });
});
