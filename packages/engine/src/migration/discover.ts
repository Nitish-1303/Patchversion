import semver from 'semver';
import type { ChangeRecord } from '@patchversion/shared';
import { defaultMigrationRegistry, MigrationRuleRegistry } from './registry';
import type { IMigrationRule } from './types';

export interface DiscoveredDependencyVersion {
  name: string;
  version: string;
}

/**
 * Derive supported migration ChangeRecords only from dependencies that are
 * actually present in the repository evidence. Never inject fixture packages.
 */
export function discoverSupportedMigrations(
  dependencies: DiscoveredDependencyVersion[],
  registry: MigrationRuleRegistry = defaultMigrationRegistry,
): ChangeRecord[] {
  const changes: ChangeRecord[] = [];
  const seen = new Set<string>();

  for (const dep of dependencies) {
    const installed = semver.coerce(dep.version)?.version;
    if (!installed) continue;

    for (const rule of registry.getAllRules()) {
      if (rule.packageName !== dep.name) continue;
      if (!semver.satisfies(installed, rule.fromVersionRange, { includePrerelease: true })) {
        continue;
      }

      const toVersion = canonicalTargetVersion(rule);
      if (!toVersion) continue;
      if (!rule.appliesTo(dep.name, installed, toVersion)) continue;

      const id = `discover-${rule.id}-${installed}-to-${toVersion}`;
      if (seen.has(id)) continue;
      seen.add(id);

      changes.push({
        id,
        packageName: dep.name,
        ecosystem: 'npm',
        fromVersion: installed,
        toVersion,
        detectedAt: new Date().toISOString(),
        source: 'registry',
        sourceUrl: `https://www.npmjs.com/package/${encodeURIComponent(dep.name)}`,
        rawNotes: rule.description,
        classification: {
          isBreaking: true,
          confidence: 0.85,
          affectedExports: [],
          reason: `Supported migration rule ${rule.id}: ${rule.description}`,
        },
        severity: 'breaking',
      });
    }
  }

  return changes;
}

function canonicalTargetVersion(rule: IMigrationRule): string | null {
  // Prefer the minimum version that satisfies the rule's to-range.
  const min = semver.minVersion(rule.toVersionRange);
  return min ? min.version : null;
}
