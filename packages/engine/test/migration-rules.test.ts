import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  MigrationRuleRegistry,
  defaultMigrationRegistry,
  LodashMethodRenameRule,
  MockpayPaymentMethodRule,
} from '../src/migration';

describe('Migration Rule Registry and AST Transforms', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patchbay-migration-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // Windows transient file lock tolerance
      }
    }
  });

  describe('1. MigrationRuleRegistry Resolution', () => {
    const registry = new MigrationRuleRegistry();

    test('finds applicable rules for lodash 3.10.1 -> 4.17.21', () => {
      const rules = registry.findApplicableRules('lodash', '3.10.1', '4.17.21');
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0].id).toBe('lodash-v3-to-v4-methods');
    });

    test('rejects rules for lodash when fromVersion is already 4.x', () => {
      const rules = registry.findApplicableRules('lodash', '4.17.20', '4.17.21');
      expect(rules.length).toBe(0);
    });

    test('finds applicable rules for mockpay 1.2.0 -> 2.0.0', () => {
      const rules = registry.findApplicableRules('mockpay', '1.2.0', '2.0.0');
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0].id).toBe('mockpay-v1-to-v2-payment-method');
    });

    test('returns empty array for packages with no registered rules', () => {
      const rules = registry.findApplicableRules('express', '4.18.0', '5.0.0');
      expect(rules).toEqual([]);
    });

    test('defaultMigrationRegistry is pre-populated', () => {
      expect(defaultMigrationRegistry.getAllRules().length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('2. LodashMethodRenameRule', () => {
    const rule = new LodashMethodRenameRule();

    test('fails precondition if package.json has no lodash dependency', async () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test-app' }));
      const result = await rule.execute({
        repoPath: tmpDir,
        packageName: 'lodash',
        fromVersion: '3.10.1',
        toVersion: '4.17.21',
      });

      expect(result.preconditionsSatisfied).toBe(false);
      expect(result.filesModified).toHaveLength(0);
      expect(result.errors?.[0]).toContain('Precondition failed');
    });

    test('transforms _.contains and _.pluck to _.includes and _.map with valid unified diff', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          name: 'test-app',
          dependencies: { lodash: '^3.10.1' },
        }),
      );

      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      const sampleCode = `import _ from 'lodash';

export function checkItems(list: string[], target: string) {
  const hasItem = _.contains(list, target);
  return hasItem;
}

export function extractNames(users: Array<{ name: string; id: number }>) {
  return _.pluck(users, 'name');
}
`;
      const sampleFile = path.join(srcDir, 'utils.ts');
      fs.writeFileSync(sampleFile, sampleCode);

      const result = await rule.execute({
        repoPath: tmpDir,
        packageName: 'lodash',
        fromVersion: '3.10.1',
        toVersion: '4.17.21',
        targetFiles: ['src/utils.ts'],
      });

      expect(result.preconditionsSatisfied).toBe(true);
      expect(result.postconditionsVerified).toBe(true);
      expect(result.filesModified).toContain('src/utils.ts');
      expect(result.unifiedDiff).toContain('-  const hasItem = _.contains(list, target);');
      expect(result.unifiedDiff).toContain('+  const hasItem = _.includes(list, target);');
      expect(result.unifiedDiff).toContain('-  return _.pluck(users, \'name\');');
      expect(result.unifiedDiff).toContain('+  return _.map(users, \'name\');');
      expect(result.diffHash).toMatch(/^[a-f0-9]{64}$/);
    });

    test('transforms named imports: import { contains, pluck } from "lodash"', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          name: 'test-app',
          dependencies: { lodash: '^3.10.1' },
        }),
      );

      const sampleCode = `import { contains, pluck } from 'lodash';

export function testNamed(items: string[]) {
  return contains(items, 'active') && pluck([{ a: 1 }], 'a');
}
`;
      const sampleFile = path.join(tmpDir, 'index.ts');
      fs.writeFileSync(sampleFile, sampleCode);

      const result = await rule.execute({
        repoPath: tmpDir,
        packageName: 'lodash',
        fromVersion: '3.10.1',
        toVersion: '4.17.21',
        targetFiles: ['index.ts'],
      });

      expect(result.preconditionsSatisfied).toBe(true);
      expect(result.unifiedDiff).toContain('import { includes, map } from \'lodash\';');
      expect(result.unifiedDiff).toContain('return includes(items, \'active\') && map([{ a: 1 }], \'a\');');
    });

    test('is idempotent when executed against already transformed code', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          name: 'test-app',
          dependencies: { lodash: '^3.10.1' },
        }),
      );

      const alreadyMigrated = `import _ from 'lodash';
export function check(list: string[]) {
  return _.includes(list, 'ok') && _.map(list, (x) => x.trim());
}
`;
      fs.writeFileSync(path.join(tmpDir, 'app.ts'), alreadyMigrated);

      const result = await rule.execute({
        repoPath: tmpDir,
        packageName: 'lodash',
        fromVersion: '3.10.1',
        toVersion: '4.17.21',
        targetFiles: ['app.ts'],
      });

      expect(result.filesModified).toHaveLength(0);
      expect(result.unifiedDiff).toBe('');
      expect(result.diffHash).toBe('');
    });
  });

  describe('3. MockpayPaymentMethodRule', () => {
    const rule = new MockpayPaymentMethodRule();

    test('transforms charges.create({ source: token }) to { payment_method: token }', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          name: 'billing-app',
          dependencies: { mockpay: '^1.0.0' },
        }),
      );

      const billingCode = `export async function processPayment(client: any, cardToken: string) {
  const charge = await client.charges.create({
    amount: 2500,
    currency: 'usd',
    source: cardToken,
    description: 'Invoice #1234',
  });
  return charge;
}
`;
      fs.writeFileSync(path.join(tmpDir, 'billing.ts'), billingCode);

      const result = await rule.execute({
        repoPath: tmpDir,
        packageName: 'mockpay',
        fromVersion: '1.2.0',
        toVersion: '2.0.0',
        targetFiles: ['billing.ts'],
      });

      expect(result.preconditionsSatisfied).toBe(true);
      expect(result.postconditionsVerified).toBe(true);
      expect(result.filesModified).toContain('billing.ts');
      expect(result.unifiedDiff).toContain('-    source: cardToken,');
      expect(result.unifiedDiff).toContain('+    payment_method: cardToken,');
      expect(result.diffHash).toMatch(/^[a-f0-9]{64}$/);
    });

    test('is idempotent when executed against code already using payment_method', async () => {
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          name: 'billing-app',
          dependencies: { mockpay: '^1.0.0' },
        }),
      );

      const modernCode = `export async function processPayment(client: any, cardToken: string) {
  return await client.charges.create({
    amount: 2500,
    payment_method: cardToken,
  });
}
`;
      fs.writeFileSync(path.join(tmpDir, 'billing.ts'), modernCode);

      const result = await rule.execute({
        repoPath: tmpDir,
        packageName: 'mockpay',
        fromVersion: '1.2.0',
        toVersion: '2.0.0',
        targetFiles: ['billing.ts'],
      });

      expect(result.filesModified).toHaveLength(0);
      expect(result.unifiedDiff).toBe('');
    });
  });
});
