import https from 'https';
import { ChangeRecord, ChangeClassification, WatchTargetRecord } from '@patchversion/shared';
import { classifyChange } from '../break-detector/classifier';

export interface IProviderAdapter {
  readonly name: string;
  readonly ecosystem: 'npm' | 'pypi' | 'remote-api';
  checkTarget(target: WatchTargetRecord): Promise<ChangeRecord | null>;
  fetchChangelog?(packageName: string, fromVersion: string, toVersion: string): Promise<string>;
  classifyBreakingChanges(packageName: string, fromVersion: string, toVersion: string, rawNotes: string): ChangeClassification;
}

export class ProviderRegistry {
  private static instance: ProviderRegistry | null = null;
  private adapters = new Map<string, IProviderAdapter>();

  static getInstance(): ProviderRegistry {
    if (!this.instance) {
      this.instance = new ProviderRegistry();
      this.instance.register(new NpmProviderAdapter());
      this.instance.register(new StripeApiProviderAdapter());
    }
    return this.instance;
  }

  register(adapter: IProviderAdapter): void {
    this.adapters.set(adapter.name.toLowerCase(), adapter);
    this.adapters.set(adapter.ecosystem.toLowerCase(), adapter);
    this.adapters.set(`${adapter.ecosystem.toLowerCase()}:${adapter.name.toLowerCase()}`, adapter);
  }

  get(key: string): IProviderAdapter | undefined {
    return this.adapters.get(key.toLowerCase());
  }

  list(): IProviderAdapter[] {
    const unique = new Set<IProviderAdapter>();
    for (const a of this.adapters.values()) {
      unique.add(a);
    }
    return Array.from(unique);
  }
}

/**
 * Adapter for npm package registry version monitoring.
 */
export class NpmProviderAdapter implements IProviderAdapter {
  readonly name = 'npm';
  readonly ecosystem = 'npm' as const;

  classifyBreakingChanges(packageName: string, fromVersion: string, toVersion: string, rawNotes: string): ChangeClassification {
    return classifyChange(packageName, fromVersion, toVersion, rawNotes);
  }

  async checkTarget(target: WatchTargetRecord): Promise<ChangeRecord | null> {
    const registry = await this.fetchRegistry(target.packageName);
    const latest = registry['dist-tags']?.latest;
    if (!latest || target.currentVersion === latest) {
      return null;
    }

    const versionInfo = registry.versions[latest];
    if (!versionInfo) return null;

    const fromVersion = target.currentVersion || '0.0.0';
    const rawNotes = versionInfo.deprecated ?? versionInfo.description ?? `Version bump to ${latest}`;
    const classification = this.classifyBreakingChanges(target.packageName, fromVersion, latest, rawNotes);

    return {
      id: `npm-${target.packageName}-${fromVersion}-${latest}`,
      packageName: target.packageName,
      ecosystem: 'npm',
      fromVersion,
      toVersion: latest,
      detectedAt: new Date().toISOString(),
      source: 'registry',
      sourceUrl: `https://registry.npmjs.org/${encodeURIComponent(target.packageName)}`,
      rawNotes,
      classification,
      severity: classification.isBreaking ? 'breaking' : 'feature',
    };
  }

  private fetchRegistry(packageName: string): Promise<{
    'dist-tags': { latest: string };
    versions: Record<string, { version: string; description?: string; deprecated?: string }>;
  }> {
    return new Promise((resolve, reject) => {
      const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
      const req = https.get(
        url,
        {
          headers: { Accept: 'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8' },
          timeout: 15_000,
        },
        (res) => {
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`npm registry returned HTTP ${res.statusCode} for ${packageName}`));
          }
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => {
            try {
              const body = Buffer.concat(chunks).toString('utf8');
              resolve(JSON.parse(body));
            } catch (err) {
              reject(err);
            }
          });
        },
      );
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timed out requesting ${packageName} from npm registry`));
      });
    });
  }
}

/**
 * Adapter for Stripe API version changes and breaking schema updates.
 */
export class StripeApiProviderAdapter implements IProviderAdapter {
  readonly name = 'stripe';
  readonly ecosystem = 'remote-api' as const;

  // Documented Stripe API versions and breaking upgrade notes
  private static readonly STRIPE_VERSIONS: Record<string, {
    date: string;
    breaking: boolean;
    reason: string;
    affectedEndpoints: string[];
    affectedExports: string[];
  }> = {
    '2022-11-15': {
      date: '2022-11-15',
      breaking: true,
      reason: 'Breaking change: `charges.data` on PaymentIntent is deprecated; use `latest_charge` instead.',
      affectedEndpoints: ['/v1/payment_intents', '/v1/charges'],
      affectedExports: ['charges', 'latest_charge'],
    },
    '2023-10-16': {
      date: '2023-10-16',
      breaking: true,
      reason: 'Breaking change: Legacy `source` parameter on Customer creation removed; replaced by `payment_method`.',
      affectedEndpoints: ['/v1/customers', '/v1/payment_methods'],
      affectedExports: ['source', 'payment_method'],
    },
    '2024-04-10': {
      date: '2024-04-10',
      breaking: true,
      reason: 'Breaking change: `plan` field on Subscriptions removed in favor of `price`.',
      affectedEndpoints: ['/v1/subscriptions'],
      affectedExports: ['plan', 'price'],
    },
    '2024-06-20': {
      date: '2024-06-20',
      breaking: false,
      reason: 'Non-breaking additions: New payment method types for SEPA and iDEAL.',
      affectedEndpoints: ['/v1/payment_intents'],
      affectedExports: [],
    },
  };

  classifyBreakingChanges(packageName: string, fromVersion: string, toVersion: string, rawNotes: string): ChangeClassification {
    const lower = rawNotes.toLowerCase();
    const isBreaking = lower.includes('breaking') || lower.includes('removed') || lower.includes('deprecated');
    const affectedExports: string[] = [];
    if (lower.includes('charges')) affectedExports.push('charges');
    if (lower.includes('source')) affectedExports.push('source');
    if (lower.includes('plan')) affectedExports.push('plan');

    return {
      isBreaking,
      confidence: 0.95,
      affectedEndpoints: ['/v1/payment_intents', '/v1/customers'],
      affectedExports,
      reason: rawNotes,
    };
  }

  async checkTarget(target: WatchTargetRecord): Promise<ChangeRecord | null> {
    const versions = Object.keys(StripeApiProviderAdapter.STRIPE_VERSIONS).sort();
    const latestVersion = versions[versions.length - 1];
    const currentVersion = target.currentVersion || '2020-08-27';

    if (currentVersion === latestVersion) {
      return null;
    }

    const versionMeta = StripeApiProviderAdapter.STRIPE_VERSIONS[latestVersion];
    const rawNotes = versionMeta.reason;

    return {
      id: `stripe-api-${currentVersion}-${latestVersion}`,
      packageName: 'stripe',
      ecosystem: 'remote-api',
      fromVersion: currentVersion,
      toVersion: latestVersion,
      detectedAt: new Date().toISOString(),
      source: 'spec-diff',
      sourceUrl: 'https://docs.stripe.com/upgrades',
      rawNotes,
      classification: {
        isBreaking: versionMeta.breaking,
        confidence: 0.95,
        affectedEndpoints: versionMeta.affectedEndpoints,
        affectedExports: versionMeta.affectedExports,
        reason: versionMeta.reason,
      },
      severity: versionMeta.breaking ? 'breaking' : 'feature',
    };
  }
}
