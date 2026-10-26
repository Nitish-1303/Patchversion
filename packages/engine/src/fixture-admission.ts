import fs from 'fs';
import path from 'path';

/** Canonical trusted fixture path, or null. This is admission, not isolation. */
export function resolveTrustedFixture(repoPath: string, trustedDirs: readonly string[]): string | null {
  try {
    const realRepo = fs.realpathSync(repoPath);
    return trustedDirs.some(dir => {
      try {
        const realDir = fs.realpathSync(dir);
        return realRepo === realDir || realRepo.startsWith(realDir + path.sep);
      } catch {
        return false;
      }
    }) ? realRepo : null;
  } catch {
    return null;
  }
}
