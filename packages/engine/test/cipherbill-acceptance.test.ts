import { RepositoryScanner, IRepositoryFileProvider, GitHubClient } from '../src';

const runLiveAcceptance = process.env.ENABLE_LIVE_GITHUB_TESTS === 'true';
const describeLive = runLiveAcceptance ? describe : describe.skip;

describeLive('Real CipherBill Acceptance Test (Read-Only GitHub API)', () => {
  // 30 second timeout for network requests to GitHub API
  jest.setTimeout(30000);

  test('scans Nitish-1303/CipherBill live repository over real GitHub API', async () => {
    const github = new GitHubClient();
    const owner = 'Nitish-1303';
    const repo = 'CipherBill';

    const fileProvider: IRepositoryFileProvider = {
      getFileContent: async (filePath: string) => {
        return await github.getRepositoryFileContent(owner, repo, filePath);
      },
      listFiles: async () => {
        return await github.listRepositoryFiles(owner, repo);
      },
      getBranchHeadSha: async (branch?: string) => {
        return await github.getBranchHeadSha(owner, repo, branch || 'main');
      },
    };

    const scanner = new RepositoryScanner();
    const scanResult = await scanner.scanRemoteRepository(
      'tenant_cipherbill_acceptance',
      'repo_cipherbill_live',
      fileProvider,
      {
        repositoryFullName: `${owner}/${repo}`,
        branch: 'main',
      },
    );

    // 1. Basic Metadata
    expect(scanResult.repositoryId).toBe('repo_cipherbill_live');
    expect(scanResult.packageManager).toBe('npm');
    expect(scanResult.projectType).toBe('single-package');

    // 2. Lockfile
    expect(scanResult.lockfiles.length).toBe(1);
    expect(scanResult.lockfiles[0].type).toBe('package-lock');
    expect(scanResult.lockfiles[0].formatVersion).toBe('3');

    // 3. Dependencies: 11 prod + 8 dev = 19 direct dependencies, 504 transitive
    expect(scanResult.directCount).toBe(19);
    expect(scanResult.transitiveCount).toBe(504);
    expect(scanResult.totalDependencies).toBe(523);

    const depNames = scanResult.dependencies.map((d) => d.name);
    expect(depNames).toContain('next');
    expect(depNames).toContain('react');
    expect(depNames).toContain('react-dom');
    expect(depNames).toContain('starknet');
    expect(depNames).toContain('@react-three/fiber');
    expect(depNames).toContain('@react-three/drei');
    expect(depNames).toContain('framer-motion');
    expect(depNames).toContain('three');

    // 4. Framework Detection
    const frameworkNames = scanResult.frameworks.map((f) => f.name);
    expect(frameworkNames).toContain('next');
    expect(frameworkNames).toContain('react');
    expect(frameworkNames).toContain('typescript');

    // 5. Findings: Honest zero breaking changes for current packages
    expect(scanResult.findings).toHaveLength(0);

    // 6. Provenance
    expect(scanResult.provenance).toBeDefined();
    expect(scanResult.provenance.commitSha).toBe('5f160dc1cf6907ce2397d5ef0e0b73590e3c5abf');
    expect(scanResult.provenance.branch).toBe('main');
    expect(scanResult.provenance.astAnalysisStatus).toBe('manifest-only');
    expect(scanResult.provenance.filesInspected).toBeGreaterThanOrEqual(2);
  });
});
