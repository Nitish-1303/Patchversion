// Core domain types for trypatchbay

/** A normalized record of a detected change in a tracked package or API. */
export interface ChangeRecord {
  id: string;
  packageName: string;
  ecosystem: 'npm' | 'pypi' | 'remote-api';
  fromVersion: string;
  toVersion: string;
  detectedAt: string; // ISO 8601
  source: 'registry' | 'changelog' | 'live-probe' | 'spec-diff';
  sourceUrl: string;
  rawNotes: string;
  classification: ChangeClassification;
  severity: 'breaking' | 'feature' | 'fix' | 'deprecation' | 'unknown';
  /**
   * Offline fallback: maps a version to an installable package location
   * (path relative to the tested repo's root, e.g. a vendored directory).
   * When present, the sandbox installs from that path instead of a registry.
   */
  offlineVersions?: Record<string, string>;
}

export interface ChangeClassification {
  isBreaking: boolean;
  confidence: number; // 0-1
  affectedEndpoints?: string[];
  affectedExports?: string[];
  reason: string;
}

/** A single call site in a repo that touches a tracked dependency. */
export interface CallSite {
  filePath: string;
  line: number;
  column: number;
  importStatement: string;
  callExpression: string;
  packageName: string;
  exportedSymbol: string;
}

/** The full usage map for one repo against one package. */
export interface UsageMap {
  repoId: string;
  packageName: string;
  mappedAt: string; // ISO 8601
  callSites: CallSite[];
  totalFiles: number;
  filesWithUsage: number;
}

/** Result of intersecting a change with a usage map. */
export interface ImpactAnalysis {
  changeId: string;
  repoId: string;
  affectedCallSites: CallSite[];
  unaffectedCallSites: CallSite[];
  /**
   * Sites that use the package but do not intersect the specific change.
   * Flagged only by the broad breaking-change fallback; listed in PRs as
   * not individually verified.
   */
  potentialCallSites?: CallSite[];
  coveragePercent: number;
  sourceAnalysisPerformed?: boolean;
  analysisMode?: 'local-ast' | 'remote-manifest-only' | 'remote-ast';
  analyzedAt: string;
}

/** Proof artifact from the sandbox red-to-green loop. */
export interface ProofArtifact {
  id: string;
  changeId: string;
  repoId: string;
  /** Test result on the original version, before any bump. */
  baselineResult: TestResult;
  redResult: TestResult;
  greenResult: TestResult;
  fixDiff: string;
  /** Files the applied fix actually changed. */
  fixedFiles: string[];
  coverageVerified: number; // N of M call sites verified
  coverageTotal: number;    // M total call sites
  unverifiable: UnverifiableSite[];
  producedAt: string;
  sandboxType: 'docker-isolated' | 'local-process';
  durationMs: number;
  executionProvenance?: 'fixture-verified' | 'executed' | 'not-executed';
}

export interface TestResult {
  passed: number;
  failed: number;
  total: number;
  output: string;
  exitCode: number;
}

export interface UnverifiableSite {
  callSite: CallSite;
  reason: string;
}

/** A PR prepared by the bot. */
export interface PreparedPR {
  title: string;
  body: string;
  branch: string;
  proofArtifact: ProofArtifact;
  change: ChangeRecord;
  impact: ImpactAnalysis;
}

/** Watcher state for one tracked package. */
export interface WatchTarget {
  packageName: string;
  ecosystem: 'npm' | 'pypi' | 'remote-api';
  lastCheckedAt: string | null;
  lastKnownVersion: string | null;
  baselineSchema?: Record<string, unknown>;
  endpointBaselines?: EndpointBaseline[];
}

export interface EndpointBaseline {
  endpoint: string;
  method: string;
  responseSchema: Record<string, unknown>;
  statusCode: number;
  capturedAt: string;
}

/** Drift detected by a live probe. */
export interface ProbeDrift {
  endpoint: string;
  field: string;
  expectedType: string;
  actualType: string;
  expectedValue?: unknown;
  actualValue?: unknown;
  detectedAt: string;
}

/** Milestone status tracker. */
export interface MilestoneStatus {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'done' | 'blocked';
  ciGreen: boolean;
  doneDefinition: string;
  notes: string;
}


/**
 * Outcome of one sandbox proof attempt.
 *
 * - fixed: the fix turned the suite green on the new version; proof attached.
 * - no-break: the suite stayed green on the new version without any fix;
 *   proof attached for the record, but no fix PR should be opened.
 * - unfixable: the change is real (suite went red) but the fix did not
 *   verify; refuse any success claim or PR.
 * - inconclusive: nothing can be claimed - baseline failing, no usable
 *   tests, version bump/install failed, or the patch could not be applied.
 */
export type ProveOutcome = 'fixed' | 'no-break' | 'unfixable' | 'inconclusive';

/** Result of the sandbox red-to-green loop. Null proof means no artifact. */
export interface ProveResult {
  outcome: ProveOutcome;
  proof: ProofArtifact | null;
  /** Human-readable reason, set for unfixable and inconclusive outcomes. */
  reason?: string;
}


// Tenancy and Authentication
export interface Tenant {
  id: string;
  name: string;
  createdAt: string;
}

export type UserRole = 'owner' | 'admin' | 'member' | 'reviewer';

export interface User {
  id: string;
  tenantId: string;
  email: string;
  passwordHash?: string;
  githubUserId?: string;
  githubLogin?: string;
  role: UserRole;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  tenantId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

// GitHub Installation and Repository
export interface InstallationRecord {
  id: string;
  tenantId: string;
  githubInstallationId: number;
  accountLogin: string;
  accountType: 'User' | 'Organization';
  status: 'active' | 'suspended' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

export interface RepositoryRecord {
  id: string;
  tenantId: string;
  installationId: string;
  githubRepoId: number;
  fullName: string;
  owner: string;
  name: string;
  defaultBranch: string;
  isPrivate: boolean;
  status: 'connected' | 'disconnected' | 'revoked';
  localPath?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Durable Jobs
export type JobType = 'scan_dependencies' | 'analyze_impact' | 'prove_fix' | 'deliver_pr';
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface JobRecord<TPayload = unknown, TResult = unknown> {
  id: string;
  tenantId: string;
  repositoryId: string;
  type: JobType;
  status: JobStatus;
  payload: TPayload;
  result?: TResult;
  error?: string;
  attempts: number;
  maxAttempts: number;
  runAfter: string;
  lockedAt?: string;
  lockedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Findings and Candidate Patches
export interface FindingRecord {
  id: string;
  tenantId: string;
  repositoryId: string;
  packageName: string;
  fromVersion: string;
  toVersion: string;
  isBreaking: boolean;
  changeRecord: ChangeRecord;
  impactAnalysis: ImpactAnalysis;
  status: 'open' | 'fixing' | 'validated' | 'approved' | 'pr_created' | 'dismissed';
  sourceAnalysisPerformed?: boolean;
  analysisMode?: 'local-ast' | 'remote-manifest-only' | 'remote-ast';
  createdAt: string;
}

export interface PatchRecord {
  id: string;
  tenantId: string;
  findingId: string;
  diffContent: string;
  diffHash: string; // SHA-256 of normalized diff
  lockfileUpdates?: string;
  status: 'generated' | 'validated' | 'rejected';
  createdAt: string;
}

export interface ValidationRecord {
  id: string;
  tenantId: string;
  patchId: string;
  status: 'passed' | 'failed' | 'inconclusive';
  executionProvenance?: 'fixture-verified' | 'executed' | 'not-executed';
  proof?: ProofArtifact;
  executionLogs: string;
  durationMs: number;
  createdAt: string;
}

export interface ApprovalRecord {
  id: string;
  tenantId: string;
  patchId: string;
  approvedByUserId: string;
  diffHashAtApproval: string;
  status: 'active' | 'invalidated' | 'used';
  approvedAt: string;
  invalidatedAt?: string;
  invalidationReason?: string;
}

export interface PullRequestRecord {
  id: string;
  tenantId: string;
  repositoryId: string;
  findingId: string;
  patchId: string;
  approvalId: string;
  githubPrNumber: number;
  githubPrUrl: string;
  branchName: string;
  commitSha: string;
  status: 'open' | 'merged' | 'closed';
  isDraft?: boolean;
  isSimulation?: boolean;
  deliveryBlockedReason?: string;
  createdAt: string;
  updatedAt: string;
}


export interface WatchTargetRecord {
  id: string;
  tenantId: string;
  packageName: string;
  ecosystem: 'npm' | 'pypi' | 'remote-api';
  currentVersion: string;
  latestVersion: string;
  lastCheckedAt: string;
  status: 'up_to_date' | 'upgrade_available' | 'error';
  isDemo?: boolean;
  notes?: string;
  lastError?: string;
  source: 'registry' | 'fixture-demo' | 'manual';
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDeliveryRecord {
  id: string;
  deliveryId: string;
  event: string;
  signature: string;
  processedAt: string;
  status: 'processed' | 'ignored' | 'failed';
}
export interface InstallationOnboardingState {
  id: string;
  token: string;
  tenantId: string;
  userId: string;
  targetAccount?: string;
  status: 'pending' | 'completed' | 'expired';
  createdAt: string;
  expiresAt: string;
  completedAt?: string;
  installationId?: number;
}

export interface DeliveryClaimRecord {
  id: string;
  tenantId: string;
  patchId: string;
  workerId: string;
  claimedAt: string;
  expiresAt: string;
  status: 'active' | 'released' | 'completed';
}

// Repository Scanning and Dependency Mapping Domain Types
export type PackageManagerType = 'npm' | 'pnpm' | 'yarn' | 'unknown';
export type ProjectStructureType =
  | 'single-package'
  | 'npm-workspace'
  | 'pnpm-workspace'
  | 'yarn-workspace'
  | 'lerna'
  | 'nested-packages';
export type FrameworkRole = 'framework' | 'build-tool' | 'testing' | 'utility' | 'runtime' | 'dev';
export type DependencyType = 'direct-prod' | 'direct-dev' | 'direct-peer' | 'direct-optional' | 'transitive';

export interface ManifestRecord {
  path: string;
  name: string;
  version: string;
  isRoot: boolean;
  workspaceName?: string;
  packageManager?: PackageManagerType;
  dependenciesCount: number;
}

export interface LockfileRecord {
  type: 'package-lock' | 'pnpm-lock' | 'yarn-lock';
  path: string;
  formatVersion: string;
  entriesCount: number;
}

export interface DependencySourceLocation {
  filePath: string;
  line: number;
  column: number;
  symbol?: string;
  callExpression?: string;
}

export interface DependencyConcern {
  type:
    | 'upgrade_available'
    | 'breaking_change'
    | 'duplicate_version'
    | 'unsupported_specifier'
    | 'incompatible_range'
    | 'deprecated_pattern';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  evidence: string;
}

export interface MappedDependency {
  id: string;
  name: string;
  declaredVersion: string;
  resolvedVersion?: string;
  type: DependencyType;
  packageManager: PackageManagerType;
  manifestPath: string;
  workspaceName?: string;
  frameworkRole?: FrameworkRole;
  importingFiles: DependencySourceLocation[];
  directDependents: string[];
  transitiveDependencies: string[];
  concerns: DependencyConcern[];
  evidence: {
    source: 'manifest' | 'lockfile' | 'ast-import';
    detail: string;
    confidence?: number;
  };
}

export interface DependencyGraphNode {
  id: string;
  name: string;
  version: string;
  type: 'package' | 'source-file' | 'workspace';
  direct: boolean;
  role?: FrameworkRole;
}

export interface DependencyGraphEdge {
  source: string;
  target: string;
  relation: 'imports' | 'depends_on' | 'declared_in' | 'workspace_child';
}

export interface DependencyGraph {
  nodes: DependencyGraphNode[];
  edges: DependencyGraphEdge[];
}

export interface ScanProvenance {
  repositoryFullName: string;
  repositoryId: string;
  branch: string;
  commitSha: string;
  scannedAt: string;
  scannerVersion: string;
  filesInspected: number;
  filesSkipped: Array<{ path: string; reason: string }>;
  limitsReached: boolean;
  warnings: string[];
  astAnalysisStatus: 'complete' | 'manifest-only' | 'partial';
}

export interface RepositoryScanResult {
  repositoryId: string;
  tenantId: string;
  scannedAt: string;
  projectType: ProjectStructureType;
  packageManager: PackageManagerType;
  manifests: ManifestRecord[];
  lockfiles: LockfileRecord[];
  frameworks: Array<{ name: string; version?: string; role: FrameworkRole }>;
  totalDependencies: number;
  directCount: number;
  transitiveCount: number;
  dependencies: MappedDependency[];
  graph: DependencyGraph;
  warnings: string[];
  unsupportedFeatures: string[];
  findings: FindingRecord[];
  provenance: ScanProvenance;
}

