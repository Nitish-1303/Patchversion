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
  [/opens a verified fix PR/i, 'claims live verified PR delivery'],
  [/prepares tested fixes/i, 'claims tested fixes without scope'],
  [/finds affected code in your repositor/i, 'claims live repository scanning'],
  [/^(?!.*Grep the repo).*\bevery call site\b/i, 'claims complete call-site coverage'],
  [/\bfield removals\b/i, 'only renames are auto-fixed'],
  [/publishes its own failure rate/i, 'no failure-rate metrics exist'],
  [/proves the fix in a sandbox/i, 'no verified sandbox execution'],
  [/verified in sandbox/i, 'no verified sandbox execution'],
  [/removals, renames/i, 'only renames are auto-fixed'],
  [/It watches for breaking changes/, 'watching is not running; use planned wording'],
  [/\u2014/, 'emdash in copy'],
];

describe('public claims match implementation', () => {
  for (const rel of FILES) {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    test(rel, () => {
      for (const [re, why] of BANNED) {
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
