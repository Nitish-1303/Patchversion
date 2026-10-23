import { ChangeRecord, ImpactAnalysis, CallSite } from '@patchversion/shared';
import fs from 'fs';
import path from 'path';

/**
 * Fix generator: produces a minimal patch for affected call sites.
 *
 * Two modes:
 * - LLM-assisted (when an API key is available): sends the failing code,
 *   the change description, and the test failures to the model and asks
 *   for a minimal diff.
 * - Deterministic: for known migration patterns (e.g., field renames),
 *   applies a mechanical transformation.
 *
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
      return this.generateWithLLM(repoPath, change, impact);
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
    const notes = change.rawNotes.toLowerCase();

    // Pattern: field rename (e.g., 'source' -> 'payment_method' in Stripe)
    const renameMatch = notes.match(/renamed?\s+[`'"]?(\w+)[`'"]?\s+to\s+[`'"]?(\w+)[`'"]?/i);
    if (renameMatch) {
      const [, oldName, newName] = renameMatch;
      return this.generateRenameFix(repoPath, impact.affectedCallSites, oldName, newName);
    }

    // Pattern: parameter removed (wrap in conditional or remove usage)
    const removedMatch = notes.match(/removed?\s+[`'"]?(\w+)[`'"]?/i);
    if (removedMatch) {
      // Can't auto-fix removals without understanding intent
      return null;
    }

    return null;
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
      const fixed = this.applyRename(content, oldName, newName);

      if (fixed !== content) {
        diffs.push(this.createUnifiedDiff(filePath, content, fixed));
      }
    }

    return diffs.length > 0 ? diffs.join('\n') : null;
  }

  private applyRename(content: string, oldName: string, newName: string): string {
    // Rename object property assignments and accesses
    // This is intentionally simple - handles the most common patterns
    let result = content;

    // Pattern: { oldName: value } -> { newName: value }
    result = result.replace(
      new RegExp(`(\\{[^}]*?)\\b${oldName}\\s*:`, 'g'),
      `$1${newName}:`,
    );

    // Pattern: .oldName -> .newName (property access)
    result = result.replace(
      new RegExp(`\\.${oldName}\\b`, 'g'),
      `.${newName}`,
    );

    // Pattern: ['oldName'] -> ['newName'] (bracket access)
    result = result.replace(
      new RegExp(`\\[['"]${oldName}['"]\\]`, 'g'),
      `['${newName}']`,
    );

    return result;
  }

  /**
   * LLM-assisted fix generation.
   * Sends the failing code and change description to the model.
   */
  private async generateWithLLM(
    repoPath: string,
    change: ChangeRecord,
    impact: ImpactAnalysis,
  ): Promise<string | null> {
    // Build the prompt from affected call sites
    const siteContexts = impact.affectedCallSites.map((site: CallSite) => {
      const fullPath = path.join(repoPath, site.filePath);
      if (!fs.existsSync(fullPath)) return null;
      const lines = fs.readFileSync(fullPath, 'utf-8').split('\n');
      const start = Math.max(0, site.line - 5);
      const end = Math.min(lines.length, site.line + 5);
      return {
        file: site.filePath,
        line: site.line,
        context: lines.slice(start, end).join('\n'),
        callExpression: site.callExpression,
      };
    }).filter(Boolean);

    if (siteContexts.length === 0) return null;

    const prompt = this.buildFixPrompt(change, siteContexts);

    // TODO: Call Anthropic API when key is available
    // For now, return null - the deterministic path handles known patterns
    return null;
  }

  private buildFixPrompt(change: ChangeRecord, contexts: unknown[]): string {
    return [
      `Package "${change.packageName}" released ${change.toVersion} with breaking changes.`,
      `Release notes: ${change.rawNotes}`,
      ``,
      `The following call sites are affected:`,
      ...contexts.map((c: any) => [
        ``,
        `File: ${c.file} (line ${c.line})`,
        `Call: ${c.callExpression}`,
        `Context:`,
        '```',
        c.context,
        '```',
      ].join('\n')),
      ``,
      `Generate a minimal unified diff that fixes these call sites for the new version.`,
      `Only change what is necessary. Do not refactor.`,
    ].join('\n');
  }

  private createUnifiedDiff(filePath: string, original: string, fixed: string): string {
    const originalLines = original.split('\n');
    const fixedLines = fixed.split('\n');

    const diff: string[] = [
      `--- a/${filePath}`,
      `+++ b/${filePath}`,
    ];

    // Simple line-by-line diff (not optimal, but correct for small changes)
    let i = 0, j = 0;
    while (i < originalLines.length || j < fixedLines.length) {
      if (i < originalLines.length && j < fixedLines.length && originalLines[i] === fixedLines[j]) {
        i++;
        j++;
      } else {
        // Find the extent of the change
        const startI = i, startJ = j;
        while (i < originalLines.length && (j >= fixedLines.length || originalLines[i] !== fixedLines[j])) {
          i++;
        }
        while (j < fixedLines.length && (startI >= originalLines.length || fixedLines[j] !== originalLines[startI])) {
          j++;
        }

        const removedCount = i - startI;
        const addedCount = j - startJ;
        diff.push(`@@ -${startI + 1},${removedCount} +${startJ + 1},${addedCount} @@`);

        for (let k = startI; k < i; k++) {
          diff.push(`-${originalLines[k]}`);
        }
        for (let k = startJ; k < j; k++) {
          diff.push(`+${fixedLines[k]}`);
        }
      }
    }

    return diff.join('\n');
  }
}
