import { FixGenerator } from '../src/fix-generator/generator';
import { ChangeRecord, ImpactAnalysis } from '@patchversion/shared';
import { applyPatch, parsePatch } from 'diff';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('FixGenerator', () => {
  const tmpRoot = path.join(__dirname, '.fixgen-fixtures');

  const sourceFile = [
    "const mockpay = require('mockpay');",
    '',
    'async function createCharge(amount, currency, source) {',
    '  const charge = await mockpay.charges.create({',
    '    amount: amount,',
    '    currency: currency,',
    '    source: source,',
    "    description: 'Payment for order'",
    '  });',
    '  return charge;',
    '}',
    '',
    'module.exports = { createCharge };',
  ].join('\n');

  function makeChange(rawNotes: string): ChangeRecord {
    return {
      id: 'test-change',
      packageName: 'mockpay',
      ecosystem: 'npm',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      detectedAt: '2026-10-23T00:00:00Z',
      source: 'registry',
      sourceUrl: 'https://example.com/mockpay/2.0.0',
      rawNotes,
      classification: { isBreaking: true, confidence: 0.95, affectedExports: ['source'], reason: 'test' },
      severity: 'breaking',
    };
  }

  function makeImpact(): ImpactAnalysis {
    return {
      changeId: 'test-change',
      repoId: 'test/repo',
      affectedCallSites: [{
        filePath: 'src/createCharge.js',
        line: 4,
        column: 24,
        importStatement: "const mockpay = require('mockpay');",
        callExpression: 'mockpay.charges.create({ amount, currency, source: source })',
        packageName: 'mockpay',
        exportedSymbol: '*',
      }],
      unaffectedCallSites: [],
      coveragePercent: 100,
      analyzedAt: '2026-10-23T00:00:00Z',
    };
  }

  beforeEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    fs.mkdirSync(path.join(tmpRoot, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpRoot, 'src', 'createCharge.js'), sourceFile);
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  const phrasings = [
    'BREAKING CHANGE: renamed source to payment_method. The old parameter will be ignored.',
    "BREAKING CHANGE: The 'source' parameter in charges.create has been renamed to 'payment_method'. Update your integration to use the new parameter name. The old parameter will be ignored.",
    'source was renamed to payment_method',
    'renamed from source to payment_method',
  ];

  for (const notes of phrasings) {
    it(`generates an applicable rename fix for: "${notes.slice(0, 60)}..."`, async () => {
      const diff = await new FixGenerator(null).generateFix(tmpRoot, makeChange(notes), makeImpact());
      expect(diff).not.toBeNull();

      // The diff must apply cleanly with the diff library
      const patches = parsePatch(diff!);
      expect(patches.length).toBe(1);
      const patched = applyPatch(sourceFile, patches[0]);
      expect(patched).not.toBe(false);
      expect(patched).toContain('payment_method: source,');
      expect(patched).not.toContain('source: source,');

      // Also verify with patch(1) when the executable is available. Avoid a
      // shell so Windows reports a missing executable as ENOENT instead of
      // returning the shell's generic nonzero status.
      const version = spawnSync('patch', ['--version'], { encoding: 'utf8' });
      if ((version.error as NodeJS.ErrnoException | undefined)?.code !== 'ENOENT') {
        if (version.error) throw version.error;
        if (version.status !== 0) {
          throw new Error(`patch --version exited ${version.status}: ${version.stderr}`);
        }

        const result = spawnSync('patch', ['-p1', '--dry-run'], {
          cwd: tmpRoot,
          input: diff!,
          encoding: 'utf8',
        });
        if (result.error) throw result.error;
        if (result.status !== 0) {
          throw new Error(`patch dry-run exited ${result.status}: ${result.stderr}`);
        }
      }
    });
  }

  it('returns null when no rename is described', async () => {
    const diff = await new FixGenerator(null).generateFix(
      tmpRoot,
      makeChange('BREAKING CHANGE: removed the charges.create method entirely.'),
      makeImpact(),
    );
    expect(diff).toBeNull();
  });
});
