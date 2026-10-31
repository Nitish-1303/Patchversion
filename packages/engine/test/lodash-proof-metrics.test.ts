import path from 'path';
import fs from 'fs';
import { parsePatch } from 'diff';
import { UsageMapper } from '../src/usage-map/mapper';
import { analyzeImpact } from '../src/break-detector/impact-analyzer';
import { LodashMethodRenameRule } from '../src/migration/rules/lodash-rename';
import { ChangeRecord } from '@patchversion/shared';
import { normalizeRepoRelativePath } from '../src/sandbox/runner';

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

  test('filesChangedByDiff matches canonical repo-relative path so coverageVerified is 1 of 1', () => {
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

    // Exact canonical matching as implemented in SandboxRunner
    const canonicalFixedFiles = new Set(
      parsePatch(sampleDiff)
        .map(p => (p.newFileName ?? '').replace(/^b\//, ''))
        .filter((f: string) => f !== '/dev/null')
        .map((f: string) => f.replace(/^b\//, ''))
        .filter((f: string) => f.length > 0)
        .map(normalizeRepoRelativePath)
    );

    const isFileFixed = (filePath: string) => {
      return canonicalFixedFiles.has(normalizeRepoRelativePath(filePath));
    };

    const verified = impact.affectedCallSites.filter(site => isFileFixed(site.filePath));
    const unverifiableAffected = impact.affectedCallSites.filter(site => !isFileFixed(site.filePath));

    expect(verified.length).toBe(1);
    expect(unverifiableAffected.length).toBe(0);
    expect(impact.affectedCallSites.length).toBe(1);
  });

  describe('Regression: Multi-Directory Identical Basename Isolation', () => {
    test('modifying apps/b/src/util.js does NOT mark apps/a/src/util.js as fixed', () => {
      const diffModifyingB = '--- a/apps/b/src/util.js\n+++ b/apps/b/src/util.js\n@@ -1,1 +1,1 @@\n-const oldVal = 1;\n+const oldVal = 2;\n';
      const canonicalFixedFiles = new Set(
        parsePatch(diffModifyingB)
          .map(p => (p.newFileName ?? '').replace(/^b\//, ''))
          .filter((f: string) => f !== '/dev/null')
          .filter((f: string) => f.length > 0)
          .map(normalizeRepoRelativePath)
      );

      const isFileFixed = (filePath: string) => {
        return canonicalFixedFiles.has(normalizeRepoRelativePath(filePath));
      };

      // Two call sites in different directories with identical basenames
      const siteA = { filePath: 'apps/a/src/util.js' };
      const siteB = { filePath: 'apps/b/src/util.js' };
      const siteBWindows = { filePath: 'apps\\b\\src\\util.js' };

      // apps/a/src/util.js must NOT be marked as fixed
      expect(isFileFixed(siteA.filePath)).toBe(false);

      // apps/b/src/util.js MUST be marked as fixed
      expect(isFileFixed(siteB.filePath)).toBe(true);

      // Windows path notation for apps/b must also match
      expect(isFileFixed(siteBWindows.filePath)).toBe(true);
    });

    test('modifying src/util.js does NOT mark apps/a/src/util.js or apps/b/src/util.js as fixed', () => {
      const diffModifyingRoot = '--- a/src/util.js\n+++ b/src/util.js\n@@ -1,1 +1,1 @@\n-const x = 1;\n+const x = 2;\n';
      const canonicalFixedFiles = new Set(
        parsePatch(diffModifyingRoot)
          .map(p => (p.newFileName ?? '').replace(/^b\//, ''))
          .filter((f: string) => f !== '/dev/null')
          .filter((f: string) => f.length > 0)
          .map(normalizeRepoRelativePath)
      );

      const isFileFixed = (filePath: string) => {
        return canonicalFixedFiles.has(normalizeRepoRelativePath(filePath));
      };

      // Root src/util.js is fixed
      expect(isFileFixed('src/util.js')).toBe(true);
      expect(isFileFixed('src\\util.js')).toBe(true);

      // Subdirectory files with same basename are NOT fixed
      expect(isFileFixed('apps/a/src/util.js')).toBe(false);
      expect(isFileFixed('apps/b/src/util.js')).toBe(false);
      expect(isFileFixed('sub/src/util.js')).toBe(false);
    });
  });
});
