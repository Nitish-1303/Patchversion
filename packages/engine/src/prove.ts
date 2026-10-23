import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { PatchversionEngine } from './engine';
import { ChangeRecord } from '@patchversion/shared';

/**
 * prove: run the full pipeline against the repo's own fixture.
 *
 *   detect -> map -> impact -> fix -> red-to-green sandbox -> prepared PR
 *
 * Writes a human-readable transcript, the proof artifact and the prepared
 * PR text into runs/latest/ at the repo root. Exits nonzero if the loop
 * does not produce a verified fix - silence or a crash is a failure here,
 * because this fixture exists to prove the loop works.
 */

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const fixtureRepo = path.join(repoRoot, 'fixtures', 'sample-repo');
const changePath = path.join(repoRoot, 'fixtures', 'breaking-change', 'change-record.json');
const outDir = path.join(repoRoot, 'runs', 'latest');
const stateDir = path.join(repoRoot, '.patchversion-state');

const lines: string[] = [];
function log(line: string): void {
  lines.push(line);
  console.log(line);
}

async function main(): Promise<void> {
  const startedAt = new Date();
  log(`Patchversion proof run - ${startedAt.toISOString()}`);
  log(`Fixture repo: ${path.relative(repoRoot, fixtureRepo)}`);
  log('');

  // Ensure the fixture's dependencies are installed (vendored, no registry needed)
  if (!fs.existsSync(path.join(fixtureRepo, 'node_modules', 'mockpay'))) {
    log('Installing fixture dependencies...');
    execSync('npm install --no-audit --no-fund', { cwd: fixtureRepo, stdio: 'pipe', timeout: 120_000 });
  }

  const change: ChangeRecord = JSON.parse(fs.readFileSync(changePath, 'utf-8'));
  log(`Change: ${change.packageName} ${change.fromVersion} -> ${change.toVersion}`);
  log(`Notes: ${change.rawNotes}`);
  log('');

  const engine = new PatchversionEngine({
    stateDir,
    sandboxMode: 'local',
    sandboxTimeoutMs: 120_000,
  });

  const pr = await engine.processChange(change, fixtureRepo, 'acme/payments');

  if (!pr) {
    log('RESULT: no verified fix produced. The loop failed or stayed silent.');
    writeOutputs(null);
    process.exit(1);
  }

  const proof = pr.proofArtifact;
  log('--- USAGE MAP ---');
  const store = engine.getStore();
  const usageMap = store.getUsageMap('acme/payments', change.packageName);
  if (usageMap) {
    log(`Files scanned: ${usageMap.totalFiles}, files using ${change.packageName}: ${usageMap.filesWithUsage}`);
    for (const site of usageMap.callSites) {
      log(`  ${site.filePath}:${site.line}  ${site.callExpression.split('\n')[0].slice(0, 80)}`);
    }
  }
  log('');
  log('--- IMPACT ---');
  log(`Affected call sites: ${pr.impact.affectedCallSites.map(s => `${s.filePath}:${s.line}`).join(', ') || 'none'}`);
  log(`Potential (broad match, not individually verified): ${(pr.impact.potentialCallSites ?? []).map(s => `${s.filePath}:${s.line}`).join(', ') || 'none'}`);
  log('');
  log('--- RED-TO-GREEN PROOF ---');
  log(`Baseline (${change.fromVersion}):  exit ${proof.baselineResult.exitCode} - ${proof.baselineResult.passed} passed, ${proof.baselineResult.failed} failed, ${proof.baselineResult.total} total`);
  log(`Bumped (${change.toVersion}):      exit ${proof.redResult.exitCode} - ${proof.redResult.passed} passed, ${proof.redResult.failed} failed, ${proof.redResult.total} total`);
  log(`After fix (${change.toVersion}):   exit ${proof.greenResult.exitCode} - ${proof.greenResult.passed} passed, ${proof.greenResult.failed} failed, ${proof.greenResult.total} total`);
  log(`Sandbox: ${proof.sandboxType} (local process, no isolation)`);
  log(`Coverage: verified ${proof.coverageVerified} of ${proof.coverageTotal} affected call sites`);
  log(`Files changed by fix: ${proof.fixedFiles.join(', ') || 'none'}`);
  log(`Duration: ${(proof.durationMs / 1000).toFixed(1)}s`);
  log('');
  log('--- PREPARED PR ---');
  log(`Title: ${pr.title}`);
  log(`Branch: ${pr.branch}`);

  const failed =
    proof.baselineResult.exitCode !== 0 ||
    proof.redResult.exitCode === 0 ||
    proof.greenResult.exitCode !== 0;

  if (failed) {
    log('');
    log('PROOF INVALID: expected baseline green, bumped red, fixed green.');
    writeOutputs(pr);
    process.exit(1);
  }

  log('');
  log(`PROOF VALID. Outputs written to ${path.relative(process.cwd(), outDir)}/`);
  writeOutputs(pr);
}

function writeOutputs(pr: import('@patchversion/shared').PreparedPR | null): void {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'transcript.txt'), lines.join('\n') + '\n');
  if (pr) {
    fs.writeFileSync(path.join(outDir, 'proof.json'), JSON.stringify(pr.proofArtifact, null, 2));
    fs.writeFileSync(
      path.join(outDir, 'prepared-pr.md'),
      [`# ${pr.title}`, '', `Branch: \`${pr.branch}\``, '', pr.body, ''].join('\n'),
    );
  }
}

main().catch(err => {
  log(`FATAL: ${err instanceof Error ? err.message : String(err)}`);
  writeOutputs(null);
  process.exit(1);
});
