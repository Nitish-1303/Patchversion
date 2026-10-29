import path from 'path';
import fs from 'fs';
import os from 'os';
import { ReadinessEvaluator } from '../src/readiness/readiness-evaluator';

describe('ReadinessEvaluator - Authoritative Production & Staging Readiness Model', () => {
  const repoRoot = path.resolve(__dirname, '../../..');

  test('evaluates current repository baseline accurately with explicit BLOCKED and NOT_RUN states', () => {
    const evaluator = new ReadinessEvaluator({
      repoRoot,
      gitCommitSha: '38b129ce8524face42de9c2fb49e56f63a9d24ea',
      gitBranch: 'fix/tenant-repo-lookup-and-github-scan',
      livePostgresTested: false,
      isolatedProviderActive: false,
    });

    const report = evaluator.evaluate();
    expect(report.version).toBe('1.0.0');
    expect(report.gitCommitSha).toBe('38b129ce8524face42de9c2fb49e56f63a9d24ea');
    expect(report.gitBranch).toBe('fix/tenant-repo-lookup-and-github-scan');

    // Prototype demo is ready
    expect(report.summary.prototypeDemoReady).toBe(true);

    // Staging and customer are NOT ready due to BLOCKED isolation and NOT_RUN database
    expect(report.summary.stagingReady).toBe(false);
    expect(report.summary.customerReady).toBe(false);
    expect(report.summary.overallState).toBe('BLOCKED');

    // Individual gates
    const isolationGate = report.gates.find(g => g.category === 'Execution Boundary');
    expect(isolationGate?.state).toBe('BLOCKED');

    const pgGate = report.gates.find(g => g.category === 'Persistence & Data Integrity');
    expect(pgGate?.state).toBe('NOT_RUN');

    const secondMigrationGate = report.gates.find(g => g.name.includes('second consumer'));
    expect(secondMigrationGate?.state).toBe('BLOCKED');

    const lodashGate = report.gates.find(g => g.name.includes('Lodash'));
    expect(lodashGate?.state).toBe('PASS');
  });

  test('missing or invalid evidence directory results in FAIL for migration gate', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readiness-test-'));
    try {
      const evaluator = new ReadinessEvaluator({
        repoRoot: tmpDir, // Empty dir without runs/lodash-4-migration
        gitCommitSha: 'test_sha',
        gitBranch: 'test_branch',
      });

      const report = evaluator.evaluate();
      const lodashGate = report.gates.find(g => g.name.includes('Lodash'));
      expect(lodashGate?.state).toBe('FAIL');
      expect(report.summary.prototypeDemoReady).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('qualifying live PostgreSQL and isolated provider elevates staging readiness', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readiness-qualified-'));
    const secondEvidenceDir = path.join(tmpDir, 'second-proof');
    fs.mkdirSync(secondEvidenceDir, { recursive: true });

    // Mock an external independent evidence bundle
    fs.writeFileSync(path.join(secondEvidenceDir, 'proof.json'), '{"test":"ok"}', 'utf8');
    const { EvidenceBundleManager } = require('../src/evidence/evidence-bundle');
    EvidenceBundleManager.writeManifest(
      secondEvidenceDir,
      {
        runId: 'run_ext_1',
        sourceRevision: 'ext_sha',
        targetRepo: { id: 'repo_ext', fullName: 'external-org/payment-service' },
        dependency: { packageName: 'mime', fromVersion: '1.6.0', toVersion: '2.0.3' },
        execution: {
          providerName: 'microvm-worker',
          isolationType: 'microvm',
          command: 'npm test',
          exitCodes: { baseline: 0, red: 1, green: 0 },
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: 5000,
        },
        patch: {
          generatedFiles: ['src/index.js'],
          sha256: 'deadbeef',
          patchType: 'deterministic-ast',
        },
      },
      ['proof.json'],
    );

    try {
      const evaluator = new ReadinessEvaluator({
        repoRoot,
        gitCommitSha: '38b129ce8524face42de9c2fb49e56f63a9d24ea',
        gitBranch: 'fix/tenant-repo-lookup-and-github-scan',
        livePostgresTested: true,
        isolatedProviderActive: true,
        secondConsumerMigrationEvidenceDir: secondEvidenceDir,
      });

      const report = evaluator.evaluate();
      expect(report.summary.stagingReady).toBe(true);
      expect(report.summary.customerReady).toBe(true);
      expect(report.summary.overallState).toBe('PASS');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
