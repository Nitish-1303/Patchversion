/**
 * Failure-case coverage for the proof pipeline. Every case must fail
 * honestly: no success on failure, no crash, an explicit outcome.
 *
 * The SandboxRunner is exercised directly with requireIsolation: false.
 * That only lifts the engine's admission gate for these in-test fixture
 * trees; it is not production permission to run untrusted repos locally.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createTwoFilesPatch } from 'diff';
import { execFileSync } from 'child_process';
import { SandboxRunner } from '../src/sandbox/runner';
import { PatchversionEngine } from '../src/engine';
import { loadConfig } from '../src/config';
import { ChangeRecord, ImpactAnalysis } from '@patchversion/shared';
import { resolveNpmInvocation } from '../src/npm-cli';

jest.setTimeout(120_000);

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'patchversion-neg-'));

const CHARGE_JS = [
  "const minipay = require('minipay');",
  '',
  'async function charge(source) {',
  '  return minipay.charges.create({',
  '    source: source,',
  '  });',
  '}',
  '',
  'module.exports = { charge };',
  '',
].join('\n');

const TEST_JS = [
  "const { charge } = require('./src/charge');",
  '(async () => {',
  '  try {',
  "    const r = await charge('tok_visa');",
  "    if (r.status !== 'succeeded') throw new Error('bad status');",
  "    console.log('Tests: 1 passed, 1 total');",
  '  } catch (err) {',
  "    console.log('FAIL: ' + err.message);",
  "    console.log('Tests: 1 failed, 1 total');",
  '    process.exit(1);',
  '  }',
  '})();',
  '',
].join('\n');

const MINIPAY_V1 = `module.exports = { charges: { create: async (params) => {
  if (params.source === undefined) throw new Error('Missing required parameter: source');
  return { id: 'ch_123', status: 'succeeded' };
}}};
`;

const MINIPAY_V2 = `module.exports = { charges: { create: async (params) => {
  if (params.payment_method === undefined) throw new Error('Missing required parameter: payment_method');
  return { id: 'ch_123', status: 'succeeded' };
}}};
`;

function writeVendor(repoDir: string, version: string, code: string): void {
  const dir = path.join(repoDir, 'vendor', `minipay-${version}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'),
    JSON.stringify({ name: 'minipay', version, main: 'index.js' }, null, 2));
  fs.writeFileSync(path.join(dir, 'index.js'), code);
}

/** Create a mini repo. testJs === null means no test script at all. */
function makeRepo(name: string, opts: { testJs?: string | null } = {}): string {
  const dir = path.join(tmpRoot, name);
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'charge.js'), CHARGE_JS);
  writeVendor(dir, '1.0.0', MINIPAY_V1);
  writeVendor(dir, '1.1.0', MINIPAY_V1); // non-breaking target
  writeVendor(dir, '2.0.0', MINIPAY_V2);

  const pkg: Record<string, unknown> = {
    name, private: true, version: '1.0.0',
    dependencies: { minipay: 'file:vendor/minipay-1.0.0' },
  };
  if (opts.testJs !== null) {
    fs.writeFileSync(path.join(dir, 'test.js'), opts.testJs ?? TEST_JS);
    pkg.scripts = { test: 'node test.js' };
  }
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
  // Install the vendored dependency so the baseline run is real
  const npm = resolveNpmInvocation(['install', '--install-links', '--no-audit', '--no-fund']);
  execFileSync(npm.command, npm.args, { cwd: dir, stdio: 'pipe', shell: npm.shell });
  return dir;
}

function makeChange(toVersion: string, notes = "BREAKING CHANGE: renamed source to payment_method"): ChangeRecord {
  return {
    id: `test-minipay-${toVersion}`,
    packageName: 'minipay',
    ecosystem: 'npm',
    fromVersion: '1.0.0',
    toVersion,
    detectedAt: '2026-10-24T00:00:00Z',
    source: 'registry',
    sourceUrl: 'https://example.com/minipay',
    rawNotes: notes,
    classification: { isBreaking: true, confidence: 0.9, affectedExports: ['source'], reason: 'test' },
    severity: 'breaking',
    offlineVersions: { '1.1.0': 'vendor/minipay-1.1.0', '2.0.0': 'vendor/minipay-2.0.0' },
  };
}

function makeImpact(repoId = 'test/repo'): ImpactAnalysis {
  return {
    changeId: 'test-minipay-2.0.0',
    repoId,
    affectedCallSites: [{
      filePath: 'src/charge.js',
      line: 4,
      column: 24,
      importStatement: "const minipay = require('minipay');",
      callExpression: 'minipay.charges.create({ source: source })',
      packageName: 'minipay',
      exportedSymbol: '*',
    }],
    unaffectedCallSites: [],
    potentialCallSites: [],
    coveragePercent: 100,
    analyzedAt: '2026-10-24T00:00:00Z',
  };
}

function makeRunner(stateName: string, timeoutMs = 60_000): SandboxRunner {
  return new SandboxRunner(loadConfig({
    stateDir: path.join(tmpRoot, `state-${stateName}`),
    sandboxMode: 'local',
    requireIsolation: false,
    sandboxTimeoutMs: timeoutMs,
  }));
}

const RENAME_DIFF = createTwoFilesPatch(
  'a/src/charge.js', 'b/src/charge.js',
  CHARGE_JS, CHARGE_JS.replace('source: source', 'payment_method: source'),
);

const COMMENT_ONLY_DIFF = createTwoFilesPatch(
  'a/src/charge.js', 'b/src/charge.js',
  CHARGE_JS, CHARGE_JS.replace('async function charge', 'async function /* untouched */ charge'),
);

afterAll(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('sandbox outcomes', () => {
  it('fixed: a working fix produces a verified proof', async () => {
    const repo = makeRepo('fixed');
    const result = await makeRunner('fixed').proveLoop(repo, makeChange('2.0.0'), makeImpact(), RENAME_DIFF);
    expect(result.outcome).toBe('fixed');
    expect(result.proof).not.toBeNull();
    expect(result.proof!.baselineResult.exitCode).toBe(0);
    expect(result.proof!.redResult.exitCode).not.toBe(0);
    expect(result.proof!.greenResult.exitCode).toBe(0);
  });

  it('non-breaking upgrade: no-break, honest zero coverage, no fix claimed', async () => {
    const repo = makeRepo('nobreak');
    const result = await makeRunner('nobreak').proveLoop(repo, makeChange('1.1.0'), makeImpact(), RENAME_DIFF);
    expect(result.outcome).toBe('no-break');
    expect(result.proof).not.toBeNull();
    expect(result.proof!.fixDiff).toBe('');
    expect(result.proof!.coverageVerified).toBe(0);
    expect(result.proof!.unverifiable.length).toBe(1);
  });

  it('unfixable: a clean-applying but wrong fix is refused, no proof', async () => {
    const repo = makeRepo('unfixable');
    const result = await makeRunner('unfixable').proveLoop(repo, makeChange('2.0.0'), makeImpact(), COMMENT_ONLY_DIFF);
    expect(result.outcome).toBe('unfixable');
    expect(result.proof).toBeNull();
    expect(result.reason).toMatch(/did not verify/);
  });

  it('malformed patch: inconclusive, no crash', async () => {
    const repo = makeRepo('malformed');
    const result = await makeRunner('malformed').proveLoop(repo, makeChange('2.0.0'), makeImpact(), 'this is not a diff at all');
    expect(result.outcome).toBe('inconclusive');
    expect(result.reason).toMatch(/could not be applied/);
  });

  it('path-escaping patch: refused, nothing written outside the work dir', async () => {
    const repo = makeRepo('escape');
    const escapeTarget = path.join(tmpRoot, 'escape-marker.txt');
    const evil = [
      '===================================================================',
      '--- a/../../escape-marker.txt',
      '+++ b/../../escape-marker.txt',
      '@@ -0,0 +1 @@',
      '+pwned',
      '',
    ].join('\n');
    const result = await makeRunner('escape').proveLoop(repo, makeChange('2.0.0'), makeImpact(), evil);
    expect(result.outcome).toBe('inconclusive');
    expect(result.reason).toMatch(/escapes the working directory/);
    expect(fs.existsSync(escapeTarget)).toBe(false);
  });

  it('baseline already failing: inconclusive, never claimed as a migration break', async () => {
    const repo = makeRepo('baseline-red', {
      testJs: "console.log('Tests: 1 failed, 1 total');\nprocess.exit(1);\n",
    });
    const result = await makeRunner('baseline-red').proveLoop(repo, makeChange('2.0.0'), makeImpact(), RENAME_DIFF);
    expect(result.outcome).toBe('inconclusive');
    expect(result.reason).toMatch(/Baseline test run failed/);
  });

  it('no test script: inconclusive (npm fails), not a green run', async () => {
    const repo = makeRepo('no-script', { testJs: null });
    const result = await makeRunner('no-script').proveLoop(repo, makeChange('2.0.0'), makeImpact(), RENAME_DIFF);
    expect(result.outcome).toBe('inconclusive');
    expect(result.reason).toMatch(/Baseline test run failed/);
  });

  it('zero parsed tests: inconclusive even when the suite exits 0', async () => {
    const repo = makeRepo('zero-tests', {
      testJs: "console.log('nothing here');\n",
    });
    const result = await makeRunner('zero-tests').proveLoop(repo, makeChange('2.0.0'), makeImpact(), RENAME_DIFF);
    expect(result.outcome).toBe('inconclusive');
    expect(result.reason).toMatch(/zero tests/);
  });

  it('timeout: hung suite is killed and reported, not left running', async () => {
    const repo = makeRepo('hung', {
      testJs: 'setInterval(() => {}, 1000);\n',
    });
    const started = Date.now();
    const result = await makeRunner('hung', 1_500).proveLoop(repo, makeChange('2.0.0'), makeImpact(), RENAME_DIFF);
    expect(result.outcome).toBe('inconclusive');
    expect(result.reason).toMatch(/Baseline test run failed/);
    expect(Date.now() - started).toBeLessThan(30_000);
  });

  it('missing dependency entry: bump refuses instead of faking a green', async () => {
    const repo = makeRepo('missing-dep');
    const change = makeChange('2.0.0');
    change.packageName = 'not-installed-pkg';
    const result = await makeRunner('missing-dep').proveLoop(repo, change, makeImpact(), RENAME_DIFF);
    expect(result.outcome).toBe('inconclusive');
    expect(result.reason).toMatch(/not a dependency/);
  });

  it('docker mode is blocked explicitly', () => {
    expect(() => new SandboxRunner(loadConfig({
      stateDir: path.join(tmpRoot, 'state-docker'),
      sandboxMode: 'docker',
    }))).toThrow(/UNVERIFIED and blocked/);
  });
});

describe('engine admission gate', () => {
  it('blocks unisolated execution of repos outside trusted fixture dirs', async () => {
    const repo = makeRepo('blocked');
    const stateDir = path.join(tmpRoot, 'state-blocked');
    const engine = new PatchversionEngine({ stateDir, sandboxMode: 'local' }); // requireIsolation defaults true
    const pr = await engine.processChange(makeChange('2.0.0'), repo, 'test/blocked');
    expect(pr).toBeNull();
    const eventsDir = path.join(stateDir, 'events');
    const events = fs.readdirSync(eventsDir)
      .flatMap(f => fs.readFileSync(path.join(eventsDir, f), 'utf-8').split('\n'))
      .filter(l => l.trim())
      .map(l => JSON.parse(l));
    expect(events.some(e => e.type === 'execution_blocked')).toBe(true);
  });

  it('no affected call sites: silence, no PR', async () => {
    const repo = path.join(tmpRoot, 'no-usage');
    fs.mkdirSync(path.join(repo, 'src'), { recursive: true });
    fs.writeFileSync(path.join(repo, 'src', 'index.js'), 'module.exports = 1;\n');
    fs.writeFileSync(path.join(repo, 'package.json'), JSON.stringify({ name: 'no-usage', private: true }));
    const engine = new PatchversionEngine({
      stateDir: path.join(tmpRoot, 'state-nousage'),
      sandboxMode: 'local',
      requireIsolation: false,
    });
    const pr = await engine.processChange(makeChange('2.0.0'), repo, 'test/no-usage');
    expect(pr).toBeNull();
  });

  it('ambiguous migration description: no fix generated, no PR', async () => {
    const repo = makeRepo('ambiguous');
    const engine = new PatchversionEngine({
      stateDir: path.join(tmpRoot, 'state-ambiguous'),
      sandboxMode: 'local',
      requireIsolation: false,
    });
    const change = makeChange('2.0.0', 'BREAKING CHANGE: various breaking changes, see the migration guide.');
    const pr = await engine.processChange(change, repo, 'test/ambiguous');
    expect(pr).toBeNull();
  });
});
