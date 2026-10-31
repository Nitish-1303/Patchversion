export interface MigrationPrecondition {
  id: string;
  description: string;
  check: (context: MigrationContext) => Promise<boolean> | boolean;
}

export interface MigrationContext {
  repoPath: string;
  packageName: string;
  fromVersion: string;
  toVersion: string;
  targetFiles?: string[];
}

export interface MigrationResult {
  ruleId: string;
  packageName: string;
  filesModified: string[];
  unifiedDiff: string;
  diffHash: string;
  preconditionsSatisfied: boolean;
  postconditionsVerified: boolean;
  isIdempotent: boolean;
  description: string;
  errors?: string[];
}

export interface IMigrationRule {
  readonly id: string;
  readonly packageName: string;
  readonly fromVersionRange: string;
  readonly toVersionRange: string;
  readonly description: string;
  readonly preconditions: MigrationPrecondition[];

  appliesTo(packageName: string, fromVersion: string, toVersion: string): boolean;
  execute(context: MigrationContext): Promise<MigrationResult>;
}
