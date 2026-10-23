import { Project, SyntaxKind, CallExpression, ImportDeclaration, SourceFile } from 'ts-morph';
import { CallSite, UsageMap } from '@patchversion/shared';
import path from 'path';
import fs from 'fs';

/**
 * AST-based usage mapper. Scans a repo's TypeScript/JavaScript source
 * and produces a map of every call site that touches a tracked package.
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
    const callSites: CallSite[] = [];
    let filesWithUsage = 0;

    for (const sourceFile of sourceFiles) {
      const imports = this.findPackageImports(sourceFile, packageName);
      if (imports.length === 0) continue;

      filesWithUsage++;
      const sites = this.findCallSites(sourceFile, imports, packageName, repoPath);
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

  private findPackageImports(sourceFile: SourceFile, packageName: string): ImportDeclaration[] {
    return sourceFile.getImportDeclarations().filter(imp => {
      const moduleSpecifier = imp.getModuleSpecifierValue();
      // Match exact package or subpath imports (e.g., 'stripe' or 'stripe/lib/charges')
      return moduleSpecifier === packageName ||
             moduleSpecifier.startsWith(packageName + '/');
    });
  }

  private findCallSites(
    sourceFile: SourceFile,
    imports: ImportDeclaration[],
    packageName: string,
    repoPath: string,
  ): CallSite[] {
    const sites: CallSite[] = [];
    const importedSymbols = new Map<string, string>(); // local name -> exported name

    // Collect all imported symbols from the tracked package
    for (const imp of imports) {
      const moduleSpecifier = imp.getModuleSpecifierValue();
      const namedImports = imp.getNamedImports();
      const defaultImport = imp.getDefaultImport();
      const namespaceImport = imp.getNamespaceImport();

      for (const named of namedImports) {
        const name = named.getName();
        const alias = named.getAliasNode()?.getText() ?? name;
        importedSymbols.set(alias, name);
      }

      if (defaultImport) {
        importedSymbols.set(defaultImport.getText(), 'default');
      }

      if (namespaceImport) {
        importedSymbols.set(namespaceImport.getText(), '*');
      }
    }

    // Find all call expressions that use imported symbols
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CallExpression) {
        const callExpr = node as CallExpression;
        const expression = callExpr.getExpression();
        const expressionText = expression.getText();

        // Check direct calls: importedSymbol(...)
        for (const [localName, exportedName] of importedSymbols) {
          if (expressionText === localName || expressionText.startsWith(localName + '.')) {
            const pos = sourceFile.getLineAndColumnAtPos(node.getStart());
            sites.push({
              filePath: path.relative(repoPath, sourceFile.getFilePath()),
              line: pos.line,
              column: pos.column,
              importStatement: imports[0]?.getText() ?? '',
              callExpression: node.getText().slice(0, 200), // truncate long calls
              packageName,
              exportedSymbol: exportedName,
            });
            break;
          }
        }
      }

      // Also check require() calls
      if (node.getKind() === SyntaxKind.CallExpression) {
        const callExpr = node as CallExpression;
        const expr = callExpr.getExpression().getText();
        if (expr === 'require') {
          const args = callExpr.getArguments();
          if (args.length > 0) {
            const argText = args[0].getText().replace(/['"]/g, '');
            if (argText === packageName || argText.startsWith(packageName + '/')) {
              const pos = sourceFile.getLineAndColumnAtPos(node.getStart());
              sites.push({
                filePath: path.relative(repoPath, sourceFile.getFilePath()),
                line: pos.line,
                column: pos.column,
                importStatement: `require('${argText}')`,
                callExpression: node.getText().slice(0, 200),
                packageName,
                exportedSymbol: 'require',
              });
            }
          }
        }
      }
    });

    return sites;
  }
}
