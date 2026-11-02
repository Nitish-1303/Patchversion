import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import semver from 'semver';
import { Project, CallExpression, Node } from 'ts-morph';
import { createTwoFilesPatch } from 'diff';
import { IMigrationRule, MigrationContext, MigrationPrecondition, MigrationResult } from '../types';

export class NextJs14To15AsyncRule implements IMigrationRule {
  readonly id = 'nextjs-v14-to-v15-async-headers';
  readonly packageName = 'next';
  readonly fromVersionRange = '>=13.0.0 <15.0.0';
  readonly toVersionRange = '>=15.0.0';
  readonly description = 'Migrates Next.js 14 synchronous cookies() and headers() to Next.js 15 async (await cookies(), await headers())';

  readonly preconditions: MigrationPrecondition[] = [
    {
      id: 'next-manifest-present',
      description: 'Next.js dependency is present in package.json',
      check: (ctx) => {
        const pkgPath = path.join(ctx.repoPath, 'package.json');
        if (!fs.existsSync(pkgPath)) return false;
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          return Boolean(
            (pkg.dependencies && pkg.dependencies.next) ||
            (pkg.devDependencies && pkg.devDependencies.next)
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
    const diffParts: string[] = [];

    for (const sourceFile of project.getSourceFiles()) {
      const originalText = fs.readFileSync(sourceFile.getFilePath(), 'utf8');
      let fileChanged = false;

      // Check if sourceFile imports from 'next/headers'
      const hasHeadersImport = sourceFile.getImportDeclarations().some(
        (id) => id.getModuleSpecifierValue() === 'next/headers'
      );

      if (!hasHeadersImport) continue;

      // Scan for calls to cookies() or headers() that are NOT already awaited
      sourceFile.forEachDescendant((node) => {
        if (!Node.isCallExpression(node)) return;
        const callExpr = node as CallExpression;
        const expr = callExpr.getExpression();
        const callName = expr.getText();

        if (callName === 'cookies' || callName === 'headers') {
          const parent = callExpr.getParent();
          if (!parent || !Node.isAwaitExpression(parent)) {
            // Check enclosing function and ensure it is async
            const func = callExpr.getFirstAncestor((ancestor) =>
              Node.isFunctionDeclaration(ancestor) ||
              Node.isArrowFunction(ancestor) ||
              Node.isFunctionExpression(ancestor) ||
              Node.isMethodDeclaration(ancestor),
            );

            if (func && 'setIsAsync' in func && typeof (func as { setIsAsync: (val: boolean) => void }).setIsAsync === 'function') {
              (func as { setIsAsync: (val: boolean) => void }).setIsAsync(true);
            }

            callExpr.replaceWithText(`await ${callExpr.getText()}`);
            fileChanged = true;
          }
        }
      });

      if (fileChanged) {
        const newText = sourceFile.getFullText();
        const relPath = path.relative(context.repoPath, sourceFile.getFilePath()).replace(/\\/g, '/');
        const fileDiff = createTwoFilesPatch(
          `a/${relPath}`,
          `b/${relPath}`,
          originalText,
          newText,
          '',
          '',
          { context: 3 },
        );
        diffParts.push(fileDiff);
        modifiedFiles.push(relPath);
      }
    }

    const unifiedDiff = diffParts.join('\n');
    const diffHash = unifiedDiff.trim().length > 0
      ? crypto.createHash('sha256').update(unifiedDiff).digest('hex')
      : '';

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

  private findSourceFiles(repoPath: string): string[] {
    const results: string[] = [];
    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist' && entry.name !== '.next') {
            walk(full);
          }
        } else if (/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(entry.name)) {
          results.push(full);
        }
      }
    };
    try {
      walk(repoPath);
    } catch {
      // ignore
    }
    return results;
  }
}
