import fs from 'fs';
import path from 'path';

/**
 * Proof output writer with history.
 *
 * runs/latest/ always holds the most recent run's artifacts, but a new
 * result must never masquerade as an older one: before writing, any
 * existing artifacts are moved into runs/archive/<timestamp>/. This is a
 * selected-file rename, not an atomic multi-file publication - noted in
 * docs/security-threat-model.md as a residual limitation.
 */

const ARTIFACTS = ['transcript.txt', 'proof.json', 'prepared-pr.md'];

export function archivePreviousArtifacts(outDir: string): string | null {
  if (!fs.existsSync(outDir)) return null;
  const existing = ARTIFACTS.filter(f => fs.existsSync(path.join(outDir, f)));
  if (existing.length === 0) return null;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archiveDir = path.join(path.dirname(outDir), 'archive', stamp);
  fs.mkdirSync(archiveDir, { recursive: true });
  for (const file of existing) {
    fs.renameSync(path.join(outDir, file), path.join(archiveDir, file));
  }
  return archiveDir;
}

export function writeArtifacts(
  outDir: string,
  files: Record<string, string>,
): void {
  fs.mkdirSync(outDir, { recursive: true });
  archivePreviousArtifacts(outDir);
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(outDir, name), content);
  }
}
