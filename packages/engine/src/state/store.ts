import fs from 'fs';
import path from 'path';
import {
  ChangeRecord,
  WatchTarget,
  ProofArtifact,
  UsageMap,
  ImpactAnalysis,
  PreparedPR,
} from '@patchversion/shared';

/**
 * File-backed state store. Every detection, decision, proof, and failure
 * is recorded durably. This is the raw material for the public dataset
 * and failure-rate page (M10).
 */
export class StateStore {
  private stateDir: string;

  /** Make an arbitrary id safe for use as a file name. */
  private fileKey(id: string): string {
    return id.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  constructor(stateDir: string) {
    this.stateDir = stateDir;
    this.ensureDir(stateDir);
    this.ensureDir(path.join(stateDir, 'changes'));
    this.ensureDir(path.join(stateDir, 'proofs'));
    this.ensureDir(path.join(stateDir, 'usage-maps'));
    this.ensureDir(path.join(stateDir, 'impacts'));
    this.ensureDir(path.join(stateDir, 'prs'));
    this.ensureDir(path.join(stateDir, 'watch-targets'));
    this.ensureDir(path.join(stateDir, 'baselines'));
    this.ensureDir(path.join(stateDir, 'events'));
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /** Directory where endpoint baselines live (for the contract prober). */
  getBaselinesDir(): string {
    return path.join(this.stateDir, 'baselines');
  }

  /**
   * Atomic JSON write: tmp file + rename, so a crash mid-write never
   * leaves a truncated record behind.
   */
  private writeJson(file: string, value: unknown): void {
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
    fs.renameSync(tmp, file);
  }

  /**
   * Tolerant JSON read: a corrupt record returns null and is logged,
   * instead of crashing the engine with an opaque parse error.
   */
  private readJson<T>(file: string): T | null {
    if (!fs.existsSync(file)) return null;
    try {
      return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
    } catch (err) {
      this.logEvent('state_corrupt', {
        file: path.basename(file),
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  // --- Watch targets ---

  saveWatchTarget(target: WatchTarget): void {
    const file = path.join(this.stateDir, 'watch-targets', `${this.fileKey(target.packageName)}.json`);
    this.writeJson(file, target);
  }

  getWatchTarget(packageName: string): WatchTarget | null {
    const file = path.join(this.stateDir, 'watch-targets', `${this.fileKey(packageName)}.json`);
    return this.readJson<WatchTarget>(file);
  }

  listWatchTargets(): WatchTarget[] {
    const dir = path.join(this.stateDir, 'watch-targets');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => this.readJson<WatchTarget>(path.join(dir, f)))
      .filter((t): t is WatchTarget => t !== null);
  }

  // --- Change records ---

  saveChange(change: ChangeRecord): void {
    const file = path.join(this.stateDir, 'changes', `${this.fileKey(change.id)}.json`);
    this.writeJson(file, change);
    this.logEvent('change_detected', { changeId: change.id, packageName: change.packageName });
  }

  getChange(changeId: string): ChangeRecord | null {
    const file = path.join(this.stateDir, 'changes', `${this.fileKey(changeId)}.json`);
    return this.readJson<ChangeRecord>(file);
  }

  listChanges(limit = 100): ChangeRecord[] {
    const dir = path.join(this.stateDir, 'changes');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => this.readJson<ChangeRecord>(path.join(dir, f)))
      .filter((c): c is ChangeRecord => c !== null)
      .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
      .slice(0, limit);
  }

  // --- Usage maps ---

  saveUsageMap(map: UsageMap): void {
    const file = path.join(this.stateDir, 'usage-maps', `${this.fileKey(map.repoId)}--${this.fileKey(map.packageName)}.json`);
    this.writeJson(file, map);
  }

  getUsageMap(repoId: string, packageName: string): UsageMap | null {
    const file = path.join(this.stateDir, 'usage-maps', `${this.fileKey(repoId)}--${this.fileKey(packageName)}.json`);
    return this.readJson<UsageMap>(file);
  }

  // --- Impact analyses ---

  saveImpact(impact: ImpactAnalysis): void {
    const file = path.join(this.stateDir, 'impacts', `${this.fileKey(impact.changeId)}--${this.fileKey(impact.repoId)}.json`);
    this.writeJson(file, impact);
  }

  // --- Proof artifacts ---

  saveProof(proof: ProofArtifact): void {
    const file = path.join(this.stateDir, 'proofs', `${this.fileKey(proof.id)}.json`);
    this.writeJson(file, proof);
    this.logEvent('proof_produced', {
      proofId: proof.id,
      changeId: proof.changeId,
      verified: proof.coverageVerified,
      total: proof.coverageTotal,
    });
  }

  getProof(proofId: string): ProofArtifact | null {
    const file = path.join(this.stateDir, 'proofs', `${this.fileKey(proofId)}.json`);
    return this.readJson<ProofArtifact>(file);
  }

  listProofs(limit = 100): ProofArtifact[] {
    const dir = path.join(this.stateDir, 'proofs');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => this.readJson<ProofArtifact>(path.join(dir, f)))
      .filter((p): p is ProofArtifact => p !== null)
      .sort((a, b) => b.producedAt.localeCompare(a.producedAt))
      .slice(0, limit);
  }

  // --- Prepared PRs ---

  savePR(pr: PreparedPR): void {
    const file = path.join(this.stateDir, 'prs', `${this.fileKey(pr.proofArtifact.id)}.json`);
    this.writeJson(file, pr);
    this.logEvent('pr_prepared', { changeId: pr.change.id, proofId: pr.proofArtifact.id });
  }

  // --- Event log (append-only) ---

  logEvent(type: string, data: Record<string, unknown>): void {
    const today = new Date().toISOString().slice(0, 10);
    const file = path.join(this.stateDir, 'events', `${today}.jsonl`);
    const entry = JSON.stringify({ type, data, ts: new Date().toISOString() }) + '\n';
    fs.appendFileSync(file, entry);
  }

  // --- Failure rate computation ---

  /**
   * Honest failure accounting. Fixes that verified green are counted from
   * proof artifacts; refusals (unfixable) and inconclusive runs are
   * counted from the event log, because neither produces a proof. A run
   * where the suite stayed green without a fix (no-break) is reported
   * separately and never counted as a proven fix.
   */
  getFailureRate(): {
    totalProofs: number;
    fixesProven: number;
    noBreak: number;
    failed: number;
    inconclusive: number;
    rate: number;
  } {
    const proofs = this.listProofs(10000);
    const fixesProven = proofs.filter(p => p.fixDiff !== '' && p.greenResult.exitCode === 0).length;
    const noBreak = proofs.filter(p => p.fixDiff === '').length;

    let failed = 0;
    let inconclusive = 0;
    for (const event of this.readEvents()) {
      if (event.type === 'proof_failed') failed++;
      else if (event.type === 'proof_inconclusive') inconclusive++;
    }

    const attempts = fixesProven + failed + inconclusive;
    return {
      totalProofs: proofs.length,
      fixesProven,
      noBreak,
      failed,
      inconclusive,
      rate: attempts > 0 ? fixesProven / attempts : 0,
    };
  }

  private readEvents(): Array<{ type: string }> {
    const dir = path.join(this.stateDir, 'events');
    if (!fs.existsSync(dir)) return [];
    const events: Array<{ type: string }> = [];
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.jsonl'))) {
      const lines = fs.readFileSync(path.join(dir, file), 'utf-8').split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          events.push(JSON.parse(line));
        } catch {
          // skip malformed lines
        }
      }
    }
    return events;
  }
}
