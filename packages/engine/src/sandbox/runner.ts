import { execSync, spawn, ChildProcess } from 'child_process';
import { parsePatch, applyPatch } from 'diff';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { ProofArtifact, TestResult, CallSite, UnverifiableSite, ImpactAnalysis, ChangeRecord } from '@patchversion/shared';
import { EngineConfig } from '../config';

/**
 * Sandbox runner: executes the red-to-green proof loop.
 *
 * The loop:
 * 1. Run the repo's test suite against the OLD version (expect green/baseline).
 * 2. Apply the version bump (upgrade the dependency).
 * 3. Run the test suite again (expect red if the change is breaking).
 * 4. If red: apply a candidate fix.
 * 5. Run the test suite again (expect green if the fix works).
 * 6. If green: produce a ProofArtifact with the diff and test results.
 * 7. If still red after budget: refuse to produce a PR.
 *
 * Two sandbox modes:
 * - docker: runs in a Docker container with --network none (isolated)
 * - local: runs in a child process on the host (fallback)
 */
export class SandboxRunner {
  private config: EngineConfig;

  constructor(config: EngineConfig) {
    this.config = config;
  }

  /**
   * Run the full red-to-green proof loop for a change against a repo.
   * Returns a ProofArtifact if the fix is verified, null if unverifiable.
   */
  async proveLoop(
    repoPath: string,
    change: ChangeRecord,
    impact: ImpactAnalysis,
    fixDiff: string,
  ): Promise<ProofArtifact | null> {
    const workDir = this.createWorkDir(repoPath);

    try {
      // Step 1: Baseline - run tests on the old version
      const baselineResult = await this.runTests(workDir, 'baseline');

      // Step 2: Apply the version bump
      this.applyVersionBump(workDir, change);

      // Step 3: Run tests against the new version (expect failures = red)
      const redResult = await this.runTests(workDir, 'red');

      if (redResult.exitCode === 0) {
        // No failures - the change doesn't actually break this repo's usage
        return this.createNoBreakProof(change, impact, baselineResult, redResult);
      }

      // Step 4: Apply the fix
      this.applyFix(workDir, fixDiff);

      // Step 5: Run tests again (expect green)
      const greenResult = await this.runTests(workDir, 'green');

      if (greenResult.exitCode !== 0) {
        // Fix did not work - refuse to produce a PR
        this.logRefusal(change, redResult, greenResult);
        return null;
      }

      // Step 6: Build the proof artifact
      const fixedFiles = this.filesChangedByDiff(fixDiff);
      const verified = impact.affectedCallSites.filter(
        site => fixedFiles.includes(site.filePath),
      );
      const unverifiable: UnverifiableSite[] = [
        // Affected sites the fix did not touch: not verified
        ...impact.affectedCallSites
          .filter(site => !fixedFiles.includes(site.filePath))
          .map(site => ({
            callSite: site,
            reason: 'Affected by the change but the generated fix did not modify this file',
          })),
        // Sites matched only by the broad breaking-change fallback
        ...(impact.potentialCallSites ?? []).map(site => ({
          callSite: site,
          reason: 'Uses the changed package but does not intersect this change; not individually verified',
        })),
      ];

      return {
        id: crypto.randomUUID(),
        changeId: change.id,
        repoId: impact.repoId,
        baselineResult,
        redResult,
        greenResult,
        fixDiff,
        fixedFiles,
        coverageVerified: verified.length,
        coverageTotal: impact.affectedCallSites.length,
        unverifiable,
        producedAt: new Date().toISOString(),
        sandboxType: this.config.sandboxMode === 'docker' ? 'docker-isolated' : 'local-process',
        durationMs: 0, // populated by caller
      };
    } finally {
      // Cleanup work directory
      this.cleanupWorkDir(workDir);
    }
  }

  /**
   * Run the repo's test suite in the sandbox.
   */
  private async runTests(workDir: string, phase: string): Promise<TestResult> {
    const testCommand = this.detectTestCommand(workDir);

    if (this.config.sandboxMode === 'docker') {
      return this.runTestsDocker(workDir, testCommand);
    }
    return this.runTestsLocal(workDir, testCommand);
  }

  private detectTestCommand(workDir: string): string {
    const pkgPath = path.join(workDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.scripts?.test) return 'npm test';
    }
    return 'npm test'; // default
  }

  private async runTestsLocal(workDir: string, command: string): Promise<TestResult> {
    return new Promise((resolve) => {
      let output = '';
      const timeout = setTimeout(() => {
        proc.kill('SIGTERM');
        resolve({ passed: 0, failed: 0, total: 0, output: output + '\n[TIMEOUT]', exitCode: 124 });
      }, this.config.sandboxTimeoutMs);

      const proc: ChildProcess = spawn('sh', ['-c', command], {
        cwd: workDir,
        env: { ...process.env, CI: 'true', NODE_ENV: 'test' },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      proc.stdout?.on('data', (data: Buffer) => { output += data.toString(); });
      proc.stderr?.on('data', (data: Buffer) => { output += data.toString(); });

      proc.on('close', (code) => {
        clearTimeout(timeout);
        const parsed = this.parseTestOutput(output);
        resolve({
          ...parsed,
          output: output.slice(-5000), // keep last 5KB
          exitCode: code ?? 1,
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        resolve({ passed: 0, failed: 0, total: 0, output: String(err), exitCode: 1 });
      });
    });
  }

  private async runTestsDocker(workDir: string, command: string): Promise<TestResult> {
    // Docker mode: run in isolated container with no network
    const dockerCmd = [
      'docker', 'run', '--rm',
      '--network', 'none',
      '--memory', '512m',
      '--cpus', '1',
      '-v', `${workDir}:/app`,
      '-w', '/app',
      'node:20-slim',
      'sh', '-c', `npm install --prefer-offline 2>/dev/null; ${command}`,
    ].join(' ');

    try {
      const output = execSync(dockerCmd, {
        timeout: this.config.sandboxTimeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        encoding: 'utf-8',
      });
      const parsed = this.parseTestOutput(output);
      return { ...parsed, output: output.slice(-5000), exitCode: 0 };
    } catch (err: any) {
      const output = err.stdout?.toString() ?? String(err);
      const parsed = this.parseTestOutput(output);
      return { ...parsed, output: output.slice(-5000), exitCode: err.status ?? 1 };
    }
  }

  private parseTestOutput(output: string): { passed: number; failed: number; total: number } {
    // Parse Jest's summary line. Jest prints failures first when present:
    //   "Tests:       1 failed, 1 passed, 2 total"
    //   "Tests:       2 passed, 2 total"
    const summaryLine = output.split('\n').find(line => /Tests:/.test(line));
    if (summaryLine) {
      const passed = summaryLine.match(/(\d+)\s+passed/);
      const failed = summaryLine.match(/(\d+)\s+failed/);
      const total = summaryLine.match(/(\d+)\s+total/);
      if (passed || failed || total) {
        return {
          passed: passed ? parseInt(passed[1], 10) : 0,
          failed: failed ? parseInt(failed[1], 10) : 0,
          total: total
            ? parseInt(total[1], 10)
            : (passed ? parseInt(passed[1], 10) : 0) + (failed ? parseInt(failed[1], 10) : 0),
        };
      }
    }

    // Parse generic pass/fail patterns
    const passMatch = output.match(/(\d+)\s+pass/i);
    const failMatch = output.match(/(\d+)\s+fail/i);
    if (passMatch || failMatch) {
      const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
      const failed = failMatch ? parseInt(failMatch[1], 10) : 0;
      return { passed, failed, total: passed + failed };
    }

    return { passed: 0, failed: 0, total: 0 };
  }

  private applyVersionBump(workDir: string, change: ChangeRecord): void {
    const pkgPath = path.join(workDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    // Offline fallback: install the target version from a vendored path
    // (relative to the tested repo's root) instead of a registry.
    const offlinePath = change.offlineVersions?.[change.toVersion];
    const spec = offlinePath ? `file:${offlinePath}` : change.toVersion;

    if (pkg.dependencies?.[change.packageName]) {
      pkg.dependencies[change.packageName] = spec;
    }
    if (pkg.devDependencies?.[change.packageName]) {
      pkg.devDependencies[change.packageName] = spec;
    }

    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

    // Reinstall
    try {
      execSync('npm install --prefer-offline --no-audit --no-fund 2>&1', { cwd: workDir, timeout: 60_000 });
    } catch {
      // Install failures are expected if the new version has issues
    }
  }

  private applyFix(workDir: string, fixDiff: string): void {
    // Apply a unified diff to the working directory using the diff library.
    // In-process application works identically in local and docker modes
    // (the work directory is what gets mounted into the container).
    const patches = parsePatch(fixDiff);
    if (patches.length === 0) {
      throw new Error('Failed to apply fix: no file patches found in diff');
    }

    for (const patch of patches) {
      const relPath = (patch.newFileName ?? patch.oldFileName ?? '')
        .replace(/^a\//, '')
        .replace(/^b\//, '');
      const fullPath = path.join(workDir, relPath);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Failed to apply fix: file not found: ${relPath}`);
      }
      const original = fs.readFileSync(fullPath, 'utf-8');
      const patched = applyPatch(original, patch);
      if (patched === false) {
        throw new Error(`Failed to apply fix: patch does not apply cleanly to ${relPath}`);
      }
      fs.writeFileSync(fullPath, patched);
    }
  }

  /** List the files a unified diff modifies (b/ paths). */
  private filesChangedByDiff(fixDiff: string): string[] {
    return parsePatch(fixDiff)
      .map(p => (p.newFileName ?? '').replace(/^b\//, ''))
      .filter(f => f.length > 0 && f !== '/dev/null');
  }

  private createNoBreakProof(
    change: ChangeRecord,
    impact: ImpactAnalysis,
    baseline: TestResult,
    red: TestResult,
  ): ProofArtifact {
    return {
      id: crypto.randomUUID(),
      changeId: change.id,
      repoId: impact.repoId,
      baselineResult: baseline,
      redResult: red,
      greenResult: red, // same as red - no fix needed
      fixDiff: '',
      fixedFiles: [],
      coverageVerified: impact.affectedCallSites.length,
      coverageTotal: impact.affectedCallSites.length,
      unverifiable: [],
      producedAt: new Date().toISOString(),
      sandboxType: this.config.sandboxMode === 'docker' ? 'docker-isolated' : 'local-process',
      durationMs: 0,
    };
  }

  private logRefusal(change: ChangeRecord, red: TestResult, green: TestResult): void {
    // Log that we refused to produce a PR because the fix didn't verify
    console.warn(`[sandbox] REFUSED PR for ${change.packageName}@${change.toVersion}: fix did not verify green`);
  }

  private createWorkDir(repoPath: string): string {
    const workDir = path.join(this.config.stateDir, 'sandbox-work', crypto.randomUUID());
    fs.mkdirSync(workDir, { recursive: true });

    // Copy repo to work directory
    execSync(`cp -r ${repoPath}/. ${workDir}/`, { timeout: 30_000 });

    return workDir;
  }

  private cleanupWorkDir(workDir: string): void {
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup
    }
  }
}
