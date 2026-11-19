import { applyPatch, parsePatch } from 'diff';

export interface PatchedFileContent {
  path: string;
  content: string;
}

export interface ApplyUnifiedDiffResult {
  success: boolean;
  files: PatchedFileContent[];
  error?: string;
}

/**
 * Apply a unified diff to an in-memory map of base file contents.
 * Rejects path traversal, missing bases, failed hunks, and no-op results.
 */
export function applyUnifiedDiffToContents(
  baseFiles: Record<string, string>,
  diffText: string,
): ApplyUnifiedDiffResult {
  const trimmed = (diffText || '').replace(/\r\n/g, '\n').trim();
  if (!trimmed) {
    return { success: false, files: [], error: 'Patch diff is empty' };
  }

  let parsed;
  try {
    parsed = parsePatch(trimmed);
  } catch (err) {
    return {
      success: false,
      files: [],
      error: `Malformed unified diff: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!parsed.length) {
    return { success: false, files: [], error: 'Patch diff contains no file hunks' };
  }

  const out = new Map<string, string>();

  for (const patch of parsed) {
    const rawFile = patch.newFileName ?? patch.oldFileName;
    if (!rawFile || rawFile === '/dev/null') {
      return { success: false, files: [], error: 'Patch references an unsupported file path' };
    }
    const normalized = rawFile.replace(/^[ab]\//, '').replace(/\\/g, '/');
    if (!normalized || normalized.includes('..') || normalized.startsWith('/')) {
      return { success: false, files: [], error: `Diff attempts unsafe path: ${normalized}` };
    }

    const original = baseFiles[normalized];
    if (original === undefined) {
      return { success: false, files: [], error: `Target file does not exist at base revision: ${normalized}` };
    }

    const patched = applyPatch(original, patch);
    if (patched === false) {
      return { success: false, files: [], error: `Hunk failed to apply to ${normalized}` };
    }
    if (patched === original) {
      continue;
    }
    out.set(normalized, patched);
  }

  if (out.size === 0) {
    return { success: false, files: [], error: 'Patch produced an empty diff against the base revision' };
  }

  return {
    success: true,
    files: Array.from(out.entries()).map(([path, content]) => ({ path, content })),
  };
}

export function listPathsInUnifiedDiff(diffText: string): string[] {
  try {
    return parsePatch(diffText || '')
      .map((p) => (p.newFileName ?? p.oldFileName ?? '').replace(/^[ab]\//, ''))
      .filter((f) => f && f !== '/dev/null');
  } catch {
    return [];
  }
}
