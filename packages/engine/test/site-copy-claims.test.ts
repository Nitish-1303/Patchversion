/**
 * Guards the public site copy against presenting unimplemented capability
 * (live watching, GitHub PR delivery, complete call-site coverage) as current.
 */
import fs from 'fs';
import path from 'path';

const app = path.resolve(__dirname, '../../site/src/app');
const read = (f: string) => fs.readFileSync(path.join(app, f), 'utf8');
const readRoot = (f: string) => fs.readFileSync(path.resolve(__dirname, '../../..', f), 'utf8');

describe('site copy honesty', () => {
  const faq = read('components/FAQ.tsx');
  const home = read('page.tsx');

  it('FAQ "What does PatchBay do?" states fixture-only, PARTIAL / NOT READY, and no live watching or PR delivery', () => {
    expect(faq).not.toContain('It watches for breaking changes');
    expect(faq).not.toContain('and prepares a pull request with the verification evidence attached');
    expect(faq).toContain('fixture-based migration work');
    expect(faq).toContain('MockPay and Lodash, are PARTIAL / NOT READY');
    expect(faq).toContain('Continuous monitoring of live SDK changes and live GitHub pull-request delivery are not implemented');
  });

  it('FAQ auto-merge answer does not say every migration arrives as a pull request', () => {
    expect(faq).not.toContain('Every migration arrives as a pull request');
    expect(faq).toContain('GitHub pull-request delivery is not implemented');
  });

  it('comparison table does not claim complete coverage or delivered PRs', () => {
    expect(home).not.toContain('Every call site is located and listed');
    expect(home).not.toContain('The PR arrives with');
    expect(home).toContain('coverage is partial');
    expect(home).toContain('Today only a local prepared-PR file exists');
  });

  it('pipeline Analyze card states partial coverage for both demos', () => {
    expect(home).not.toContain('An index of every call site');
    expect(home).toContain('An index of supported call sites');
    expect(home).toContain('Coverage is partial; both MockPay and Lodash demos are PARTIAL / NOT READY');
  });

  it('product impact analysis states partial coverage for both demos', () => {
    const product = read('product/page.tsx');
    expect(product).not.toContain('maps every call site in the');
    expect(product).toContain('analysis to map supported call sites');
    expect(product).toContain('partial today: both MockPay and Lodash demos are PARTIAL / NOT READY');
    expect(product).toContain('repository-wide call-site maps');
  });

  it('homepage impact headline does not promise every call site', () => {
    expect(home).not.toContain('Every affected call site, down to the line');
    expect(home).toContain('Supported call sites, with file and line');
  });

  it('product impact analysis does not promise a precise list or zero false positives', () => {
    const product = read('product/page.tsx');
    expect(product).not.toContain('a precise list of affected files');
    expect(product).not.toContain('No false positives from commented-out code');
    expect(product).toContain('It may miss call sites, and precision has not been measured beyond');
  });

  it('homepage impact paragraph does not imply every call site is found', () => {
    expect(home).not.toContain('lists each call site that touches it');
    expect(home).not.toContain('No grep-and-hope');
    expect(home).toContain('Coverage is partial, so some call sites may be missed.');
    expect(home).toContain('Illustrative impact map; example paths and line numbers.');
  });

  it('StageTabs Map tab does not claim every call site or a guaranteed list', () => {
    const tabs = read('components/StageTabs.tsx');
    expect(tabs).not.toContain('Every affected call site, found');
    expect(tabs).not.toContain('pinpoints exactly which files and lines');
    expect(tabs).not.toContain('not a guess, a list');
    expect(tabs).toContain('Supported call sites, mapped.');
    expect(tabs).toContain('coverage is partial and may miss call sites');
    expect(tabs).toContain('Call-site mapping verified locally against the bundled sample repo.');
  });

  it('hero lead does not present PR delivery as current', () => {
    expect(home).not.toContain('and preparing reviewable pull requests with verification evidence');
    expect(home).toContain('PatchBay is built to help engineering teams');
    expect(home).toContain('Pull-request delivery with verification evidence is planned');
  });

  it('docs/concepts usage map does not claim every call site', () => {
    const concepts = read('docs/concepts/page.tsx');
    expect(concepts).not.toContain('index of every call site');
    expect(concepts).toContain('Coverage is partial today');
  });

  it('MigrationDemo impact stage does not claim every call site', () => {
    const demo = read('components/MigrationDemo.tsx');
    expect(demo).not.toContain('flags every call site');
    expect(demo).toContain('flags the supported call sites it finds');
    expect(demo).toContain('Coverage is partial, so other call sites may be missed.');
  });

  it('how-it-works analyze stage does not claim a precise call-site map', () => {
    const hiw = read('how-it-works/page.tsx');
    expect(hiw).not.toContain('precise call-site map');
    expect(hiw).toContain('for supported cases - fixture-verified, with partial coverage that may miss call sites');
  });

  it('README MAP step does not claim every call site is found', () => {
    const readme = readRoot('README.md');
    expect(readme).not.toContain('finds every call site in your repo');
    expect(readme).toContain('finds the supported call sites in your repo that touch the changed package');
    expect(readme).toContain('limited to supported cases, and may miss call sites');
  });

  it('docs/concepts impact analysis does not promise exact, complete results', () => {
    const concepts = read('docs/concepts/page.tsx');
    expect(concepts).not.toContain('find exactly which call sites are affected');
    expect(concepts).toContain('identify the affected call sites among the usages it maps');
    expect(concepts).toContain('Coverage is partial, so some call sites may be missed.');
  });

  it('how-it-works scan description does not claim every import, require, and call expression', () => {
    const hiw = read('how-it-works/page.tsx');
    expect(hiw).not.toContain('find every import, require, and call expression');
    expect(hiw).toContain('find the supported import, require, and call expression patterns that touch the changed package');
    expect(hiw).toContain('Coverage is partial, so some usages may be missed.');
  });

  it('README usage mapper line does not claim every import and call site', () => {
    const readme = readRoot('README.md');
    expect(readme).not.toContain('find every import and call site per tracked package');
    expect(readme).toContain('find the supported imports and call sites per tracked package (partial coverage, may miss some)');
  });

  it('FAQ repository-handling answer is fixture-only and does not imply arbitrary repository support', () => {
    expect(faq).not.toContain('runs locally against repositories you point it at');
    expect(faq).toContain('only against the bundled fixture repositories');
    expect(faq).toContain('It refuses other repositories, including yours');
  });

  it('StageTabs does not say the diff ships in a PR or evidence is attached to a PR', () => {
    const tabs = read('components/StageTabs.tsx');
    expect(tabs).not.toContain('The full diff ships in the pull request');
    expect(tabs).not.toContain('evidence attached to PR');
    expect(tabs).not.toContain('never opened as a PR');
    expect(tabs).not.toContain('Green tests, or no pull request.');
    expect(tabs).toContain('local prepared-PR file; live GitHub pull-request delivery is not implemented');
    expect(tabs).toContain('evidence in local PR file');
  });

  it('StageTabs patch body does not repeat the same sentence opener', () => {
    const tabs = read('components/StageTabs.tsx');
    expect(tabs).not.toContain('The patch changes only what the break requires. The patch');
    expect(tabs).toContain('It is written as a unified diff, so review stays short.');
  });

  it('README does not claim exact mapping', () => {
    const readme = readRoot('README.md');
    expect(readme).not.toContain('maps exactly where your code is affected');
    expect(readme).toContain('maps the supported call sites where your code is affected (coverage is partial and may miss some)');
  });

  it('README opening separates the fixture-based prototype from planned capabilities', () => {
    const readme = readRoot('README.md');
    expect(readme).not.toContain('A GitHub App that watches third-party APIs');
    expect(readme).toContain('local, fixture-based prototype');
    expect(readme).toContain('Planned and not yet built: the GitHub App, continuous monitoring of live APIs and packages, a verified isolated sandbox, live pull-request delivery, and publishing its own failure rate in public');
  });

  it('deterministic fixes are described as rename-only on how-it-works and product pages', () => {
    const hiw = read('how-it-works/page.tsx');
    const product = read('product/page.tsx');
    for (const page of [hiw, product]) {
      expect(page).not.toContain('field removals, renames');
      expect(page).not.toContain('removals, renames, signature changes');
      expect(page).not.toContain('Deterministic fixes cover known patterns');
      expect(page).toContain('removals and signature changes are not handled');
    }
    expect(hiw).toContain('Deterministic fixes cover renames only');
    expect(product).toContain('only deterministic fix built today is a parameter or field rename');
  });

  it('README labels the LLM fallback as planned and not implemented', () => {
    const readme = readRoot('README.md');
    expect(readme).not.toContain('deterministic patterns first, LLM fallback');
    expect(readme).toContain('An LLM fallback is PLANNED and NOT implemented');
  });

  it('architecture doc separates implemented from planned and makes no false fallback claims', () => {
    const doc = readRoot('docs/technical-architecture.md');
    expect(doc).not.toContain('**Status:** As built');
    expect(doc).not.toContain('Every stage has a real path and an offline fallback');
    expect(doc).not.toContain('Docker sandbox falls back');
    expect(doc).not.toContain('LLM fix generation falls back to deterministic patterns');
    expect(doc).not.toContain('GitHub App PR falls back to local git branch');
    expect(doc).not.toContain('Deterministic + LLM fix generation');
    expect(doc).not.toContain('Live API contract probes');
    expect(doc).toContain('## Part 1: Implemented today');
    expect(doc).toContain('## Part 2: PLANNED architecture (not built)');
    expect(doc).toContain('Docker mode is blocked in code');
    expect(doc).toContain('The LLM path builds a prompt and returns nothing; it is not a working fallback');
    expect(doc).toContain('No pull request is opened on GitHub');
    expect(doc).toContain('there is no automatic fallback from one to another');
  });

  it('README does not present live contract probes or changelog watching as working', () => {
    const readme = readRoot('README.md');
    expect(readme).not.toContain('via npm registry, changelogs, and live API contract probes');
    expect(readme).not.toContain('- **Contract probes**: hit live API endpoints');
    expect(readme).toContain('changelog watching and live API contract probes are planned, not built');
  });
});
