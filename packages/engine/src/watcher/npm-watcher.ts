import https from 'https';
import { ChangeRecord } from '@patchversion/shared';
import { StateStore } from '../state/store';
import { classifyChange } from '../break-detector/classifier';

/** Timeout for one registry request; a hung socket fails the poll. */
const REGISTRY_REQUEST_TIMEOUT_MS = 30_000;
/** Cap on buffered registry metadata (large package docs run a few MB). */
const MAX_REGISTRY_RESPONSE_BYTES = 16 * 1024 * 1024;

interface NpmRegistryResponse {
  'dist-tags': { latest: string };
  versions: Record<string, {
    version: string;
    description?: string;
    deprecated?: string;
  }>;
  time: Record<string, string>;
}

/**
 * Watches the npm registry for new versions of tracked packages.
 * Produces normalized ChangeRecords within the polling interval.
 */
export class NpmWatcher {
  private store: StateStore;
  private intervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private pollInFlight = false;

  constructor(store: StateStore, intervalMs = 3_600_000) {
    this.store = store;
    this.intervalMs = intervalMs;
  }

  start(): void {
    void this.pollAll();
    this.timer = setInterval(() => void this.pollAll(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Poll all watch targets once. Overlapping polls are skipped: a hung
   *  registry request must never stack unbounded concurrent polls. */
  async pollAll(): Promise<ChangeRecord[]> {
    if (this.pollInFlight) {
      this.store.logEvent('watcher_overlap_skipped', {});
      return [];
    }
    this.pollInFlight = true;
    try {
      return await this.pollAllInner();
    } finally {
      this.pollInFlight = false;
    }
  }

  private async pollAllInner(): Promise<ChangeRecord[]> {
    const targets = this.store.listWatchTargets();
    const changes: ChangeRecord[] = [];

    for (const target of targets) {
      if (target.ecosystem !== 'npm') continue;
      try {
        const change = await this.checkPackage(target.packageName, target.lastKnownVersion);
        if (change) {
          this.store.saveChange(change);
          changes.push(change);
          this.store.saveWatchTarget({
            ...target,
            lastCheckedAt: new Date().toISOString(),
            lastKnownVersion: change.toVersion,
          });
        } else {
          this.store.saveWatchTarget({
            ...target,
            lastCheckedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        this.store.logEvent('watcher_error', {
          packageName: target.packageName,
          error: String(err),
        });
      }
    }
    return changes;
  }

  /** Check a single package for a new version. */
  async checkPackage(packageName: string, lastKnownVersion: string | null): Promise<ChangeRecord | null> {
    const registry = await this.fetchRegistry(packageName);
    const latest = registry['dist-tags'].latest;

    if (lastKnownVersion === latest) return null;

    const versionInfo = registry.versions[latest];
    if (!versionInfo) return null;

    const releaseDate = registry.time[latest] ?? new Date().toISOString();
    // NOTE: only registry metadata is available here - the npm deprecation
    // message, not real release notes or changelogs. Classification for
    // non-deprecated releases rests on semver alone until a changelog
    // source is implemented.
    const rawNotes = versionInfo.deprecated ?? '';

    const classification = classifyChange(
      packageName,
      lastKnownVersion ?? '0.0.0',
      latest,
      rawNotes,
    );

    return {
      // Deterministic id: the same transition re-detected after a state
      // reset overwrites the same record instead of duplicating it.
      id: `npm-${packageName}-${lastKnownVersion ?? 'unknown'}-${latest}`,
      packageName,
      ecosystem: 'npm',
      fromVersion: lastKnownVersion ?? 'unknown',
      toVersion: latest,
      detectedAt: releaseDate,
      source: 'registry',
      sourceUrl: `https://www.npmjs.com/package/${packageName}/v/${latest}`,
      rawNotes,
      classification,
      severity: classification.isBreaking ? 'breaking' : 'unknown',
    };
  }

  private fetchRegistry(packageName: string): Promise<NpmRegistryResponse> {
    return new Promise((resolve, reject) => {
      const encoded = encodeURIComponent(packageName);
      const req = https.get(`https://registry.npmjs.org/${encoded}`, (res) => {
        let data = '';
        let bytes = 0;
        res.on('data', (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > MAX_REGISTRY_RESPONSE_BYTES) {
            req.destroy(
              new Error(`registry response for ${packageName} exceeded ${MAX_REGISTRY_RESPONSE_BYTES} bytes`),
            );
            return;
          }
          data += chunk.toString();
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Failed to parse registry response for ${packageName}`));
          }
        });
      });
      // A hung connection must fail the poll, not stall it forever: the
      // next interval depends on this promise settling.
      req.setTimeout(REGISTRY_REQUEST_TIMEOUT_MS, () => {
        req.destroy(new Error(`registry request for ${packageName} timed out after ${REGISTRY_REQUEST_TIMEOUT_MS}ms`));
      });
      req.on('error', reject);
    });
  }
}
