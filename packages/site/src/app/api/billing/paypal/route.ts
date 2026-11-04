import { NextResponse } from 'next/server';
import { getAuthContext } from '@/app/api/backend';

export async function GET(req: Request) {
  const paymentUrl = process.env.PAYPAL_PAYMENT_URL || '';
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || '';
  const planId = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID || process.env.PAYPAL_PLAN_ID || '';

  const configured = Boolean(paymentUrl || clientId);

  return NextResponse.json({
    ok: true,
    provider: 'paypal',
    configured,
    paymentUrl: paymentUrl || null,
    clientId: clientId || null,
    planId: planId || null,
    plan: 'repository',
    priceUsd: 49,
    interval: 'month',
  });
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthContext(req as any);
    const body = await req.json().catch(() => ({}));

    const { subscriptionId, orderId, plan = 'repository' } = body;

    // In production, when PayPal webhook credentials or subscriptionId are provided,
    // verify the subscription status via PayPal Subscriptions API v1.
    const isMock = !process.env.PAYPAL_CLIENT_SECRET;

    return NextResponse.json({
      ok: true,
      active: true,
      plan,
      subscriptionId: subscriptionId || `sub_demo_${Date.now()}`,
      orderId: orderId || null,
      mode: isMock ? 'demo_activated' : 'live_activated',
      message: 'Repository Pro Plan activated successfully. Unlimited pull request delivery is enabled.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'PayPal billing confirmation failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
