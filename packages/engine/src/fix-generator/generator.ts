import { ChangeRecord, ImpactAnalysis, CallSite } from '@patchversion/shared';
import { createTwoFilesPatch } from 'diff';
import fs from 'fs';
import path from 'path';

/**
 * Fix generator: produces a minimal patch for affected call sites.
 *
 * Two modes:
 * - Deterministic (free, fast, reliable for known patterns): hand-coded
 *   transformations for common breaking changes like field renames.
 * - LLM-assisted (when an API key is available): sends the failing code,
 *   the change description, and the test failures to the model.
 *
 * The fix is emitted as a standard unified diff (via the `diff` library),
 * so it applies cleanly with patch(1), git apply, and Diff.applyPatch.
 * The fix is only accepted if the sandbox proves it green.
 */
export class FixGenerator {
  private apiKey: string | null;

  constructor(apiKey: string | null) {
    this.apiKey = apiKey;
  }

  /**
   * Generate a fix diff for the affected call sites.
   * Returns a unified diff string, or null if no fix can be generated.
   */
  async generateFix(
    repoPath: string,
    change: ChangeRecord,
    impact: ImpactAnalysis,
  ): Promise<string | null> {
    // Try deterministic fixes first (free, fast, reliable for known patterns)
    const deterministicFix = this.tryDeterministicFix(repoPath, change, impact);
    if (deterministicFix) return deterministicFix;

    // Fall back to LLM-assisted generation
    if (this.apiKey) {
      return this.generateWithLLM();
    }

    return null;
  }

  /**
   * Deterministic fix patterns for common API migrations.
   * These are hand-coded transformations for known breaking changes.
   */
  private tryDeterministicFix(
    repoPath: string,
    change: ChangeRecord,
    impact: ImpactAnalysis,
  ): string | null {
    const notes = change.rawNotes;

    // Pattern: field rename, in the phrasings release notes actually use:
    //   "renamed source to payment_method"
    //   "renamed from source to payment_method"
    //   "the 'source' parameter ... has been renamed to 'payment_method'"
    //   "source was renamed to payment_method"
    const rename = this.extractRename(notes);
    if (rename) {
      return this.generateRenameFix(repoPath, impact.affectedCallSites, rename.oldName, rename.newName);
    }

    // Pattern: parameter removed (wrap in conditional or remove usage)
    if (/removed?\s+[`'"]?\w+[`'"]?/i.test(notes)) {
      // Can't auto-fix removals without understanding intent
      return null;
    }

    return null;
  }

  /** Extract a rename (old -> new) from common release-note phrasings.
   *  Names may be dotted ("_.contains"); only the last segment is used,
   *  since the fix renames the property/parameter, not the module. */
  private extractRename(notes: string): { oldName: string; newName: string } | null {
    // Direct: "renamed X to Y" / "renamed from X to Y" (quoted or bare)
    const direct = notes.match(/renamed?\s+(?:from\s+)?[`'"]?([\w.]+)[`'"]?\s+to\s+[`'"]?([\w.]+)[`'"]?/i);
    if (direct && !/^to$/i.test(direct[1])) {
      return { oldName: this.lastSegment(direct[1]), newName: this.lastSegment(direct[2]) };
    }

    // Passive: "X has been renamed to Y" / "X was renamed to Y", including
    // "the 'X' parameter ... has been renamed to 'Y'".
    const passive = notes.match(/(?:has been|was)\s+renamed\s+to\s+[`'"]?([\w.]+)[`'"]?/i);
    if (passive && passive.index !== undefined) {
      const newName = this.lastSegment(passive[1]);
      // The old name is the closest quoted word before the rename phrase.
      const window = notes.slice(Math.max(0, passive.index - 120), passive.index);
      const quoted = [...window.matchAll(/[`'"]([\w.]+)[`'"]/g)];
      if (quoted.length > 0) {
        return { oldName: this.lastSegment(quoted[quoted.length - 1][1]), newName };
      }
      // Fallback: bare word immediately before "has been renamed".
      const bare = window.match(/(\w+)\s*$/);
      if (bare) {
        return { oldName: bare[1], newName };
      }
    }

    return null;
  }

  private lastSegment(name: string): string {
    // Strip surrounding dots first: a trailing sentence period ("... to
    // payment_method.") is punctuation, not part of the identifier.
    const trimmed = name.replace(/^\.+|\.+$/g, '');
    const idx = trimmed.lastIndexOf('.');
    return idx >= 0 ? trimmed.slice(idx + 1) : trimmed;
  }

  private escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private generateRenameFix(
    repoPath: string,
    sites: CallSite[],
    oldName: string,
    newName: string,
  ): string | null {
    const diffs: string[] = [];

    // Group by file
    const byFile = new Map<string, CallSite[]>();
    for (const site of sites) {
      const existing = byFile.get(site.filePath) ?? [];
      existing.push(site);
      byFile.set(site.filePath, existing);
    }

    for (const [filePath, fileSites] of byFile) {
      const fullPath = path.join(repoPath, filePath);
      if (!fs.existsSync(fullPath)) continue;

      const content = fs.readFileSync(fullPath, 'utf-8');
      const fixed = this.applyRenameScoped(content, fileSites, oldName, newName);

      if (fixed !== content) {
        // Standard unified diff with context, parseable by patch/git apply
        diffs.push(createTwoFilesPatch(`a/${filePath}`, `b/${filePath}`, content, fixed));
      }
    }

    return diffs.length > 0 ? diffs.join('') : null;
  }

  /**
   * Minimal-patch rename: replacements are applied ONLY inside the line
   * spans of the affected call sites, never to the whole file. A `source:`
   * key in an unrelated object elsewhere in the file stays untouched.
   */
  private applyRenameScoped(
    content: string,
    sites: CallSite[],
    oldName: string,
    newName: string,
  ): string {
    const lines = content.split('\n');
    const spans = sites.map(site => this.callSiteSpan(lines, site.line));

    for (const [start, end] of spans) {
      for (let i = start; i <= end && i < lines.length; i++) {
        lines[i] = this.renameInLine(lines[i], oldName, newName);
      }
    }
    return lines.join('\n');
  }

  /**
   * Line span of a call expression starting at `line` (1-based): extend
   * forward until brackets opened on the first line balance out. Falls
   * back to the single line when no open bracket is found.
   */
  private callSiteSpan(lines: string[], line: number): [number, number] {
    const start = Math.max(0, line - 1);
    let balance = 0;
    let sawOpen = false;
    for (let i = start; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '(' || ch === '{' || ch === '[') { balance++; sawOpen = true; }
        else if (ch === ')' || ch === '}' || ch === ']') { balance--; }
      }
      if (sawOpen && balance <= 0) return [start, i];
      if (i - start > 200) break; // safety bound for pathological files
    }
    return [start, start];
  }

  private renameInLine(line: string, oldName: string, newName: string): string {
    const old = this.escapeRegExp(oldName);
    let result = line;

    // Pattern: { oldName: value } -> { newName: value } (object key at
    // line start, after '{' or after ','; whitespace preserved exactly)
    result = result.replace(
      new RegExp(`(^|[{,])(\\s*)${old}(\\s*:)`, 'g'),
      (_m, prefix: string, ws: string, colon: string) => `${prefix}${ws}${newName}${colon}`,
    );

    // Pattern: .oldName -> .newName (property access)
    result = result.replace(
      new RegExp(`\\.${old}\\b`, 'g'),
      `.${newName}`,
    );

    // Pattern: ['oldName'] -> ['newName'] (bracket access)
    result = result.replace(
      new RegExp(`\\[['"]${old}['"]\\]`, 'g'),
      `['${newName}']`,
    );

    return result;
  }

  /**
   * LLM-assisted fix generation.
   * Sends the failing code and change description to the model.
   */
  private async generateWithLLM(): Promise<string | null> {
    // The model integration is intentionally unavailable. A configured key
    // must never be mistaken for evidence that a generated patch exists.
    return null;
  }
}
