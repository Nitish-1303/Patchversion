import fs from 'fs';
import path from 'path';
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

export function runReadinessCheck(): void {
  const repoRoot = findRepoRoot();
  const evaluator = new ReadinessEvaluator({
    repoRoot,
    gitCommitSha: process.env.GITHUB_SHA || '38b129ce8524face42de9c2fb49e56f63a9d24ea',
    gitBranch: process.env.GITHUB_REF_NAME || 'fix/tenant-repo-lookup-and-github-scan',
    livePostgresTested: Boolean(process.env.TEST_POSTGRES_LIVE),
    isolatedProviderActive: Boolean(process.env.QUALIFIED_ISOLATION_BACKEND),
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
