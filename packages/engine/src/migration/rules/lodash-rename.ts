import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import semver from 'semver';
import { Project, CallExpression, PropertyAccessExpression, Node } from 'ts-morph';
import { createTwoFilesPatch } from 'diff';
import { IMigrationRule, MigrationContext, MigrationPrecondition, MigrationResult } from '../types';

export class LodashMethodRenameRule implements IMigrationRule {
  readonly id = 'lodash-v3-to-v4-methods';
  readonly packageName = 'lodash';
  readonly fromVersionRange = '>=3.0.0 <4.0.0';
  readonly toVersionRange = '>=4.0.0';
  readonly description = 'Migrates lodash v3 methods to v4: _.contains() -> _.includes(), _.pluck() -> _.map()';

  readonly preconditions: MigrationPrecondition[] = [
    {
      id: 'lodash-manifest-present',
      description: 'Lodash dependency is present in package.json',
      check: (ctx) => {
        const pkgPath = path.join(ctx.repoPath, 'package.json');
        if (!fs.existsSync(pkgPath)) return false;
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          return Boolean(
            (pkg.dependencies && pkg.dependencies.lodash) ||
            (pkg.devDependencies && pkg.devDependencies.lodash)
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

    // Verify preconditions
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
      ? context.targetFiles.map((f) => path.isAbsolute(f) ? f : path.join(context.repoPath, f))
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

      // Discover lodash bindings in this file
      const { moduleAliases, namedContains, namedPluck } = this.discoverLodashBindings(sourceFile);
      if (moduleAliases.size === 0 && namedContains.size === 0 && namedPluck.size === 0) {
        continue;
      }

      let fileChanged = false;

      // 1. Transform call expressions: _.contains(...) and _.pluck(...)
      sourceFile.forEachDescendant((node) => {
        if (!Node.isCallExpression(node)) return;
        const callExpr = node as CallExpression;
        const expr = callExpr.getExpression();

        if (Node.isPropertyAccessExpression(expr)) {
          const propAccess = expr as PropertyAccessExpression;
          const callerText = propAccess.getExpression().getText();
          const methodName = propAccess.getName();

          if (moduleAliases.has(callerText)) {
            if (methodName === 'contains') {
              propAccess.getNameNode().replaceWithText('includes');
              fileChanged = true;
            } else if (methodName === 'pluck') {
              propAccess.getNameNode().replaceWithText('map');
              fileChanged = true;
            }
          }
        } else if (Node.isIdentifier(expr)) {
          const identifier = expr.getText();
          if (namedContains.has(identifier)) {
            expr.replaceWithText('includes');
            fileChanged = true;
          } else if (namedPluck.has(identifier)) {
            expr.replaceWithText('map');
            fileChanged = true;
          }
        }
      });

      // 2. Transform named imports: import { contains, pluck } from 'lodash'
      for (const importDecl of sourceFile.getImportDeclarations()) {
        const specifier = importDecl.getModuleSpecifierValue();
        if (specifier === 'lodash' || specifier.startsWith('lodash/')) {
          for (const named of importDecl.getNamedImports()) {
            if (named.getName() === 'contains' && !named.getAliasNode()) {
              named.setName('includes');
              fileChanged = true;
            } else if (named.getName() === 'pluck' && !named.getAliasNode()) {
              named.setName('map');
              fileChanged = true;
            }
          }
        }
      }

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

    // Verify postconditions: transformed syntax must be valid
    let postconditionsVerified = true;
    for (const sourceFile of project.getSourceFiles()) {
      const relPath = path.relative(context.repoPath, sourceFile.getFilePath()).replace(/\\/g, '/');
      if (modifiedFiles.includes(relPath)) {
        const diagnostics = project.getProgram().getSyntacticDiagnostics(sourceFile);
        const syntaxErrors = diagnostics.filter((d) => d.getCategory() === 1 /* Error */);
        if (syntaxErrors.length > 0) {
          postconditionsVerified = false;
          errors.push(`Syntax error introduced in ${relPath}: ${syntaxErrors[0].getMessageText()}`);
        }
      }
    }

    return {
      ruleId: this.id,
      packageName: this.packageName,
      filesModified: modifiedFiles,
      unifiedDiff,
      diffHash,
      preconditionsSatisfied: true,
      postconditionsVerified,
      isIdempotent: true,
      description: this.description,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private discoverLodashBindings(sourceFile: Node) {
    const moduleAliases = new Set<string>();
    const namedContains = new Set<string>();
    const namedPluck = new Set<string>();

    sourceFile.forEachDescendant((node) => {
      // ES Imports: import _ from 'lodash', import * as _ from 'lodash'
      if (Node.isImportDeclaration(node)) {
        const specifier = node.getModuleSpecifierValue();
        if (specifier === 'lodash') {
          const defaultImport = node.getDefaultImport();
          if (defaultImport) moduleAliases.add(defaultImport.getText());
          const namespaceImport = node.getNamespaceImport();
          if (namespaceImport) moduleAliases.add(namespaceImport.getText());

          for (const named of node.getNamedImports()) {
            const importedName = named.getName();
            const localName = named.getAliasNode()?.getText() || importedName;
            if (importedName === 'contains') namedContains.add(localName);
            if (importedName === 'pluck') namedPluck.add(localName);
          }
        }
      }

      // CJS Requires: const _ = require('lodash'), const { contains } = require('lodash')
      if (Node.isVariableDeclaration(node)) {
        const init = node.getInitializer();
        if (init && Node.isCallExpression(init)) {
          const expr = init.getExpression();
          const args = init.getArguments();
          if (expr.getText() === 'require' && args.length > 0 && Node.isStringLiteral(args[0])) {
            const moduleName = args[0].getLiteralValue();
            if (moduleName === 'lodash') {
              const nameNode = node.getNameNode();
              if (Node.isIdentifier(nameNode)) {
                moduleAliases.add(nameNode.getText());
              } else if (Node.isObjectBindingPattern(nameNode)) {
                for (const elem of nameNode.getElements()) {
                  const propName = elem.getPropertyNameNode()?.getText() || elem.getName();
                  const localName = elem.getName();
                  if (propName === 'contains') namedContains.add(localName);
                  if (propName === 'pluck') namedPluck.add(localName);
                }
              }
            }
          }
        }
      }
    });

    return { moduleAliases, namedContains, namedPluck };
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
