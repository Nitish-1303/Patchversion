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
