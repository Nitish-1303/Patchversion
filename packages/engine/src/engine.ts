import { EngineConfig, loadConfig } from './config';
import { StateStore } from './state/store';
import { NpmWatcher } from './watcher/npm-watcher';
import { ContractProber } from './probes/contract-probe';
import { UsageMapper } from './usage-map/mapper';
import { analyzeImpact } from './break-detector/impact-analyzer';
import { SandboxRunner } from './sandbox/runner';
import { FixGenerator } from './fix-generator/generator';
import { PRBot } from './pr-bot/bot';
import { ChangeRecord, WatchTarget, ProofArtifact, PreparedPR } from '@patchversion/shared';

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
      // Can't generate a fix - prepare honest "needs human" issue
      const issue = this.prBot.prepareUnfixableIssue(
        change,
        impact,
        'No automatic fix could be generated for this breaking change.',
      );
      this.store.logEvent('unfixable', { changeId: change.id, repoId });
      return null;
    }

    // Step 4: Sandbox proof
    const startMs = Date.now();
    const proof = await this.sandbox.proveLoop(repoPath, change, impact, fixDiff);
    const durationMs = Date.now() - startMs;

    if (!proof) {
      // Fix did not verify - refuse to produce a PR
      this.store.logEvent('proof_failed', { changeId: change.id, repoId });
      return null;
    }

    proof.durationMs = durationMs;
    this.store.saveProof(proof);

    // Step 5: Prepare PR
    const pr = this.prBot.preparePR(change, impact, proof);
    return pr;
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
