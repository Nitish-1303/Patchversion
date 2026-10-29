import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { EvidenceBundleManager } from '../src/evidence/evidence-bundle';

describe('EvidenceBundleManager - Reproducible & Tamper-Evident Evidence Verification', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-bundle-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  test('valid bundle passes validation cleanly', () => {
    fs.writeFileSync(path.join(tmpDir, 'proof.json'), '{"id":"proof_1"}', 'utf8');
    fs.writeFileSync(path.join(tmpDir, 'transcript.txt'), 'transcript logs', 'utf8');

    EvidenceBundleManager.writeManifest(
      tmpDir,
      {
        runId: 'run_123',
        sourceRevision: 'abc1234',
        targetRepo: { id: 'repo_1', fullName: 'acme/service' },
        dependency: { packageName: 'lodash', fromVersion: '3.10.1', toVersion: '4.17.21' },
        execution: {
          providerName: 'local-process',
          isolationType: 'local-process',
          command: 'npm test',
          exitCodes: { baseline: 0, red: 1, green: 0 },
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: 1200,
        },
        patch: {
          generatedFiles: ['src/index.js'],
          sha256: crypto.createHash('sha256').update('diff').digest('hex'),
          patchType: 'deterministic-ast',
        },
      },
      ['proof.json', 'transcript.txt'],
    );

    const res = EvidenceBundleManager.validateBundle(tmpDir);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.manifest?.runId).toBe('run_123');
  });

  test('missing manifest.json is rejected', () => {
    const res = EvidenceBundleManager.validateBundle(tmpDir);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toMatch(/missing manifest\.json/i);
  });

  test('corrupt manifest.json is rejected', () => {
    fs.writeFileSync(path.join(tmpDir, 'manifest.json'), '{ invalid json ...', 'utf8');
    const res = EvidenceBundleManager.validateBundle(tmpDir);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toMatch(/corrupted manifest\.json/i);
  });

  test('tamper-evident hash mismatch is detected and rejected', () => {
    fs.writeFileSync(path.join(tmpDir, 'proof.json'), '{"id":"proof_1"}', 'utf8');

    const manifest = EvidenceBundleManager.writeManifest(
      tmpDir,
      {
        runId: 'run_tamper',
        sourceRevision: 'abc1234',
        targetRepo: { id: 'repo_1', fullName: 'acme/service' },
        dependency: { packageName: 'lodash', fromVersion: '3.10.1', toVersion: '4.17.21' },
        execution: {
          providerName: 'local-process',
          isolationType: 'local-process',
          command: 'npm test',
          exitCodes: { baseline: 0, red: 1, green: 0 },
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: 1200,
        },
        patch: {
          generatedFiles: ['src/index.js'],
          sha256: 'deadbeef',
          patchType: 'deterministic-ast',
        },
      },
      ['proof.json'],
    );

    // Tamper with metadata inside manifest
    manifest.sourceRevision = 'attacker_fake_revision';
    fs.writeFileSync(path.join(tmpDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

    const res = EvidenceBundleManager.validateBundle(tmpDir);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes('tamperEvidentHash mismatch'))).toBe(true);
  });

  test('tampering with artifact content is detected and rejected', () => {
    fs.writeFileSync(path.join(tmpDir, 'proof.json'), '{"id":"proof_original"}', 'utf8');

    EvidenceBundleManager.writeManifest(
      tmpDir,
      {
        runId: 'run_content_tamper',
        sourceRevision: 'abc1234',
        targetRepo: { id: 'repo_1', fullName: 'acme/service' },
        dependency: { packageName: 'lodash', fromVersion: '3.10.1', toVersion: '4.17.21' },
        execution: {
          providerName: 'local-process',
          isolationType: 'local-process',
          command: 'npm test',
          exitCodes: { baseline: 0, red: 1, green: 0 },
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: 1200,
        },
        patch: {
          generatedFiles: ['src/index.js'],
          sha256: 'deadbeef',
          patchType: 'deterministic-ast',
        },
      },
      ['proof.json'],
    );

    // Attacker modifies proof.json after manifest creation
    fs.writeFileSync(path.join(tmpDir, 'proof.json'), '{"id":"proof_forged"}', 'utf8');

    const res = EvidenceBundleManager.validateBundle(tmpDir);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes('Artifact hash mismatch for proof.json'))).toBe(true);
  });

  test('missing artifact file is detected and rejected', () => {
    fs.writeFileSync(path.join(tmpDir, 'proof.json'), '{"id":"proof_original"}', 'utf8');
    fs.writeFileSync(path.join(tmpDir, 'patch.diff'), 'diff text', 'utf8');

    EvidenceBundleManager.writeManifest(
      tmpDir,
      {
        runId: 'run_missing_file',
        sourceRevision: 'abc1234',
        targetRepo: { id: 'repo_1', fullName: 'acme/service' },
        dependency: { packageName: 'lodash', fromVersion: '3.10.1', toVersion: '4.17.21' },
        execution: {
          providerName: 'local-process',
          isolationType: 'local-process',
          command: 'npm test',
          exitCodes: { baseline: 0, red: 1, green: 0 },
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: 1200,
        },
        patch: {
          generatedFiles: ['src/index.js'],
          sha256: 'deadbeef',
          patchType: 'deterministic-ast',
        },
      },
      ['proof.json', 'patch.diff'],
    );

    // Delete patch.diff
    fs.unlinkSync(path.join(tmpDir, 'patch.diff'));

    const res = EvidenceBundleManager.validateBundle(tmpDir);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes('Missing artifact file: patch.diff'))).toBe(true);
  });
});
