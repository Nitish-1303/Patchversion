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

  // --- Watch targets ---

  saveWatchTarget(target: WatchTarget): void {
    const file = path.join(this.stateDir, 'watch-targets', `${this.fileKey(target.packageName)}.json`);
    fs.writeFileSync(file, JSON.stringify(target, null, 2));
  }

  getWatchTarget(packageName: string): WatchTarget | null {
    const file = path.join(this.stateDir, 'watch-targets', `${this.fileKey(packageName)}.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  }

  listWatchTargets(): WatchTarget[] {
    const dir = path.join(this.stateDir, 'watch-targets');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')));
  }

  // --- Change records ---

  saveChange(change: ChangeRecord): void {
    const file = path.join(this.stateDir, 'changes', `${this.fileKey(change.id)}.json`);
    fs.writeFileSync(file, JSON.stringify(change, null, 2));
    this.logEvent('change_detected', { changeId: change.id, packageName: change.packageName });
  }

  getChange(changeId: string): ChangeRecord | null {
    const file = path.join(this.stateDir, 'changes', `${this.fileKey(changeId)}.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  }

  listChanges(limit = 100): ChangeRecord[] {
    const dir = path.join(this.stateDir, 'changes');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')))
      .sort((a: ChangeRecord, b: ChangeRecord) => b.detectedAt.localeCompare(a.detectedAt))
      .slice(0, limit);
  }

  // --- Usage maps ---

  saveUsageMap(map: UsageMap): void {
    const file = path.join(this.stateDir, 'usage-maps', `${this.fileKey(map.repoId)}--${this.fileKey(map.packageName)}.json`);
    fs.writeFileSync(file, JSON.stringify(map, null, 2));
  }

  getUsageMap(repoId: string, packageName: string): UsageMap | null {
    const file = path.join(this.stateDir, 'usage-maps', `${this.fileKey(repoId)}--${this.fileKey(packageName)}.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  }

  // --- Impact analyses ---

  saveImpact(impact: ImpactAnalysis): void {
    const file = path.join(this.stateDir, 'impacts', `${this.fileKey(impact.changeId)}--${this.fileKey(impact.repoId)}.json`);
    fs.writeFileSync(file, JSON.stringify(impact, null, 2));
  }

  // --- Proof artifacts ---

  saveProof(proof: ProofArtifact): void {
    const file = path.join(this.stateDir, 'proofs', `${this.fileKey(proof.id)}.json`);
    fs.writeFileSync(file, JSON.stringify(proof, null, 2));
    this.logEvent('proof_produced', {
      proofId: proof.id,
      changeId: proof.changeId,
      verified: proof.coverageVerified,
      total: proof.coverageTotal,
    });
  }

  getProof(proofId: string): ProofArtifact | null {
    const file = path.join(this.stateDir, 'proofs', `${this.fileKey(proofId)}.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  }

  listProofs(limit = 100): ProofArtifact[] {
    const dir = path.join(this.stateDir, 'proofs');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')))
      .sort((a: ProofArtifact, b: ProofArtifact) => b.producedAt.localeCompare(a.producedAt))
      .slice(0, limit);
  }

  // --- Prepared PRs ---

  savePR(pr: PreparedPR): void {
    const file = path.join(this.stateDir, 'prs', `${this.fileKey(pr.proofArtifact.id)}.json`);
    fs.writeFileSync(file, JSON.stringify(pr, null, 2));
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

  getFailureRate(): { totalProofs: number; successful: number; failed: number; rate: number } {
    const proofs = this.listProofs(10000);
    const successful = proofs.filter(p => p.greenResult.exitCode === 0).length;
    const failed = proofs.length - successful;
    return {
      totalProofs: proofs.length,
      successful,
      failed,
      rate: proofs.length > 0 ? successful / proofs.length : 0,
    };
  }
}
