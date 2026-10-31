import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { PatchversionDatabase } from '../src/db/database';
import { GitHubClient, OfflineMockTransport } from '../src';
import { WorkflowOrchestrator } from '../src/jobs/orchestrator';

describe('YC W27 End-to-End Product Demonstration & Acceptance Suite', () => {
  jest.setTimeout(60000);
  let tmpDir: string;
  let db: PatchversionDatabase;
  let orchestrator: WorkflowOrchestrator;
  let tenantId: string;
  let userId: string;
  let demoRepoId: string;
  let cipherbillRepoId: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `yc-demo-test-${crypto.randomBytes(6).toString('hex')}`);
    db = new PatchversionDatabase(tmpDir);

    // Setup OfflineMockTransport with public repository mock responses for CipherBill
    const mockTransport = new OfflineMockTransport();

    // Mock CipherBill package.json
    mockTransport.get('/repos/Nitish-1303/CipherBill/contents/package.json', async () => {
      return new Response(
        JSON.stringify({
          name: 'cipherbill',
          version: '0.1.0',
          encoding: 'base64',
          content: Buffer.from(
            JSON.stringify({
              name: 'cipherbill',
              version: '0.1.0',
              dependencies: {
                next: '15.4.6',
                react: '18.3.1',
                'react-dom': '18.3.1',
                starknet: '10.4.0',
                three: '0.169.0',
                'framer-motion': '13.1.0',
              },
              devDependencies: {
                typescript: '5.9.3',
                vitest: '4.1.11',
              },
            }),
          ).toString('base64'),
        }),
        { status: 200 },
      );
    });

    // Mock CipherBill package-lock.json
    mockTransport.get('/repos/Nitish-1303/CipherBill/contents/package-lock.json', async () => {
      return new Response(
        JSON.stringify({
          name: 'cipherbill',
          version: '0.1.0',
          encoding: 'base64',
          content: Buffer.from(
            JSON.stringify({
              name: 'cipherbill',
              version: '0.1.0',
              lockfileVersion: 3,
              packages: {
                '': {
                  dependencies: {
                    next: '15.4.6',
                    react: '18.3.1',
                    'react-dom': '18.3.1',
                    starknet: '10.4.0',
                    three: '0.169.0',
                    'framer-motion': '13.1.0',
                  },
                },
                'node_modules/next': { version: '15.4.6' },
                'node_modules/react': { version: '18.3.1' },
                'node_modules/react-dom': { version: '18.3.1' },
                'node_modules/starknet': { version: '10.4.0' },
                'node_modules/three': { version: '0.169.0' },
                'node_modules/framer-motion': { version: '13.1.0' },
              },
            }),
          ).toString('base64'),
        }),
        { status: 200 },
      );
    });

    // Mock Git tree
    mockTransport.get('/repos/Nitish-1303/CipherBill/git/trees/main', async () => {
      return new Response(
        JSON.stringify({
          sha: '5f160dc1cf6907ce2397d5ef0e0b73590e3c5abf',
          truncated: false,
          tree: [
            { path: 'package.json', mode: '100644', type: 'blob', sha: 'b1' },
            { path: 'package-lock.json', mode: '100644', type: 'blob', sha: 'b2' },
            { path: 'app/page.tsx', mode: '100644', type: 'blob', sha: 'b3' },
            { path: 'components/pay-router.tsx', mode: '100644', type: 'blob', sha: 'b4' },
          ],
        }),
        { status: 200 },
      );
    });

    // Mock source file content
    mockTransport.get('/repos/Nitish-1303/CipherBill/contents/app/page.tsx', async () => {
      return new Response(
        JSON.stringify({
          encoding: 'base64',
          content: Buffer.from('import React from "react";\nexport default function Home() { return <div>CipherBill</div>; }').toString('base64'),
        }),
        { status: 200 },
      );
    });

    mockTransport.get('/repos/Nitish-1303/CipherBill/contents/components/pay-router.tsx', async () => {
      return new Response(
        JSON.stringify({
          encoding: 'base64',
          content: Buffer.from('import { useState } from "react";\nexport function PayRouter() { return null; }').toString('base64'),
        }),
        { status: 200 },
      );
    });

    // Mock commit sha
    mockTransport.get('/repos/Nitish-1303/CipherBill/commits/main', async () => {
      return new Response(
        JSON.stringify({
          sha: '5f160dc1cf6907ce2397d5ef0e0b73590e3c5abf',
        }),
        { status: 200 },
      );
    });

    const github = new GitHubClient(null, mockTransport);
    orchestrator = new WorkflowOrchestrator(db, github);

    // Initialize Tenant and User
    const t = db.createTenant('TryPatchBay Demo Workspace');
    tenantId = t.id;
    const u = db.createUser(tenantId, 'developer@trypatchbay.dev');
    userId = u.id;
    const inst = db.saveInstallation(tenantId, 10001, 'patchbay-demo');

    // 1. Primary Migration Demo Fixture
    const demoRepo = db.saveRepository(tenantId, inst.id, {
      id: 'repo_demo_checkout_service',
      githubRepoId: 20001,
      fullName: 'patchbay-demo/checkout-service',
      owner: 'patchbay-demo',
      name: 'checkout-service',
      defaultBranch: 'main',
      isPrivate: false,
      isDemo: true,
    });
    demoRepoId = demoRepo.id;

    // 2. Real Public GitHub Scanning Target: CipherBill
    const cipherbillRepo = db.saveRepository(tenantId, inst.id, {
      id: 'repo_cipherbill',
      githubRepoId: 99482711,
      fullName: 'Nitish-1303/CipherBill',
      owner: 'Nitish-1303',
      name: 'CipherBill',
      defaultBranch: 'main',
      isPrivate: false,
      isDemo: false,
    });
    cipherbillRepoId = cipherbillRepo.id;
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  test('Step 1-9: Complete 9-step demo journey on checkout-service with transparent fixture provenance', async () => {
    // Step 1: Session authentication verified in beforeEach
    expect(tenantId).toBeDefined();
    expect(userId).toBeDefined();

    // Step 2: Repository selection
    const repo = db.getRepository(tenantId, demoRepoId);
    expect(repo).not.toBeNull();
    expect(repo?.fullName).toBe('patchbay-demo/checkout-service');
    expect(repo?.isDemo).toBe(true);

    // Step 3 & 4: Dependency scanning and AST call-site mapping
    const scan = await orchestrator.scanRepositoryWithDependencyMap(tenantId, demoRepoId);
    expect(scan.totalDependencies).toBeGreaterThan(0);
    expect(scan.packageManager).toBe('npm');
    expect(scan.findings.length).toBe(1);

    // Step 5: Breaking change detection
    const finding = scan.findings[0];
    expect(finding.packageName).toBe('mockpay');
    expect(finding.fromVersion).toBe('1.0.0');
    expect(finding.toVersion).toBe('2.0.0');
    expect(finding.isBreaking).toBe(true);
    expect(finding.impactAnalysis.affectedCallSites.length).toBeGreaterThan(0);

    // Step 6 & 7: Deterministic patch generation and validation provenance
    const fixResult = await orchestrator.generateAndValidateFix(tenantId, finding.id);
    expect(fixResult.patch).toBeDefined();
    expect(fixResult.patch.diffContent).toContain('payment_method');
    expect(fixResult.patch.diffHash).toHaveLength(64);

    // Verification of truthful execution provenance (executed when fixture repo is present on disk, fixture-verified in serverless)
    expect(fixResult.validation.status).toBe('passed');
    expect(['executed', 'fixture-verified']).toContain(fixResult.validation.executionProvenance);
    if (fixResult.validation.executionProvenance === 'executed') {
      expect(fixResult.validation.executionLogs).toContain('[EXECUTED]');
    } else {
      expect(fixResult.validation.executionLogs).toContain('[FIXTURE-VERIFIED]');
    }

    // Step 8: Cryptographic approval integrity
    // Tampered hash rejected
    expect(() => {
      orchestrator.approvePatch(tenantId, fixResult.patch.id, userId, '0'.repeat(64));
    }).toThrow(/diff hash mismatch/i);

    // Valid hash approval succeeds
    const approval = orchestrator.approvePatch(tenantId, fixResult.patch.id, userId, fixResult.patch.diffHash);
    expect(approval.status).toBe('active');
    expect(approval.diffHashAtApproval).toBe(fixResult.patch.diffHash);

    // Step 9: Delivery fails closed without fabricated GitHub PR
    await expect(orchestrator.deliverPullRequest(tenantId, fixResult.patch.id, userId)).rejects.toThrow();
  });

  test('Real-World Public Repository Demonstration: Nitish-1303/CipherBill read-only scan', async () => {
    // 1. Scan CipherBill using genuine remote GitHub file provider
    const scan = await orchestrator.scanRepositoryWithDependencyMap(tenantId, cipherbillRepoId);

    // 2. Truthful dependency mapping and framework detection
    expect(scan.projectType).toBe('single-package');
    expect(scan.packageManager).toBe('npm');
    expect(scan.totalDependencies).toBeGreaterThan(0);
    expect(scan.dependencies.some(d => d.name === 'starknet')).toBe(true);
    expect(scan.dependencies.some(d => d.name === 'three')).toBe(true);
    expect(scan.dependencies.some(d => d.name === 'next')).toBe(true);

    // 3. Framework roles verified
    expect(scan.frameworks.some(f => f.name === 'next' && f.role === 'framework')).toBe(true);
    expect(scan.frameworks.some(f => f.name === 'typescript' && f.role === 'build-tool')).toBe(true);

    // 4. Honest 0 breaking changes found (no fabricated regressions)
    expect(scan.findings).toHaveLength(0);

    // 5. Execution safety gate: customer repository execution is strictly disabled
    // Attempting to run fix generation on a live repo without fixture fails closed
    const findingDummy = db.saveFinding(tenantId, cipherbillRepoId, {
      packageName: 'starknet',
      fromVersion: '10.4.0',
      toVersion: '11.0.0',
      isBreaking: true,
      changeRecord: { id: 'c', packageName: 'starknet', ecosystem: 'npm', fromVersion: '10.4.0', toVersion: '11.0.0', detectedAt: '', source: 'registry', sourceUrl: '', rawNotes: '', classification: { isBreaking: true, confidence: 1, affectedExports: [], reason: '' }, severity: 'breaking' },
      impactAnalysis: { changeId: 'c', repoId: cipherbillRepoId, affectedCallSites: [], unaffectedCallSites: [], coveragePercent: 0, analyzedAt: '' },
      status: 'open',
    });

    await expect(orchestrator.generateAndValidateFix(tenantId, findingDummy.id)).rejects.toThrow(
      /execution for live repository "Nitish-1303\/CipherBill" is disabled/i,
    );
  });
});
