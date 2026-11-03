import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { ReadinessEvaluator } from './readiness-evaluator';

function findRepoRoot(): string {
  let curr = __dirname;
  while (curr !== path.dirname(curr)) {
    if (fs.existsSync(path.join(curr, 'fixtures', 'lodash-repo'))) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  return process.cwd();
}

function resolveGitCommitSha(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return '59b6d62d9affd27da1190ebadb5d4223f4e96c9b';
  }
}

function resolveGitBranch(): string {
  if (process.env.GITHUB_REF_NAME) return process.env.GITHUB_REF_NAME;
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'feat/launch-readiness-and-billing';
  }
}

export function runReadinessCheck(): void {
  const repoRoot = findRepoRoot();
  const evaluator = new ReadinessEvaluator({
    repoRoot,
    gitCommitSha: resolveGitCommitSha(),
    gitBranch: resolveGitBranch(),
    livePostgresTested: Boolean(process.env.TEST_POSTGRES_LIVE),
    isolatedProviderActive: Boolean(
      process.env.QUALIFIED_ISOLATION_BACKEND ||
      process.env.MICROVM_FLEET_URL ||
      process.env.PATCHVERSION_SANDBOX_MODE === 'microvm'
    ),
  });

  const report = evaluator.evaluate();
  console.log(JSON.stringify(report, null, 2));

  console.log('\n================ TRYPATCHBAY READINESS REPORT ================');
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`Commit:    ${report.gitCommitSha}`);
  console.log(`Branch:    ${report.gitBranch}`);
  console.log('--------------------------------------------------------------');
  for (const gate of report.gates) {
    const symbol = gate.state === 'PASS' ? '✅' : gate.state === 'BLOCKED' ? '🚫' : gate.state === 'NOT_RUN' ? '⏸️' : '❌';
    console.log(`${symbol} [${gate.state.padEnd(7)}] ${gate.category} :: ${gate.name}`);
    console.log(`   ${gate.details}`);
  }
  console.log('--------------------------------------------------------------');
  console.log(`Summary:`);
  console.log(`  Prototype Demo Ready: ${report.summary.prototypeDemoReady ? 'YES' : 'NO'}`);
  console.log(`  Staging Ready:        ${report.summary.stagingReady ? 'YES' : 'NO'}`);
  console.log(`  Customer Ready:       ${report.summary.customerReady ? 'YES' : 'NO'}`);
  console.log(`  Overall Gate State:   ${report.summary.overallState}`);
  console.log('==============================================================\n');
}

if (require.main === module) {
  runReadinessCheck();
}
