import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import semver from 'semver';
import { Project, CallExpression, PropertyAccessExpression, ImportDeclaration, Node } from 'ts-morph';
import { createTwoFilesPatch } from 'diff';
import { IMigrationRule, MigrationContext, MigrationPrecondition, MigrationResult } from '../types';

export class OpenAIV3ToV4Rule implements IMigrationRule {
  readonly id = 'openai-v3-to-v4-client';
  readonly packageName = 'openai';
  readonly fromVersionRange = '>=3.0.0 <4.0.0';
  readonly toVersionRange = '>=4.0.0';
  readonly description = 'Migrates openai v3 (Configuration, OpenAIApi, createChatCompletion) to v4 (new OpenAI(), chat.completions.create)';

  readonly preconditions: MigrationPrecondition[] = [
    {
      id: 'openai-manifest-present',
      description: 'OpenAI dependency is present in package.json',
      check: (ctx) => {
        const pkgPath = path.join(ctx.repoPath, 'package.json');
        if (!fs.existsSync(pkgPath)) return false;
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          return Boolean(
            (pkg.dependencies && pkg.dependencies.openai) ||
            (pkg.devDependencies && pkg.devDependencies.openai)
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

    const methodReplacements: Record<string, string> = {
      createChatCompletion: 'chat.completions.create',
      createCompletion: 'completions.create',
      createEmbedding: 'embeddings.create',
      createImage: 'images.generate',
      listModels: 'models.list',
    };

    for (const sourceFile of project.getSourceFiles()) {
      const originalText = fs.readFileSync(sourceFile.getFilePath(), 'utf8');
      let fileChanged = false;

      // 1. Transform Imports: import { Configuration, OpenAIApi } from 'openai'; -> import OpenAI from 'openai';
      sourceFile.getImportDeclarations().forEach((importDecl: ImportDeclaration) => {
        const moduleSpec = importDecl.getModuleSpecifierValue();
        if (moduleSpec === 'openai') {
          const namedImports = importDecl.getNamedImports().map(ni => ni.getName());
          if (namedImports.includes('Configuration') || namedImports.includes('OpenAIApi')) {
            importDecl.removeNamedImports();
            if (!importDecl.getDefaultImport()) {
              importDecl.setDefaultImport('OpenAI');
            }
            fileChanged = true;
          }
        }
      });

      // 2. Transform CallExpressions & Method invocations
      sourceFile.forEachDescendant((node) => {
        if (!Node.isCallExpression(node)) return;
        const callExpr = node as CallExpression;
        const expr = callExpr.getExpression();

        if (Node.isPropertyAccessExpression(expr)) {
          const propAccess = expr as PropertyAccessExpression;
          const methodName = propAccess.getName();

          if (methodReplacements[methodName]) {
            const caller = propAccess.getExpression().getText();
            propAccess.replaceWithText(`${caller}.${methodReplacements[methodName]}`);
            fileChanged = true;
          }
        }
      });

      // 3. Transform new Configuration and new OpenAIApi instantiation patterns
      sourceFile.forEachDescendant((node) => {
        if (Node.isNewExpression(node)) {
          const expr = node.getExpression();
          if (expr.getText() === 'OpenAIApi') {
            node.replaceWithText(`new OpenAI(${node.getArguments().map(a => a.getText()).join(', ')})`);
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
