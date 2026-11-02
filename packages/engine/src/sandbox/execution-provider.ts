
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess, execFileSync } from 'child_process';
import { IsolatedRunner, resolvePermittedFixturePath } from './isolated-runner';

function terminateProcessTree(child: ChildProcess): void {
  if (!child.pid) return;
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/pid', child.pid.toString(), '/T', '/F'], { stdio: 'ignore' });
    } else {
      child.kill('SIGKILL');
    }
  } catch {
    try {
      child.kill('SIGKILL');
    } catch { /* ignore */ }
  }
}

/**
 * Network egress policy for isolated execution.
 * - 'none': Complete network isolation. No outbound or inbound connections. (Default)
 * - 'offline-mirrors': Loopback/internal mirror access only for pinned package tarballs.
 * - 'restricted-egress': Explicitly allowlisted hostnames/CIDRs (e.g. registry.npmjs.org only).
 */
export type IsolationNetworkPolicy = 'none' | 'offline-mirrors' | 'restricted-egress';

/**
 * Hard resource boundaries enforced on the isolated container/microVM.
 */
export interface IsolationResourceLimits {
  /** Maximum execution time in milliseconds before forced termination (default: 120_000). */
  timeoutMs: number;
  /** Maximum memory allocation in megabytes (default: 512). */
  maxMemoryMb: number;
  /** Number of virtual CPU cores allocated (default: 1). */
  cpuCores: number;
  /** Maximum captured stdout/stderr output in bytes before truncation (default: 1 MiB). */
  maxOutputBytes: number;
  /** Maximum ephemeral disk space in megabytes (default: 1024). */
  maxDiskMb: number;
}

export const DEFAULT_ISOLATION_LIMITS: IsolationResourceLimits = {
  timeoutMs: 120_000,
  maxMemoryMb: 512,
  cpuCores: 1,
  maxOutputBytes: 1024 * 1024,
  maxDiskMb: 1024,
};

/**
 * Sanitized execution environment specification.
 * Ambient host environment variables and secrets MUST be stripped before sandbox creation.
 */
export interface IsolationEnvironment {
  /** Explicit allowlisted environment key-values passed to the runner. */
  env: Record<string, string>;
  /** Blacklisted variable name patterns (e.g. /token/i, /key/i, /secret/i). */
  excludedPatterns: string[];
}

/**
 * Default patterns matching sensitive credentials that must never enter the execution sandbox.
 */
export const DEFAULT_SECRET_EXCLUSION_PATTERNS: string[] = [
  '.git',
  '.patchversion-*',
  '.env*',
  '*.pem',
  '*.key',
  '*.p12',
  '*.pfx',
  'credentials*',
  'id_rsa*',
  'id_ed25519*',
  '*token*',
  '*secret*',
];

/**
 * Specification for provisioning the target codebase inside the isolated workspace.
 */
export interface WorkspaceRepositoryInput {
  sourceType: 'local-fixture' | 'git-url' | 'tarball';
  sourceLocation: string;
  commitSha?: string;
  branch?: string;
  excludePatterns: string[];
}

/**
 * Dependency input required for reproducing breaking changes.
 */
export interface WorkspaceDependencyInput {
  packageName: string;
  targetVersion: string;
  tarballLocation?: string;
  /**
   * Whether package installation lifecycle scripts (preinstall, postinstall)
   * are permitted. In untrusted environments, this MUST be false by default.
   */
  allowLifecycleScripts: boolean;
}

/**
 * Specification of an individual command to execute within the isolated workspace.
 */
export interface WorkspaceCommand {
  executable: string;
  args: string[];
  cwd?: string;
  timeoutMs?: number;
  abortSignal?: AbortSignal;
}

/**
 * Standardized execution telemetry, output capture, and integrity verification.
 */
export interface WorkspaceExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  killed: boolean;
  durationMs: number;
  outputTruncated: boolean;
  /**
   * Cryptographic SHA-256 hashes of created or modified workspace files
   * to guarantee artifact integrity against tampering.
   */
  artifactHashes: Record<string, string>;
}

/**
 * A disposable, hermetically isolated workspace.
 * Implementations MUST guarantee resource cleanup upon completion or failure.
 */
export interface IDisposableWorkspace {
  readonly workspaceId: string;
  readonly isCleanedUp: boolean;

  /**
   * Execute a command within the isolated workspace adhering to resource limits and network policy.
   */
  execute(command: WorkspaceCommand): Promise<WorkspaceExecutionResult>;

  /**
   * Apply a unified diff patch strictly confined to the workspace boundaries.
   */
  applyPatch(diffText: string): Promise<{ success: boolean; changedFiles: string[]; error?: string }>;

  /**
   * Destroy the workspace and permanently remove all ephemeral state.
   */
  cleanup(): Promise<void>;
}

/**
 * Workspace provisioning configuration.
 */
export interface WorkspaceProvisionOptions {
  repo: WorkspaceRepositoryInput;
  dependencies?: WorkspaceDependencyInput[];
  limits?: Partial<IsolationResourceLimits>;
  network?: IsolationNetworkPolicy;
  env?: Partial<IsolationEnvironment>;
}

/**
 * Error thrown when no verified isolation provider is operational.
 * TryPatchBay fails closed rather than executing untrusted code on the host.
 */
export class IsolationProviderUnavailableError extends Error {
  readonly code = 'ISOLATION_PROVIDER_UNAVAILABLE';
  constructor(message = 'No verified isolated execution provider is configured. Failing closed.') {
    super(message);
    this.name = 'IsolationProviderUnavailableError';
  }
}

/**
 * Error thrown when an execution step violates isolation security constraints
 * (e.g. attempting filesystem traversal, symlink breakout, or unauthorized network access).
 */
export class IsolationSecurityViolationError extends Error {
  readonly code = 'ISOLATION_SECURITY_VIOLATION';
  constructor(message: string) {
    super(message);
    this.name = 'IsolationSecurityViolationError';
  }
}

/**
 * Error thrown when an execution step exceeds allocated limits (timeout, memory, disk).
 */
export class IsolationResourceExceededError extends Error {
  readonly code = 'ISOLATION_RESOURCE_EXCEEDED';
  constructor(message: string) {
    super(message);
    this.name = 'IsolationResourceExceededError';
  }
}

/**
 * Formal contract for an isolated execution provider.
 * Future backends (e.g. Firecracker microVM, AWS Fargate, hardened gVisor)
 * must implement this contract.
 */
export interface IExecutionProvider {
  readonly name: string;
  readonly type: 'docker' | 'microvm' | 'remote-worker' | 'unavailable';

  /**
   * Check whether the provider backend is operational and passes health checks.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Acquire a fresh, disposable workspace with strict isolation boundaries.
   */
  createWorkspace(options?: WorkspaceProvisionOptions): Promise<IDisposableWorkspace>;
}

/**
 * Fail-closed default execution provider.
 * When no qualified isolation backend (Firecracker/gVisor/Fargate) is configured,
 * this provider explicitly reports unavailable and refuses workspace creation.
 * It deliberately does NOT wrap host child processes.
 */
export class UnavailableExecutionProvider implements IExecutionProvider {
  readonly name = 'unavailable-execution-provider';
  readonly type = 'unavailable' as const;

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async createWorkspace(_options?: WorkspaceProvisionOptions): Promise<IDisposableWorkspace> {
    void _options;
    throw new IsolationProviderUnavailableError(
      'No verified isolated execution provider is configured. ' +
      'Local child-process execution carries NO isolation and is refused for untrusted repositories. ' +
      'Execution is disabled until a qualified isolation provider is configured.',
    );
  }
}

/* ========================================================================= */
/* Phase 5 — Execution Provider Contract & Signed Job Architecture           */
/* ========================================================================= */

/**
 * Cryptographically signed execution job created by the authenticated application host.
 */
export interface ExecutionJob {
  jobId: string;
  tenantId: string;
  repoId: string;
  repoFullName: string;
  sourceLocation: string;
  changeId: string;
  patchDiff?: string;
  commands: WorkspaceCommand[];
  networkPolicy?: IsolationNetworkPolicy;
  limits?: Partial<IsolationResourceLimits>;
  nonce: string;
  expiresAt: number; // Unix timestamp ms
  signature: string; // HMAC-SHA256 signature
}

export interface JobSubmissionResult {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'rejected' | 'cancelled';
  acceptedAt: string;
  reason?: string;
}

export interface ExecutionJobStatus {
  jobId: string;
  tenantId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  exitCode?: number;
  error?: string;
}

export interface ExecutionArtifacts {
  jobId: string;
  tenantId: string;
  stdout: string;
  stderr: string;
  artifactHashes: Record<string, string>;
  producedAt: string;
  signature: string;
}

/**
 * Provider interface contract required by Phase 5.
 */
export interface IExecutionJobProvider {
  readonly name: string;
  submitJob(job: ExecutionJob): Promise<JobSubmissionResult>;
  getJobStatus(jobId: string): Promise<ExecutionJobStatus | null>;
  cancelJob(jobId: string): Promise<boolean>;
  collectArtifacts(jobId: string): Promise<ExecutionArtifacts | null>;
  cleanupJob(jobId: string): Promise<void>;
}

/**
 * Constructs an HMAC-SHA256 digest signature over immutable job fields.
 */
export function createJobSignature(
  job: Omit<ExecutionJob, 'signature'>,
  signingSecret: string,
): string {
  const commandsDigest = crypto
    .createHash('sha256')
    .update(JSON.stringify(job.commands ?? []))
    .digest('hex');
  const patchDigest = crypto
    .createHash('sha256')
    .update(job.patchDiff ?? '')
    .digest('hex');
  const payload = [
    job.jobId,
    job.tenantId,
    job.repoId,
    job.sourceLocation,
    job.changeId,
    commandsDigest,
    patchDigest,
    job.nonce,
    job.expiresAt.toString(),
  ].join(':');
  return crypto.createHmac('sha256', signingSecret).update(payload).digest('hex');
}

/**
 * Verifies job signature authenticity and expiration timestamp.
 */
export function verifyJobSignature(
  job: ExecutionJob,
  signingSecret: string,
): { valid: boolean; reason?: string } {
  if (!job.signature || typeof job.signature !== 'string') {
    return { valid: false, reason: 'missing_signature' };
  }
  if (!signingSecret || signingSecret.trim() === '') {
    return { valid: false, reason: 'missing_signing_secret' };
  }
  if (Date.now() > job.expiresAt) {
    return { valid: false, reason: 'expired_job' };
  }
  const expected = createJobSignature(job, signingSecret);
  const sigBuf = Buffer.from(job.signature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, reason: 'invalid_signature' };
  }
  return { valid: true };
}

/**
 * Signs execution output artifacts to guarantee integrity back to the application.
 */
export function createArtifactsSignature(
  artifacts: Omit<ExecutionArtifacts, 'signature'>,
  signingSecret: string,
): string {
  const hashKeys = Object.keys(artifacts.artifactHashes).sort().join(',');
  const payload = [
    artifacts.jobId,
    artifacts.tenantId,
    artifacts.producedAt,
    hashKeys,
    crypto.createHash('sha256').update(artifacts.stdout).digest('hex'),
  ].join(':');
  return crypto.createHmac('sha256', signingSecret).update(payload).digest('hex');
}

export function verifyArtifactsSignature(
  artifacts: ExecutionArtifacts,
  signingSecret: string,
): boolean {
  if (!artifacts.signature || !signingSecret) return false;
  const expected = createArtifactsSignature(artifacts, signingSecret);
  const sigBuf = Buffer.from(artifacts.signature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return false;
  }
  return true;
}

export interface INonceStore {
  has(nonce: string): Promise<boolean> | boolean;
  add(nonce: string): Promise<void> | void;
}

export interface LocalTrustedFixtureProviderOptions {
  fixtureRootDir?: string;
  defaultTimeoutMs?: number;
  nonceStore?: INonceStore | Set<string>;
}

/**
 * Local Trusted-Fixture Provider.
 * Enforces cryptographic job signatures, replay prevention, fixture allowlists,
 * and ephemeral scratch-space execution for local development and CI testing.
 */
export class LocalTrustedFixtureProvider implements IExecutionJobProvider {
  readonly name = 'local-trusted-fixture-provider';
  private signingSecret: string;
  private fixtureRootDir: string;
  private nonceStore: INonceStore | Set<string>;
  private jobs = new Map<
    string,
    {
      job: ExecutionJob;
      status: ExecutionJobStatus;
      artifacts?: ExecutionArtifacts;
      workDir?: string;
      activeChild?: ChildProcess;
      isCancelled?: boolean;
    }
  >();

  constructor(signingSecret: string, options?: LocalTrustedFixtureProviderOptions) {
    this.signingSecret = signingSecret;
    if (options?.fixtureRootDir) {
      this.fixtureRootDir = path.resolve(options.fixtureRootDir);
    } else {
      let curr = path.resolve(/*turbopackIgnore: true*/ process.cwd());
      for (let i = 0; i < 4; i++) {
        if (fs.existsSync(path.join(curr, 'fixtures'))) {
          break;
        }
        const parent = path.dirname(curr);
        if (parent === curr) break;
        curr = parent;
      }
      this.fixtureRootDir = curr;
    }
    this.nonceStore = options?.nonceStore ?? new Set<string>();
  }

  async submitJob(job: ExecutionJob): Promise<JobSubmissionResult> {
    const now = new Date().toISOString();

    // 1. Verify job signature and expiration
    const sigCheck = verifyJobSignature(job, this.signingSecret);
    if (!sigCheck.valid) {
      return {
        jobId: job.jobId,
        status: 'rejected',
        acceptedAt: now,
        reason: `Signature rejected: ${sigCheck.reason}`,
      };
    }

    // 2. Replay protection (duplicate nonce check)
    const isDuplicate = await this.nonceStore.has(job.nonce);
    if (isDuplicate) {
      return {
        jobId: job.jobId,
        status: 'rejected',
        acceptedAt: now,
        reason: 'Duplicate job delivery rejected (nonce already processed)',
      };
    }
    await this.nonceStore.add(job.nonce);

    // 3. Permitted fixture verification
    const permittedPath = resolvePermittedFixturePath(this.fixtureRootDir, job.sourceLocation);
    if (!permittedPath) {
      return {
        jobId: job.jobId,
        status: 'rejected',
        acceptedAt: now,
        reason: 'Unpermitted fixture location. Arbitrary repository execution is disallowed.',
      };
    }

    // 4. Command security validation (blocks Docker socket access, directory breakouts)
    for (const cmd of job.commands) {
      const fullCmd = [cmd.executable, ...cmd.args].join(' ');
      if (
        fullCmd.includes('/var/run/docker.sock') ||
        fullCmd.includes('docker_engine') ||
        fullCmd.includes('DOCKER_HOST')
      ) {
        return {
          jobId: job.jobId,
          status: 'rejected',
          acceptedAt: now,
          reason: 'Prohibited command: Docker socket access is forbidden.',
        };
      }
      if (cmd.cwd && (cmd.cwd.includes('..') || path.isAbsolute(cmd.cwd))) {
        return {
          jobId: job.jobId,
          status: 'rejected',
          acceptedAt: now,
          reason: 'Prohibited command: cwd cannot escape workspace boundary.',
        };
      }
    }

    // Initialize job state
    const jobState: ExecutionJobStatus = {
      jobId: job.jobId,
      tenantId: job.tenantId,
      status: 'running',
      startedAt: now,
    };

    const entry: {
      job: ExecutionJob;
      status: ExecutionJobStatus;
      artifacts?: ExecutionArtifacts;
      workDir?: string;
      activeChild?: ChildProcess;
      isCancelled: boolean;
    } = {
      job,
      status: jobState,
      artifacts: undefined,
      workDir: undefined,
      activeChild: undefined,
      isCancelled: false,
    };
    this.jobs.set(job.jobId, entry);

    // Execute in background / ephemeral workspace
    const timeoutMs = job.limits?.timeoutMs ?? 30_000;
    const runner = new IsolatedRunner({ maxExecutionTimeMs: timeoutMs });

    try {
      const workDir = runner.createIsolatedWorkspace(permittedPath);
      entry.workDir = workDir;

      // Apply patch if provided
      if (job.patchDiff) {
        const patchRes = runner.applyUnifiedDiff(workDir, job.patchDiff);
        if (!patchRes.success) {
          throw new Error(`Patch application failed: ${patchRes.error}`);
        }
      }

      // Execute commands
      let combinedStdout = '';
      let combinedStderr = '';
      let lastExitCode = 0;
      const startTime = Date.now();

      for (const cmd of job.commands) {
        if (entry.isCancelled) {
          throw new Error('Job was cancelled');
        }

        const effectiveTimeout = cmd.timeoutMs ?? timeoutMs;
        const cmdCwd = cmd.cwd ? path.resolve(workDir, cmd.cwd) : workDir;

        // Security check: confirm cmdCwd is inside workDir
        if (!cmdCwd.startsWith(workDir)) {
          throw new IsolationSecurityViolationError('Command execution directory escapes workspace boundary');
        }

        const execPromise = new Promise<{ exitCode: number; stdout: string; stderr: string; timedOut: boolean }>(
          (resolve) => {
            const sanitizedEnv = runner.getSanitizedEnv();
            // Network policy enforcement: if network is 'none', simulate isolated offline env
            if (job.networkPolicy === 'none') {
              sanitizedEnv.npm_config_offline = 'true';
              sanitizedEnv.npm_config_fetch_retry_mintimeout = '1';
              sanitizedEnv.npm_config_fetch_retries = '0';
            }

            const child = spawn(cmd.executable, cmd.args, {
              cwd: cmdCwd,
              env: sanitizedEnv,
              stdio: ['ignore', 'pipe', 'pipe'],
            });
            entry.activeChild = child;

            let stdout = '';
            let stderr = '';
            let timedOut = false;

            const timer = setTimeout(() => {
              timedOut = true;
              terminateProcessTree(child);
            }, effectiveTimeout);

            child.stdout?.on('data', (d: Buffer) => {
              stdout += d.toString();
            });
            child.stderr?.on('data', (d: Buffer) => {
              stderr += d.toString();
            });

            child.on('close', (code) => {
              clearTimeout(timer);
              entry.activeChild = undefined;
              resolve({
                exitCode: timedOut ? 124 : (code ?? 1),
                stdout,
                stderr,
                timedOut,
              });
            });

            child.on('error', (err) => {
              clearTimeout(timer);
              entry.activeChild = undefined;
              resolve({
                exitCode: 1,
                stdout,
                stderr: stderr + `\nProcess spawn error: ${err.message}`,
                timedOut: false,
              });
            });
          },
        );

        const res = await execPromise;
        combinedStdout += res.stdout;
        combinedStderr += res.stderr;
        lastExitCode = res.exitCode;

        if (res.timedOut) {
          throw new IsolationResourceExceededError(`Execution timed out after ${effectiveTimeout}ms`);
        }
        if (res.exitCode !== 0) {
          break;
        }
      }

      const durationMs = Date.now() - startTime;
      jobState.status = lastExitCode === 0 ? 'completed' : 'failed';
      jobState.completedAt = new Date().toISOString();
      jobState.durationMs = durationMs;
      jobState.exitCode = lastExitCode;

      // Compute SHA-256 artifact hashes
      const artifactHashes: Record<string, string> = {};
      const realWorkDir = fs.realpathSync(workDir);
      const collectHashes = (dir: string) => {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
          const fullPath = path.join(dir, file.name);
          try {
            const realPath = fs.realpathSync(fullPath);
            if (!realPath.startsWith(realWorkDir + path.sep) && realPath !== realWorkDir) {
              // Ignore files/symlinks escaping workspace boundary
              continue;
            }
          } catch {
            continue;
          }
          if (file.isDirectory()) {
            if (file.name !== 'node_modules' && !file.name.startsWith('.')) {
              collectHashes(fullPath);
            }
          } else if (file.isFile()) {
            const rel = path.relative(workDir, fullPath).replace(/\\/g, '/');
            const hash = crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');
            artifactHashes[rel] = hash;
          }
        }
      };
      collectHashes(workDir);

      const artifactsPayload = {
        jobId: job.jobId,
        tenantId: job.tenantId,
        stdout: combinedStdout,
        stderr: combinedStderr,
        artifactHashes,
        producedAt: new Date().toISOString(),
      };

      entry.artifacts = {
        ...artifactsPayload,
        signature: createArtifactsSignature(artifactsPayload, this.signingSecret),
      };

      return {
        jobId: job.jobId,
        status: jobState.status,
        acceptedAt: now,
      };
    } catch (err) {
      jobState.status = entry.isCancelled ? 'cancelled' : 'failed';
      jobState.completedAt = new Date().toISOString();
      jobState.error = err instanceof Error ? err.message : String(err);
      return {
        jobId: job.jobId,
        status: jobState.status,
        acceptedAt: now,
        reason: jobState.error,
      };
    } finally {
      // Ensure workspace cleanup
      if (entry.workDir) {
        runner.cleanupWorkspace(entry.workDir);
        entry.workDir = undefined;
      }
    }
  }

  async getJobStatus(jobId: string): Promise<ExecutionJobStatus | null> {
    const entry = this.jobs.get(jobId);
    return entry ? { ...entry.status } : null;
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const entry = this.jobs.get(jobId);
    if (!entry) return false;
    entry.isCancelled = true;
    if (entry.activeChild) {
      terminateProcessTree(entry.activeChild);
    }
    entry.status.status = 'cancelled';
    entry.status.completedAt = new Date().toISOString();
    return true;
  }

  async collectArtifacts(jobId: string): Promise<ExecutionArtifacts | null> {
    const entry = this.jobs.get(jobId);
    return entry?.artifacts ? { ...entry.artifacts } : null;
  }

  async cleanupJob(jobId: string): Promise<void> {
    const entry = this.jobs.get(jobId);
    if (entry && entry.workDir) {
      const runner = new IsolatedRunner();
      runner.cleanupWorkspace(entry.workDir);
      entry.workDir = undefined;
    }
    this.jobs.delete(jobId);
  }
}

/**
 * Production Isolated Execution Provider.
 * Delegates signed execution jobs to a remote microVM / isolated container cluster
 * (e.g. AWS Fargate, Fly Machines, Firecracker).
 *
 * FAILS CLOSED if no remote execution endpoint is qualified, ensuring customer
 * code is NEVER executed on the application server.
 */
export class ProductionIsolatedExecutionProvider implements IExecutionJobProvider {
  readonly name = 'production-isolated-execution-provider';
  private remoteWorkerUrl?: string;
  private workerAuthToken?: string;
  private signingSecret: string;

  constructor(signingSecret: string, remoteWorkerUrl?: string, workerAuthToken?: string) {
    this.signingSecret = signingSecret;
    this.remoteWorkerUrl = remoteWorkerUrl;
    this.workerAuthToken = workerAuthToken;
  }

  async submitJob(job: ExecutionJob): Promise<JobSubmissionResult> {
    if (!this.remoteWorkerUrl) {
      return {
        jobId: job.jobId,
        status: 'rejected',
        acceptedAt: new Date().toISOString(),
        reason:
          'Fail-Closed: Production remote worker endpoint is not configured. ' +
          'Untrusted repository execution is strictly disabled on the application host.',
      };
    }

    // Verify signature before forwarding
    const sigCheck = verifyJobSignature(job, this.signingSecret);
    if (!sigCheck.valid) {
      return {
        jobId: job.jobId,
        status: 'rejected',
        acceptedAt: new Date().toISOString(),
        reason: `Signature rejected: ${sigCheck.reason}`,
      };
    }

    try {
      const res = await fetch(`${this.remoteWorkerUrl}/v1/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.workerAuthToken ?? ''}`,
        },
        body: JSON.stringify(job),
      });

      if (!res.ok) {
        const text = await res.text();
        return {
          jobId: job.jobId,
          status: 'rejected',
          acceptedAt: new Date().toISOString(),
          reason: `Remote worker returned ${res.status}: ${text}`,
        };
      }

      return (await res.json()) as JobSubmissionResult;
    } catch (err) {
      return {
        jobId: job.jobId,
        status: 'failed',
        acceptedAt: new Date().toISOString(),
        reason: `Failed to dispatch job to isolated worker: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async getJobStatus(jobId: string): Promise<ExecutionJobStatus | null> {
    if (!this.remoteWorkerUrl) return null;
    try {
      const res = await fetch(`${this.remoteWorkerUrl}/v1/jobs/${encodeURIComponent(jobId)}`, {
        headers: { Authorization: `Bearer ${this.workerAuthToken ?? ''}` },
      });
      if (!res.ok) return null;
      return (await res.json()) as ExecutionJobStatus;
    } catch {
      return null;
    }
  }

  async cancelJob(jobId: string): Promise<boolean> {
    if (!this.remoteWorkerUrl) return false;
    try {
      const res = await fetch(`${this.remoteWorkerUrl}/v1/jobs/${encodeURIComponent(jobId)}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.workerAuthToken ?? ''}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async collectArtifacts(jobId: string): Promise<ExecutionArtifacts | null> {
    if (!this.remoteWorkerUrl) return null;
    try {
      const res = await fetch(`${this.remoteWorkerUrl}/v1/jobs/${encodeURIComponent(jobId)}/artifacts`, {
        headers: { Authorization: `Bearer ${this.workerAuthToken ?? ''}` },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as ExecutionArtifacts;
      // Verify signature on collected artifacts
      if (!verifyArtifactsSignature(data, this.signingSecret)) {
        throw new Error('Collected artifacts signature is invalid or tampered');
      }
      return data;
    } catch {
      return null;
    }
  }

  async cleanupJob(jobId: string): Promise<void> {
    if (!this.remoteWorkerUrl) return;
    try {
      await fetch(`${this.remoteWorkerUrl}/v1/jobs/${encodeURIComponent(jobId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.workerAuthToken ?? ''}` },
      });
    } catch { /* ignore */ }
  }
}
