import path from 'path';
import fs from 'fs';

export interface ScanResourceLimits {
  maxFiles: number;
  maxFileSizeBytes: number;
  maxTotalBytes: number;
  maxDurationMs: number;
}

export const DEFAULT_SCAN_LIMITS: ScanResourceLimits = {
  maxFiles: 5000,
  maxFileSizeBytes: 2 * 1024 * 1024, // 2MB
  maxTotalBytes: 50 * 1024 * 1024,   // 50MB
  maxDurationMs: 60000,              // 60 seconds
};

export class ScannerSecurityError extends Error {
  public code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'ScannerSecurityError';
    this.code = code;
  }
}

/**
 * Validates that a requested file path does not attempt path traversal
 * and stays strictly within the permitted repository root directory.
 */
export function assertSafePath(repoRoot: string, relativeOrAbsolutePath: string): string {
  if (!relativeOrAbsolutePath || typeof relativeOrAbsolutePath !== 'string') {
    throw new ScannerSecurityError('Invalid path provided', 'INVALID_PATH');
  }

  // Reject null bytes, control characters, and suspicious URL schemes
  if (/[\0\r\n]/.test(relativeOrAbsolutePath) || /^[a-z]+:\/\//i.test(relativeOrAbsolutePath)) {
    throw new ScannerSecurityError('Path contains forbidden characters or protocol scheme', 'FORBIDDEN_CHARACTERS');
  }

  const resolvedRoot = path.resolve(repoRoot);
  const resolvedTarget = path.isAbsolute(relativeOrAbsolutePath)
    ? path.resolve(relativeOrAbsolutePath)
    : path.resolve(resolvedRoot, relativeOrAbsolutePath);

  // Must start with resolved root
  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(resolvedRoot + path.sep)) {
    throw new ScannerSecurityError(
      `Path traversal attempt detected: "${relativeOrAbsolutePath}" escapes repository root`,
      'PATH_TRAVERSAL_DETECTED',
    );
  }

  return resolvedTarget;
}

/**
 * Validates symlink safety: if the file exists as a symlink, ensures its realpath
 * remains within the repository root.
 */
export function assertSafeSymlink(repoRoot: string, targetPath: string): void {
  const resolvedRoot = path.resolve(repoRoot);
  try {
    const lstat = fs.lstatSync(targetPath);
    if (lstat.isSymbolicLink()) {
      const real = fs.realpathSync(targetPath);
      if (real !== resolvedRoot && !real.startsWith(resolvedRoot + path.sep)) {
        throw new ScannerSecurityError(
          `Symlink target escapes repository boundary: "${targetPath}" -> "${real}"`,
          'SYMLINK_ESCAPE_DETECTED',
        );
      }
    }
  } catch (err) {
    if (err instanceof ScannerSecurityError) throw err;
    // Non-existent files or permission errors will be handled during read
  }
}

/**
 * Resource tracker to enforce scan time and memory bounds.
 */
export class ScanBudget {
  private startTime: number;
  private filesScanned: number = 0;
  private totalBytesRead: number = 0;
  private limits: ScanResourceLimits;

  constructor(limits?: Partial<ScanResourceLimits>) {
    this.limits = { ...DEFAULT_SCAN_LIMITS, ...limits };
    this.startTime = Date.now();
  }

  checkDuration(): void {
    const elapsed = Date.now() - this.startTime;
    if (elapsed > this.limits.maxDurationMs) {
      throw new ScannerSecurityError(
        `Repository scan exceeded maximum allowed duration of ${this.limits.maxDurationMs}ms`,
        'SCAN_TIMEOUT_EXCEEDED',
      );
    }
  }

  recordFile(fileSizeBytes: number): void {
    this.checkDuration();

    this.filesScanned++;
    if (this.filesScanned > this.limits.maxFiles) {
      throw new ScannerSecurityError(
        `Repository scan exceeded maximum allowed file count of ${this.limits.maxFiles}`,
        'MAX_FILES_EXCEEDED',
      );
    }

    if (fileSizeBytes > this.limits.maxFileSizeBytes) {
      throw new ScannerSecurityError(
        `File size ${fileSizeBytes} bytes exceeds limit of ${this.limits.maxFileSizeBytes} bytes`,
        'MAX_FILE_SIZE_EXCEEDED',
      );
    }

    this.totalBytesRead += fileSizeBytes;
    if (this.totalBytesRead > this.limits.maxTotalBytes) {
      throw new ScannerSecurityError(
        `Total scan bytes ${this.totalBytesRead} exceeds limit of ${this.limits.maxTotalBytes} bytes`,
        'MAX_TOTAL_BYTES_EXCEEDED',
      );
    }
  }

  getMetrics(): { filesScanned: number; totalBytesRead: number; elapsedMs: number } {
    return {
      filesScanned: this.filesScanned,
      totalBytesRead: this.totalBytesRead,
      elapsedMs: Date.now() - this.startTime,
    };
  }
}
