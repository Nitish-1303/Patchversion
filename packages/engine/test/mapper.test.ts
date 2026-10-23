import { UsageMapper } from '../src/usage-map/mapper';
import fs from 'fs';
import path from 'path';

describe('UsageMapper', () => {
  const tmpRoot = path.join(__dirname, '.mapper-fixtures');

  beforeEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    fs.mkdirSync(path.join(tmpRoot, 'src'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  function writeFile(rel: string, content: string): void {
    const full = path.join(tmpRoot, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }

  it('maps CommonJS require() call sites', () => {
    writeFile('src/createCharge.js', [
      "const mockpay = require('mockpay');",
      '',
      'async function createCharge(amount, currency, source) {',
      '  return mockpay.charges.create({ amount, currency, source: source });',
      '}',
      '',
      'module.exports = { createCharge };',
    ].join('\n'));

    const map = new UsageMapper().mapPackageUsage(tmpRoot, 'mockpay', 'test/repo');
    expect(map.filesWithUsage).toBe(1);
    expect(map.callSites.length).toBe(1);
    expect(map.callSites[0].filePath).toBe(path.join('src', 'createCharge.js'));
    expect(map.callSites[0].line).toBe(4);
  });

  it('maps CommonJS destructured require() call sites', () => {
    writeFile('src/pay.js', [
      "const { charges } = require('mockpay');",
      '',
      'async function run(source) {',
      '  return charges.create({ amount: 100, source: source });',
      '}',
    ].join('\n'));

    const map = new UsageMapper().mapPackageUsage(tmpRoot, 'mockpay', 'test/repo');
    expect(map.callSites.length).toBe(1);
    expect(map.callSites[0].exportedSymbol).toBe('charges');
    expect(map.callSites[0].line).toBe(4);
  });

  it('maps ES module import call sites', () => {
    writeFile('src/charge.js', [
      "import mockpay from 'mockpay';",
      '',
      'export async function createCharge(amount, currency, source) {',
      '  return mockpay.charges.create({ amount, currency, source });',
      '}',
    ].join('\n'));

    const map = new UsageMapper().mapPackageUsage(tmpRoot, 'mockpay', 'test/repo');
    expect(map.filesWithUsage).toBe(1);
    expect(map.callSites.length).toBe(1);
    expect(map.callSites[0].line).toBe(4);
  });

  it('maps require() with property access', () => {
    writeFile('src/direct.js', [
      "const charges = require('mockpay').charges;",
      '',
      'charges.create({ amount: 1, source: "tok" });',
    ].join('\n'));

    const map = new UsageMapper().mapPackageUsage(tmpRoot, 'mockpay', 'test/repo');
    expect(map.callSites.length).toBe(1);
    expect(map.callSites[0].exportedSymbol).toBe('charges');
  });

  it('ignores files that do not use the package', () => {
    writeFile('src/unrelated.js', [
      "const fs = require('fs');",
      'fs.readFileSync("x");',
    ].join('\n'));

    const map = new UsageMapper().mapPackageUsage(tmpRoot, 'mockpay', 'test/repo');
    expect(map.filesWithUsage).toBe(0);
    expect(map.callSites.length).toBe(0);
  });

  it('does not record the require statement itself as a call site', () => {
    writeFile('src/only-require.js', [
      "const mockpay = require('mockpay');",
      'module.exports = mockpay;',
    ].join('\n'));

    const map = new UsageMapper().mapPackageUsage(tmpRoot, 'mockpay', 'test/repo');
    expect(map.callSites.length).toBe(0);
  });
});
