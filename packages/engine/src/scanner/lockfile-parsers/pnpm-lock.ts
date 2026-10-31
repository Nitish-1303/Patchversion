import { ParsedLockfile, ParsedLockfilePackage } from './package-lock';

/**
 * Fast, secure indentation-based parser for pnpm-lock.yaml and pnpm-workspace.yaml.
 * Operates without third-party YAML libraries to maintain strict supply-chain boundaries
 * and prevent YAML deserialization exploits.
 */
export function parsePnpmLock(content: string): ParsedLockfile {
  if (!content || !content.trim()) {
    throw new Error('pnpm-lock.yaml is empty');
  }

  const lines = content.split('\n');
  const packages = new Map<string, ParsedLockfilePackage>();
  let lockfileVersion = '6.0';

  let currentSection: 'root' | 'packages' | 'importers' | 'dependencies' | 'devDependencies' = 'root';
  let currentPkgName: string | null = null;
  let currentPkgVersion: string | null = null;
  let currentPkgDependencies: Record<string, string> = {};
  let inPkgDependencies = false;

  const flushPackage = () => {
    if (currentPkgName && currentPkgVersion) {
      if (!packages.has(currentPkgName)) {
        packages.set(currentPkgName, {
          name: currentPkgName,
          version: currentPkgVersion,
          dependencies: { ...currentPkgDependencies },
        });
      }
    }
    currentPkgName = null;
    currentPkgVersion = null;
    currentPkgDependencies = {};
    inPkgDependencies = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    // Detect lockfile version
    if (trimmed.startsWith('lockfileVersion:')) {
      const match = trimmed.match(/^lockfileVersion:\s*['"]?([^'"\r\n]+)['"]?/);
      if (match) lockfileVersion = match[1];
      continue;
    }

    // Top-level sections (0-indent)
    if (!rawLine.startsWith(' ') && !rawLine.startsWith('\t') && trimmed.endsWith(':')) {
      flushPackage();
      const sectionName = trimmed.slice(0, -1);
      if (sectionName === 'packages') {
        currentSection = 'packages';
      } else if (sectionName === 'importers') {
        currentSection = 'importers';
      } else if (sectionName === 'dependencies') {
        currentSection = 'dependencies';
      } else if (sectionName === 'devDependencies') {
        currentSection = 'devDependencies';
      } else {
        currentSection = 'root';
      }
      continue;
    }

    // In top-level dependencies / devDependencies block
    if (currentSection === 'dependencies' || currentSection === 'devDependencies') {
      // e.g. "  lodash: 4.17.21" or "  lodash:" followed by "version: 4.17.21"
      const simpleMatch = trimmed.match(/^['"]?([^':\s]+)['"]?:\s*['"]?([0-9a-zA-Z._~+-]+)['"]?$/);
      if (simpleMatch) {
        const name = simpleMatch[1];
        const version = simpleMatch[2];
        if (!packages.has(name)) {
          packages.set(name, {
            name,
            version,
            dependencies: {},
          });
        }
      }
      continue;
    }

    // In packages section
    if (currentSection === 'packages') {
      // Package entries are indented by 2 spaces (or 1 tab)
      // Formats:
      // "  /lodash@4.17.21:" or "  /@babel/core@7.26.0:" or "  lodash@4.17.21:" or "  /lodash/4.17.21:"
      const isPkgHeader =
        (rawLine.startsWith('  ') && !rawLine.startsWith('    ')) ||
        (rawLine.startsWith('\t') && !rawLine.startsWith('\t\t'));

      if (isPkgHeader && trimmed.endsWith(':')) {
        flushPackage();
        const header = trimmed.slice(0, -1).replace(/^\/+/, '');

        // Match "name@version" or "@scope/name@version" or "name/version"
        const atIdx = header.lastIndexOf('@');
        const slashIdx = header.lastIndexOf('/');

        if (atIdx > 0) {
          currentPkgName = header.slice(0, atIdx).replace(/^\/+/, '');
          currentPkgVersion = header.slice(atIdx + 1);
        } else if (slashIdx > 0) {
          currentPkgName = header.slice(0, slashIdx).replace(/^\/+/, '');
          currentPkgVersion = header.slice(slashIdx + 1);
        }
        continue;
      }

      // Package properties (indented by 4 spaces or more)
      if (rawLine.startsWith('    ') || rawLine.startsWith('\t\t')) {
        if (trimmed.startsWith('dependencies:') || trimmed.startsWith('optionalDependencies:')) {
          inPkgDependencies = true;
          continue;
        }

        if (inPkgDependencies) {
          // If sub-dependency line: "      bar: 1.0.0"
          const depMatch = trimmed.match(/^['"]?([^':\s]+)['"]?:\s*['"]?([^'"\r\n]+)['"]?$/);
          if (depMatch) {
            currentPkgDependencies[depMatch[1]] = depMatch[2];
            continue;
          } else {
            inPkgDependencies = false;
          }
        }

        if (trimmed.startsWith('version:')) {
          const match = trimmed.match(/^version:\s*['"]?([^'"\r\n]+)['"]?/);
          if (match) currentPkgVersion = match[1];
          continue;
        }
      }
    }
  }

  flushPackage();

  return {
    lockfileVersion,
    packages,
  };
}

/**
 * Parses pnpm-workspace.yaml to discover monorepo package directories.
 */
export function parsePnpmWorkspace(content: string): string[] {
  if (!content) return [];
  const lines = content.split('\n');
  const packages: string[] = [];
  let inPackagesBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('packages:')) {
      inPackagesBlock = true;
      continue;
    }

    if (inPackagesBlock) {
      if (trimmed.startsWith('-')) {
        const pkgPattern = trimmed.slice(1).trim().replace(/^['"]|['"]$/g, '');
        if (pkgPattern) packages.push(pkgPattern);
      } else if (!line.startsWith(' ') && !line.startsWith('\t')) {
        inPackagesBlock = false;
      }
    }
  }

  return packages.length > 0 ? packages : ['packages/*'];
}
