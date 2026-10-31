import { RepositoryScanner, IRepositoryFileProvider } from '../src';

describe('Audit: Remote Source Analysis Integrity & Limits', () => {
  const scanner = new RepositoryScanner();

  test('Repo 1 (TypeScript): discovers manifests and maps exact TypeScript call sites with lines & columns', async () => {
    const mockFiles: Record<string, string> = {
      'package.json': JSON.stringify({
        name: 'ts-payments-service',
        version: '1.0.0',
        dependencies: {
          mockpay: '^1.0.0',
        },
      }),
      'package-lock.json': JSON.stringify({
        name: 'ts-payments-service',
        version: '1.0.0',
        lockfileVersion: 3,
        packages: {
          '': { name: 'ts-payments-service', dependencies: { mockpay: '^1.0.0' } },
          'node_modules/mockpay': { version: '1.0.0' },
        },
      }),
      'src/charge.ts': `import { charges } from 'mockpay';

export async function processCharge(amount: number, token: string) {
  const result = await charges.create({ amount, currency: 'usd', source: token });
  return result;
}
`,
    };

    const provider: IRepositoryFileProvider = {
      getFileContent: async (p: string) => mockFiles[p] ?? null,
      listFiles: async () => Object.keys(mockFiles),
      getBranchHeadSha: async () => 'sha_ts_repo_123',
    };

    const result = await scanner.scanRemoteRepository('ten_audit_1', 'repo_ts_audit', provider, {
      knownChanges: [
        {
          id: 'change_mockpay_1_to_2',
          packageName: 'mockpay',
          ecosystem: 'npm',
          fromVersion: '1.0.0',
          toVersion: '2.0.0',
          detectedAt: new Date().toISOString(),
          source: 'registry',
          sourceUrl: 'https://example.com/mockpay',
          rawNotes: 'Parameter renamed',
          classification: { isBreaking: true, confidence: 1.0, affectedExports: ['charges.create', 'source'], reason: 'rename' },
          severity: 'breaking',
        },
      ],
    });

    expect(result.provenance.astAnalysisStatus).toBe('complete');
    expect(result.provenance.limitsReached).toBe(false);
    expect(result.findings.length).toBe(1);

    const finding = result.findings[0];
    expect(finding.analysisMode).toBe('remote-ast');
    expect(finding.sourceAnalysisPerformed).toBe(true);
    expect(finding.impactAnalysis.affectedCallSites.length).toBe(1);

    const callSite = finding.impactAnalysis.affectedCallSites[0];
    expect(callSite.filePath).toBe('src/charge.ts');
    expect(callSite.line).toBe(4);
    expect(callSite.column).toBe(24);
  });

  test('Repo 2 (CommonJS JavaScript): discovers manifests and maps require() call sites', async () => {
    const mockFiles: Record<string, string> = {
      'package.json': JSON.stringify({
        name: 'cjs-service',
        version: '1.0.0',
        dependencies: {
          mockpay: '^1.0.0',
        },
      }),
      'yarn.lock': `# yarn lockfile v1\n"mockpay@^1.0.0":\n  version "1.0.0"\n`,
      'lib/billing.js': `const mockpay = require('mockpay');

function createInvoice(amount, source) {
  return mockpay.charges.create({ amount, source });
}

module.exports = { createInvoice };
`,
    };

    const provider: IRepositoryFileProvider = {
      getFileContent: async (p: string) => mockFiles[p] ?? null,
      listFiles: async () => Object.keys(mockFiles),
      getBranchHeadSha: async () => 'sha_cjs_repo_456',
    };

    const result = await scanner.scanRemoteRepository('ten_audit_2', 'repo_cjs_audit', provider, {
      knownChanges: [
        {
          id: 'change_mockpay_1_to_2',
          packageName: 'mockpay',
          ecosystem: 'npm',
          fromVersion: '1.0.0',
          toVersion: '2.0.0',
          detectedAt: new Date().toISOString(),
          source: 'registry',
          sourceUrl: 'https://example.com/mockpay',
          rawNotes: 'Parameter renamed',
          classification: { isBreaking: true, confidence: 1.0, affectedExports: ['charges.create', 'source'], reason: 'rename' },
          severity: 'breaking',
        },
      ],
    });

    expect(result.provenance.astAnalysisStatus).toBe('complete');
    expect(result.findings[0].analysisMode).toBe('remote-ast');
    expect(result.findings[0].impactAnalysis.affectedCallSites[0].filePath).toBe('lib/billing.js');
    expect(result.findings[0].impactAnalysis.affectedCallSites[0].line).toBe(4);
  });

  test('Repo 3 (Exclusions): strictly excludes node_modules, dist, .next, and minified bundles', async () => {
    const mockFiles: Record<string, string> = {
      'package.json': JSON.stringify({ name: 'complex-app', version: '1.0.0', dependencies: { mockpay: '^1.0.0' } }),
      'src/index.js': `const m = require('mockpay'); m.charges.create({ source: 'tok_1' });`,
      'node_modules/mockpay/index.js': `console.log('vendor code');`,
      'dist/bundle.js': `console.log('compiled bundle');`,
      '.next/server/chunk.js': `console.log('next build chunk');`,
      'public/vendor.min.js': `console.log('minified file');`,
      'assets/vendor.bundle.js': `console.log('bundle file');`,
    };

    const fetchedPaths: string[] = [];
    const provider: IRepositoryFileProvider = {
      getFileContent: async (p: string) => {
        fetchedPaths.push(p);
        return mockFiles[p] ?? null;
      },
      listFiles: async () => Object.keys(mockFiles),
    };

    const result = await scanner.scanRemoteRepository('ten_audit_3', 'repo_complex_audit', provider);

    // Only package.json and src/index.js should be fetched
    expect(fetchedPaths).toContain('src/index.js');
    expect(fetchedPaths).not.toContain('node_modules/mockpay/index.js');
    expect(fetchedPaths).not.toContain('dist/bundle.js');
    expect(fetchedPaths).not.toContain('.next/server/chunk.js');
    expect(fetchedPaths).not.toContain('public/vendor.min.js');
    expect(fetchedPaths).not.toContain('assets/vendor.bundle.js');
    expect(result.provenance.astAnalysisStatus).toBe('complete');
  });

  test('Ceiling enforcement: maxFiles limit is enforced and provenance truthfully set to partial', async () => {
    const mockFiles: Record<string, string> = {
      'package.json': JSON.stringify({ name: 'large-repo', version: '1.0.0', dependencies: { lodash: '^4.17.21' } }),
    };
    for (let i = 1; i <= 20; i++) {
      mockFiles[`src/components/Comp${i}.tsx`] = `import _ from 'lodash'; export const Comp${i} = () => null;`;
    }

    const provider: IRepositoryFileProvider = {
      getFileContent: async (p: string) => mockFiles[p] ?? null,
      listFiles: async () => Object.keys(mockFiles),
    };

    const result = await scanner.scanRemoteRepository('ten_audit_4', 'repo_large_audit', provider, {
      limits: { maxFiles: 5 },
    });

    expect(result.provenance.astAnalysisStatus).toBe('partial');
    expect(result.provenance.limitsReached).toBe(true);
    expect(result.provenance.filesSkipped.length).toBe(15);
    expect(result.provenance.filesSkipped[0].reason).toContain('exceeded maxFiles limit of 5');
  });

  test('Ceiling enforcement: file size limit triggers skip and partial provenance', async () => {
    const mockFiles: Record<string, string> = {
      'package.json': JSON.stringify({ name: 'big-file-repo', version: '1.0.0', dependencies: { lodash: '^4.17.21' } }),
      'src/small.js': `console.log('small');`,
      'src/oversized.js': 'x'.repeat(600 * 1024), // 600 KB
    };

    const provider: IRepositoryFileProvider = {
      getFileContent: async (p: string) => mockFiles[p] ?? null,
      listFiles: async () => Object.keys(mockFiles),
    };

    const result = await scanner.scanRemoteRepository('ten_audit_5', 'repo_oversized_audit', provider, {
      limits: { maxFileSizeBytes: 500 * 1024 }, // 500 KB limit
    });

    expect(result.provenance.astAnalysisStatus).toBe('partial');
    expect(result.provenance.filesSkipped.some((f) => f.path === 'src/oversized.js')).toBe(true);
    expect(result.provenance.filesSkipped.find((f) => f.path === 'src/oversized.js')?.reason).toContain('maxFileSizeBytes');
  });

  test('Graceful fallback: when listFiles is unavailable or throws, provenance is manifest-only', async () => {
    const providerWithoutListFiles: IRepositoryFileProvider = {
      getFileContent: async (p: string) => {
        if (p === 'package.json') return JSON.stringify({ name: 'no-list', version: '1.0.0', dependencies: { express: '^4.18.2' } });
        return null;
      },
    };

    const result = await scanner.scanRemoteRepository('ten_audit_6', 'repo_no_list', providerWithoutListFiles);
    expect(result.provenance.astAnalysisStatus).toBe('manifest-only');
    expect(result.findings.length).toBe(0);
  });
});
