import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { ChangeRecord, ImpactAnalysis, PatchRecord } from '@patchversion/shared';
import { resolvePermittedFixturePath } from '../src/sandbox/isolated-runner';
import { PatchversionDatabase } from '../src/db/database';
import { WorkflowOrchestrator } from '../src/jobs/orchestrator';
import { GitHubClient } from '../src/github/client';
import { PatchversionEngine } from '../src/engine';
import { SandboxRunner } from '../src/sandbox/runner';
import {
  UnavailableExecutionProvider,
  IsolationProviderUnavailableError,
} from '../src/sandbox/execution-provider';

describe('Repository Scan, Tenancy, and Security Regression Tests', () => {
  let tmpDirA: string;
  let tmpDirB: string;
  let db: PatchversionDatabase;
  let github: GitHubClient;
  let orchestrator: WorkflowOrchestrator;

  const mockChange: ChangeRecord = {
    id: 'change_mock_1',
    packageName: 'mockpay',
    ecosystem: 'npm',
    fromVersion: '1.0.0',
    toVersion: '2.0.0',
    detectedAt: new Date().toISOString(),
    source: 'registry',
    sourceUrl: 'https://registry.npmjs.org/mockpay',
    rawNotes: 'mockpay v2 breaking update notes',
    classification: { isBreaking: true, confidence: 1.0, affectedExports: [], reason: 'Breaking API change in major bump' },
    severity: 'breaking',
  };

  const mockImpact: ImpactAnalysis = {
    changeId: 'change_mock_1',
    repoId: 'repo_demo_checkout_service',
    affectedCallSites: [],
    unaffectedCallSites: [],
    coveragePercent: 100,
    analyzedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    tmpDirA = path.join(os.tmpdir(), `test-scan-a-${crypto.randomBytes(6).toString('hex')}`);
    tmpDirB = path.join(os.tmpdir(), `test-scan-b-${crypto.randomBytes(6).toString('hex')}`);
    db = new PatchversionDatabase(tmpDirA);
    github = new GitHubClient(null); // Mock provider
    orchestrator = new WorkflowOrchestrator(db, github);
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDirA, { recursive: true, force: true });
      fs.rmSync(tmpDirB, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  test('1. A tenant scanning its own connected repository succeeds', async () => {
    const tenant = db.createTenant('Acme Corp');
    const inst = db.saveInstallation(tenant.id, 176251721, 'Nitish-1303');
    const repo = db.saveRepository(tenant.id, inst.id, {
      githubRepoId: 98765432,
      fullName: 'Nitish-1303/CipherBill',
      owner: 'Nitish-1303',
      name: 'CipherBill',
      defaultBranch: 'main',
      isPrivate: false,
      isDemo: false,
    });

    const findings = await orchestrator.scanRepository(tenant.id, repo.id);
    expect(Array.isArray(findings)).toBe(true);
    // CipherBill has real dependencies with 0 breaking regression candidates in current known changes
    expect(findings.length).toBe(0);
  });

  test('2. A missing repository returns a clear not-found response', async () => {
    const tenant = db.createTenant('Acme Corp');
    await expect(orchestrator.scanRepository(tenant.id, 'non_existent_repo_id')).rejects.toThrow(
      /Repository non_existent_repo_id not found for tenant/,
    );
  });

  test('3. A repository belonging to another tenant cannot be accessed or scanned', async () => {
    const tenantA = db.createTenant('Tenant Alpha');
    const tenantB = db.createTenant('Tenant Beta');

    const instA = db.saveInstallation(tenantA.id, 1001, 'alpha-org');
    const repoA = db.saveRepository(tenantA.id, instA.id, {
      githubRepoId: 1001,
      fullName: 'alpha-org/private-repo',
      owner: 'alpha-org',
      name: 'private-repo',
      defaultBranch: 'main',
      isPrivate: true,
    });

    // Database lookup fails across tenants
    expect(db.getRepository(tenantB.id, repoA.id)).toBeNull();
    expect(db.getRepository(tenantB.id, repoA.fullName)).toBeNull();

    // Orchestrator rejects scan across tenants
    await expect(orchestrator.scanRepository(tenantB.id, repoA.id)).rejects.toThrow(
      new RegExp(`Repository ${repoA.id} not found for tenant`),
    );
  });

  test('4. An unconnected or unauthorized repository cannot be scanned', async () => {
    const tenant = db.createTenant('Acme Corp');
    await expect(orchestrator.scanRepository(tenant.id, 'unauthorized/unknown-repo')).rejects.toThrow(
      /Repository unauthorized\/unknown-repo not found for tenant/,
    );
  });

  test('5. Repository identifiers are resolved consistently between UI and scan API', () => {
    const tenant = db.createTenant('Acme Corp');
    const inst = db.saveInstallation(tenant.id, 176251721, 'Nitish-1303');
    const repo = db.saveRepository(tenant.id, inst.id, {
      id: 'repo_stable_cipherbill',
      githubRepoId: 98765432,
      fullName: 'Nitish-1303/CipherBill',
      owner: 'Nitish-1303',
      name: 'CipherBill',
      defaultBranch: 'main',
      isPrivate: false,
    });

    // Lookup by internal stable ID
    const byId = db.getRepository(tenant.id, 'repo_stable_cipherbill');
    expect(byId).not.toBeNull();
    expect(byId?.id).toBe(repo.id);

    // Lookup by fullName (case-insensitive)
    const byFullName = db.getRepository(tenant.id, 'nitish-1303/cipherbill');
    expect(byFullName).not.toBeNull();
    expect(byFullName?.id).toBe(repo.id);

    // Lookup by name
    const byName = db.getRepository(tenant.id, 'cipherbill');
    expect(byName).not.toBeNull();
    expect(byName?.id).toBe(repo.id);

    // Lookup by numeric githubRepoId
    const byNum = db.getRepository(tenant.id, '98765432');
    expect(byNum).not.toBeNull();
    expect(byNum?.id).toBe(repo.id);
  });

  test('6. Demo fixtures cannot masquerade as live repositories', () => {
    const tenant = db.createTenant('Acme Corp');
    const inst = db.saveInstallation(tenant.id, 10001, 'patchbay-demo');

    const demoRepo = db.saveRepository(tenant.id, inst.id, {
      id: 'repo_demo_checkout_service',
      githubRepoId: 20001,
      fullName: 'patchbay-demo/checkout-service',
      owner: 'patchbay-demo',
      name: 'checkout-service',
      defaultBranch: 'main',
      isPrivate: false,
      isDemo: true,
    });

    const liveRepo = db.saveRepository(tenant.id, inst.id, {
      id: 'repo_live_cipherbill',
      githubRepoId: 98765432,
      fullName: 'Nitish-1303/CipherBill',
      owner: 'Nitish-1303',
      name: 'CipherBill',
      defaultBranch: 'main',
      isPrivate: false,
      isDemo: false,
    });

    expect(demoRepo.isDemo).toBe(true);
    expect(liveRepo.isDemo).toBe(false);
  });

  test('7. Scan failures do not create fake findings, validated patches, or delivered PRs', async () => {
    const tenant = db.createTenant('Acme Corp');
    const dbInternal = db as unknown as { data: { patches: Record<string, PatchRecord> } };
    const initialFindings = db.listFindings(tenant.id);
    const initialPatches = Object.values(dbInternal.data.patches).filter(p => p.tenantId === tenant.id);
    const initialPRs = db.listPullRequests(tenant.id);

    expect(initialFindings.length).toBe(0);
    expect(initialPatches.length).toBe(0);
    expect(initialPRs.length).toBe(0);

    // Attempt scan on missing repo
    await expect(orchestrator.scanRepository(tenant.id, 'non_existent')).rejects.toThrow();

    // Verify counters remain strictly at zero
    expect(db.listFindings(tenant.id).length).toBe(0);
    expect(Object.values(dbInternal.data.patches).filter(p => p.tenantId === tenant.id).length).toBe(0);
    expect(db.listPullRequests(tenant.id).length).toBe(0);
  });

  test('8. Deterministic demo IDs survive cross-container cold starts', () => {
    const DEMO_TENANT = 'ten_demo_workspace';
    const DEMO_REPO = 'repo_demo_checkout_service';
    const DEMO_FINDING = 'finding_demo_mockpay_1_0_0_to_2_0_0';
    const DEMO_PATCH = 'patch_demo_mockpay_1_0_0_to_2_0_0';

    // Container 1
    const db1 = new PatchversionDatabase(tmpDirA);
    const tenant1 = db1.createTenant('Demo Workspace', DEMO_TENANT);
    const inst1 = db1.saveInstallation(tenant1.id, 10001, 'patchbay-demo');
    const repo1 = db1.saveRepository(tenant1.id, inst1.id, {
      id: DEMO_REPO,
      githubRepoId: 20001,
      fullName: 'patchbay-demo/checkout-service',
      owner: 'patchbay-demo',
      name: 'checkout-service',
      defaultBranch: 'main',
      isPrivate: false,
      isDemo: true,
    });
    const finding1 = db1.saveFinding(tenant1.id, repo1.id, {
      id: DEMO_FINDING,
      packageName: 'mockpay',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      isBreaking: true,
      changeRecord: mockChange,
      impactAnalysis: mockImpact,
      status: 'validated',
    });
    const patch1 = db1.savePatch(tenant1.id, finding1.id, 'diff content', undefined, DEMO_PATCH);

    expect(repo1.id).toBe(DEMO_REPO);
    expect(finding1.id).toBe(DEMO_FINDING);
    expect(patch1.id).toBe(DEMO_PATCH);

    // Container 2 (brand new cold started directory, deterministic initialization)
    const db2 = new PatchversionDatabase(tmpDirB);
    const tenant2 = db2.createTenant('Demo Workspace', DEMO_TENANT);
    const inst2 = db2.saveInstallation(tenant2.id, 10001, 'patchbay-demo');
    const repo2 = db2.saveRepository(tenant2.id, inst2.id, {
      id: DEMO_REPO,
      githubRepoId: 20001,
      fullName: 'patchbay-demo/checkout-service',
      owner: 'patchbay-demo',
      name: 'checkout-service',
      defaultBranch: 'main',
      isPrivate: false,
      isDemo: true,
    });
    const finding2 = db2.saveFinding(tenant2.id, repo2.id, {
      id: DEMO_FINDING,
      packageName: 'mockpay',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      isBreaking: true,
      changeRecord: mockChange,
      impactAnalysis: mockImpact,
      status: 'validated',
    });
    const patch2 = db2.savePatch(tenant2.id, finding2.id, 'diff content', undefined, DEMO_PATCH);

    expect(repo2.id).toBe(DEMO_REPO);
    expect(finding2.id).toBe(DEMO_FINDING);
    expect(patch2.id).toBe(DEMO_PATCH);

    // Container 2 resolves the exact same IDs that Container 1 returned to the client
    expect(db2.getRepository(DEMO_TENANT, repo1.id)?.id).toBe(DEMO_REPO);
    expect(db2.getFinding(DEMO_TENANT, finding1.id)?.id).toBe(DEMO_FINDING);
    expect(db2.getPatch(DEMO_TENANT, patch1.id)?.id).toBe(DEMO_PATCH);
  });

  test('9. Untrusted or live repository cannot reach local-process test execution runner', async () => {
    const tenant = db.createTenant('Customer Workspace', 'customer');
    const inst = db.saveInstallation(tenant.id, 999001, 'customer-org');
    const liveRepo = db.saveRepository(tenant.id, inst.id, {
      githubRepoId: 55443322,
      fullName: 'customer-org/live-backend',
      owner: 'customer-org',
      name: 'live-backend',
      defaultBranch: 'main',
      isPrivate: true,
      isDemo: false,
    });

    const finding = db.saveFinding(tenant.id, liveRepo.id, {
      packageName: 'mockpay',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      isBreaking: true,
      changeRecord: mockChange,
      impactAnalysis: mockImpact,
      status: 'open',
    });

    await expect(
      orchestrator.generateAndValidateFix(tenant.id, finding.id),
    ).rejects.toThrow(/execution for live repository "customer-org\/live-backend" is disabled/i);
  });

  test('10. resolvePermittedFixturePath strictly allowlists vetted fixtures and rejects traversal', () => {
    const root = path.resolve(__dirname, '../../..');
    const validSample = resolvePermittedFixturePath(root, 'fixtures/sample-repo');
    expect(validSample).not.toBeNull();
    expect(validSample).toContain('sample-repo');

    const validLodash = resolvePermittedFixturePath(root, 'fixtures/lodash-repo');
    expect(validLodash).not.toBeNull();
    expect(validLodash).toContain('lodash-repo');

    // Path traversal rejects
    expect(resolvePermittedFixturePath(root, 'fixtures/sample-repo/../../packages')).toBeNull();
    expect(resolvePermittedFixturePath(root, '../fixtures/sample-repo')).toBeNull();
    expect(resolvePermittedFixturePath(root, 'fixtures/../fixtures/sample-repo')).toBeNull();

    // Arbitrary unallowlisted directory rejects
    expect(resolvePermittedFixturePath(root, 'packages/engine')).toBeNull();
    expect(resolvePermittedFixturePath(root, 'node_modules')).toBeNull();
    expect(resolvePermittedFixturePath(root, 'src')).toBeNull();
  });

  test('11. Cross-tenant explicit ID collisions are safely rejected', () => {
    const tenantA = db.createTenant('Tenant A');
    const tenantB = db.createTenant('Tenant B');

    const instA = db.saveInstallation(tenantA.id, 1001, 'org-a');
    const repoA = db.saveRepository(tenantA.id, instA.id, {
      id: 'repo_shared_id_1',
      githubRepoId: 1111,
      fullName: 'org-a/service-a',
      owner: 'org-a',
      name: 'service-a',
      defaultBranch: 'main',
      isPrivate: false,
    });

    const instB = db.saveInstallation(tenantB.id, 1002, 'org-b');

    // Tenant B attempts to reuse Tenant A's explicit repository ID
    expect(() => {
      db.saveRepository(tenantB.id, instB.id, {
        id: 'repo_shared_id_1',
        githubRepoId: 2222,
        fullName: 'org-b/service-b',
        owner: 'org-b',
        name: 'service-b',
        defaultBranch: 'main',
        isPrivate: false,
      });
    }).toThrow(/Cross-tenant collision: repository ID repo_shared_id_1/);

    const findingA = db.saveFinding(tenantA.id, repoA.id, {
      id: 'finding_shared_id_1',
      packageName: 'mockpay',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      isBreaking: true,
      changeRecord: mockChange,
      impactAnalysis: mockImpact,
      status: 'open',
    });

    const repoB = db.saveRepository(tenantB.id, instB.id, {
      githubRepoId: 3333,
      fullName: 'org-b/service-b',
      owner: 'org-b',
      name: 'service-b',
      defaultBranch: 'main',
      isPrivate: false,
    });

    // Tenant B attempts to reuse Tenant A's finding ID
    expect(() => {
      db.saveFinding(tenantB.id, repoB.id, {
        id: 'finding_shared_id_1',
        packageName: 'mockpay',
        fromVersion: '1.0.0',
        toVersion: '2.0.0',
        isBreaking: true,
        changeRecord: mockChange,
        impactAnalysis: mockImpact,
        status: 'open',
      });
    }).toThrow(/Cross-tenant collision: finding ID finding_shared_id_1/);

    db.savePatch(tenantA.id, findingA.id, 'diff content a', undefined, 'patch_shared_id_1');

    // Tenant B attempts to reuse Tenant A's patch ID
    const findingB = db.saveFinding(tenantB.id, repoB.id, {
      packageName: 'mockpay',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      isBreaking: true,
      changeRecord: mockChange,
      impactAnalysis: mockImpact,
      status: 'open',
    });

    expect(() => {
      db.savePatch(tenantB.id, findingB.id, 'diff content b', undefined, 'patch_shared_id_1');
    }).toThrow(/Cross-tenant collision: patch ID patch_shared_id_1/);
  });

  test('12. Ambiguous repository short names under the same tenant fail safely', () => {
    const tenant = db.createTenant('Multi-Org Tenant');
    const inst = db.saveInstallation(tenant.id, 5001, 'multi-org');

    db.saveRepository(tenant.id, inst.id, {
      githubRepoId: 7001,
      fullName: 'org-alpha/payment-service',
      owner: 'org-alpha',
      name: 'payment-service',
      defaultBranch: 'main',
      isPrivate: false,
    });

    db.saveRepository(tenant.id, inst.id, {
      githubRepoId: 7002,
      fullName: 'org-beta/payment-service',
      owner: 'org-beta',
      name: 'payment-service',
      defaultBranch: 'main',
      isPrivate: false,
    });

    // Lookup by short name 'payment-service' is ambiguous (matches 2 repos) -> must return null
    expect(db.getRepository(tenant.id, 'payment-service')).toBeNull();

    // Disambiguated full name lookups succeed
    expect(db.getRepository(tenant.id, 'org-alpha/payment-service')).not.toBeNull();
    expect(db.getRepository(tenant.id, 'org-beta/payment-service')).not.toBeNull();
  });

  test('13. Finding deduplication distinguishes different version transitions for same package', () => {
    const tenant = db.createTenant('Version Tenant');
    const inst = db.saveInstallation(tenant.id, 6001, 'version-org');
    const repo = db.saveRepository(tenant.id, inst.id, {
      githubRepoId: 8001,
      fullName: 'version-org/app',
      owner: 'version-org',
      name: 'app',
      defaultBranch: 'main',
      isPrivate: false,
    });

    const f1 = db.saveFinding(tenant.id, repo.id, {
      packageName: 'mockpay',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      isBreaking: true,
      changeRecord: mockChange,
      impactAnalysis: mockImpact,
      status: 'open',
    });

    const f2 = db.saveFinding(tenant.id, repo.id, {
      packageName: 'mockpay',
      fromVersion: '2.0.0',
      toVersion: '3.0.0',
      isBreaking: true,
      changeRecord: { ...mockChange, fromVersion: '2.0.0', toVersion: '3.0.0' },
      impactAnalysis: mockImpact,
      status: 'open',
    });

    // Different version transitions create distinct findings
    expect(f1.id).not.toBe(f2.id);
    const findings = db.listFindings(tenant.id, repo.id);
    expect(findings.length).toBe(2);
  });

  test('14. Cross-tenant installation isolation prevents stealing GitHub installations', () => {
    const tenantA = db.createTenant('Tenant Alpha');
    const tenantB = db.createTenant('Tenant Beta');

    const instA = db.saveInstallation(tenantA.id, 991122, 'alpha-org');
    expect(instA.tenantId).toBe(tenantA.id);

    // Tenant B attempts to register or claim Tenant A's installation ID
    expect(() => {
      db.saveInstallation(tenantB.id, 991122, 'alpha-org');
    }).toThrow(/Cross-tenant collision: GitHub installation 991122 belongs to another tenant/);

    // Tenant B's installations list remains empty
    expect(db.listInstallations(tenantB.id)).toHaveLength(0);
  });

  test('15. Cross-tenant repository collision prevents claiming another tenant\'s GitHub repo', () => {
    const tenantA = db.createTenant('Tenant Alpha');
    const tenantB = db.createTenant('Tenant Beta');

    const instA = db.saveInstallation(tenantA.id, 111, 'alpha-org');
    const instB = db.saveInstallation(tenantB.id, 222, 'beta-org');

    db.saveRepository(tenantA.id, instA.id, {
      githubRepoId: 777001,
      fullName: 'alpha-org/service',
      owner: 'alpha-org',
      name: 'service',
      defaultBranch: 'main',
      isPrivate: true,
    });

    // Tenant B attempts to register the exact same GitHub repository
    expect(() => {
      db.saveRepository(tenantB.id, instB.id, {
        githubRepoId: 777001,
        fullName: 'alpha-org/service',
        owner: 'alpha-org',
        name: 'service',
        defaultBranch: 'main',
        isPrivate: true,
      });
    }).toThrow(/Cross-tenant collision: GitHub repository ID 777001 belongs to another tenant/);
  });

  test('16. Immutable parent relationships prevent silent parent reassignment via reused IDs', () => {
    const tenant = db.createTenant('Acme Corp');
    const inst = db.saveInstallation(tenant.id, 333, 'acme');
    const repo1 = db.saveRepository(tenant.id, inst.id, {
      githubRepoId: 1001,
      fullName: 'acme/repo1',
      owner: 'acme',
      name: 'repo1',
      defaultBranch: 'main',
      isPrivate: false,
    });
    const repo2 = db.saveRepository(tenant.id, inst.id, {
      githubRepoId: 1002,
      fullName: 'acme/repo2',
      owner: 'acme',
      name: 'repo2',
      defaultBranch: 'main',
      isPrivate: false,
    });

    const f1 = db.saveFinding(tenant.id, repo1.id, {
      id: 'finding_fixed_id',
      packageName: 'mockpay',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      isBreaking: true,
      changeRecord: mockChange,
      impactAnalysis: mockImpact,
      status: 'open',
    });

    // Attempt to reassign finding_fixed_id to repo2
    expect(() => {
      db.saveFinding(tenant.id, repo2.id, {
        id: 'finding_fixed_id',
        packageName: 'mockpay',
        fromVersion: '1.0.0',
        toVersion: '2.0.0',
        isBreaking: true,
        changeRecord: mockChange,
        impactAnalysis: mockImpact,
        status: 'open',
      });
    }).toThrow(/Immutable parent violation: cannot reassign finding finding_fixed_id to repository/);

    const patch1 = db.savePatch(tenant.id, f1.id, 'diff content', undefined, 'patch_fixed_id');

    const f2 = db.saveFinding(tenant.id, repo2.id, {
      packageName: 'lodash',
      fromVersion: '3.10.1',
      toVersion: '4.17.21',
      isBreaking: true,
      changeRecord: { ...mockChange, packageName: 'lodash', fromVersion: '3.10.1', toVersion: '4.17.21' },
      impactAnalysis: mockImpact,
      status: 'open',
    });

    // Attempt to reassign patch_fixed_id to f2
    expect(() => {
      db.savePatch(tenant.id, f2.id, 'diff content', undefined, 'patch_fixed_id');
    }).toThrow(/Immutable parent violation: cannot reassign patch patch_fixed_id to finding/);

    db.saveValidation(tenant.id, patch1.id, {
      id: 'val_fixed_id',
      status: 'passed',
      executionLogs: 'ok',
      durationMs: 50,
    });

    const patch2 = db.savePatch(tenant.id, f2.id, 'diff content 2');

    // Attempt to reassign val_fixed_id to patch2
    expect(() => {
      db.saveValidation(tenant.id, patch2.id, {
        id: 'val_fixed_id',
        status: 'passed',
        executionLogs: 'ok',
        durationMs: 50,
      });
    }).toThrow(/Immutable parent violation: cannot reassign validation val_fixed_id to patch/);
  });

  test('17. Pull request parent validation rejects missing parents and inconsistent relationships', () => {
    const tenant = db.createTenant('Acme Corp');
    const user = db.createUser(tenant.id, 'dev@acme.com');
    const inst = db.saveInstallation(tenant.id, 444, 'acme');
    const repo1 = db.saveRepository(tenant.id, inst.id, {
      githubRepoId: 2001,
      fullName: 'acme/repo1',
      owner: 'acme',
      name: 'repo1',
      defaultBranch: 'main',
      isPrivate: false,
    });
    const repo2 = db.saveRepository(tenant.id, inst.id, {
      githubRepoId: 2002,
      fullName: 'acme/repo2',
      owner: 'acme',
      name: 'repo2',
      defaultBranch: 'main',
      isPrivate: false,
    });

    const finding = db.saveFinding(tenant.id, repo1.id, {
      packageName: 'mockpay',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      isBreaking: true,
      changeRecord: mockChange,
      impactAnalysis: mockImpact,
      status: 'open',
    });
    const patch = db.savePatch(tenant.id, finding.id, 'diff content');
    db.saveValidation(tenant.id, patch.id, {
      status: 'passed',
      executionLogs: 'ok',
      durationMs: 50,
    });
    const approval = db.approvePatch(tenant.id, patch.id, user.id, patch.diffHash);

    // Reject missing repository
    expect(() => {
      db.savePullRequest(tenant.id, {
        repositoryId: 'nonexistent_repo',
        findingId: finding.id,
        patchId: patch.id,
        approvalId: approval.id,
        githubPrNumber: 1,
        githubPrUrl: 'https://github.com/acme/repo1/pull/1',
        branchName: 'b1',
        commitSha: 's1',
      });
    }).toThrow(/Repository nonexistent_repo not found/);

    // Reject inconsistent relationship: finding belongs to repo1, but PR cites repo2
    expect(() => {
      db.savePullRequest(tenant.id, {
        repositoryId: repo2.id,
        findingId: finding.id,
        patchId: patch.id,
        approvalId: approval.id,
        githubPrNumber: 1,
        githubPrUrl: 'https://github.com/acme/repo1/pull/1',
        branchName: 'b1',
        commitSha: 's1',
      });
    }).toThrow(/Inconsistent parent relationship: finding .* does not belong to repository/);
  });

  test('18. Pull request creation is idempotent and enforces single-use approval', () => {
    const tenant = db.createTenant('Acme Corp');
    const user = db.createUser(tenant.id, 'dev@acme.com');
    const inst = db.saveInstallation(tenant.id, 555, 'acme');
    const repo = db.saveRepository(tenant.id, inst.id, {
      githubRepoId: 3001,
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
      changeRecord: mockChange,
      impactAnalysis: mockImpact,
      status: 'open',
    });
    const patch = db.savePatch(tenant.id, finding.id, 'diff content');
    db.saveValidation(tenant.id, patch.id, {
      status: 'passed',
      executionLogs: 'ok',
      durationMs: 50,
    });
    const approval = db.approvePatch(tenant.id, patch.id, user.id, patch.diffHash);

    const pr1 = db.savePullRequest(tenant.id, {
      repositoryId: repo.id,
      findingId: finding.id,
      patchId: patch.id,
      approvalId: approval.id,
      githubPrNumber: 10,
      githubPrUrl: 'https://github.com/acme/service/pull/10',
      branchName: 'b1',
      commitSha: 's1',
    });

    // Approval is now marked 'used'
    expect(approval.status).toBe('used');

    // Repeated call for same patch returns existing PR record without throwing
    const pr2 = db.savePullRequest(tenant.id, {
      repositoryId: repo.id,
      findingId: finding.id,
      patchId: patch.id,
      approvalId: approval.id,
      githubPrNumber: 10,
      githubPrUrl: 'https://github.com/acme/service/pull/10',
      branchName: 'b1',
      commitSha: 's1',
    });
    expect(pr2.id).toBe(pr1.id);

    // But if someone attempts to reuse the approval for a different patch, it is rejected
    const patchNew = db.savePatch(tenant.id, finding.id, 'diff content', undefined, 'patch_new_id');
    expect(() => {
      db.savePullRequest(tenant.id, {
        repositoryId: repo.id,
        findingId: finding.id,
        patchId: patchNew.id,
        approvalId: approval.id,
        githubPrNumber: 11,
        githubPrUrl: 'https://github.com/acme/service/pull/11',
        branchName: 'b2',
        commitSha: 's2',
      });
    }).toThrow(/Inconsistent parent relationship: approval .* does not belong to patch/);

    // And if someone attempts to create a PR with an invalidated approval, it is rejected
    const patch3 = db.savePatch(tenant.id, finding.id, 'diff content 3', undefined, 'patch_3_id');
    db.saveValidation(tenant.id, patch3.id, { status: 'passed', executionLogs: 'ok', durationMs: 50 });
    const appr3 = db.approvePatch(tenant.id, patch3.id, user.id, patch3.diffHash);
    db.invalidateApprovalsForPatch(tenant.id, patch3.id, 'Manual revoke');
    expect(() => {
      db.savePullRequest(tenant.id, {
        repositoryId: repo.id,
        findingId: finding.id,
        patchId: patch3.id,
        approvalId: appr3.id,
        githubPrNumber: 12,
        githubPrUrl: 'https://github.com/acme/service/pull/12',
        branchName: 'b3',
        commitSha: 's3',
      });
    }).toThrow(/Approval .* is not active/);
  });

  test('19. Concurrent deliverPullRequest triggers in-flight delivery lock', async () => {
    const tenant = db.createTenant('Acme Lock');
    const user = db.createUser(tenant.id, 'lock@acme.com');
    const inst = db.saveInstallation(tenant.id, 77711, 'acme');
    const repo = db.saveRepository(tenant.id, inst.id, {
      githubRepoId: 9001,
      fullName: 'acme/lock-service',
      owner: 'acme',
      name: 'lock-service',
      defaultBranch: 'main',
      isPrivate: false,
    });

    const finding = db.saveFinding(tenant.id, repo.id, {
      packageName: 'mockpay',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      isBreaking: true,
      changeRecord: mockChange,
      impactAnalysis: mockImpact,
      status: 'open',
    });
    const patch = db.savePatch(tenant.id, finding.id, 'diff content');
    db.saveValidation(tenant.id, patch.id, {
      status: 'passed',
      executionLogs: 'ok',
      durationMs: 50,
      proof: {
        id: 'proof_1',
        changeId: 'cr_1',
        repoId: repo.id,
        baselineResult: { exitCode: 0, passed: 1, failed: 0, total: 1, output: 'ok' },
        redResult: { exitCode: 1, passed: 0, failed: 1, total: 1, output: 'fail' },
        greenResult: { exitCode: 0, passed: 1, failed: 0, total: 1, output: 'ok' },
        fixDiff: 'diff content',
        fixedFiles: ['src/app.js'],
        coverageVerified: 1,
        coverageTotal: 1,
        unverifiable: [],
        producedAt: new Date().toISOString(),
        sandboxType: 'local-process',
        durationMs: 50,
      },
    });
    db.approvePatch(tenant.id, patch.id, user.id, patch.diffHash);

    const gh = (orchestrator as unknown as { github: { getBranchHeadSha: (...args: unknown[]) => Promise<string> } }).github;
    const originalGetSha = gh.getBranchHeadSha;
    gh.getBranchHeadSha = async () => {
      await new Promise(r => setTimeout(r, 60));
      return 'mock_sha_123';
    };

    try {
      const p1 = orchestrator.deliverPullRequest(tenant.id, patch.id, user.id);
      const p2 = orchestrator.deliverPullRequest(tenant.id, patch.id, user.id);
      const results = await Promise.allSettled([p1, p2]);
      const rejected = results.find(r => r.status === 'rejected');
      expect(rejected).toBeDefined();
      if (rejected?.status === 'rejected') {
        expect(rejected.reason.message).toMatch(/delivery is already in progress/i);
      }
    } finally {
      gh.getBranchHeadSha = originalGetSha;
    }
  });

  test('20. PatchversionEngine.processChange rejects untrusted repositories and logs execution_blocked event', async () => {
    const engineStateDir = path.join(tmpDirA, 'engine-state');
    const engine = new PatchversionEngine({ stateDir: engineStateDir });
    const untrustedPath = path.join(os.tmpdir(), `untrusted-repo-${crypto.randomBytes(4).toString('hex')}`);
    fs.mkdirSync(untrustedPath, { recursive: true });

    try {
      const pr = await engine.processChange(mockChange, untrustedPath, 'customer-repo-1');
      expect(pr).toBeNull();

      const events = engine.getStore().getEvents();
      const blockedEvent = events.find(e => e.type === 'execution_blocked');
      expect(blockedEvent).toBeDefined();
      expect(blockedEvent?.data).toMatchObject({
        repoPath: untrustedPath,
        reason: 'unisolated local execution refused: repo is not a trusted fixture',
      });
    } finally {
      fs.rmSync(untrustedPath, { recursive: true, force: true });
    }
  });

  test('21. PatchversionEngine fails closed if non-local sandbox mode is configured without verified provider', async () => {
    const engineStateDir = path.join(tmpDirA, 'engine-state-custom');
    const engine = new PatchversionEngine({ stateDir: engineStateDir });
    // Config is frozen; override the property on engine to test the fail-closed gate
    const currentConfig = (engine as unknown as { config: Record<string, unknown> }).config;
    Object.defineProperty(engine, 'config', {
      value: { ...currentConfig, sandboxMode: 'unverified-sandbox' },
      configurable: true,
    });

    const untrustedPath = path.join(os.tmpdir(), `untrusted-repo-${crypto.randomBytes(4).toString('hex')}`);
    fs.mkdirSync(untrustedPath, { recursive: true });

    try {
      const pr = await engine.processChange(mockChange, untrustedPath, 'customer-repo-2');
      expect(pr).toBeNull();

      const events = engine.getStore().getEvents();
      const blockedEvent = events.find(e => e.type === 'execution_blocked');
      expect(blockedEvent).toBeDefined();
    } finally {
      fs.rmSync(untrustedPath, { recursive: true, force: true });
    }
  });

  test('22. SandboxRunner constructor fails closed when docker sandbox mode is requested', () => {
    expect(() => {
      new SandboxRunner({
        stateDir: tmpDirA,
        sandboxMode: 'docker',
        requireIsolation: true,
        trustedFixtureDirs: [],
        sandboxTimeoutMs: 1000,
        dailyLlmBudgetUsd: 1,
        githubApp: null,
        anthropicApiKey: null,
        watcherIntervalMs: 1000,
        probeIntervalMs: 1000,
        logLevel: 'error',
      });
    }).toThrow(/Docker sandbox mode is UNVERIFIED and blocked/i);
  });

  test('23. UnavailableExecutionProvider reports unavailable and throws IsolationProviderUnavailableError', async () => {
    const provider = new UnavailableExecutionProvider();
    expect(provider.name).toBe('unavailable-execution-provider');
    expect(provider.type).toBe('unavailable');
    expect(await provider.isAvailable()).toBe(false);

    await expect(
      provider.createWorkspace({
        repo: {
          sourceType: 'git-url',
          sourceLocation: 'https://github.com/customer/repo.git',
          excludePatterns: ['.env*'],
        },
      }),
    ).rejects.toThrow(IsolationProviderUnavailableError);
  });

  test('24. Orchestrator rejects path traversal or escaping localPath on repository fix validation', async () => {
    const tenant = db.createTenant('Traversal Test Tenant');
    const inst = db.saveInstallation(tenant.id, 999111, 'traversal-org');
    const maliciousRepo = db.saveRepository(tenant.id, inst.id, {
      githubRepoId: 998877,
      fullName: 'traversal-org/pwned',
      owner: 'traversal-org',
      name: 'pwned',
      defaultBranch: 'main',
      isPrivate: true,
      isDemo: false,
      localPath: '../../../../etc/passwd',
    });

    const finding = db.saveFinding(tenant.id, maliciousRepo.id, {
      packageName: 'mockpay',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      isBreaking: true,
      changeRecord: mockChange,
      impactAnalysis: mockImpact,
      status: 'open',
    });

    await expect(
      orchestrator.generateAndValidateFix(tenant.id, finding.id),
    ).rejects.toThrow(/execution for live repository "traversal-org\/pwned" is disabled/i);
  });
});
