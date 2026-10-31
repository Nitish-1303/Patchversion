export { RepositoryScanner, type IRepositoryFileProvider, type ScannerOptions } from './repository-scanner';
export { buildDependencyMap, type BuildDependencyMapOptions, type BuiltDependencyMapResult } from './dependency-mapper';
export { detectFrameworks, classifyFrameworkRole, type FrameworkDetection } from './framework-detector';
export { parsePackageLock, type ParsedLockfile, type ParsedLockfilePackage } from './lockfile-parsers/package-lock';
export { parseYarnLock } from './lockfile-parsers/yarn-lock';
export { parsePnpmLock, parsePnpmWorkspace } from './lockfile-parsers/pnpm-lock';
export { assertSafePath, assertSafeSymlink, ScanBudget, ScannerSecurityError, DEFAULT_SCAN_LIMITS } from './security';
