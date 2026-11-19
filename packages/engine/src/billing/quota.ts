export type TenantPlan = 'developer' | 'repository' | 'organization' | 'enterprise';

/** Monthly non-simulation draft PR limits by plan. Infinity = unlimited. */
export const MONTHLY_PR_QUOTA_BY_PLAN: Record<TenantPlan, number> = {
  developer: 1,
  repository: Number.POSITIVE_INFINITY,
  organization: Number.POSITIVE_INFINITY,
  enterprise: Number.POSITIVE_INFINITY,
};

export class QuotaExceededError extends Error {
  readonly code = 'QUOTA_EXCEEDED';
  readonly statusCode = 402;

  constructor(
    public readonly plan: TenantPlan,
    public readonly used: number,
    public readonly limit: number,
  ) {
    super(
      `Pull request quota exceeded for plan "${plan}": used ${used} of ${limit} non-simulation PRs this month.`,
    );
    this.name = 'QuotaExceededError';
  }
}

export function monthlyPrQuotaForPlan(plan: TenantPlan | string | undefined | null): number {
  const key = (plan || 'developer') as TenantPlan;
  return MONTHLY_PR_QUOTA_BY_PLAN[key] ?? MONTHLY_PR_QUOTA_BY_PLAN.developer;
}

export function startOfUtcMonth(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

export function assertMonthlyPrQuotaAvailable(input: {
  plan: TenantPlan | string | undefined | null;
  usedThisMonth: number;
}): void {
  const limit = monthlyPrQuotaForPlan(input.plan);
  if (!Number.isFinite(limit)) return;
  if (input.usedThisMonth >= limit) {
    throw new QuotaExceededError(
      (input.plan as TenantPlan) || 'developer',
      input.usedThisMonth,
      limit,
    );
  }
}
