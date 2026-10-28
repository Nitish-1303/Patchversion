import { EngineConfig, loadConfig } from './config';
import { StateStore } from './state/store';
import { NpmWatcher } from './watcher/npm-watcher';
import { ContractProber } from './probes/contract-probe';
import { UsageMapper } from './usage-map/mapper';
import { analyzeImpact } from './break-detector/impact-analyzer';
import { SandboxRunner } from './sandbox/runner';
import { FixGenerator } from './fix-generator/generator';
import { PRBot } from './pr-bot/bot';
import { resolveTrustedFixture } from './fixture-admission';
import { ChangeRecord, WatchTarget, PreparedPR, ProveResult } from '@patchversion/shared';

/**
 * Patchversion Engine: the core orchestrator.
 *
 * Pipeline: WATCH -> DETECT -> MAP -> ANALYZE -> PROVE -> PR
 *
 * Every stage has a real path and an offline fallback.
 * Silence by default: no PR unless verified fix or verified unfixable break.
 */
export class PatchversionEngine {
  private config: EngineConfig;
  private store: StateStore;
  private watcher: NpmWatcher;
  private prober: ContractProber;
  private mapper: UsageMapper;
  private sandbox: SandboxRunner;
  private fixGen: FixGenerator;
  private prBot: PRBot;
  private lastProveResult: ProveResult | null = null;

  constructor(configOverrides?: Partial<EngineConfig>) {
    this.config = loadConfig(configOverrides);
    this.store = new StateStore(this.config.stateDir);
    this.watcher = new NpmWatcher(this.store, this.config.watcherIntervalMs);
    this.prober = new ContractProber(this.store, this.config.probeIntervalMs);
    this.mapper = new UsageMapper();
    this.sandbox = new SandboxRunner(this.config);
    this.fixGen = new FixGenerator(this.config.anthropicApiKey);
    this.prBot = new PRBot(this.store);
  }

  /** Start the watcher and prober schedulers. */
  start(): void {
    this.watcher.start();
    this.prober.start();
    this.store.logEvent('engine_started', { mode: this.config.sandboxMode });
  }

  stop(): void {
    this.watcher.stop();
    this.prober.stop();
    this.store.logEvent('engine_stopped', {});
  }

  /** Add a package to watch. */
  addWatchTarget(target: WatchTarget): void {
    this.store.saveWatchTarget(target);
  }

  /**
   * Run the full pipeline for a single detected change against a repo.
   * This is the core loop: DETECT -> MAP -> ANALYZE -> FIX -> PROVE -> PR.
   *
   * Returns a PreparedPR if the fix is verified, null otherwise.
   */
  async processChange(change: ChangeRecord, repoPath: string, repoId: string): Promise<PreparedPR | null> {
    // Fail-closed admission gate: with no verified isolated sandbox, only
    // the bundled trusted fixture trees may execute. Anything else - in
    // particular customer repositories - is blocked and logged.
    if (!this.isRepoExecutionAllowed(repoPath)) {
      this.store.logEvent('execution_blocked', {
        changeId: change.id,
        repoId,
        repoPath,
        reason: 'unisolated local execution refused: repo is not a trusted fixture',
      });
      return null;
    }

    // Step 1: Map usage of the changed package in this repo
    const usageMap = this.mapper.mapPackageUsage(repoPath, change.packageName, repoId);
    this.store.saveUsageMap(usageMap);

    if (usageMap.callSites.length === 0) {
      this.store.logEvent('no_usage_found', { changeId: change.id, repoId });
      return null; // No usage = no impact = silence
    }

    // Step 2: Analyze impact
    const impact = analyzeImpact(change, usageMap);
    this.store.saveImpact(impact);

    if (impact.affectedCallSites.length === 0) {
      this.store.logEvent('no_impact', { changeId: change.id, repoId });
      return null; // No affected call sites = silence
    }

    // Step 3: Generate fix
    const fixDiff = await this.fixGen.generateFix(repoPath, change, impact);
    if (!fixDiff) {
      // No automatic fix is available. Keep this local prototype honest by
      // recording the limitation without presenting a prepared issue as sent.
      this.store.logEvent('unfixable', { changeId: change.id, repoId });
      return null;
    }

    // Step 4: Sandbox proof
    const startMs = Date.now();
    const result = await this.sandbox.proveLoop(repoPath, change, impact, fixDiff);
    const durationMs = Date.now() - startMs;
    this.lastProveResult = result;

    if (result.outcome === 'no-break' && result.proof) {
      // Suite stayed green on the new version with no fix. Record the
      // evidence for the public dataset, but open nothing.
      result.proof.durationMs = durationMs;
      this.store.saveProof(result.proof);
      this.store.logEvent('no_break_confirmed', { changeId: change.id, repoId });
      return null;
    }

    if (result.outcome !== 'fixed' || !result.proof) {
      // unfixable / inconclusive: refuse to produce a PR
      this.store.logEvent(
        result.outcome === 'unfixable' ? 'proof_failed' : 'proof_inconclusive',
        { changeId: change.id, repoId, reason: result.reason },
      );
      return null;
    }

    result.proof.durationMs = durationMs;
    this.store.saveProof(result.proof);

    // Step 5: Prepare PR
    const pr = this.prBot.preparePR(change, impact, result.proof);
    return pr;
  }

  /** Whether this repo may execute under the current sandbox policy. */
  private isRepoExecutionAllowed(repoPath: string): boolean {
    if (!this.config.requireIsolation) return true;
    if (this.config.sandboxMode !== 'local') return true; // non-local modes carry their own gates
    return resolveTrustedFixture(repoPath, this.config.trustedFixtureDirs) !== null;
  }

  /** Outcome of the most recent proveLoop, for callers (e.g. prove.ts). */
  getLastProveResult(): ProveResult | null {
    return this.lastProveResult;
  }

  /**
   * Manual trigger: check all watched packages and process any changes.
   */
  async checkAndProcess(repoPath: string, repoId: string): Promise<PreparedPR[]> {
    const changes = await this.watcher.pollAll();
    const prs: PreparedPR[] = [];

    for (const change of changes) {
      if (change.classification.isBreaking) {
        const pr = await this.processChange(change, repoPath, repoId);
        if (pr) prs.push(pr);
      }
    }

    return prs;
  }

  /** Get the failure rate stats. */
  getFailureRate() {
    return this.store.getFailureRate();
  }

  /** Get the state store (for external access to proofs, changes, etc.). */
  getStore(): StateStore {
    return this.store;
  }
}
