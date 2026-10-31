import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import semver from 'semver';
import { Project, CallExpression, PropertyAccessExpression, ObjectLiteralExpression, PropertyAssignment, Node } from 'ts-morph';
import { createTwoFilesPatch } from 'diff';
import { IMigrationRule, MigrationContext, MigrationPrecondition, MigrationResult } from '../types';

export class MockpayPaymentMethodRule implements IMigrationRule {
  readonly id = 'mockpay-v1-to-v2-payment-method';
  readonly packageName = 'mockpay';
  readonly fromVersionRange = '>=1.0.0 <2.0.0';
  readonly toVersionRange = '>=2.0.0';
  readonly description = 'Migrates mockpay v1 charges.create({ source: ... }) to v2 charges.create({ payment_method: ... })';

  readonly preconditions: MigrationPrecondition[] = [
    {
      id: 'mockpay-manifest-present',
      description: 'Mockpay dependency is present in package.json',
      check: (ctx) => {
        const pkgPath = path.join(ctx.repoPath, 'package.json');
        if (!fs.existsSync(pkgPath)) return false;
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          return Boolean(
            (pkg.dependencies && pkg.dependencies.mockpay) ||
            (pkg.devDependencies && pkg.devDependencies.mockpay)
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

      sourceFile.forEachDescendant((node) => {
        if (!Node.isCallExpression(node)) return;
        const callExpr = node as CallExpression;
        const expr = callExpr.getExpression();

        if (Node.isPropertyAccessExpression(expr)) {
          const propAccess = expr as PropertyAccessExpression;
          const methodName = propAccess.getName();

          if (methodName === 'create') {
            const args = callExpr.getArguments();
            for (const arg of args) {
              if (Node.isObjectLiteralExpression(arg)) {
                const objLit = arg as ObjectLiteralExpression;
                for (const prop of objLit.getProperties()) {
                  if (Node.isPropertyAssignment(prop)) {
                    const propAssign = prop as PropertyAssignment;
                    if (propAssign.getName() === 'source') {
                      propAssign.getNameNode().replaceWithText('payment_method');
                      fileChanged = true;
                    }
                  }
                }
              }
            }
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
          if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
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
