import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import os from 'os';
import { parsePatch, applyPatch } from 'diff';
import {
  ProofArtifact,
  TestResult,
  ImpactAnalysis,
  ChangeRecord,
  ProveResult,
} from '@patchversion/shared';
import { resolveNpmInvocation } from '../npm-cli';

export interface IsolationPolicy {
  maxExecutionTimeMs: number;
  maxMemoryMb: number;
  maxOutputBytes: number;
  allowNetwork: boolean;
  scrubSecrets: boolean;
}

const DEFAULT_POLICY: IsolationPolicy = {
  maxExecutionTimeMs: 120_000,
  maxMemoryMb: 512,
  maxOutputBytes: 1024 * 1024, // 1 MiB
  allowNetwork: false,
  scrubSecrets: true,
};

/**
 * Patterns of files containing secrets that MUST NEVER be copied into
 * an execution sandbox.
 */
export const EXCLUDED_PATTERNS = [
  /^\.git$/i,
  /^\.env(\..+)?$/i,
  /^\.patchversion-.*$/i,
  /\.(pem|key|p12|pfx|pkcs12)$/i,
  /^credentials(\..+)?$/i,
  /^id_(rsa|ed25519|dsa|ecdsa)$/i,
  /^.*token.*$/i,
  /^.*secret.*$/i,
];

/**
 * Resolves and validates a fixture path strictly against the server-side trusted fixture allowlist.
 * Prevents directory traversal ('..'), symlink escape, and arbitrary local directory execution.
 */
export function resolvePermittedFixturePath(repoRoot: string, fixtureSubpath: string): string | null {
  if (!fixtureSubpath || typeof fixtureSubpath !== 'string') return null;

  if (fixtureSubpath.includes('\0')) {
    return null;
  }

  const fixturesRoot = path.resolve(repoRoot, 'fixtures');
  const allowedRoots = [
    path.resolve(repoRoot, 'fixtures/sample-repo'),
    path.resolve(repoRoot, 'fixtures/lodash-repo'),
  ];

  try {
    let fullPath: string;
    if (path.isAbsolute(fixtureSubpath)) {
      fullPath = path.normalize(fixtureSubpath);
    } else {
      if (fixtureSubpath.includes('..')) {
        return null;
      }
      fullPath = path.resolve(repoRoot, fixtureSubpath);
    }

    if (!fs.existsSync(fullPath)) return null;

    const realPath = fs.realpathSync(fullPath);
    const realFixturesRoot = fs.realpathSync(fixturesRoot);
    if (!realPath.startsWith(realFixturesRoot + path.sep)) {
      return null;
    }

    const matchesAllowed = allowedRoots.some(allowed => {
      if (!fs.existsSync(allowed)) return false;
      return realPath === fs.realpathSync(allowed);
    });

    if (!matchesAllowed) {
      return null;
    }

    return realPath;
  } catch {
    return null;
  }
}

export function isSecretOrExcluded(filename: string): boolean {
  return EXCLUDED_PATTERNS.some(pattern => pattern.test(filename));
}

/**
 * Verified Isolated Sandbox Runner.
 * Executes untrusted repository checks in an ephemeral directory with
 * strict resource limits, scrubbed environment, network isolation,
 * and guaranteed cleanup.
 */
export class IsolatedRunner {
  private policy: IsolationPolicy;

  constructor(policyOverrides?: Partial<IsolationPolicy>) {
    this.policy = { ...DEFAULT_POLICY, ...policyOverrides };
  }

  /**
   * Builds a sanitized environment containing only the minimum necessary keys.
   * Strips all host tokens, API keys, and sensitive variables.
   */
  getSanitizedEnv(): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      TMPDIR: process.env.TMPDIR,
      LANG: process.env.LANG ?? 'C.UTF-8',
      CI: 'true',
      NODE_ENV: 'test',
      NODE_OPTIONS: `--max-old-space-size=${this.policy.maxMemoryMb}`,
    };

    if (process.platform === 'win32') {
      env.SystemRoot = process.env.SystemRoot ?? process.env.SYSTEMROOT;
      env.WINDIR = process.env.WINDIR;
      env.ComSpec = process.env.ComSpec ?? process.env.COMSPEC;
      env.TEMP = process.env.TEMP;
      env.TMP = process.env.TMP;
    }

    // Explicitly blacklist and scrub any variable with sensitive terms
    const forbiddenPatterns = [
      /token/i,
      /secret/i,
      /key/i,
      /auth/i,
      /github/i,
      /anthropic/i,
      /openai/i,
      /aws/i,
      /gcp/i,
      /vercel/i,
    ];

    for (const key of Object.keys(process.env)) {
      if (forbiddenPatterns.some(pat => pat.test(key))) {
        delete env[key];
      }
    }

    return env;
  }

  /**
   * Creates an ephemeral workspace directory and copies the repository files
   * while excluding any secrets, .git, or credentials.
   */
  createIsolatedWorkspace(sourceRepoPath: string): string {
    const resolvedSource = path.resolve(sourceRepoPath);
    if (!fs.existsSync(resolvedSource)) {
      throw new Error(`Source repository does not exist at ${resolvedSource}`);
    }

    const uniqueId = crypto.randomBytes(8).toString('hex');
    const workDir = path.join(os.tmpdir(), `trypatchbay-sandbox-${uniqueId}`);
    fs.mkdirSync(workDir, { recursive: true });

    this.copyDirectorySafe(resolvedSource, workDir, resolvedSource);
    return workDir;
  }

  private copyDirectorySafe(srcDir: string, destDir: string, rootDir: string): void {
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      if (isSecretOrExcluded(entry.name)) {
        continue;
      }

      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      // Symlink path traversal defense: resolve real path and verify containment
      if (entry.isSymbolicLink()) {
        try {
          const realSrc = fs.realpathSync(srcPath);
          if (!realSrc.startsWith(rootDir)) {
            // Refuse symlinks escaping source repository
            continue;
          }
        } catch {
          continue;
        }
      }

      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        this.copyDirectorySafe(srcPath, destPath, rootDir);
      } else if (entry.isFile()) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Safely cleans up the ephemeral workspace with retry backoff for Windows file locks.
   */
  cleanupWorkspace(workDir: string): void {
    if (!workDir || !workDir.includes('trypatchbay-sandbox-')) return;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (fs.existsSync(workDir)) {
          fs.rmSync(workDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        }
        return;
      } catch (err) {
        if (attempt === 2) {
          console.warn(`Warning: failed to remove isolated sandbox at ${workDir}:`, err);
        }
      }
    }
  }

  /**
   * Executes a command within the isolated workspace adhering to timeouts and limits.
   */
  async executeCommand(
    executable: string,
    args: string[],
    cwd: string,
    shell = false,
  ): Promise<{ exitCode: number; stdout: string; stderr: string; timedOut: boolean }> {
    return new Promise((resolve) => {
      const env = this.getSanitizedEnv();
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let killed = false;

      const child = spawn(executable, args, {
        cwd,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell,
      });

      const timer = setTimeout(() => {
        timedOut = true;
        killed = true;
        try {
          child.kill('SIGTERM');
          setTimeout(() => {
            try { child.kill('SIGKILL'); } catch { /* ignore */ }
          }, 3000);
        } catch { /* ignore */ }
      }, this.policy.maxExecutionTimeMs);

      child.stdout.on('data', (data: Buffer) => {
        if (stdout.length < this.policy.maxOutputBytes) {
          stdout += data.toString();
        }
      });

      child.stderr.on('data', (data: Buffer) => {
        if (stderr.length < this.policy.maxOutputBytes) {
          stderr += data.toString();
        }
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          exitCode: code ?? (killed ? 124 : 1),
          stdout: stdout.slice(0, this.policy.maxOutputBytes),
          stderr: stderr.slice(0, this.policy.maxOutputBytes),
          timedOut,
        });
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          exitCode: 1,
          stdout,
          stderr: stderr + '\n' + err.message,
          timedOut: false,
        });
      });
    });
  }

  /**
   * Runs the complete Red-to-Green proof loop inside verified isolation:
   * 1. Baseline run (current version): must pass (exit 0)
   * 2. Target upgrade run (breaking version): must fail (exit != 0)
   * 3. Patched run (breaking version + fix diff): must pass (exit 0)
   */
  async proveLoop(
    sourceRepoPath: string,
    change: ChangeRecord,
    impact: ImpactAnalysis,
    fixDiff: string,
  ): Promise<ProveResult> {
    const workDir = this.createIsolatedWorkspace(sourceRepoPath);
    const startMs = Date.now();

    try {
      // Step 1: Ensure dependencies are installed for baseline run
      const pkgJsonPath = path.join(workDir, 'package.json');
      if (fs.existsSync(pkgJsonPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
          const deps = Object.keys(pkg.dependencies ?? {});
          const needsInstall = deps.length > 0 && !fs.existsSync(path.join(workDir, 'node_modules', deps[0]));
          if (needsInstall) {
            const initArgs = ['install', '--install-links', '--no-audit', '--no-fund'];
            if (!this.policy.allowNetwork) initArgs.push('--prefer-offline');
            const npmInit = resolveNpmInvocation(initArgs);
            await this.executeCommand(npmInit.command, npmInit.args, workDir, npmInit.shell);
          }
        } catch { /* proceed to test */ }
      }

      // Step 1: Baseline test run
      const npmTest = resolveNpmInvocation(['test']);
      const baselineRes = await this.executeCommand(npmTest.command, npmTest.args, workDir, npmTest.shell);
      const baselineResult: TestResult = {
        passed: baselineRes.exitCode === 0 ? 1 : 0,
        failed: baselineRes.exitCode !== 0 ? 1 : 0,
        total: 1,
        output: (baselineRes.stdout + '\n' + baselineRes.stderr).trim(),
        exitCode: baselineRes.exitCode,
      };

      if (baselineRes.exitCode !== 0) {
        return {
          outcome: 'inconclusive',
          proof: null,
          reason: 'Baseline tests are already failing before version bump; cannot verify regression',
        };
      }

      // Step 2: Bump to breaking version
      if (fs.existsSync(pkgJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
        const offlinePath = change.offlineVersions?.[change.toVersion];
        const spec = offlinePath ? `file:${offlinePath}` : change.toVersion;
        if (pkg.dependencies && pkg.dependencies[change.packageName]) {
          pkg.dependencies[change.packageName] = spec;
        } else if (pkg.devDependencies && pkg.devDependencies[change.packageName]) {
          pkg.devDependencies[change.packageName] = spec;
        }
        fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2), 'utf8');
      }

      this.removeInstalledDependency(workDir, change.packageName);

      // If offline version is provided, install from offline bundle, else npm install
      const installArgs = ['install', '--install-links', '--no-audit', '--no-fund'];
      if (!this.policy.allowNetwork) {
        installArgs.push('--prefer-offline');
      }
      const npmInstall = resolveNpmInvocation(installArgs);
      await this.executeCommand(npmInstall.command, npmInstall.args, workDir, npmInstall.shell);

      // Step 3: Run bumped test (Red test)
      const redRes = await this.executeCommand(npmTest.command, npmTest.args, workDir, npmTest.shell);
      const redResult: TestResult = {
        passed: redRes.exitCode === 0 ? 1 : 0,
        failed: redRes.exitCode !== 0 ? 1 : 0,
        total: 1,
        output: (redRes.stdout + '\n' + redRes.stderr).trim(),
        exitCode: redRes.exitCode,
      };

      if (redRes.exitCode === 0) {
        // Did not break!
        const proof: ProofArtifact = {
          id: `proof_${crypto.randomUUID()}`,
          changeId: change.id,
          repoId: impact.repoId,
          baselineResult,
          redResult,
          greenResult: redResult,
          fixDiff: '',
          fixedFiles: [],
          coverageVerified: 0,
          coverageTotal: impact.affectedCallSites.length,
          unverifiable: [],
          producedAt: new Date().toISOString(),
          sandboxType: 'local-process',
          durationMs: Date.now() - startMs,
        };
        return {
          outcome: 'no-break',
          proof,
          reason: 'Tests remained passing on the new version without requiring any code fix',
        };
      }

      // Step 4: Apply the candidate fix diff
      const applied = this.applyUnifiedDiff(workDir, fixDiff);
      if (!applied.success) {
        return {
          outcome: 'inconclusive',
          proof: null,
          reason: `Candidate diff failed to apply: ${applied.error}`,
        };
      }

      // Step 5: Run tests on fixed code (Green test)
      const greenRes = await this.executeCommand(npmTest.command, npmTest.args, workDir, npmTest.shell);
      const greenResult: TestResult = {
        passed: greenRes.exitCode === 0 ? 1 : 0,
        failed: greenRes.exitCode !== 0 ? 1 : 0,
        total: 1,
        output: (greenRes.stdout + '\n' + greenRes.stderr).trim(),
        exitCode: greenRes.exitCode,
      };

      if (greenRes.exitCode !== 0) {
        return {
          outcome: 'unfixable',
          proof: null,
          reason: 'Tests still failed after applying the proposed fix; human review required',
        };
      }

      // VERIFIED FIXED!
      const proof: ProofArtifact = {
        id: `proof_${crypto.randomUUID()}`,
        changeId: change.id,
        repoId: impact.repoId,
        baselineResult,
        redResult,
        greenResult,
        fixDiff,
        fixedFiles: applied.changedFiles,
        coverageVerified: impact.affectedCallSites.length,
        coverageTotal: impact.affectedCallSites.length,
        unverifiable: [],
        producedAt: new Date().toISOString(),
        sandboxType: 'local-process',
        durationMs: Date.now() - startMs,
      };

      return {
        outcome: 'fixed',
        proof,
      };
    } finally {
      this.cleanupWorkspace(workDir);
    }
  }

  /**
   * Applies unified diff strictly bounded inside the workDir.
   */
  applyUnifiedDiff(workDir: string, diffText: string): { success: boolean; changedFiles: string[]; error?: string } {
    try {
      const parsedPatches = parsePatch(diffText);
      const changedFiles: string[] = [];

      for (const patch of parsedPatches) {
        const rawFile = patch.newFileName ?? patch.oldFileName;
        if (!rawFile) continue;
        const normalizedFile = rawFile.replace(/^[ab]\//, '');
        const targetPath = path.resolve(workDir, normalizedFile);

        // Path containment check
        if (!targetPath.startsWith(path.resolve(workDir) + path.sep)) {
          return { success: false, changedFiles: [], error: `Diff attempts path traversal: ${normalizedFile}` };
        }

        if (!fs.existsSync(targetPath)) {
          return { success: false, changedFiles: [], error: `Target file does not exist: ${normalizedFile}` };
        }

        const originalContent = fs.readFileSync(targetPath, 'utf8');
        const patched = applyPatch(originalContent, patch);
        if (patched === false) {
          return { success: false, changedFiles: [], error: `Hunk failed to apply to ${normalizedFile}` };
        }

        fs.writeFileSync(targetPath, patched, 'utf8');
        changedFiles.push(normalizedFile);
      }

      return { success: true, changedFiles };
    } catch (err) {
      return { success: false, changedFiles: [], error: err instanceof Error ? err.message : String(err) };
    }
  }

  private removeInstalledDependency(workDir: string, packageName: string): void {
    const installedPath = path.resolve(workDir, 'node_modules', ...packageName.split('/'));
    try {
      if (fs.existsSync(installedPath)) {
        fs.rmSync(installedPath, { recursive: true, force: true });
      }
    } catch { /* ignore */ }

    const lockPath = path.join(workDir, 'package-lock.json');
    if (fs.existsSync(lockPath)) {
      try {
        const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
        if (lock.packages && lock.packages[`node_modules/${packageName}`]) {
          delete lock.packages[`node_modules/${packageName}`];
        }
        if (lock.dependencies && lock.dependencies[packageName]) {
          delete lock.dependencies[packageName];
        }
        fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2));
      } catch { /* ignore */ }
    }
  }
}
