import { IMigrationRule } from './types';
import { LodashMethodRenameRule } from './rules/lodash-rename';
import { MockpayPaymentMethodRule } from './rules/mockpay-rename';
import { OpenAIV3ToV4Rule } from './rules/openai-v3-to-v4';
import { NextJs14To15AsyncRule } from './rules/nextjs-v14-to-v15';
import { StripePaymentIntentsRule } from './rules/stripe-rename';
import { AxiosV0ToV1Rule } from './rules/axios-v0-to-v1';

export class MigrationRuleRegistry {
  private rules: Map<string, IMigrationRule> = new Map();

  constructor() {
    // Register canonical enterprise migration rules
    this.register(new LodashMethodRenameRule());
    this.register(new MockpayPaymentMethodRule());
    this.register(new OpenAIV3ToV4Rule());
    this.register(new NextJs14To15AsyncRule());
    this.register(new StripePaymentIntentsRule());
    this.register(new AxiosV0ToV1Rule());
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
