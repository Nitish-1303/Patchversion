/** PayPal pricing tiers and plan configuration (non-route module for Next.js App Router). */
export type PricingTier = 'developer' | 'repository' | 'organization' | 'enterprise';

export interface PlanConfig {
  name: string;
  priceUsd: number;
  interval: string;
  paymentUrl: string | null;
  planId: string | null;
  description: string;
  features: string[];
}

export const ACTIVE_PAYPAL_CLIENT_ID = 'BAASotFTsmDk1LL0SyvTHjxkVVUqbg6ONaxOeNg7Fn5G3fuCbb348n99trKyqNXlFSa9EkWAe9dqaaO9e8';
export const ACTIVE_REPOSITORY_PLAN_ID = 'P-3J256502HE020922SNLVRT7A';
export const ACTIVE_REPOSITORY_PAYMENT_URL = `https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=${ACTIVE_REPOSITORY_PLAN_ID}`;

export const ACTIVE_ORGANIZATION_PLAN_ID = 'P-5H742454KV472641MNLVR4QQ';
export const ACTIVE_ORGANIZATION_PAYMENT_URL = `https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=${ACTIVE_ORGANIZATION_PLAN_ID}`;

export const ACTIVE_ENTERPRISE_PLAN_ID = 'P-1LP49683142123911NLVTCYA';
export const ACTIVE_ENTERPRISE_PAYMENT_URL = `https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=${ACTIVE_ENTERPRISE_PLAN_ID}`;

export function getTierConfigs(): Record<PricingTier, PlanConfig> {
  const defaultPaypalUrl = process.env.PAYPAL_PAYMENT_URL || null;
  const defaultPlanId = process.env.PAYPAL_PLAN_ID || process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID || null;

  return {
    developer: {
      name: 'Developer Preview',
      priceUsd: 0,
      interval: 'forever',
      paymentUrl: null,
      planId: null,
      description: 'Free AST scanning and local deterministic proof loop.',
      features: [
        'Unlimited local AST scans',
        'AST call-site mapping engine',
        'Deterministic patch generator',
        '1 free automated PR / month',
        'Tamper-evident proof bundles',
      ],
    },
    repository: {
      name: 'Repository Tier',
      priceUsd: 49,
      interval: 'month',
      paymentUrl: process.env.PAYPAL_PAYMENT_URL_REPOSITORY || defaultPaypalUrl || ACTIVE_REPOSITORY_PAYMENT_URL,
      planId: process.env.PAYPAL_PLAN_ID_REPOSITORY || defaultPlanId || ACTIVE_REPOSITORY_PLAN_ID,
      description: 'Continuous upstream watching and unlimited verified PR delivery for 1 repository.',
      features: [
        '1 connected repository',
        'Continuous 24/7 upstream watching',
        'Unlimited verified migration PRs',
        'Single-use human approvals',
        'Fail-closed AST sandboxing',
      ],
    },
    organization: {
      name: 'Organization Tier',
      priceUsd: 299,
      interval: 'month',
      paymentUrl: process.env.PAYPAL_PAYMENT_URL_ORGANIZATION || process.env.PAYPAL_PAYMENT_URL_ORG || defaultPaypalUrl || ACTIVE_ORGANIZATION_PAYMENT_URL,
      planId: process.env.PAYPAL_PLAN_ID_ORGANIZATION || process.env.PAYPAL_PLAN_ID_ORG || defaultPlanId || ACTIVE_ORGANIZATION_PLAN_ID,
      description: 'Unlimited repositories with team RBAC, custom migration rules, and priority runners.',
      features: [
        'Unlimited connected repositories',
        'Custom internal API migration rules',
        'Multi-member team RBAC controls',
        'Priority isolated runner queues',
        'Tamper-evident proof audit trails',
      ],
    },
    enterprise: {
      name: 'Enterprise Contract',
      priceUsd: 15000,
      interval: 'year',
      paymentUrl: process.env.PAYPAL_PAYMENT_URL_ENTERPRISE || defaultPaypalUrl || ACTIVE_ENTERPRISE_PAYMENT_URL,
      planId: process.env.PAYPAL_PLAN_ID_ENTERPRISE || defaultPlanId || ACTIVE_ENTERPRISE_PLAN_ID,
      description: 'Dedicated microVM sandboxing runners, private registry support, and custom SLAs.',
      features: [
        'Dedicated microVM sandboxing runners',
        'Private npm & internal registry support',
        'Custom SSO / SAML & tenant data isolation',
        'SOC 2 compliance readiness & dedicated SLA',
        'Direct founder & engineering Slack channel',
      ],
    },
  };
}

