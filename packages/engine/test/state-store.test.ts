import { StateStore } from '../src/state/store';
import fs from 'fs';
import path from 'path';

describe('StateStore', () => {
  const testDir = path.join(__dirname, '.test-state');
  let store: StateStore;

  beforeEach(() => {
    store = new StateStore(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('saves and retrieves watch targets', () => {
    store.saveWatchTarget({
      packageName: 'stripe',
      ecosystem: 'npm',
      lastCheckedAt: null,
      lastKnownVersion: '10.0.0',
    });
    const target = store.getWatchTarget('stripe');
    expect(target).not.toBeNull();
    expect(target!.packageName).toBe('stripe');
  });

  it('returns null for unknown targets', () => {
    expect(store.getWatchTarget('nonexistent')).toBeNull();
  });

  it('saves and retrieves change records', () => {
    store.saveChange({
      id: 'test-change-1',
      packageName: 'stripe',
      ecosystem: 'npm',
      fromVersion: '10.0.0',
      toVersion: '11.0.0',
      detectedAt: '2026-10-23T00:00:00Z',
      source: 'registry',
      sourceUrl: 'https://npmjs.com/stripe',
      rawNotes: 'Breaking change',
      classification: { isBreaking: true, confidence: 0.9, reason: 'major' },
      severity: 'breaking',
    });
    const change = store.getChange('test-change-1');
    expect(change).not.toBeNull();
    expect(change!.packageName).toBe('stripe');
  });

  it('handles repo ids and package names with slashes', () => {
    store.saveUsageMap({
      repoId: 'acme/payments',
      packageName: '@scope/pkg',
      mappedAt: '2026-10-23T00:00:00Z',
      callSites: [],
      totalFiles: 1,
      filesWithUsage: 0,
    });
    const map = store.getUsageMap('acme/payments', '@scope/pkg');
    expect(map).not.toBeNull();
    expect(map!.repoId).toBe('acme/payments');

    store.saveWatchTarget({
      packageName: '@scope/pkg',
      ecosystem: 'npm',
      lastCheckedAt: null,
      lastKnownVersion: '1.0.0',
    });
    expect(store.getWatchTarget('@scope/pkg')).not.toBeNull();
  });

  it('computes failure rate', () => {
    const rate = store.getFailureRate();
    expect(rate.totalProofs).toBe(0);
    expect(rate.rate).toBe(0);
  });
});
