import { ParsedLockfile, ParsedLockfilePackage } from './package-lock';

/**
 * Line-based streaming parser for Yarn lockfiles (supporting v1 classic and v2/v3 berry).
 * Implemented without external dependencies to avoid security issues or supply-chain risks.
 */
export function parseYarnLock(content: string): ParsedLockfile {
  if (!content || !content.trim()) {
    throw new Error('yarn.lock is empty');
  }

  const lines = content.split('\n');
  const packages = new Map<string, ParsedLockfilePackage>();
  let lockfileVersion = '1';

  let currentHeaders: string[] = [];
  let currentVersion = '';
  let currentResolved: string | undefined;
  let currentIntegrity: string | undefined;
  let currentDependencies: Record<string, string> = {};
  let inDependenciesBlock = false;

  const flushCurrent = () => {
    if (currentHeaders.length > 0 && currentVersion) {
      for (const header of currentHeaders) {
        // Normalize header: e.g. "@babel/core@^7.1.0" or "lodash@^4.17.21" or "foo@npm:1.0.0"
        let pkgName = header;
        // Strip quotes
        pkgName = pkgName.replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '');

        // Extract package name before the last '@'
        const atIdx = pkgName.lastIndexOf('@');
        if (atIdx > 0) {
          pkgName = pkgName.slice(0, atIdx);
        }

        if (!packages.has(pkgName)) {
          packages.set(pkgName, {
            name: pkgName,
            version: currentVersion,
            resolved: currentResolved,
            integrity: currentIntegrity,
            dependencies: { ...currentDependencies },
          });
        }
      }
    }

    currentHeaders = [];
    currentVersion = '';
    currentResolved = undefined;
    currentIntegrity = undefined;
    currentDependencies = {};
    inDependenciesBlock = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('#')) {
      if (line.includes('yarn lockfile v1')) {
        lockfileVersion = '1';
      }
      continue;
    }

    // Version header in Yarn berry: __metadata:\n  version: 6
    if (line.startsWith('version:') && (currentHeaders.length === 0 || currentHeaders.some((h) => h.includes('__metadata')))) {
      const match = line.match(/^version:\s*([0-9]+)/);
      if (match) {
        lockfileVersion = match[1];
        continue;
      }
    }

    // Top-level block header (unindented line ending with ':')
    if (!rawLine.startsWith(' ') && !rawLine.startsWith('\t') && line.endsWith(':')) {
      flushCurrent();
      const headerLine = line.slice(0, -1);
      // Can be comma-separated: "foo@^1.0.0", "foo@^1.2.0":
      currentHeaders = headerLine.split(',').map((h) => h.trim());
      continue;
    }

    // Property within a block (indented)
    if (rawLine.startsWith(' ') || rawLine.startsWith('\t')) {
      if (line.startsWith('dependencies:') || line.startsWith('optionalDependencies:')) {
        inDependenciesBlock = true;
        continue;
      }

      if (inDependenciesBlock) {
        // If sub-indented inside dependencies:
        const depMatch = line.match(/^"?([^":\s]+)"?:\s*"?([^"\r\n]+)"?$/);
        if (depMatch) {
          const depName = depMatch[1];
          let depVer = depMatch[2];
          if (depVer.startsWith('npm:')) depVer = depVer.slice(4);
          currentDependencies[depName] = depVer;
          continue;
        } else {
          // Out of dependencies block
          inDependenciesBlock = false;
        }
      }

      const verMatch = line.match(/^version\s+["']?([^"'\r\n]+)["']?$/) || line.match(/^version:\s+["']?([^"'\r\n]+)["']?$/);
      if (verMatch) {
        currentVersion = verMatch[1];
        continue;
      }

      const resMatch = line.match(/^resolved\s+["']?([^"'\r\n]+)["']?$/) || line.match(/^resolution:\s+["']?([^"'\r\n]+)["']?$/);
      if (resMatch) {
        currentResolved = resMatch[1];
        continue;
      }

      const intMatch = line.match(/^integrity\s+["']?([^"'\r\n]+)["']?$/) || line.match(/^checksum:\s+["']?([^"'\r\n]+)["']?$/);
      if (intMatch) {
        currentIntegrity = intMatch[1];
        continue;
      }
    }
  }

  flushCurrent();

  return {
    lockfileVersion,
    packages,
  };
}
