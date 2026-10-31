import semver from 'semver';
import {
  MappedDependency,
  DependencyType,
  DependencyGraph,
  DependencyGraphNode,
  DependencyGraphEdge,
  DependencyConcern,
  DependencySourceLocation,
  ManifestRecord,
  PackageManagerType,
} from '@patchversion/shared';
import { ParsedLockfile } from './lockfile-parsers/package-lock';
import { classifyFrameworkRole } from './framework-detector';

export interface RawManifestPackage {
  path: string;
  isRoot: boolean;
  workspaceName?: string;
  name: string;
  version: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  optionalDependencies: Record<string, string>;
}

export interface BuildDependencyMapOptions {
  manifests: RawManifestPackage[];
  lockfiles: ParsedLockfile[];
  packageManager: PackageManagerType;
  astImports?: Map<string, DependencySourceLocation[]>; // packageName -> call sites
}

export interface BuiltDependencyMapResult {
  dependencies: MappedDependency[];
  graph: DependencyGraph;
  manifestRecords: ManifestRecord[];
  directCount: number;
  transitiveCount: number;
}

/**
 * Builds the comprehensive dependency graph and mapped dependencies list
 * combining manifests, lockfiles, and AST usage evidence.
 */
export function buildDependencyMap(options: BuildDependencyMapOptions): BuiltDependencyMapResult {
  const { manifests, lockfiles, packageManager, astImports = new Map() } = options;

  const manifestRecords: ManifestRecord[] = [];
  const directDepMap = new Map<
    string,
    {
      declaredVersion: string;
      type: DependencyType;
      manifestPath: string;
      workspaceName?: string;
    }[]
  >();

  // 1. Process manifests and collect all direct dependencies
  for (const m of manifests) {
    const totalDeps =
      Object.keys(m.dependencies).length +
      Object.keys(m.devDependencies).length +
      Object.keys(m.peerDependencies).length +
      Object.keys(m.optionalDependencies).length;

    manifestRecords.push({
      path: m.path,
      name: m.name,
      version: m.version,
      isRoot: m.isRoot,
      workspaceName: m.workspaceName,
      packageManager,
      dependenciesCount: totalDeps,
    });

    const addDirect = (name: string, spec: string, type: DependencyType) => {
      const list = directDepMap.get(name) ?? [];
      list.push({
        declaredVersion: spec,
        type,
        manifestPath: m.path,
        workspaceName: m.workspaceName,
      });
      directDepMap.set(name, list);
    };

    for (const [name, spec] of Object.entries(m.dependencies)) {
      addDirect(name, spec, 'direct-prod');
    }
    for (const [name, spec] of Object.entries(m.devDependencies)) {
      addDirect(name, spec, 'direct-dev');
    }
    for (const [name, spec] of Object.entries(m.peerDependencies)) {
      addDirect(name, spec, 'direct-peer');
    }
    for (const [name, spec] of Object.entries(m.optionalDependencies)) {
      addDirect(name, spec, 'direct-optional');
    }
  }

  // 2. Aggregate lockfile packages for transitive discovery & resolution
  const lockfileMap = new Map<string, { version: string; dependencies: Record<string, string> }>();
  for (const lf of lockfiles) {
    for (const [pkgName, pkgData] of lf.packages.entries()) {
      if (!lockfileMap.has(pkgName)) {
        lockfileMap.set(pkgName, {
          version: pkgData.version,
          dependencies: pkgData.dependencies,
        });
      }
    }
  }

  // 3. Construct MappedDependency records
  const mappedList: MappedDependency[] = [];
  const processedNames = new Set<string>();

  // Process Direct Dependencies
  for (const [name, declarations] of directDepMap.entries()) {
    processedNames.add(name);
    const primaryDecl = declarations[0];
    const lockEntry = lockfileMap.get(name);
    const resolvedVersion = lockEntry?.version;
    const isDev = primaryDecl.type === 'direct-dev';
    const role = classifyFrameworkRole(name, isDev);
    const importingFiles: DependencySourceLocation[] = astImports.get(name) ?? [];
    const directDependents = declarations.map((d) => d.manifestPath);
    const transitiveDeps = lockEntry ? Object.keys(lockEntry.dependencies) : [];

    const concerns: DependencyConcern[] = [];

    // Check for duplicate / conflicting declarations across workspaces
    if (declarations.length > 1) {
      const distinctRanges = Array.from(new Set(declarations.map((d) => d.declaredVersion)));
      if (distinctRanges.length > 1) {
        concerns.push({
          type: 'duplicate_version',
          severity: 'warning',
          message: `Conflicting versions declared across workspaces: ${declarations
            .map((d) => `${d.manifestPath} (${d.declaredVersion})`)
            .join(', ')}`,
          evidence: `Declared in multiple manifests with divergent semver ranges: ${distinctRanges.join(' vs ')}`,
        });
      }
    }

    // Check for unpinned or wide specifiers
    if (primaryDecl.declaredVersion === '*' || primaryDecl.declaredVersion === 'latest') {
      concerns.push({
        type: 'unsupported_specifier',
        severity: 'warning',
        message: `Package "${name}" uses wild range specifier "${primaryDecl.declaredVersion}", which causes nondeterministic builds.`,
        evidence: `Manifest ${primaryDecl.manifestPath} specifies "${name}": "${primaryDecl.declaredVersion}"`,
      });
    }

    // Check for invalid semver
    if (
      !semver.validRange(primaryDecl.declaredVersion) &&
      !primaryDecl.declaredVersion.startsWith('workspace:') &&
      !primaryDecl.declaredVersion.startsWith('file:') &&
      !primaryDecl.declaredVersion.startsWith('link:')
    ) {
      concerns.push({
        type: 'incompatible_range',
        severity: 'info',
        message: `Declared version "${primaryDecl.declaredVersion}" is a non-standard specifier.`,
        evidence: `Declared in ${primaryDecl.manifestPath}`,
      });
    }

    mappedList.push({
      id: `dep:${name}@${resolvedVersion || primaryDecl.declaredVersion}`,
      name,
      declaredVersion: primaryDecl.declaredVersion,
      resolvedVersion,
      type: primaryDecl.type,
      packageManager,
      manifestPath: primaryDecl.manifestPath,
      frameworkRole: role,
      importingFiles,
      directDependents,
      transitiveDependencies: transitiveDeps,
      concerns,
      evidence: {
        source: lockEntry ? 'lockfile' : 'manifest',
        detail: lockEntry
          ? `Resolved to ${resolvedVersion} via lockfile; declared as ${primaryDecl.declaredVersion} in ${primaryDecl.manifestPath}`
          : `Declared as ${primaryDecl.declaredVersion} in ${primaryDecl.manifestPath}`,
      },
    });
  }

  // Process Transitive Dependencies from Lockfiles
  for (const [name, lockData] of lockfileMap.entries()) {
    if (processedNames.has(name)) continue;
    processedNames.add(name);

    const importingFiles: DependencySourceLocation[] = astImports.get(name) ?? [];
    const concerns: DependencyConcern[] = [];

    // If an application source file directly imports a package only present transitively
    if (importingFiles.length > 0) {
      concerns.push({
        type: 'deprecated_pattern',
        severity: 'warning',
        message: `Phantom dependency: "${name}" is imported in source files but missing from package manifests.`,
        evidence: `Imported by ${importingFiles.map((s) => s.filePath).join(', ')} but resolved only via lockfile`,
      });
    }

    mappedList.push({
      id: `dep:${name}@${lockData.version}`,
      name,
      declaredVersion: lockData.version,
      resolvedVersion: lockData.version,
      type: 'transitive',
      packageManager,
      manifestPath: 'lockfile',
      frameworkRole: classifyFrameworkRole(name, false),
      importingFiles,
      directDependents: [],
      transitiveDependencies: Object.keys(lockData.dependencies),
      concerns,
      evidence: {
        source: 'lockfile',
        detail: `Transitive dependency resolved to ${lockData.version} via lockfile`,
      },
    });
  }

  // 4. Construct Dependency Graph (nodes and edges)
  const nodes: DependencyGraphNode[] = [];
  const edges: DependencyGraphEdge[] = [];
  const nodeSet = new Set<string>();

  // Add workspace nodes
  for (const m of manifestRecords) {
    const wsNodeId = `ws:${m.path}`;
    if (!nodeSet.has(wsNodeId)) {
      nodeSet.add(wsNodeId);
      nodes.push({
        id: wsNodeId,
        name: m.workspaceName || m.name || m.path,
        version: m.version || '0.0.0',
        type: 'workspace',
        direct: true,
      });
    }
  }

  // Add package nodes & manifest edges
  for (const dep of mappedList) {
    if (!nodeSet.has(dep.id)) {
      nodeSet.add(dep.id);
      nodes.push({
        id: dep.id,
        name: dep.name,
        version: dep.resolvedVersion || dep.declaredVersion,
        type: 'package',
        direct: dep.type !== 'transitive',
        role: dep.frameworkRole,
      });
    }

    // Edge from workspace to direct dependency
    if (dep.type !== 'transitive' && dep.manifestPath) {
      const wsNodeId = `ws:${dep.manifestPath}`;
      edges.push({
        source: wsNodeId,
        target: dep.id,
        relation: 'declared_in',
      });
    }

    // Edges from direct to transitive sub-dependencies
    for (const subDepName of dep.transitiveDependencies) {
      const subDep = mappedList.find((d) => d.name === subDepName);
      if (subDep) {
        edges.push({
          source: dep.id,
          target: subDep.id,
          relation: 'depends_on',
        });
      }
    }

    // Edges from source file to imported package
    for (const site of dep.importingFiles) {
      const fileNodeId = `file:${site.filePath}`;
      if (!nodeSet.has(fileNodeId)) {
        nodeSet.add(fileNodeId);
        nodes.push({
          id: fileNodeId,
          name: site.filePath,
          version: '',
          type: 'source-file',
          direct: false,
        });
      }
      edges.push({
        source: fileNodeId,
        target: dep.id,
        relation: 'imports',
      });
    }
  }

  const directCount = mappedList.filter((d) => d.type !== 'transitive').length;
  const transitiveCount = mappedList.filter((d) => d.type === 'transitive').length;

  return {
    dependencies: mappedList,
    graph: { nodes, edges },
    manifestRecords,
    directCount,
    transitiveCount,
  };
}
