import fs from 'fs';
import os from 'os';
import path from 'path';
import { PRBot } from '../src/pr-bot/bot';
import { StateStore } from '../src/state/store';
import { ChangeRecord, ImpactAnalysis, ProofArtifact } from '@patchversion/shared';

const ROOT = path.resolve(__dirname, '../../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'patchversion-output-'));
const change: ChangeRecord = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'fixtures/breaking-change/change-record.json'), 'utf8'));
const proof: ProofArtifact = JSON.parse(fs.readFileSync(path.join(ROOT, 'runs/latest/proof.json'), 'utf8'));
const impact: ImpactAnalysis = {
  changeId: change.id, repoId: proof.repoId, affectedCallSites: [],
  unaffectedCallSites: [], coveragePercent: 0, analyzedAt: proof.producedAt,
};
const bot = new PRBot(new StateStore(tmp));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

function expectNotSubmitted(body: string): void {
  expect(body.split('\n')[0]).toContain('Not submitted to GitHub');
  expect(body).toContain('Prepared by Patchversion. Not submitted to GitHub.');
  expect(body).not.toMatch(/Opened by Patchversion|before this PR was opened|sandbox execution record/i);
}

test('generated PR artifact and saved body clearly distinguish preparation from submission', () => {
  const pr = bot.preparePR(change, impact, { ...proof, sandboxType: 'local-process' });
  expectNotSubmitted(pr.body);
  expect(pr.body).toContain('local process (no isolation) before this PR text was prepared');
  expect(pr.body).toContain('Proof recorded from local execution.');
  const saved = fs.readdirSync(path.join(tmp, 'prs')).map(file =>
    JSON.parse(fs.readFileSync(path.join(tmp, 'prs', file), 'utf8')));
  expect(saved.some(record => record.body === pr.body)).toBe(true);
});

test('generated issue artifact never claims an issue or PR was opened', () => {
  const issue = bot.prepareUnfixableIssue(change, impact, 'No automatic fix could be generated.');
  expectNotSubmitted(issue.body);
  expect(issue.body).toContain('Prepared issue text only.');
  expect(issue.body).not.toContain('Proof recorded from local execution');
});

test.each(['docker-isolated', 'unknown-runtime', undefined, null, 42, {}])(
  'generated and persisted PR output does not infer isolation from unsupported type %p',
  sandboxType => {
    // JSON-backed state and callers do not provide runtime schema/provenance checks.
    const store = new StateStore(tmp);
    const supplied = { ...proof, sandboxType } as ProofArtifact;
    store.saveProof(supplied);
    const loaded = store.getProof(supplied.id)!;
    const pr = bot.preparePR(change, impact, loaded);
    expectNotSubmitted(pr.body);
    expect(pr.body).toContain('Execution environment is unsupported or unknown; isolation has not been verified.');
    expect(pr.body).toContain('Sandbox type: unsupported or unknown (not verified)');
    expect(pr.body).not.toMatch(/verified in an isolated Docker sandbox|verified in a local process|Proof recorded from local execution/i);
    expect(pr.body).toContain('Execution environment not verified.');
    const saved = fs.readdirSync(path.join(tmp, 'prs')).map(file =>
      JSON.parse(fs.readFileSync(path.join(tmp, 'prs', file), 'utf8')));
    expect(saved.some(record => record.body === pr.body)).toBe(true);
  },
);
