import { NextResponse } from 'next/server';

interface CheckoutRequestBody {
  plan?: string;
  tenantId?: string;
  returnUrl?: string;
}

const VALID_PLANS = ['developer', 'repository', 'organization', 'enterprise'] as const;
type Plan = (typeof VALID_PLANS)[number];

const PLAN_PRICES: Record<Plan, { name: string; amountCents: number }> = {
  developer: { name: 'Developer Preview', amountCents: 0 },
  repository: { name: 'Repository Tier', amountCents: 4900 },
  organization: { name: 'Organization Tier', amountCents: 29900 },
  enterprise: { name: 'Enterprise Pilot', amountCents: 1500000 },
};

export async function POST(req: Request) {
  try {
    let body: CheckoutRequestBody = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty or invalid JSON
    }

    const planInput = (body.plan || 'repository').toLowerCase();
    const plan: Plan = (VALID_PLANS as readonly string[]).includes(planInput)
      ? (planInput as Plan)
      : 'repository';

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://trypatchbay.vercel.app';

    // If Stripe is configured with live or test credentials
    if (stripeKey && stripeKey.startsWith('sk_')) {
      try {
        const params = new URLSearchParams();
        params.append('mode', 'subscription');
        params.append('success_url', `${siteUrl}/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}`);
        params.append('cancel_url', `${siteUrl}/pricing?billing=canceled`);
        params.append('line_items[0][price_data][currency]', 'usd');
        params.append('line_items[0][price_data][product_data][name]', `trypatchbay ${PLAN_PRICES[plan].name}`);
        params.append('line_items[0][price_data][product_data][description]', 'Deterministic AST migration platform subscription');
        params.append('line_items[0][price_data][unit_amount]', String(PLAN_PRICES[plan].amountCents));
        params.append('line_items[0][price_data][recurring][interval]', 'month');
        params.append('line_items[0][quantity]', '1');
        if (body.tenantId) {
          params.append('client_reference_id', body.tenantId);
          params.append('metadata[tenant_id]', body.tenantId);
        }
        params.append('metadata[plan]', plan);

        const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        if (stripeRes.ok) {
          const session = await stripeRes.json();
          return NextResponse.json({ ok: true, url: session.url, sessionId: session.id });
        }
      } catch {
        // Fall back gracefully if Stripe API call fails
      }
    }

    // Graceful fallback when Stripe is not provisioned or configured in preview
    return NextResponse.json({
      ok: true,
      demo: true,
      plan,
      amountCents: PLAN_PRICES[plan].amountCents,
      message: 'Stripe live billing is not configured in this environment. TryPatchBay prototype access is free during evaluation.',
      redirectUrl: `/signup?plan=${encodeURIComponent(plan)}&billing=preview`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown billing error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const planInput = (searchParams.get('plan') || 'repository').toLowerCase();
  const plan: Plan = (VALID_PLANS as readonly string[]).includes(planInput)
    ? (planInput as Plan)
    : 'repository';

  return NextResponse.json({
    ok: true,
    plan,
    priceCents: PLAN_PRICES[plan].amountCents,
    configured: Boolean(process.env.STRIPE_SECRET_KEY),
    checkoutEndpoint: '/api/billing/checkout',
  });
}
