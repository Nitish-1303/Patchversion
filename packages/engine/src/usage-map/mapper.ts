import { Project, SyntaxKind, CallExpression, ImportDeclaration, SourceFile, Node } from 'ts-morph';
import { CallSite, UsageMap } from '@patchversion/shared';
import path from 'path';
import fs from 'fs';

/** A symbol bound to a tracked package: local name -> exported name. */
interface ImportBinding {
  localName: string;
  exportedName: string;
  statementText: string;
}

/**
 * AST-based usage mapper. Scans a repo's TypeScript/JavaScript source
 * and produces a map of every call site that touches a tracked package.
 *
 * Supports both module systems:
 * - ES modules: import x from 'pkg', import { y } from 'pkg', import * as z from 'pkg'
 * - CommonJS: const x = require('pkg'), const { y } = require('pkg'),
 *   const y = require('pkg').y
 *
 * This is the foundation for impact analysis: when a breaking change is
 * detected, we intersect the change with the usage map to find exactly
 * which lines of code are affected.
 */
export class UsageMapper {
  private project: Project;

  constructor() {
    this.project = new Project({
      compilerOptions: {
        allowJs: true,
        checkJs: false,
        noEmit: true,
        skipLibCheck: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        moduleResolution: 2, // NodeJs
      },
      skipAddingFilesFromTsConfig: true,
    });
  }

  /**
   * Map all call sites for a given package across a repo directory.
   */
  mapPackageUsage(repoPath: string, packageName: string, repoId: string): UsageMap {
    const sourceFiles = this.loadSourceFiles(repoPath);
    try {
      const callSites: CallSite[] = [];
      let filesWithUsage = 0;

      for (const sourceFile of sourceFiles) {
        const bindings = [
          ...this.findImportBindings(sourceFile, packageName),
          ...this.findRequireBindings(sourceFile, packageName),
        ];
        if (bindings.length === 0) continue;

        filesWithUsage++;
        const sites = this.findCallSites(sourceFile, bindings, packageName, repoPath);
        callSites.push(...sites);
      }

      return {
        repoId,
        packageName,
        mappedAt: new Date().toISOString(),
        callSites,
        totalFiles: sourceFiles.length,
        filesWithUsage,
      };
    } finally {
      // Repository isolation: forget every parsed file so a later map of a
      // DIFFERENT repository in this same process can never see this repo's
      // files - the shared ts-morph Project must not accumulate state.
      for (const sourceFile of sourceFiles) {
        sourceFile.forget();
      }
    }
  }

  /**
   * Map usage across multiple packages at once.
   */
  mapMultiplePackages(repoPath: string, packageNames: string[], repoId: string): UsageMap[] {
    return packageNames.map(pkg => this.mapPackageUsage(repoPath, pkg, repoId));
  }

  private loadSourceFiles(repoPath: string): SourceFile[] {
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
    const files: string[] = [];

    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
            walk(fullPath);
          }
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    };

    walk(repoPath);

    return files.map(f => {
      const content = fs.readFileSync(f, 'utf-8');
      return this.project.createSourceFile(f, content, { overwrite: true });
    });
  }

  private moduleMatches(specifier: string, packageName: string): boolean {
    return specifier === packageName || specifier.startsWith(packageName + '/');
  }

  /** ES module imports of the tracked package. */
  private findImportBindings(sourceFile: SourceFile, packageName: string): ImportBinding[] {
    const bindings: ImportBinding[] = [];

    const imports = sourceFile.getImportDeclarations().filter((imp: ImportDeclaration) =>
      this.moduleMatches(imp.getModuleSpecifierValue(), packageName),
    );

    for (const imp of imports) {
      const statementText = imp.getText();
      for (const named of imp.getNamedImports()) {
        const name = named.getName();
        const alias = named.getAliasNode()?.getText() ?? name;
        bindings.push({ localName: alias, exportedName: name, statementText });
      }
      const defaultImport = imp.getDefaultImport();
      if (defaultImport) {
        bindings.push({ localName: defaultImport.getText(), exportedName: 'default', statementText });
      }
      const namespaceImport = imp.getNamespaceImport();
      if (namespaceImport) {
        bindings.push({ localName: namespaceImport.getText(), exportedName: '*', statementText });
      }
    }

    return bindings;
  }

  /** CommonJS require() bindings of the tracked package. */
  private findRequireBindings(sourceFile: SourceFile, packageName: string): ImportBinding[] {
    const bindings: ImportBinding[] = [];

    for (const decl of sourceFile.getVariableDeclarations()) {
      const init = decl.getInitializer();
      if (!Node.isCallExpression(init) && !Node.isPropertyAccessExpression(init)) continue;

      // const x = require('pkg')  |  const { y } = require('pkg')
      // const y = require('pkg').y
      let requireCall: CallExpression | null = null;
      let viaProperty: string | null = null;

      if (Node.isCallExpression(init)) {
        requireCall = init;
      } else if (Node.isPropertyAccessExpression(init) && Node.isCallExpression(init.getExpression())) {
        requireCall = init.getExpression() as CallExpression;
        viaProperty = init.getName();
      }

      if (!requireCall || requireCall.getExpression().getText() !== 'require') continue;
      const args = requireCall.getArguments();
      if (args.length === 0 || !Node.isStringLiteral(args[0])) continue;
      if (!this.moduleMatches(args[0].getLiteralValue(), packageName)) continue;

      const statementText = decl.getVariableStatement()?.getText() ?? decl.getText();
      const nameNode = decl.getNameNode();

      if (viaProperty) {
        // const y = require('pkg').y
        bindings.push({ localName: decl.getName(), exportedName: viaProperty, statementText });
      } else if (Node.isIdentifier(nameNode)) {
        // const pkg = require('pkg') - whole-module binding
        bindings.push({ localName: nameNode.getText(), exportedName: '*', statementText });
      } else if (Node.isObjectBindingPattern(nameNode)) {
        // const { y, z: alias } = require('pkg')
        for (const el of nameNode.getElements()) {
          const local = el.getName();
          const exported = el.getPropertyNameNode()?.getText() ?? local;
          bindings.push({ localName: local, exportedName: exported, statementText });
        }
      }
    }

    return bindings;
  }

  private findCallSites(
    sourceFile: SourceFile,
    bindings: ImportBinding[],
    packageName: string,
    repoPath: string,
  ): CallSite[] {
    const sites: CallSite[] = [];

    sourceFile.forEachDescendant(node => {
      if (node.getKind() !== SyntaxKind.CallExpression) return;

      const callExpr = node as CallExpression;
      const expressionText = callExpr.getExpression().getText();

      // Skip the binding statements themselves (require calls, imports are not calls)
      if (expressionText === 'require') return;

      for (const binding of bindings) {
        if (expressionText === binding.localName || expressionText.startsWith(binding.localName + '.')) {
          const pos = sourceFile.getLineAndColumnAtPos(callExpr.getStart());
          sites.push({
            filePath: path.relative(repoPath, sourceFile.getFilePath()),
            line: pos.line,
            column: pos.column,
            importStatement: binding.statementText.split('\n')[0].slice(0, 200),
            callExpression: callExpr.getText().slice(0, 200), // truncate long calls
            packageName,
            exportedSymbol: binding.exportedName,
          });
          break;
        }
      }
    });

    return sites;
  }
}
