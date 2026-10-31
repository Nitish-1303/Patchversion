import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { PatchversionDatabase } from '../src/db/database';
import { GitHubClient, OfflineMockTransport } from '../src';
import { WorkflowOrchestrator } from '../src/jobs/orchestrator';
import { resolvePermittedFixturePath } from '../src/sandbox/isolated-runner';

describe('Audit: Customer Execution Boundary & Fail-Closed Isolation', () => {
  let tmpDir: string;
  let db: PatchversionDatabase;
  let orchestrator: WorkflowOrchestrator;
  let tenantId: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `test-exec-sec-${crypto.randomBytes(6).toString('hex')}`);
    db = new PatchversionDatabase(tmpDir);
    const github = new GitHubClient(null, new OfflineMockTransport());
    orchestrator = new WorkflowOrchestrator(db, github);
    tenantId = db.createTenant('Customer Corp').id;
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  test('Customer repository without qualified container isolation fails closed with explicit error', async () => {
    const inst = db.saveInstallation(tenantId, 55555, 'customer-org');
    const customerRepo = db.saveRepository(tenantId, inst.id, {
      id: 'repo_customer_prod',
      githubRepoId: 9999,
      fullName: 'customer-org/core-api',
      owner: 'customer-org',
      name: 'core-api',
      defaultBranch: 'main',
      isPrivate: true,
      isDemo: false,
    });

    const finding = db.saveFinding(tenantId, customerRepo.id, {
      packageName: 'lodash',
      fromVersion: '3.10.1',
      toVersion: '4.17.21',
      isBreaking: true,
      changeRecord: {
        id: 'c_lodash',
        packageName: 'lodash',
        ecosystem: 'npm',
        fromVersion: '3.10.1',
        toVersion: '4.17.21',
        detectedAt: '',
        source: 'registry',
        sourceUrl: '',
        rawNotes: '',
        classification: { isBreaking: true, confidence: 1, affectedExports: [], reason: '' },
        severity: 'breaking',
      },
      impactAnalysis: {
        changeId: 'c_lodash',
        repoId: customerRepo.id,
        affectedCallSites: [],
        unaffectedCallSites: [],
        coveragePercent: 0,
        analyzedAt: '',
      },
      status: 'open',
    });

    // Attempting test validation on customer repository MUST fail closed
    await expect(orchestrator.generateAndValidateFix(tenantId, finding.id)).rejects.toThrow(
      /execution for live repository "customer-org\/core-api" is disabled\. Execution is restricted to trusted demo fixtures until container isolation is qualified\./i,
    );
  });

  test('resolvePermittedFixturePath strictly prevents path traversal and external paths', () => {
    const allowedRoot = path.resolve(__dirname, '../../../fixtures');

    // Attempt to point outside fixture root to system directories or parents
    expect(resolvePermittedFixturePath(allowedRoot, '../../windows/system32')).toBeNull();
    expect(resolvePermittedFixturePath(allowedRoot, '../../../etc/passwd')).toBeNull();
    expect(resolvePermittedFixturePath(allowedRoot, '/bin/sh')).toBeNull();
    expect(resolvePermittedFixturePath(allowedRoot, 'C:\\Windows\\cmd.exe')).toBeNull();
  });
});
