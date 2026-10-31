import fs from 'fs';
import path from 'path';
import {
  RepositoryScanResult,
  FindingRecord,
  PackageManagerType,
  ProjectStructureType,
  DependencySourceLocation,
  LockfileRecord,
  ChangeRecord,
  ScanProvenance,
} from '@patchversion/shared';
import { assertSafeSymlink, ScanBudget, ScanResourceLimits, ScannerSecurityError } from './security';
import { parsePackageLock, ParsedLockfile } from './lockfile-parsers/package-lock';
import { parseYarnLock } from './lockfile-parsers/yarn-lock';
import { parsePnpmLock, parsePnpmWorkspace } from './lockfile-parsers/pnpm-lock';
import { detectFrameworks } from './framework-detector';
import { buildDependencyMap, RawManifestPackage } from './dependency-mapper';
import { UsageMapper } from '../usage-map/mapper';
import { analyzeImpact } from '../break-detector/impact-analyzer';

export interface IRepositoryFileProvider {
  getFileContent(filePath: string): Promise<string | null>;
  listFiles?(): Promise<string[]>;
  getBranchHeadSha?(branch?: string): Promise<string>;
}

export interface ScannerOptions {
  limits?: Partial<ScanResourceLimits>;
  knownChanges?: ChangeRecord[];
  monitoredPackages?: string[];
  branch?: string;
  commitSha?: string;
  repositoryFullName?: string;
}

/**
 * Enterprise Repository Scanner and Dependency Mapping Engine for TryPatchBay.
 * Analyzes repository structure, manifests, lockfiles, and AST call sites with
 * strict resource limits and zero code execution.
 */
export class RepositoryScanner {
  private mapper: UsageMapper;

  constructor() {
    this.mapper = new UsageMapper();
  }

  /**
   * Scans a local filesystem repository directory.
   */
  async scanLocalRepository(
    tenantId: string,
    repositoryId: string,
    repoPath: string,
    options?: ScannerOptions,
  ): Promise<RepositoryScanResult> {
    const budget = new ScanBudget(options?.limits);
    const resolvedRoot = path.resolve(repoPath);
    if (!fs.existsSync(resolvedRoot) || !fs.statSync(resolvedRoot).isDirectory()) {
      throw new ScannerSecurityError(
        `Repository path does not exist or is not a directory: ${repoPath}`,
        'INVALID_PATH',
      );
    }
    assertSafeSymlink(resolvedRoot, resolvedRoot);

    const warnings: string[] = [];
    const unsupportedFeatures: string[] = [];

    // 1. Detect Manifests
    const manifests: RawManifestPackage[] = [];
    const rootPkgPath = path.join(resolvedRoot, 'package.json');

    if (!fs.existsSync(rootPkgPath)) {
      warnings.push('Root package.json was not found in the repository.');
    } else {
      try {
        const stats = fs.statSync(rootPkgPath);
        budget.recordFile(stats.size);
        const content = fs.readFileSync(rootPkgPath, 'utf8');
        const pkg = JSON.parse(content);
        manifests.push(this.normalizeManifest('package.json', pkg, true));
      } catch (err) {
        warnings.push(`Failed to parse root package.json: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Detect Monorepo Structure and Workspace manifests
    let projectType: ProjectStructureType = 'single-package';
    const workspacePatterns: string[] = [];

    // Check pnpm-workspace.yaml
    const pnpmWsPath = path.join(resolvedRoot, 'pnpm-workspace.yaml');
    if (fs.existsSync(pnpmWsPath)) {
      projectType = 'pnpm-workspace';
      try {
        const stats = fs.statSync(pnpmWsPath);
        budget.recordFile(stats.size);
        const content = fs.readFileSync(pnpmWsPath, 'utf8');
        workspacePatterns.push(...parsePnpmWorkspace(content));
      } catch {
        warnings.push('Malformed pnpm-workspace.yaml; defaulted to packages/*');
        workspacePatterns.push('packages/*');
      }
    }

    // Check npm/yarn workspaces in root package.json
    if (manifests.length > 0 && manifests[0].isRoot) {
      const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
      if (rootPkg.workspaces) {
        projectType = projectType === 'pnpm-workspace' ? projectType : 'npm-workspace';
        const ws = rootPkg.workspaces;
        if (Array.isArray(ws)) {
          workspacePatterns.push(...ws);
        } else if (Array.isArray(ws.packages)) {
          workspacePatterns.push(...ws.packages);
        }
      }
    }

    // Check lerna.json
    const lernaPath = path.join(resolvedRoot, 'lerna.json');
    if (fs.existsSync(lernaPath)) {
      projectType = 'lerna';
    }

    // Discover nested workspace package.json files
    const discoveredDirs = this.discoverWorkspaceDirectories(resolvedRoot, workspacePatterns);
    if (discoveredDirs.length > 0 && projectType === 'single-package') {
      projectType = 'nested-packages';
    }

    for (const relDir of discoveredDirs) {
      const pkgPath = path.join(resolvedRoot, relDir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        try {
          const stats = fs.statSync(pkgPath);
          budget.recordFile(stats.size);
          const content = fs.readFileSync(pkgPath, 'utf8');
          const pkg = JSON.parse(content);
          manifests.push(this.normalizeManifest(path.join(relDir, 'package.json').replace(/\\/g, '/'), pkg, false, relDir));
        } catch (err) {
          warnings.push(`Failed to parse manifest at ${relDir}/package.json: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    // 2. Detect Lockfiles and Package Manager
    let packageManager: PackageManagerType = 'unknown';
    const parsedLockfiles: ParsedLockfile[] = [];
    const lockfileRecords: LockfileRecord[] = [];

    // Check package-lock.json
    const pkgLockPath = path.join(resolvedRoot, 'package-lock.json');
    if (fs.existsSync(pkgLockPath)) {
      packageManager = 'npm';
      try {
        const stats = fs.statSync(pkgLockPath);
        budget.recordFile(stats.size);
        const content = fs.readFileSync(pkgLockPath, 'utf8');
        const parsed = parsePackageLock(content);
        parsedLockfiles.push(parsed);
        lockfileRecords.push({
          type: 'package-lock',
          path: 'package-lock.json',
          formatVersion: parsed.lockfileVersion,
          entriesCount: parsed.packages.size,
        });
      } catch (err) {
        warnings.push(`Malformed package-lock.json: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Check pnpm-lock.yaml
    const pnpmLockPath = path.join(resolvedRoot, 'pnpm-lock.yaml');
    if (fs.existsSync(pnpmLockPath)) {
      packageManager = 'pnpm';
      try {
        const stats = fs.statSync(pnpmLockPath);
        budget.recordFile(stats.size);
        const content = fs.readFileSync(pnpmLockPath, 'utf8');
        const parsed = parsePnpmLock(content);
        parsedLockfiles.push(parsed);
        lockfileRecords.push({
          type: 'pnpm-lock',
          path: 'pnpm-lock.yaml',
          formatVersion: parsed.lockfileVersion,
          entriesCount: parsed.packages.size,
        });
      } catch (err) {
        warnings.push(`Malformed pnpm-lock.yaml: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Check yarn.lock
    const yarnLockPath = path.join(resolvedRoot, 'yarn.lock');
    if (fs.existsSync(yarnLockPath)) {
      packageManager = 'yarn';
      try {
        const stats = fs.statSync(yarnLockPath);
        budget.recordFile(stats.size);
        const content = fs.readFileSync(yarnLockPath, 'utf8');
        const parsed = parseYarnLock(content);
        parsedLockfiles.push(parsed);
        lockfileRecords.push({
          type: 'yarn-lock',
          path: 'yarn.lock',
          formatVersion: parsed.lockfileVersion,
          entriesCount: parsed.packages.size,
        });
      } catch (err) {
        warnings.push(`Malformed yarn.lock: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (packageManager === 'unknown' && manifests.length > 0) {
      packageManager = 'npm'; // Default convention for Node.js
    }

    // 3. Map AST Import Usages
    const allDepNames = new Set<string>();
    for (const m of manifests) {
      for (const k of Object.keys(m.dependencies)) allDepNames.add(k);
      for (const k of Object.keys(m.devDependencies)) allDepNames.add(k);
    }

    const astImports = new Map<string, DependencySourceLocation[]>();
    for (const pkgName of allDepNames) {
      try {
        const usage = this.mapper.mapPackageUsage(resolvedRoot, pkgName, repositoryId);
        if (usage.callSites.length > 0) {
          astImports.set(
            pkgName,
            usage.callSites.map((c) => ({
              filePath: c.filePath,
              line: c.line,
              column: c.column,
              symbol: c.exportedSymbol,
              callExpression: c.callExpression,
            })),
          );
        }
      } catch {
        // Continue if single package AST resolution hits edge-case
      }
    }

    // 4. Build Dependency Map & Graph
    const mapResult = buildDependencyMap({
      manifests,
      lockfiles: parsedLockfiles,
      packageManager,
      astImports,
    });

    // 5. Detect Frameworks
    const depMapForFrameworks = new Map<string, string>();
    for (const d of mapResult.dependencies) {
      depMapForFrameworks.set(d.name, d.resolvedVersion || d.declaredVersion);
    }
    const detectedFrameworks = detectFrameworks(depMapForFrameworks);

    // 6. Generate Findings against Known Changes & Monitored Targets
    const findings: FindingRecord[] = [];
    const knownChanges = options?.knownChanges ?? [];

    for (const change of knownChanges) {
      const matchedDep = mapResult.dependencies.find((d) => d.name === change.packageName);
      if (!matchedDep) continue;

      const callSites = matchedDep.importingFiles.map((s) => ({
        filePath: s.filePath,
        line: s.line,
        column: s.column,
        importStatement: `import from '${matchedDep.name}'`,
        callExpression: s.callExpression || matchedDep.name,
        packageName: matchedDep.name,
        exportedSymbol: s.symbol || 'default',
      }));

      const impact = analyzeImpact(change, {
        repoId: repositoryId,
        packageName: change.packageName,
        mappedAt: new Date().toISOString(),
        callSites,
        totalFiles: callSites.length,
        filesWithUsage: callSites.length > 0 ? 1 : 0,
      });

      if (impact.affectedCallSites.length > 0 || change.classification.isBreaking) {
        matchedDep.concerns.push({
          type: 'breaking_change',
          severity: 'critical',
          message: `Breaking upgrade from ${change.fromVersion} to ${change.toVersion} detected: ${change.classification.reason}`,
          evidence: `${impact.affectedCallSites.length} call site(s) directly impacted`,
        });

        findings.push({
          id: `finding_${change.packageName}_${change.fromVersion}_to_${change.toVersion}`,
          tenantId,
          repositoryId,
          packageName: change.packageName,
          fromVersion: change.fromVersion,
          toVersion: change.toVersion,
          isBreaking: change.classification.isBreaking,
          changeRecord: change,
          impactAnalysis: impact,
          status: 'open',
          sourceAnalysisPerformed: callSites.length > 0,
          analysisMode: callSites.length > 0 ? 'local-ast' : 'remote-manifest-only',
          createdAt: new Date().toISOString(),
        });
      }
    }

    const scanTimestamp = new Date().toISOString();
    const provenance: ScanProvenance = {
      repositoryFullName: options?.repositoryFullName || repositoryId,
      repositoryId,
      branch: options?.branch || 'main',
      commitSha: options?.commitSha || 'local-head',
      scannedAt: scanTimestamp,
      scannerVersion: '2.4.0',
      filesInspected: budget.getMetrics().filesScanned,
      filesSkipped: [],
      limitsReached: false,
      warnings,
      astAnalysisStatus: 'complete',
    };

    return {
      repositoryId,
      tenantId,
      scannedAt: scanTimestamp,
      projectType,
      packageManager,
      manifests: mapResult.manifestRecords,
      lockfiles: lockfileRecords,
      frameworks: detectedFrameworks.map((f) => ({ name: f.name, version: f.version, role: f.role })),
      totalDependencies: mapResult.dependencies.length,
      directCount: mapResult.directCount,
      transitiveCount: mapResult.transitiveCount,
      dependencies: mapResult.dependencies,
      graph: mapResult.graph,
      warnings,
      unsupportedFeatures,
      findings,
      provenance,
    };
  }

  /**
   * Scans a remote repository using an authorized file provider (e.g. GitHubClient).
   */
  async scanRemoteRepository(
    tenantId: string,
    repositoryId: string,
    provider: IRepositoryFileProvider,
    options?: ScannerOptions,
  ): Promise<RepositoryScanResult> {
    const warnings: string[] = [];
    const unsupportedFeatures: string[] = [];
    const manifests: RawManifestPackage[] = [];

    // 1. Fetch root package.json
    const rootPkgJson = await provider.getFileContent('package.json');
    if (!rootPkgJson) {
      warnings.push('Root package.json was not found in the remote repository.');
    } else {
      try {
        const pkg = JSON.parse(rootPkgJson);
        manifests.push(this.normalizeManifest('package.json', pkg, true));
      } catch (err) {
        warnings.push(`Failed to parse remote package.json: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 2. Fetch lockfiles
    let packageManager: PackageManagerType = 'npm';
    const parsedLockfiles: ParsedLockfile[] = [];
    const lockfileRecords: LockfileRecord[] = [];

    const pkgLockContent = await provider.getFileContent('package-lock.json');
    if (pkgLockContent) {
      packageManager = 'npm';
      try {
        const parsed = parsePackageLock(pkgLockContent);
        parsedLockfiles.push(parsed);
        lockfileRecords.push({
          type: 'package-lock',
          path: 'package-lock.json',
          formatVersion: parsed.lockfileVersion,
          entriesCount: parsed.packages.size,
        });
      } catch (err) {
        warnings.push(`Malformed remote package-lock.json: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const pnpmLockContent = await provider.getFileContent('pnpm-lock.yaml');
    if (pnpmLockContent) {
      packageManager = 'pnpm';
      try {
        const parsed = parsePnpmLock(pnpmLockContent);
        parsedLockfiles.push(parsed);
        lockfileRecords.push({
          type: 'pnpm-lock',
          path: 'pnpm-lock.yaml',
          formatVersion: parsed.lockfileVersion,
          entriesCount: parsed.packages.size,
        });
      } catch (err) {
        warnings.push(`Malformed remote pnpm-lock.yaml: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const yarnLockContent = await provider.getFileContent('yarn.lock');
    if (yarnLockContent) {
      packageManager = 'yarn';
      try {
        const parsed = parseYarnLock(yarnLockContent);
        parsedLockfiles.push(parsed);
        lockfileRecords.push({
          type: 'yarn-lock',
          path: 'yarn.lock',
          formatVersion: parsed.lockfileVersion,
          entriesCount: parsed.packages.size,
        });
      } catch (err) {
        warnings.push(`Malformed remote yarn.lock: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 3. Build Dependency Map & Graph
    const mapResult = buildDependencyMap({
      manifests,
      lockfiles: parsedLockfiles,
      packageManager,
    });

    const depMapForFrameworks = new Map<string, string>();
    for (const d of mapResult.dependencies) {
      depMapForFrameworks.set(d.name, d.resolvedVersion || d.declaredVersion);
    }
    const detectedFrameworks = detectFrameworks(depMapForFrameworks);

    // 4. Generate Findings
    const findings: FindingRecord[] = [];
    const knownChanges = options?.knownChanges ?? [];

    for (const change of knownChanges) {
      const matchedDep = mapResult.dependencies.find((d) => d.name === change.packageName);
      if (!matchedDep) continue;

      const impact = analyzeImpact(change, {
        repoId: repositoryId,
        packageName: change.packageName,
        mappedAt: new Date().toISOString(),
        callSites: [],
        totalFiles: 0,
        filesWithUsage: 0,
      });

      if (change.classification.isBreaking) {
        matchedDep.concerns.push({
          type: 'breaking_change',
          severity: 'critical',
          message: `Breaking upgrade from ${change.fromVersion} to ${change.toVersion} detected: ${change.classification.reason}`,
          evidence: `Declared in remote manifest with breaking version diff`,
        });

        findings.push({
          id: `finding_${change.packageName}_${change.fromVersion}_to_${change.toVersion}`,
          tenantId,
          repositoryId,
          packageName: change.packageName,
          fromVersion: change.fromVersion,
          toVersion: change.toVersion,
          isBreaking: change.classification.isBreaking,
          changeRecord: change,
          impactAnalysis: impact,
          status: 'open',
          sourceAnalysisPerformed: false,
          analysisMode: 'remote-manifest-only',
          createdAt: new Date().toISOString(),
        });
      }
    }

    let remoteSha = options?.commitSha;
    if (!remoteSha && provider.getBranchHeadSha) {
      try {
        remoteSha = await provider.getBranchHeadSha(options?.branch || 'main');
      } catch {
        remoteSha = 'remote-head';
      }
    }

    const scanTimestamp = new Date().toISOString();
    const filesFetched = (rootPkgJson ? 1 : 0) + (pkgLockContent ? 1 : 0) + (pnpmLockContent ? 1 : 0) + (yarnLockContent ? 1 : 0);
    const provenance: ScanProvenance = {
      repositoryFullName: options?.repositoryFullName || repositoryId,
      repositoryId,
      branch: options?.branch || 'main',
      commitSha: remoteSha || 'remote-head',
      scannedAt: scanTimestamp,
      scannerVersion: '2.4.0',
      filesInspected: filesFetched,
      filesSkipped: [],
      limitsReached: false,
      warnings,
      astAnalysisStatus: 'manifest-only',
    };

    return {
      repositoryId,
      tenantId,
      scannedAt: scanTimestamp,
      projectType: 'single-package',
      packageManager,
      manifests: mapResult.manifestRecords,
      lockfiles: lockfileRecords,
      frameworks: detectedFrameworks.map((f) => ({ name: f.name, version: f.version, role: f.role })),
      totalDependencies: mapResult.dependencies.length,
      directCount: mapResult.directCount,
      transitiveCount: mapResult.transitiveCount,
      dependencies: mapResult.dependencies,
      graph: mapResult.graph,
      warnings,
      unsupportedFeatures,
      findings,
      provenance,
    };
  }

  private normalizeManifest(
    relPath: string,
    raw: Record<string, unknown>,
    isRoot: boolean,
    workspaceName?: string,
  ): RawManifestPackage {
    const toRecord = (obj: unknown): Record<string, string> => {
      if (!obj || typeof obj !== 'object') return {};
      const res: Record<string, string> = {};
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        res[k] = String(v);
      }
      return res;
    };

    return {
      path: relPath,
      isRoot,
      workspaceName,
      name: String(raw.name ?? workspaceName ?? (isRoot ? 'root' : relPath)),
      version: String(raw.version ?? '0.0.0'),
      dependencies: toRecord(raw.dependencies),
      devDependencies: toRecord(raw.devDependencies),
      peerDependencies: toRecord(raw.peerDependencies),
      optionalDependencies: toRecord(raw.optionalDependencies),
    };
  }

  private discoverWorkspaceDirectories(repoRoot: string, patterns: string[]): string[] {
    const defaultSearchDirs = ['packages', 'apps', 'libs', 'modules'];
    const candidates = new Set<string>();

    for (const pat of patterns) {
      const cleanPat = pat.replace(/\/\*$/, '').replace(/\/$/, '');
      if (cleanPat && !cleanPat.includes('*')) {
        const fullDir = path.join(repoRoot, cleanPat);
        if (fs.existsSync(/*turbopackIgnore: true*/ fullDir)) {
          try {
            const subEntries = fs.readdirSync(/*turbopackIgnore: true*/ fullDir, { withFileTypes: true });
            for (const sub of subEntries) {
              if (sub.isDirectory() && sub.name !== 'node_modules' && !sub.name.startsWith('.')) {
                candidates.add(path.join(cleanPat, sub.name));
              }
            }
          } catch {
            // ignore
          }
        }
      }
    }

    // Default discovery if patterns didn't match anything
    if (candidates.size === 0) {
      for (const d of defaultSearchDirs) {
        const fullDir = path.join(/*turbopackIgnore: true*/ repoRoot, d);
        if (fs.existsSync(/*turbopackIgnore: true*/ fullDir)) {
          try {
            const subEntries = fs.readdirSync(/*turbopackIgnore: true*/ fullDir, { withFileTypes: true });
            for (const sub of subEntries) {
              if (sub.isDirectory() && sub.name !== 'node_modules' && !sub.name.startsWith('.')) {
                if (fs.existsSync(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ fullDir, sub.name, 'package.json'))) {
                  candidates.add(path.join(/*turbopackIgnore: true*/ d, sub.name));
                }
              }
            }
          } catch {
            // ignore
          }
        }
      }
    }

    return Array.from(candidates);
  }
}
