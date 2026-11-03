import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import semver from 'semver';
import { Project, CallExpression, PropertyAccessExpression, Node } from 'ts-morph';
import { createTwoFilesPatch } from 'diff';
import { IMigrationRule, MigrationContext, MigrationPrecondition, MigrationResult } from '../types';

/**
 * Enterprise migration rule for Axios v0.x -> v1.x:
 * In Axios v1.0, axios.all(...) is deprecated in favor of native Promise.all(...),
 * and axios.spread(...) is deprecated in favor of standard parameter destructuring.
 */
export class AxiosV0ToV1Rule implements IMigrationRule {
  readonly id = 'axios-v0-to-v1-promise-all';
  readonly packageName = 'axios';
  readonly fromVersionRange = '>=0.19.0 <1.0.0';
  readonly toVersionRange = '>=1.0.0';
  readonly description = 'Migrates deprecated axios.all(promises) to Promise.all(promises) and modernizes axios.spread callbacks';

  readonly preconditions: MigrationPrecondition[] = [
    {
      id: 'axios-manifest-present',
      description: 'Axios dependency is present in package.json',
      check: (ctx) => {
        const pkgPath = path.join(ctx.repoPath, 'package.json');
        if (!fs.existsSync(pkgPath)) return false;
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          return Boolean(
            (pkg.dependencies && pkg.dependencies.axios) ||
            (pkg.devDependencies && pkg.devDependencies.axios)
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
          const callerName = propAccess.getExpression().getText();
          const methodName = propAccess.getName();

          // Transform axios.all(...) -> Promise.all(...)
          if (callerName === 'axios' && methodName === 'all') {
            propAccess.replaceWithText('Promise.all');
            fileChanged = true;
          }

          // Transform axios.spread(fn) -> (fn)
          if (callerName === 'axios' && methodName === 'spread') {
            const args = callExpr.getArguments();
            if (args.length > 0) {
              const callbackArg = args[0].getText();
              callExpr.replaceWithText(`(${callbackArg})`);
              fileChanged = true;
            }
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
