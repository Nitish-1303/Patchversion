import { analyzeImpact } from '../src/break-detector/impact-analyzer';
import { ChangeRecord, UsageMap } from '@patchversion/shared';

describe('analyzeImpact', () => {
  const mockChange: ChangeRecord = {
    id: 'test-1',
    packageName: 'mockpay',
    ecosystem: 'npm',
    fromVersion: '1.0.0',
    toVersion: '2.0.0',
    detectedAt: '2026-10-23T00:00:00Z',
    source: 'registry',
    sourceUrl: 'https://npmjs.com/mockpay',
    rawNotes: 'BREAKING: renamed source to payment_method',
    classification: {
      isBreaking: true,
      confidence: 0.9,
      affectedExports: ['source'],
      reason: 'major bump',
    },
    severity: 'breaking',
  };

  const mockUsageMap: UsageMap = {
    repoId: 'test-repo',
    packageName: 'mockpay',
    mappedAt: '2026-10-23T00:00:00Z',
    callSites: [
      {
        filePath: 'src/createCharge.js',
        line: 5,
        column: 10,
        importStatement: 'const mockpay = require("mockpay")',
        callExpression: 'mockpay.charges.create({ source: "tok_visa" })',
        packageName: 'mockpay',
        exportedSymbol: 'charges',
      },
      {
        filePath: 'src/refund.js',
        line: 3,
        column: 5,
        importStatement: 'const mockpay = require("mockpay")',
        callExpression: 'mockpay.refunds.create({ charge: "ch_123" })',
        packageName: 'mockpay',
        exportedSymbol: 'refunds',
      },
    ],
    totalFiles: 5,
    filesWithUsage: 2,
  };

  it('finds affected call sites', () => {
    const impact = analyzeImpact(mockChange, mockUsageMap);
    // The breaking change affects 'source' - both call sites use the package
    expect(impact.affectedCallSites.length).toBeGreaterThan(0);
    expect(impact.changeId).toBe('test-1');
    expect(impact.repoId).toBe('test-repo');
  });

  it('calculates coverage percentage', () => {
    const impact = analyzeImpact(mockChange, mockUsageMap);
    expect(impact.coveragePercent).toBeGreaterThanOrEqual(0);
    expect(impact.coveragePercent).toBeLessThanOrEqual(100);
  });

  it('returns empty for non-breaking changes', () => {
    const nonBreaking: ChangeRecord = {
      ...mockChange,
      classification: { isBreaking: false, confidence: 0.2, reason: 'feature only' },
      severity: 'feature',
    };
    const impact = analyzeImpact(nonBreaking, mockUsageMap);
    expect(impact.affectedCallSites.length).toBe(0);
  });
});
