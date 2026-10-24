import { spawn, ChildProcess, execFileSync } from 'child_process';
import { parsePatch, applyPatch } from 'diff';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { ProofArtifact, TestResult, UnverifiableSite, ImpactAnalysis, ChangeRecord, ProveResult } from '@patchversion/shared';
import { EngineConfig } from '../config';

/** Environment passed to repo code under test: the minimum npm needs.
 *  Deliberately does NOT inherit process.env - secrets must not leak
 *  into code from a repository being tested. */
function minimalEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR,
    LANG: process.env.LANG ?? 'C.UTF-8',
    CI: 'true',
    NODE_ENV: 'test',
  };
  if (process.env.npm_config_cache) env.npm_config_cache = process.env.npm_config_cache;
  return env;
}

/**
 * Names never copied into a sandbox work directory. The tested repo's
 * code runs with read access to its own tree, so secret-bearing files
 * must not come along. Matches the site's security documentation.
 */
export function isExcludedFromSandboxCopy(name: string): boolean {
  return (
    name === '.git' ||
    name === '.patchversion-state' ||
    name === '.env' ||
    name.startsWith('.env.') ||
    /\.(pem|key|p12|pfx)$/i.test(name) ||
    /^credentials(\.|$)/i.test(name) ||
    name === 'id_rsa' ||
    name === 'id_ed25519'
  );
}

/** Max bytes of child output held in memory before truncation. */
const MAX_OUTPUT_BYTES = 1024 * 1024;
/** Grace between SIGTERM and SIGKILL when a run exceeds its deadline. */
const KILL_GRACE_MS = 5_000;

/**
 * Sandbox runner: executes the red-to-green proof loop.
 *
 * The loop:
 * 1. Run the repo's test suite against the OLD version (must be green -
 *    a failing baseline makes every later result inconclusive).
 * 2. Apply the version bump (install must succeed - a failed install is
 *    inconclusive, never mistaken for a red suite).
 * 3. Run the test suite again (red means the change really breaks usage).
 * 4. If red: apply a candidate fix (malformed/unsafe patch = inconclusive).
 * 5. Run the test suite again (green means the fix works).
 * 6. A ProofArtifact is produced only for a verified fix ('fixed') or a
 *    confirmed no-break. Everything else is refused with an honest outcome.
 *
 * Execution modes:
 * - local: child process on this host. NO ISOLATION: repo code runs with
 *   this user's privileges (on a minimal environment). The engine only
 *   allows this for trusted fixture repositories.
 * - docker: BLOCKED. Docker isolation is unverified; selecting it throws.
 */
export class SandboxRunner {
  private config: EngineConfig;

  constructor(config: EngineConfig) {
    if (config.sandboxMode === 'docker') {
      throw new Error(
        'Docker sandbox mode is UNVERIFIED and blocked. ' +
        'Use local mode (no isolation, trusted fixtures only).',
      );
    }
    this.config = config;
  }

  /**
   * Run the full red-to-green proof loop for a change against a repo.
   * Never throws for pipeline failures; cleanup failure blocks success.
   */
  async proveLoop(
    repoPath: string,
    change: ChangeRecord,
    impact: ImpactAnalysis,
    fixDiff: string,
  ): Promise<ProveResult> {
    const workDir = this.createWorkDir(repoPath);
    let result: ProveResult;
    try {
      result = await this.runSteps(workDir, repoPath, change, impact, fixDiff);
    } catch (err) {
      result = {
        outcome: 'inconclusive',
        proof: null,
        reason: `Unexpected sandbox error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return this.finish(workDir, result);
  }

  private async runSteps(
    workDir: string,
    repoPath: string,
    change: ChangeRecord,
    impact: ImpactAnalysis,
    fixDiff: string,
  ): Promise<ProveResult> {
    // Step 1: Baseline - run tests on the old version
    const baselineResult = await this.runTests(workDir);
    if (baselineResult.exitCode !== 0) {
      return {
        outcome: 'inconclusive',
        proof: null,
        reason: `Baseline test run failed on ${change.fromVersion} (exit ${baselineResult.exitCode}); cannot prove anything against an already-red suite`,
      };
    }
    if (baselineResult.total === 0) {
      return {
        outcome: 'inconclusive',
        proof: null,
        reason: 'Baseline run reported zero tests; no usable tests to prove against',
      };
    }

    // Step 2: Apply the version bump. A failed bump is inconclusive,
    // never mistaken for a red suite.
    try {
      this.applyVersionBump(workDir, change);
    } catch (err) {
      return {
        outcome: 'inconclusive',
        proof: null,
        reason: `Version bump failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    // Step 3: Run tests against the new version (expect failures = red)
    const redResult = await this.runTests(workDir);

    if (redResult.exitCode === 0) {
      if (redResult.total === 0) {
        return {
          outcome: 'inconclusive',
          proof: null,
          reason: 'Post-bump run reported zero tests; cannot establish that nothing broke',
        };
      }
      // No failures - the change doesn't break this repo's tested usage.
      return {
        outcome: 'no-break',
        proof: this.createNoBreakProof(change, impact, baselineResult, redResult),
      };
    }

    // Step 4: Apply the fix. A malformed or unsafe patch is inconclusive.
    try {
      this.applyFix(workDir, fixDiff);
    } catch (err) {
      return {
        outcome: 'inconclusive',
        proof: null,
        reason: `Fix could not be applied: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    // Step 5: Run tests again (expect green)
    const greenResult = await this.runTests(workDir);

    if (greenResult.exitCode !== 0) {
      return {
        outcome: 'unfixable',
        proof: null,
        reason: `Fix did not verify: suite still red after applying it (${greenResult.failed} failed of ${greenResult.total})`,
      };
    }
    if (greenResult.total === 0) {
      return {
        outcome: 'inconclusive',
        proof: null,
        reason: 'Post-fix run reported zero tests; a green run without tests is not a proof',
      };
    }

    // Step 6: Verified fix - build the proof artifact
    const fixedFiles = this.filesChangedByDiff(fixDiff);
    const verified = impact.affectedCallSites.filter(
      site => fixedFiles.includes(site.filePath),
    );
    const unverifiable: UnverifiableSite[] = [
      ...impact.affectedCallSites
        .filter(site => !fixedFiles.includes(site.filePath))
        .map(site => ({
          callSite: site,
          reason: 'Affected by the change but the generated fix did not modify this file',
        })),
      ...(impact.potentialCallSites ?? []).map(site => ({
        callSite: site,
        reason: 'Uses the changed package but does not intersect this change; not individually verified',
      })),
    ];

    return {
      outcome: 'fixed',
      proof: {
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
        sandboxType: 'local-process',
        durationMs: 0, // populated by caller
      },
    };
  }

  /**
   * Cleanup gate: a failed cleanup blocks a success outcome. Leftover
   * work directories are an integrity risk (stale trees, disk fill), so a
   * cleanup error turns 'fixed'/'no-break' into 'inconclusive'.
   */
  private finish(workDir: string, result: ProveResult): ProveResult {
    try {
      this.cleanupWorkDirChecked(workDir);
      return result;
    } catch (err) {
      const reason = `Sandbox cleanup failed for ${workDir}: ${err instanceof Error ? err.message : String(err)}`;
      if (result.outcome === 'fixed' || result.outcome === 'no-break') {
        return { outcome: 'inconclusive', proof: null, reason };
      }
      return { ...result, reason: `${result.reason ?? result.outcome}; ${reason}` };
    }
  }

  /**
   * Run the repo's test suite. The runner is test-framework agnostic:
   * the exit code is the pass/fail signal; output parsing is best-effort
   * reporting only.
   */
  private async runTests(workDir: string): Promise<TestResult> {
    const command = this.detectTestCommand(workDir);
    return this.runTestsLocal(workDir, command);
  }

  private detectTestCommand(workDir: string): string {
    const pkgPath = path.join(workDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.scripts?.test) return 'npm test';
    }
    return 'npm test'; // npm exits nonzero when no test script exists
  }

  private async runTestsLocal(workDir: string, command: string): Promise<TestResult> {
    return new Promise((resolve) => {
      let output = '';
      let settled = false;
      let timedOut = false;

      const append = (data: Buffer) => {
        if (output.length < MAX_OUTPUT_BYTES) {
          output += data.toString();
        }
      };

      const done = (result: TestResult) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(result);
        }
      };

      const proc: ChildProcess = spawn('sh', ['-c', command], {
        cwd: workDir,
        env: minimalEnv(),
        stdio: ['ignore', 'pipe', 'pipe'],
        // Own process group so the timeout kills the whole tree
        // (sh -> npm -> test runner), not just the shell.
        detached: true,
      });

      const timer = setTimeout(() => {
        timedOut = true;
        try {
          if (proc.pid) process.kill(-proc.pid, 'SIGTERM');
        } catch { /* already gone */ }
        const killer = setTimeout(() => {
          try {
            if (proc.pid) process.kill(-proc.pid, 'SIGKILL');
          } catch { /* already gone */ }
        }, KILL_GRACE_MS);
        killer.unref();
      }, this.config.sandboxTimeoutMs);

      proc.stdout?.on('data', append);
      proc.stderr?.on('data', append);

      proc.on('close', (code) => {
        const parsed = this.parseTestOutput(output);
        done({
          ...parsed,
          output: (timedOut ? output + '\n[TIMEOUT]' : output).slice(-5000),
          exitCode: timedOut ? 124 : (code ?? 1),
        });
      });

      proc.on('error', (err) => {
        done({ passed: 0, failed: 0, total: 0, output: String(err), exitCode: 1 });
      });
    });
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

    return { passed: 0, failed: 0, total: 0 };
  }

  private applyVersionBump(workDir: string, change: ChangeRecord): void {
    const pkgPath = path.join(workDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    // Offline fallback: install the target version from a vendored path
    // (relative to the tested repo's root) instead of a registry.
    const offlinePath = change.offlineVersions?.[change.toVersion];
    const spec = offlinePath ? `file:${offlinePath}` : change.toVersion;

    let touched = false;
    if (pkg.dependencies?.[change.packageName]) {
      pkg.dependencies[change.packageName] = spec;
      touched = true;
    }
    if (pkg.devDependencies?.[change.packageName]) {
      pkg.devDependencies[change.packageName] = spec;
      touched = true;
    }
    if (!touched) {
      throw new Error(`${change.packageName} is not a dependency of the tested repo; nothing to bump`);
    }

    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

    // Reinstall. A failure here means the red/green runs would prove
    // nothing, so it aborts the loop instead of being swallowed.
    try {
      execFileSync('npm', ['install', '--prefer-offline', '--no-audit', '--no-fund'], {
        cwd: workDir,
        timeout: 120_000,
        stdio: 'pipe',
        env: minimalEnv(),
      });
    } catch (err: any) {
      const tail = (err?.stderr?.toString() ?? err?.stdout?.toString() ?? String(err)).slice(-500);
      throw new Error(`npm install after bump to ${change.toVersion} failed: ${tail}`);
    }
  }

  private applyFix(workDir: string, fixDiff: string): void {
    // Apply a unified diff to the working directory using the diff library.
    // Every target path is checked for containment inside the working
    // directory - a crafted diff must not write outside it.
    const realWorkDir = fs.realpathSync(workDir);
    const patches = parsePatch(fixDiff);
    if (patches.length === 0) {
      throw new Error('no file patches found in diff');
    }

    for (const patch of patches) {
      const relPath = (patch.newFileName ?? patch.oldFileName ?? '')
        .replace(/^a\//, '')
        .replace(/^b\//, '');
      const fullPath = path.resolve(workDir, relPath);
      if (!fullPath.startsWith(realWorkDir + path.sep)) {
        throw new Error(`patch path escapes the working directory: ${relPath}`);
      }
      if (!fs.existsSync(fullPath)) {
        throw new Error(`file not found: ${relPath}`);
      }
      // Symlink defense: the resolved target must also live inside.
      const realTarget = fs.realpathSync(fullPath);
      if (!realTarget.startsWith(realWorkDir + path.sep)) {
        throw new Error(`patch target resolves outside the working directory: ${relPath}`);
      }
      const original = fs.readFileSync(realTarget, 'utf-8');
      const patched = applyPatch(original, patch);
      if (patched === false) {
        throw new Error(`patch does not apply cleanly to ${relPath}`);
      }
      fs.writeFileSync(realTarget, patched);
    }
  }

  /** List the files a unified diff modifies (b/ paths). */
  private filesChangedByDiff(fixDiff: string): string[] {
    return parsePatch(fixDiff)
      .map(p => (p.newFileName ?? '').replace(/^b\//, ''))
      .filter(f => f !== '/dev/null')
      .map(f => f.replace(/^b\//, ''))
      .filter(f => f.length > 0);
  }

  private createNoBreakProof(
    change: ChangeRecord,
    impact: ImpactAnalysis,
    baseline: TestResult,
    red: TestResult,
  ): ProofArtifact {
    // Honest coverage: the suite stayed green on the new version without
    // any change, but that does not establish that each affected call
    // site is exercised by a test. Nothing is counted as verified.
    const unverifiable: UnverifiableSite[] = [
      ...impact.affectedCallSites.map(site => ({
        callSite: site,
        reason: 'Suite stayed green on the new version without changes; per-site test coverage is not established',
      })),
      ...(impact.potentialCallSites ?? []).map(site => ({
        callSite: site,
        reason: 'Uses the changed package but does not intersect this change; not individually verified',
      })),
    ];
    return {
      id: crypto.randomUUID(),
      changeId: change.id,
      repoId: impact.repoId,
      baselineResult: baseline,
      redResult: red,
      greenResult: red, // same as red - no fix needed
      fixDiff: '',
      fixedFiles: [],
      coverageVerified: 0,
      coverageTotal: impact.affectedCallSites.length,
      unverifiable,
      producedAt: new Date().toISOString(),
      sandboxType: 'local-process',
      durationMs: 0,
    };
  }

  private createWorkDir(repoPath: string): string {
    const realRepo = fs.realpathSync(repoPath);
    if (!fs.statSync(realRepo).isDirectory()) {
      throw new Error(`repo path is not a directory: ${repoPath}`);
    }
    const workDir = path.join(this.config.stateDir, 'sandbox-work', crypto.randomUUID());
    fs.mkdirSync(workDir, { recursive: true });

    // Copy the repo without a shell (no string interpolation), skipping
    // VCS and state directories. node_modules is copied on purpose: the
    // fixtures' vendored dependencies must run without registry access.
    fs.cpSync(realRepo, workDir, {
      recursive: true,
      filter: (src) => !isExcludedFromSandboxCopy(path.basename(src)),
    });

    return workDir;
  }

  private cleanupWorkDirChecked(workDir: string): void {
    // Checked cleanup: failures throw so finish() can block the outcome.
    // Path-based recursive deletion is a known residual weakness (see
    // docs/security-threat-model.md): it must only ever target the UUID
    // directory this runner created under its own state dir.
    const parent = path.join(this.config.stateDir, 'sandbox-work');
    if (!path.resolve(workDir).startsWith(path.resolve(parent) + path.sep)) {
      throw new Error(`refusing to clean a directory outside the sandbox root: ${workDir}`);
    }
    fs.rmSync(workDir, { recursive: true, force: false });
    if (fs.existsSync(workDir)) {
      throw new Error(`work directory still exists after cleanup: ${workDir}`);
    }
  }
}
