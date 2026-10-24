/**
 * Phase 1 audit regressions: false-positive classifications and
 * broad-text-replacement fixes that the audit found in the original code.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { classifyChange } from '../src/break-detector/classifier';
import { FixGenerator } from '../src/fix-generator/generator';
import { ChangeRecord, ImpactAnalysis } from '@patchversion/shared';

describe('classifier false positives', () => {
  it('"no breaking changes" is not breaking', () => {
    const r = classifyChange('pkg', '1.0.0', '1.1.0', 'This release contains no breaking changes. Enjoy!');
    expect(r.isBreaking).toBe(false);
  });

  it('"non-breaking" is not breaking', () => {
    const r = classifyChange('pkg', '1.0.0', '1.1.0', 'Non-breaking feature release: added new helpers');
    expect(r.isBreaking).toBe(false);
  });

  it('deprecation alone is not breaking', () => {
    const r = classifyChange('pkg', '1.0.0', '1.1.0', 'The create() method is deprecated, use createV2()');
    expect(r.isBreaking).toBe(false);
    expect(r.confidence).toBeGreaterThan(0.3); // still flagged as noteworthy
  });

  it('still detects a real breaking note', () => {
    const r = classifyChange('pkg', '1.0.0', '1.1.0', 'BREAKING CHANGE: removed the `charge` parameter');
    expect(r.isBreaking).toBe(true);
  });

  it('does not extract prose words as affected exports', () => {
    const r = classifyChange('pkg', '1.0.0', '2.0.0', 'BREAKING: renamed `_.contains` to `_.includes`');
    expect(r.affectedExports).toContain('contains');
    expect(r.affectedExports).not.toContain('to');
    expect(r.affectedExports).not.toContain('the');
  });

  it('extracts the old name from passive phrasing without capturing "to"', () => {
    const r = classifyChange('pkg', '1.0.0', '2.0.0', "The 'source' parameter has been renamed to 'payment_method'");
    expect(r.affectedExports).toContain('source');
    expect(r.affectedExports).not.toContain('to');
  });
});

describe('fix generator: minimal patch scoping', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'patchversion-scope-'));

  afterAll(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

  it('renames only inside the affected call span, never the whole file', async () => {
    // `source:` appears twice: inside the affected create() call and in an
    // unrelated config object. Only the call-site occurrence may change.
    const content = [
      "const minipay = require('minipay');",
      '',
      'async function charge(source) {',
      '  return minipay.charges.create({',
      '    source: source,',
      '  });',
      '}',
      '',
      'const config = {',
      '  source: "unchanged",',
      '};',
      '',
      'module.exports = { charge, config };',
      '',
    ].join('\n');

    fs.mkdirSync(path.join(tmpRoot, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpRoot, 'src', 'charge.js'), content);

    const change: ChangeRecord = {
      id: 't', packageName: 'minipay', ecosystem: 'npm',
      fromVersion: '1.0.0', toVersion: '2.0.0',
      detectedAt: '2026-10-24T00:00:00Z', source: 'registry',
      sourceUrl: 'https://example.com', rawNotes: 'BREAKING: renamed source to payment_method',
      classification: { isBreaking: true, confidence: 0.9, affectedExports: ['source'], reason: 't' },
      severity: 'breaking',
    };
    const impact: ImpactAnalysis = {
      changeId: 't', repoId: 't/r',
      affectedCallSites: [{
        filePath: 'src/charge.js', line: 4, column: 24,
        importStatement: "const minipay = require('minipay');",
        callExpression: 'minipay.charges.create({ source: source })',
        packageName: 'minipay', exportedSymbol: '*',
      }],
      unaffectedCallSites: [], potentialCallSites: [],
      coveragePercent: 100, analyzedAt: '2026-10-24T00:00:00Z',
    };

    const diff = await new FixGenerator(null).generateFix(tmpRoot, change, impact);
    expect(diff).not.toBeNull();
    // The unrelated config object must survive untouched
    expect(diff).not.toContain('-  source: "unchanged"');
    expect(diff).toContain('-    source: source,');
    expect(diff).toContain('+    payment_method: source,');
  });
});
