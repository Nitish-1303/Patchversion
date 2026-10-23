import { execSync, spawn, ChildProcess } from 'child_process';
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
      this.applyVersionBump(workDir, change.packageName, change.toVersion);

      // Step 3: Run tests against the new version (expect failures = red)
      const redResult = await this.runTests(workDir, 'red');

      if (redResult.exitCode === 0) {
        // No failures - the change doesn't actually break this repo's usage
        return this.createNoBreakProof(change, impact, baselineResult, redResult, workDir);
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
      const unverifiable = this.identifyUnverifiable(impact, redResult);

      return {
        id: crypto.randomUUID(),
        changeId: change.id,
        repoId: impact.repoId,
        redResult,
        greenResult,
        fixDiff,
        coverageVerified: impact.affectedCallSites.length - unverifiable.length,
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
    // Parse Jest output
    const jestMatch = output.match(/Tests:\s+(\d+)\s+passed(?:,\s+(\d+)\s+failed)?(?:,\s+(\d+)\s+total)?/);
    if (jestMatch) {
      return {
        passed: parseInt(jestMatch[1], 10),
        failed: parseInt(jestMatch[2] ?? '0', 10),
        total: parseInt(jestMatch[3] ?? jestMatch[1], 10),
      };
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

  private applyVersionBump(workDir: string, packageName: string, toVersion: string): void {
    const pkgPath = path.join(workDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    if (pkg.dependencies?.[packageName]) {
      pkg.dependencies[packageName] = toVersion;
    }
    if (pkg.devDependencies?.[packageName]) {
      pkg.devDependencies[packageName] = toVersion;
    }

    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

    // Reinstall
    try {
      execSync('npm install --prefer-offline 2>&1', { cwd: workDir, timeout: 60_000 });
    } catch {
      // Install failures are expected if the new version has issues
    }
  }

  private applyFix(workDir: string, fixDiff: string): void {
    // Apply a unified diff to the working directory
    const patchFile = path.join(workDir, '.patchversion-fix.patch');
    fs.writeFileSync(patchFile, fixDiff);

    try {
      execSync(`patch -p1 < ${patchFile}`, { cwd: workDir, timeout: 10_000 });
    } catch {
      // Try git apply as fallback
      try {
        execSync(`git apply ${patchFile}`, { cwd: workDir, timeout: 10_000 });
      } catch (err) {
        throw new Error(`Failed to apply fix: ${err}`);
      }
    } finally {
      fs.unlinkSync(patchFile);
    }
  }

  private identifyUnverifiable(impact: ImpactAnalysis, redResult: TestResult): UnverifiableSite[] {
    // Call sites that didn't produce test failures can't be verified
    // by the test suite. They may still be broken (no test coverage).
    if (redResult.failed === 0) {
      return impact.affectedCallSites.map((site: CallSite) => ({
        callSite: site,
        reason: 'No test failure produced; call site may lack test coverage',
      }));
    }
    return [];
  }

  private createNoBreakProof(
    change: ChangeRecord,
    impact: ImpactAnalysis,
    baseline: TestResult,
    red: TestResult,
    workDir: string,
  ): ProofArtifact {
    return {
      id: crypto.randomUUID(),
      changeId: change.id,
      repoId: impact.repoId,
      redResult: red,
      greenResult: red, // same as red - no fix needed
      fixDiff: '',
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
