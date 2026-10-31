import path from 'path';
import fs from 'fs';
import { parsePatch } from 'diff';
import { UsageMapper } from '../src/usage-map/mapper';
import { analyzeImpact } from '../src/break-detector/impact-analyzer';
import { LodashMethodRenameRule } from '../src/migration/rules/lodash-rename';
import { ChangeRecord } from '@patchversion/shared';

describe('Lodash Proof Metrics Reconciliation', () => {
  const repoRoot = path.resolve(__dirname, '../../..');
  const lodashRepo = path.join(repoRoot, 'fixtures/lodash-repo');
  const changeRecordPath = path.join(repoRoot, 'fixtures/real-migration/lodash-change-record.json');

  test('correctly maps 1 affected call site and 1 potential call site with normalized paths', () => {
    const change: ChangeRecord = JSON.parse(fs.readFileSync(changeRecordPath, 'utf8'));
    const mapper = new UsageMapper();
    const usage = mapper.mapPackageUsage(lodashRepo, 'lodash', 'acme/membership');

    expect(usage.filesWithUsage).toBe(1);
    expect(usage.callSites.length).toBe(2);

    // Call site 1: _.contains at line 6
    const containsSite = usage.callSites.find(s => s.callExpression.includes('contains'));
    expect(containsSite).toBeDefined();
    expect(containsSite!.filePath.replace(/\\/g, '/')).toBe('src/membership.js');
    expect(containsSite!.line).toBe(6);

    // Call site 2: _.uniq at line 10
    const uniqSite = usage.callSites.find(s => s.callExpression.includes('uniq'));
    expect(uniqSite).toBeDefined();
    expect(uniqSite!.filePath.replace(/\\/g, '/')).toBe('src/membership.js');
    expect(uniqSite!.line).toBe(10);

    const impact = analyzeImpact(change, usage);
    expect(impact.affectedCallSites.length).toBe(1);
    expect(impact.potentialCallSites?.length).toBe(1);
    expect(impact.affectedCallSites[0].callExpression).toContain('_.contains');
    expect(impact.affectedCallSites[0].filePath.replace(/\\/g, '/')).toBe('src/membership.js');
  });

  test('rule execution verifies postconditions and modifies exactly src/membership.js', async () => {
    const rule = new LodashMethodRenameRule();
    const result = await rule.execute({
      repoPath: lodashRepo,
      packageName: 'lodash',
      fromVersion: '3.10.1',
      toVersion: '4.17.21',
      targetFiles: ['src/membership.js'],
    });

    expect(result.preconditionsSatisfied).toBe(true);
    expect(result.postconditionsVerified).toBe(true);
    expect(result.filesModified).toContain('src/membership.js');
    expect(result.unifiedDiff).toContain('-  return _.contains(ids, id);');
    expect(result.unifiedDiff).toContain('+  return _.includes(ids, id);');
  });

  test('filesChangedByDiff matches normalized call site filePath so coverageVerified is 1 of 1', () => {
    const change: ChangeRecord = JSON.parse(fs.readFileSync(changeRecordPath, 'utf8'));
    const mapper = new UsageMapper();
    const usage = mapper.mapPackageUsage(lodashRepo, 'lodash', 'acme/membership');
    const impact = analyzeImpact(change, usage);

    const sampleDiff = `--- a/src/membership.js
+++ b/src/membership.js
@@ -5,3 +5,3 @@
 function isMember(ids, id) {
-  return _.contains(ids, id);
+  return _.includes(ids, id);
 }
`;

    // Simulated verified check as in SandboxRunner
    const fixedFiles = parsePatch(sampleDiff)
      .map(p => (p.newFileName ?? '').replace(/^b\//, ''))
      .filter((f: string) => f !== '/dev/null')
      .map((f: string) => f.replace(/^b\//, ''))
      .filter((f: string) => f.length > 0)
      .map((f: string) => f.replace(/\\/g, '/'));

    const isFileFixed = (filePath: string) => {
      const norm = (filePath || '').replace(/\\/g, '/');
      return fixedFiles.some((f: string) => f === norm || f.endsWith('/' + norm) || norm.endsWith('/' + f));
    };

    const verified = impact.affectedCallSites.filter(site => isFileFixed(site.filePath));
    const unverifiableAffected = impact.affectedCallSites.filter(site => !isFileFixed(site.filePath));

    expect(verified.length).toBe(1);
    expect(unverifiableAffected.length).toBe(0);
    expect(impact.affectedCallSites.length).toBe(1);
    // Verified 1 of 1 affected call sites
  });
});
