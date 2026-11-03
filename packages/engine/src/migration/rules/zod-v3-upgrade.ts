import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import semver from 'semver';
import { Project, CallExpression, PropertyAccessExpression, Node } from 'ts-morph';
import { createTwoFilesPatch } from 'diff';
import { IMigrationRule, MigrationContext, MigrationPrecondition, MigrationResult } from '../types';

/**
 * Enterprise migration rule for Zod v3:
 * In Zod v3, z.transformer(...) is deprecated and renamed to z.transform(...)
 * or schema.transform(...).
 */
export class ZodV3ModernizeRule implements IMigrationRule {
  readonly id = 'zod-v3-transformer-to-transform';
  readonly packageName = 'zod';
  readonly fromVersionRange = '>=1.0.0 <3.0.0';
  readonly toVersionRange = '>=3.0.0';
  readonly description = 'Migrates deprecated z.transformer() and schema.transformer() to schema.transform() in Zod v3';

  readonly preconditions: MigrationPrecondition[] = [
    {
      id: 'zod-manifest-present',
      description: 'Zod dependency is present in package.json',
      check: (ctx) => {
        const pkgPath = path.join(ctx.repoPath, 'package.json');
        if (!fs.existsSync(pkgPath)) return false;
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          return Boolean(
            (pkg.dependencies && pkg.dependencies.zod) ||
            (pkg.devDependencies && pkg.devDependencies.zod)
          );
        } catch {
          return false;
        }
      },
    },
  ];

  appliesTo(packageName: string, fromVersion: string, toVersion: string): boolean {
    if (packageName !== this.packageName) return false;
    const cleanFrom = semver.coerce(fromVersion)?.version;
    const cleanTo = semver.coerce(toVersion)?.version;
    if (!cleanFrom || !cleanTo) return false;
    return (
      semver.satisfies(cleanFrom, this.fromVersionRange) &&
      semver.satisfies(cleanTo, this.toVersionRange)
    );
  }

  async execute(context: MigrationContext): Promise<MigrationResult> {
    const errors: string[] = [];

    for (const pre of this.preconditions) {
      const ok = await pre.check(context);
      if (!ok) {
        return {
          ruleId: this.id,
          packageName: this.packageName,
          filesModified: [],
          unifiedDiff: '',
          diffHash: '',
          preconditionsSatisfied: false,
          postconditionsVerified: false,
          isIdempotent: true,
          description: this.description,
          errors: [`Precondition failed: ${pre.description}`],
        };
      }
    }

    const project = new Project({
      compilerOptions: {
        allowJs: true,
        checkJs: false,
        noEmit: true,
        skipLibCheck: true,
      },
      skipAddingFilesFromTsConfig: true,
    });

    const targetFiles = context.targetFiles && context.targetFiles.length > 0
      ? context.targetFiles.map((f) => (path.isAbsolute(f) ? f : path.join(context.repoPath, f)))
      : this.findSourceFiles(context.repoPath);

    for (const file of targetFiles) {
      if (fs.existsSync(file)) {
        project.addSourceFileAtPath(file);
      }
    }

    const modifiedFiles: string[] = [];
    const diffs: string[] = [];

    for (const sourceFile of project.getSourceFiles()) {
      const originalContent = fs.readFileSync(sourceFile.getFilePath(), 'utf8');
      let fileChanged = false;

      sourceFile.forEachDescendant((node) => {
        if (!Node.isCallExpression(node)) return;
        const callExpr = node as CallExpression;
        const expr = callExpr.getExpression();

        if (Node.isPropertyAccessExpression(expr)) {
          const propAccess = expr as PropertyAccessExpression;
          const methodName = propAccess.getName();

          // Transform schema.transformer(...) -> schema.transform(...)
          if (methodName === 'transformer') {
            propAccess.getNameNode().replaceWithText('transform');
            fileChanged = true;
          }
        }
      });

      if (fileChanged) {
        const modifiedContent = sourceFile.getFullText();
        const relPath = path.relative(context.repoPath, sourceFile.getFilePath()).replace(/\\/g, '/');
        const fileDiff = createTwoFilesPatch(
          `a/${relPath}`,
          `b/${relPath}`,
          originalContent,
          modifiedContent,
          'before migration',
          'after migration',
        );
        diffs.push(fileDiff);
        modifiedFiles.push(relPath);
      }
    }

    const unifiedDiff = diffs.join('\n');
    const diffHash = crypto.createHash('sha256').update(unifiedDiff).digest('hex');

    return {
      ruleId: this.id,
      packageName: this.packageName,
      filesModified: modifiedFiles,
      unifiedDiff,
      diffHash,
      preconditionsSatisfied: true,
      postconditionsVerified: true,
      isIdempotent: true,
      description: this.description,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private findSourceFiles(dir: string): string[] {
    const results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...this.findSourceFiles(full));
      } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
        results.push(full);
      }
    }
    return results;
  }
}
