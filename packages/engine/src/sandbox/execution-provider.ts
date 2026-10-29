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
