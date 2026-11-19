import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, getDatabase } from '@/app/api/backend';
import { verifyPayPalSubscription } from '../paypal-service';
import {
  type PricingTier,
  getTierConfigs,
  ACTIVE_PAYPAL_CLIENT_ID,
} from '../paypal-plans';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const planParam = (url.searchParams.get('plan') || 'repository').toLowerCase();
  const validPlan: PricingTier = ['developer', 'repository', 'organization', 'enterprise'].includes(planParam)
    ? (planParam as PricingTier)
    : 'repository';

  const tierConfigs = getTierConfigs();
  const selectedTier = tierConfigs[validPlan];

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || ACTIVE_PAYPAL_CLIENT_ID;
  const anyConfigured = Boolean(
    process.env.PAYPAL_PAYMENT_URL ||
    process.env.PAYPAL_PAYMENT_URL_REPOSITORY ||
    process.env.PAYPAL_PAYMENT_URL_ORGANIZATION ||
    process.env.PAYPAL_PAYMENT_URL_ORG ||
    process.env.PAYPAL_PAYMENT_URL_ENTERPRISE ||
    clientId
  );

  return NextResponse.json({
    ok: true,
    provider: 'paypal',
    configured: anyConfigured,
    plan: validPlan,
    priceUsd: selectedTier.priceUsd,
    interval: selectedTier.interval,
    paymentUrl: selectedTier.paymentUrl,
    clientId,
    planId: selectedTier.planId,
    plans: tierConfigs,
  });
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthContext(req as unknown as NextRequest);
    const body = (await req.json().catch(() => ({}))) as {
      plan?: string;
      subscriptionId?: string;
      orderId?: string;
      userEmail?: string;
      tenantName?: string;
    };

    const planParam = (body.plan || 'repository').toLowerCase();
    const requestedPlan: PricingTier = ['developer', 'repository', 'organization', 'enterprise'].includes(planParam)
      ? (planParam as PricingTier)
      : 'repository';

    if (!body.subscriptionId) {
      return NextResponse.json(
        { ok: false, error: 'Subscription ID is required for PayPal verification.' },
        { status: 400 },
      );
    }

    // Verify subscription with PayPal REST API
    const verified = await verifyPayPalSubscription(body.subscriptionId, requestedPlan);

    const tierConfigs = getTierConfigs();
    const selectedTier = tierConfigs[verified.plan];

    // Persist verified plan to the authenticated tenant
    if (auth && auth.tenant) {
      const db = getDatabase();
      await db.updateTenantPlan(
        auth.tenant.id,
        verified.plan,
        verified.subscriptionId,
        verified.status,
      );
    }

    return NextResponse.json({
      ok: true,
      active: true,
      plan: verified.plan,
      priceUsd: selectedTier.priceUsd,
      subscriptionId: verified.subscriptionId,
      orderId: body.orderId || null,
      mode: verified.isMockVerification ? 'demo_activated' : 'live_activated',
      message: `${selectedTier.name} activated successfully via verified PayPal subscription. Unlimited pull request delivery is enabled.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'PayPal billing confirmation failed';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
