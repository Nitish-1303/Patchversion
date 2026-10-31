import { IMigrationRule } from './types';
import { LodashMethodRenameRule } from './rules/lodash-rename';
import { MockpayPaymentMethodRule } from './rules/mockpay-rename';

export class MigrationRuleRegistry {
  private rules: Map<string, IMigrationRule> = new Map();

  constructor() {
    // Register canonical enterprise migration rules
    this.register(new LodashMethodRenameRule());
    this.register(new MockpayPaymentMethodRule());
  }

  register(rule: IMigrationRule): void {
    this.rules.set(rule.id, rule);
  }

  getRule(ruleId: string): IMigrationRule | undefined {
    return this.rules.get(ruleId);
  }

  getAllRules(): IMigrationRule[] {
    return Array.from(this.rules.values());
  }

  findApplicableRules(packageName: string, fromVersion: string, toVersion: string): IMigrationRule[] {
    return this.getAllRules().filter((rule) => rule.appliesTo(packageName, fromVersion, toVersion));
  }
}

export const defaultMigrationRegistry = new MigrationRuleRegistry();
