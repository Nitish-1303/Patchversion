import {
  ProviderRegistry,
  NpmProviderAdapter,
  StripeApiProviderAdapter,
} from '../src/watcher/provider-adapter';
import { WatchTargetRecord } from '@patchversion/shared';

describe('ProviderAdapter & ProviderRegistry', () => {
  test('ProviderRegistry singleton registers default npm and stripe adapters', () => {
    const registry = ProviderRegistry.getInstance();
    expect(registry.get('npm')).toBeDefined();
    expect(registry.get('stripe')).toBeDefined();
    expect(registry.get('remote-api')).toBeDefined();

    const adapters = registry.list();
    expect(adapters.length).toBeGreaterThanOrEqual(2);
    expect(adapters.some((a) => a.name === 'npm')).toBe(true);
    expect(adapters.some((a) => a.name === 'stripe')).toBe(true);
  });

  test('StripeApiProviderAdapter detects breaking version bump', async () => {
    const adapter = new StripeApiProviderAdapter();
    const target: WatchTargetRecord = {
      id: 'target_stripe_1',
      tenantId: 'ten_test',
      packageName: 'stripe',
      ecosystem: 'remote-api',
      currentVersion: '2020-08-27',
      latestVersion: '2020-08-27',
      lastCheckedAt: new Date().toISOString(),
      status: 'up_to_date',
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const change = await adapter.checkTarget(target);
    expect(change).not.toBeNull();
    expect(change?.packageName).toBe('stripe');
    expect(change?.ecosystem).toBe('remote-api');
    expect(change?.fromVersion).toBe('2020-08-27');
    expect(change?.classification.confidence).toBeGreaterThan(0.8);
    expect(change?.source).toBe('spec-diff');
  });

  test('StripeApiProviderAdapter returns null when target is already up-to-date', async () => {
    const adapter = new StripeApiProviderAdapter();
    const target: WatchTargetRecord = {
      id: 'target_stripe_2',
      tenantId: 'ten_test',
      packageName: 'stripe',
      ecosystem: 'remote-api',
      currentVersion: '2024-06-20',
      latestVersion: '2024-06-20',
      lastCheckedAt: new Date().toISOString(),
      status: 'up_to_date',
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const change = await adapter.checkTarget(target);
    expect(change).toBeNull();
  });

  test('StripeApiProviderAdapter correctly classifies breaking upgrade notes', () => {
    const adapter = new StripeApiProviderAdapter();
    const classification = adapter.classifyBreakingChanges(
      'stripe',
      '2022-11-15',
      '2023-10-16',
      'Breaking change: Legacy source parameter on Customer creation removed; replaced by payment_method.',
    );

    expect(classification.isBreaking).toBe(true);
    expect(classification.affectedExports).toContain('source');
  });

  test('NpmProviderAdapter classifies breaking semver bumps', () => {
    const adapter = new NpmProviderAdapter();
    const classification = adapter.classifyBreakingChanges(
      'lodash',
      '3.10.1',
      '4.0.0',
      'BREAKING CHANGE: Removed _.contains, renamed to _.includes',
    );

    expect(classification.isBreaking).toBe(true);
    expect(classification.confidence).toBeGreaterThanOrEqual(0.8);
  });
});
