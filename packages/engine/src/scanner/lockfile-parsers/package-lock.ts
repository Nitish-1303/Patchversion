export interface ParsedLockfilePackage {
  name: string;
  version: string;
  resolved?: string;
  integrity?: string;
  dependencies: Record<string, string>;
  isDev?: boolean;
}

export interface ParsedLockfile {
  lockfileVersion: string;
  packages: Map<string, ParsedLockfilePackage>;
}

/**
 * Robust, safe parser for npm package-lock.json across lockfileVersion 1, 2, and 3.
 */
export function parsePackageLock(content: string): ParsedLockfile {
  if (!content || !content.trim()) {
    throw new Error('package-lock.json is empty');
  }

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(content) as Record<string, unknown>;
  } catch (err) {
    throw new Error(`Malformed package-lock.json: ${err instanceof Error ? err.message : String(err)}`);
  }

  const lockfileVersion = String(json.lockfileVersion ?? '1');
  const packageMap = new Map<string, ParsedLockfilePackage>();

  // Lockfile v2 & v3 (uses top-level "packages" object)
  if (json.packages && typeof json.packages === 'object') {
    const pkgs = json.packages as Record<string, Record<string, unknown>>;
    for (const [key, pkgData] of Object.entries(pkgs)) {
      if (!key || key === '') continue; // Skip root package

      // Extract package name from "node_modules/foo" or nested "node_modules/foo/node_modules/bar"
      let name: string;
      const nmIndex = key.lastIndexOf('node_modules/');
      if (nmIndex !== -1) {
        name = key.slice(nmIndex + 'node_modules/'.length);
      } else {
        name = String(pkgData.name ?? key);
      }

      const version = String(pkgData.version ?? '');
      if (!name || !version) continue;

      const deps: Record<string, string> = {};
      if (pkgData.dependencies && typeof pkgData.dependencies === 'object') {
        for (const [depName, depVer] of Object.entries(pkgData.dependencies as Record<string, unknown>)) {
          deps[depName] = String(depVer);
        }
      }

      packageMap.set(name, {
        name,
        version,
        resolved: typeof pkgData.resolved === 'string' ? pkgData.resolved : undefined,
        integrity: typeof pkgData.integrity === 'string' ? pkgData.integrity : undefined,
        dependencies: deps,
        isDev: Boolean(pkgData.dev),
      });
    }
  }

  // Lockfile v1 fallback (or v2 dual-format)
  if (packageMap.size === 0 && json.dependencies && typeof json.dependencies === 'object') {
    const walkDeps = (depsObj: Record<string, Record<string, unknown>>) => {
      for (const [depName, data] of Object.entries(depsObj)) {
        if (!depName || !data) continue;
        const version = String(data.version ?? '');
        const subDeps: Record<string, string> = {};

        if (data.requires && typeof data.requires === 'object') {
          for (const [reqName, reqVer] of Object.entries(data.requires as Record<string, unknown>)) {
            subDeps[reqName] = String(reqVer);
          }
        }

        if (!packageMap.has(depName)) {
          packageMap.set(depName, {
            name: depName,
            version,
            resolved: typeof data.resolved === 'string' ? data.resolved : undefined,
            integrity: typeof data.integrity === 'string' ? data.integrity : undefined,
            dependencies: subDeps,
            isDev: Boolean(data.dev),
          });
        }

        if (data.dependencies && typeof data.dependencies === 'object') {
          walkDeps(data.dependencies as Record<string, Record<string, unknown>>);
        }
      }
    };

    walkDeps(json.dependencies as Record<string, Record<string, unknown>>);
  }

  return {
    lockfileVersion,
    packages: packageMap,
  };
}
