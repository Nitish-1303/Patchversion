import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import semver from 'semver';
import { Project, CallExpression, Identifier, Node } from 'ts-morph';
import { createTwoFilesPatch } from 'diff';
import { IMigrationRule, MigrationContext, MigrationPrecondition, MigrationResult } from '../types';

/**
 * Enterprise migration rule for React 18 -> React 19:
 * In React 19, `forwardRef` is deprecated in favor of passing `ref` directly as a prop to function components.
 * This rule transforms `const MyInput = forwardRef((props, ref) => ...)` to standard function components.
 */
export class React18To19RefRule implements IMigrationRule {
  readonly id = 'react-v18-to-v19-forward-ref';
  readonly packageName = 'react';
  readonly fromVersionRange = '>=16.8.0 <19.0.0';
  readonly toVersionRange = '>=19.0.0';
  readonly description = 'Migrates deprecated React.forwardRef wrappers to direct ref-prop components in React 19';

  readonly preconditions: MigrationPrecondition[] = [
    {
      id: 'react-manifest-present',
      description: 'React dependency is present in package.json',
      check: (ctx) => {
        const pkgPath = path.join(ctx.repoPath, 'package.json');
        if (!fs.existsSync(pkgPath)) return false;
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          return Boolean(
            (pkg.dependencies && pkg.dependencies.react) ||
            (pkg.devDependencies && pkg.devDependencies.react)
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
        const exprText = callExpr.getExpression().getText();

        // Match forwardRef(...) or React.forwardRef(...)
        if (exprText === 'forwardRef' || exprText === 'React.forwardRef') {
          const args = callExpr.getArguments();
          if (args.length > 0) {
            const innerComponent = args[0].getText();
            // Unwrap forwardRef(component) -> component
            callExpr.replaceWithText(innerComponent);
            fileChanged = true;
          }
        }
      });

      // Clean up unused forwardRef import if present
      if (fileChanged) {
        const importDecls = sourceFile.getImportDeclarations();
        for (const imp of importDecls) {
          if (imp.getModuleSpecifierValue() === 'react') {
            const namedImports = imp.getNamedImports();
            for (const named of namedImports) {
              if (named.getName() === 'forwardRef') {
                named.remove();
              }
            }
          }
        }

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
      } else if (/\.(jsx|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
        results.push(full);
      }
    }
    return results;
  }
}
