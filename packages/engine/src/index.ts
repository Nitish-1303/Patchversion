export { PatchversionEngine } from './engine';
export { WebhookReceiver } from './webhook-receiver';
export { type EngineConfig, loadConfig } from './config';
export { StateStore } from './state/store';
export { NpmWatcher } from './watcher/npm-watcher';
export {
  type IProviderAdapter,
  ProviderRegistry,
  NpmProviderAdapter,
  StripeApiProviderAdapter,
} from './watcher/provider-adapter';
export { ContractProber } from './probes/contract-probe';
export { UsageMapper } from './usage-map/mapper';
export { analyzeImpact } from './break-detector/impact-analyzer';
export { classifyChange } from './break-detector/classifier';
export { SandboxRunner } from './sandbox/runner';
export { FixGenerator } from './fix-generator/generator';
export { PRBot } from './pr-bot/bot';
export { PatchversionDatabase } from './db/database';
export { PostgresStore } from './db/postgres-store';
export type { IPersistenceStore } from './db/store-interface';
export { migrateJsonToPostgres } from './db/migrator';
export { GitHubClient } from './github/client';
export {
  type GitHubTransport,
  NetworkGitHubTransport,
  OfflineMockTransport,
  UnhandledMockRequestError,
  GitHubAppNotConfiguredError,
  RepositoryTreeTruncatedError,
  type MockHandler,
} from './github/transport';
export { IsolatedRunner } from './sandbox/isolated-runner';
export {
  type IExecutionProvider,
  type IDisposableWorkspace,
  type WorkspaceProvisionOptions,
  type WorkspaceRepositoryInput,
  type WorkspaceDependencyInput,
  type WorkspaceCommand,
  type WorkspaceExecutionResult,
  type IsolationResourceLimits,
  type IsolationNetworkPolicy,
  type IsolationEnvironment,
  DEFAULT_ISOLATION_LIMITS,
  DEFAULT_SECRET_EXCLUSION_PATTERNS,
  IsolationProviderUnavailableError,
  IsolationSecurityViolationError,
  IsolationResourceExceededError,
  UnavailableExecutionProvider,
} from './sandbox/execution-provider';
export { WorkflowOrchestrator } from './jobs/orchestrator';
export {
  EvidenceBundleManager,
  type EvidenceManifest,
  type EvidenceArtifactChecksum,
  type BundleValidationResult,
} from './evidence/evidence-bundle';
export {
  ReadinessEvaluator,
  type ReadinessState,
  type ReadinessGateResult,
  type ReadinessReport,
  type ReadinessContext,
} from './readiness/readiness-evaluator';
export {
  RepositoryScanner,
  buildDependencyMap,
  detectFrameworks,
  classifyFrameworkRole,
  parsePackageLock,
  parseYarnLock,
  parsePnpmLock,
  parsePnpmWorkspace,
  assertSafePath,
  assertSafeSymlink,
  ScanBudget,
  ScannerSecurityError,
  DEFAULT_SCAN_LIMITS,
  createBundledDemoFileProvider,
  DEMO_REPO_FILES,
  type IRepositoryFileProvider,
  type ScannerOptions,
  type BuildDependencyMapOptions,
  type BuiltDependencyMapResult,
  type FrameworkDetection,
  type ParsedLockfile,
  type ParsedLockfilePackage,
} from './scanner';
export {
  MigrationRuleRegistry,
  defaultMigrationRegistry,
  LodashMethodRenameRule,
  MockpayPaymentMethodRule,
  type IMigrationRule,
  type MigrationPrecondition,
  type MigrationResult,
  type MigrationContext,
} from './migration';
