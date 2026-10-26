import fs from 'fs';
import path from 'path';

/**
 * Copy guard: public text must not claim capabilities the code does not have
 * (live monitoring, verified sandbox execution, live PR delivery, complete
 * call-site coverage, LLM or non-rename fixes). Edit copy, not this list,
 * unless the capability has shipped and been verified.
 */
const ROOT = path.resolve(__dirname, '../../..');
const FILES = [
  'README.md',
  'docs/technical-architecture.md',
  'package.json',
  ...walk(path.join(ROOT, 'packages/site/src/app')).map(f => path.relative(ROOT, f)),
];

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.(tsx?|md)$/.test(e.name) ? [p] : [];
  });
}

const BANNED: [RegExp, string][] = [
  [/every\s+fix\s+PR\s+carries[\s\S]{0,140}produced\s+in\s+the\s+sandbox/i, 'claims sandbox-produced proof for delivered PRs'],
  [/\bbefore\s+the\s+PR\s+opens\b/i, 'prototype does not open actual PRs'],
  [/\b(?:opens|submits)\s+(?:an?\s+)?(?:actual\s+|verified\s+)?(?:fix\s+)?(?:PR|pull request)s?\b/i, 'claims live PR delivery'],
  [/\bevery\s+affected\s+call\s+site,?\s+found\b/i, 'claims complete call-site coverage'],
  [/\bfull diff ships in the pull request\b/i, 'claims live PR delivery'],
  [/\bSet the following environment variables to enable authentication\b/i, 'authentication is not implemented'],
  [/\bBreak reproduction against a repo(?:&apos;|')s own test suite\b/i, 'end-to-end execution is fixture-only'],
  [/opens a verified fix PR/i, 'claims live verified PR delivery'],
  [/prepares tested fixes/i, 'claims tested fixes without scope'],
  [/finds affected code in your repositor/i, 'claims live repository scanning'],
  [/^(?!.*Grep the repo).*\bevery call site\b/i, 'claims complete call-site coverage'],
  [/\bfield removals\b/i, 'only renames are auto-fixed'],
  [/publishes its own failure rate/i, 'no failure-rate metrics exist'],
  [/proves the fix in a sandbox/i, 'no verified sandbox execution'],
  [/verified in sandbox/i, 'no verified sandbox execution'],
  [/removals, renames/i, 'only renames are auto-fixed'],
  [/\bit\s+watches\s+for\s+breaking\s+changes\b/i, 'watching is not running; use planned wording'],
  [/\bwithout\s+tests\s+can\s+get\s+impact\s+analysis\s+and\s+fix\s+proposals\b/i, 'no general proposals for repositories without tests'],
  [/\bevery\s+migration\s+arrives\s+as\s+a\s+pull\s+request\b/i, 'PR delivery is not implemented'],
  [/\bproof\s+loop\s+runs\s+locally\s+against\s+(?:the\s+)?repositories\s+you\s+point\s+it\s+at\b/i, 'end-to-end execution is limited to bundled fixtures'],
  [/\u2014/, 'emdash in copy'],
];

describe('public claims match implementation', () => {
  for (const rel of FILES) {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    test(rel, () => {
      for (const [re, why] of BANNED) {
        const normalized = text.replace(/\s+/g, ' ');
        if (re.test(normalized)) throw new Error(`${rel}: ${why}`);
        const m = text.split('\n').findIndex(l => re.test(l));
        if (m >= 0) throw new Error(`${rel}:${m + 1} ${why}: ${text.split('\n')[m].trim().slice(0, 120)}`);
      }
    });
  }

  test('site metadata states prototype status', () => {
    const layout = fs.readFileSync(path.join(ROOT, 'packages/site/src/app/layout.tsx'), 'utf8');
    expect(layout).toMatch(/Early-stage prototype/);
    expect(layout).toMatch(/in development/);
  });

  test('implementation limits the copy relies on still hold', () => {
    const gen = fs.readFileSync(path.join(ROOT, 'packages/engine/src/fix-generator/generator.ts'), 'utf8');
    expect(gen).toMatch(/TODO: Call Anthropic API/);
    const runner = fs.readFileSync(path.join(ROOT, 'packages/engine/src/sandbox/runner.ts'), 'utf8');
    expect(runner).toMatch(/BLOCKED/);
  });
});


describe('public-claims guard regression examples', () => {
  const rejected = (text: string) => BANNED.some(([re]) => re.test(text));
  test.each([
    'Every affected call site, found.',
    'The full diff ships in the pull request.',
    'Set the following environment variables to enable authentication:',
    'Break reproduction against a repo&apos;s own test suite',
    'Every fix PR carries human-readable proof produced in the sandbox before the PR opens.',
    'Every fix PR carries the red-to-green test\n results produced in the sandbox BEFORE the PR opens.',
    'PatchBay opens a pull request with proof.',
    'PatchBay submits verified fix PRs.',
    'Deterministic fixes cover known patterns (removals, renames, signature changes).',
    'It watches for breaking changes and prepares a pull request.',
    'IT WATCHES FOR BREAKING CHANGES and prepares a pull request.',
    'Repositories without tests can get impact analysis and fix proposals, but no automated proof.',
    'Repositories WITHOUT TESTS CAN GET IMPACT ANALYSIS AND FIX PROPOSALS.',
    'Every migration arrives as a pull request for a human to review.',
    'The current proof loop runs locally against repositories you point it at.',
    'The proof loop runs locally against the repositories you point it at.',
  ])('rejects old misleading wording: %s', text => {
    expect(rejected(text)).toBe(true);
  });
  test.each([
    'Watching and pull-request delivery are in development.',
    'Repositories without tests would get no automated proof. Today only the bundled fixtures run end to end.',
    'The only automatic fix today is a deterministic rename of a field or parameter.',
    'The plan is a pull request for a human to review; today only PR text is prepared.',
    'The current end-to-end proof loop runs locally on bundled fixtures. Other repositories remain blocked pending verified isolation.',
    'A prototype ContractProber module exists, but hosted probing is not operational.',
  ])('allows accurate explanations: %s', text => {
    expect(rejected(text)).toBe(false);
  });
});


describe('planned setup is not presented as a configuration-only feature', () => {
  const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');
  test('onboarding and signup name the unavailable App flow', () => {
    const onboarding = read('packages/site/src/app/onboarding/page.tsx');
    expect(onboarding).toContain('Planned onboarding preview');
    expect(onboarding).toContain('App installation is not implemented');
    expect(onboarding).not.toContain('Trigger an initial scan');
    const signup = read('packages/site/src/app/signup/page.tsx');
    expect(signup).toMatch(/permissions are not implemented/);
    expect(signup).not.toContain('PatchBay will request');
  });
  test('login, security, and footer preserve prototype limits', () => {
    expect(read('packages/site/src/app/login/page.tsx')).toContain('does not enable');
    expect(read('packages/site/src/app/login/page.tsx')).toContain('authentication in this prototype');
    expect(read('packages/site/src/app/docs/security/page.tsx')).toContain('bundled fixture trees only');
    expect(read('packages/site/src/app/Chrome.tsx')).toContain('API Monitoring (planned)');
    expect(read('packages/site/src/app/Chrome.tsx')).toContain('Impact Analysis (prototype)');
    expect(read('packages/site/src/app/Chrome.tsx')).toContain('AI Remediation (planned)');
    const guide = read('packages/site/src/app/docs/getting-started/page.tsx');
    expect(guide).toContain('npm run prove');
    expect(guide).toContain('GitHub PR delivery is not implemented');
  });
  test('proof descriptions keep fixture and isolation limits', () => {
    for (const file of ['README.md', 'docs/technical-architecture.md']) {
      const text = read(file);
      expect(text).toMatch(/no isolation/);
      expect(text).toMatch(/bundled fixtures/);
      expect(text).toMatch(/does not open or submit pull requests/);
    }
    expect(read('packages/site/src/app/pricing/page.tsx')).toContain('bundled fixtures only');
    expect(read('packages/site/src/app/pricing/page.tsx')).not.toContain("a repo&apos;s own test suite");
  });
});
