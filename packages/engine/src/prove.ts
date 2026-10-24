import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';
import { PatchversionEngine } from './engine';
import { ChangeRecord } from '@patchversion/shared';
import { writeArtifacts } from './proof-output';

/**
 * prove: run the full pipeline against a repository we control.
 *
 *   detect -> map -> impact -> fix -> red-to-green sandbox -> prepared PR
 *
 * Usage:
 *   node dist/prove.js [fixtureDir] [changeRecordPath] [outDir] [repoId]
 *
 * Defaults run the bundled mockpay fixture and write transcript, proof
 * artifact and prepared PR text into runs/latest/ at the repo root.
 * Previous artifacts in the output directory are archived, never
 * silently overwritten. Exits nonzero unless the loop produces a
 * verified fix - silence or a crash is a failure here, because this
 * command exists to prove the loop works.
 */

const repoRoot = path.resolve(__dirname, '..', '..', '..');

const fixtureRepo = path.resolve(repoRoot, process.argv[2] ?? path.join('fixtures', 'sample-repo'));
const changePath = path.resolve(repoRoot, process.argv[3] ?? path.join('fixtures', 'breaking-change', 'change-record.json'));
const outDir = path.resolve(repoRoot, process.argv[4] ?? path.join('runs', 'latest'));
const repoId = process.argv[5] ?? 'acme/payments';
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
  log(`Change record: ${path.relative(repoRoot, changePath)}`);
  log('');

  // Ensure the fixture's dependencies are installed
  const pkg = JSON.parse(fs.readFileSync(path.join(fixtureRepo, 'package.json'), 'utf-8'));
  const firstDep = Object.keys(pkg.dependencies ?? {})[0];
  if (!firstDep || !fs.existsSync(path.join(fixtureRepo, 'node_modules', firstDep))) {
    log('Installing fixture dependencies...');
    execFileSync('npm', ['install', '--no-audit', '--no-fund'], {
      cwd: fixtureRepo, stdio: 'pipe', timeout: 300_000,
    });
  }

  const change: ChangeRecord = JSON.parse(fs.readFileSync(changePath, 'utf-8'));
  log(`Change: ${change.packageName} ${change.fromVersion} -> ${change.toVersion}`);
  log(`Source: ${change.source} - ${change.sourceUrl}`);
  log(`Notes: ${change.rawNotes}`);
  log('');

  const engine = new PatchversionEngine({
    stateDir,
    sandboxMode: 'local',
    sandboxTimeoutMs: 120_000,
  });

  const pr = await engine.processChange(change, fixtureRepo, repoId);
  const proveResult = engine.getLastProveResult();

  if (!pr) {
    const outcome = proveResult?.outcome ?? 'no-usage-or-no-impact';
    const reason = proveResult?.reason ?? 'no affected call sites, or execution blocked by policy';
    log(`RESULT: ${outcome} - ${reason}`);
    log('No verified fix produced. The loop stayed silent or refused.');
    writeOutputs(null);
    process.exit(1);
  }

  const proof = pr.proofArtifact;
  log('--- USAGE MAP ---');
  const store = engine.getStore();
  const usageMap = store.getUsageMap(repoId, change.packageName);
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
  log(`Sandbox: ${proof.sandboxType} (local process, NO isolation)`);
  log(`Coverage: fix updated ${proof.coverageVerified} of ${proof.coverageTotal} affected call sites`);
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
  const files: Record<string, string> = {
    'transcript.txt': lines.join('\n') + '\n',
  };
  if (pr) {
    files['proof.json'] = JSON.stringify(pr.proofArtifact, null, 2);
    files['prepared-pr.md'] = [`# ${pr.title}`, '', `Branch: \`${pr.branch}\``, '', pr.body, ''].join('\n');
  }
  writeArtifacts(outDir, files);
}

main().catch(err => {
  log(`FATAL: ${err instanceof Error ? err.message : String(err)}`);
  writeOutputs(null);
  process.exit(1);
});
