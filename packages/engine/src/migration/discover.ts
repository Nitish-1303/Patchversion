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

      const offlineVersions = offlineVersionsFromFileSpec(
        dep.name,
        dep.version,
        installed,
        toVersion,
      );

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
          affectedExports: rule.affectedExports ? [...rule.affectedExports] : [],
          reason: `Supported migration rule ${rule.id}: ${rule.description}`,
        },
        severity: 'breaking',
        ...(offlineVersions ? { offlineVersions } : {}),
      });
    }
  }

  return changes;
}

/**
 * When a dependency is installed via `file:vendor/<pkg>-<ver>`, preserve those
 * local paths so isolated proof can install without inventing registry packages.
 * Does not invent findings — only annotates evidence already present in the manifest.
 */
function offlineVersionsFromFileSpec(
  packageName: string,
  versionSpec: string,
  installed: string,
  toVersion: string,
): Record<string, string> | undefined {
  const match = /^file:(.+)$/i.exec(versionSpec.trim());
  if (!match) return undefined;

  const fromPath = match[1].replace(/\\/g, '/');
  let toPath: string;
  const installedToken = `${packageName}-${installed}`;
  const targetToken = `${packageName}-${toVersion}`;
  if (fromPath.includes(installedToken)) {
    toPath = fromPath.replace(installedToken, targetToken);
  } else if (/-\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]*)?$/.test(fromPath)) {
    toPath = fromPath.replace(/-\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]*)?$/, `-${toVersion}`);
  } else {
    toPath = pathPosixJoin('vendor', targetToken);
  }

  return { [installed]: fromPath, [toVersion]: toPath };
}

function pathPosixJoin(...parts: string[]): string {
  return parts.join('/').replace(/\/+/g, '/');
}

function canonicalTargetVersion(rule: IMigrationRule): string | null {
  // Prefer the minimum version that satisfies the rule's to-range.
  const min = semver.minVersion(rule.toVersionRange);
  return min ? min.version : null;
}
