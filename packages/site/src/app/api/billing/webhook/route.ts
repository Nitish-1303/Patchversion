import { NextResponse } from 'next/server';
import { getDatabase } from '@/app/api/backend';
import { verifyPayPalWebhookSignature, ACTIVE_PLAN_MAP } from '../paypal-service';
import {
  isStripeEventPayload,
  verifyStripeWebhookSignature,
} from '../stripe-webhook-security';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const sigHeader = req.headers.get('stripe-signature');
    const paypalSigHeader = req.headers.get('paypal-transmission-sig');
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: {
      id?: string;
      type?: string;
      event_type?: string;
      data?: { object?: Record<string, unknown> };
      resource?: {
        id?: string;
        plan_id?: string;
        status?: string;
        subscriber?: { email_address?: string };
        custom_id?: string;
      };
    } = {};

    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Invalid JSON payload' },
        { status: 400 },
      );
    }

    const looksLikeStripe = isStripeEventPayload(event);
    const looksLikePayPal = Boolean(
      event.event_type?.startsWith('BILLING.SUBSCRIPTION.') ||
      event.event_type?.startsWith('PAYMENT.') ||
      paypalSigHeader,
    );

    // 1. Stripe webhook crypto verification (required when secret configured;
    //    Stripe entitlement ingest is hard-disabled when secret is missing).
    if (looksLikeStripe) {
      if (!stripeWebhookSecret || !stripeWebhookSecret.trim()) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Stripe webhook ingest is disabled until STRIPE_WEBHOOK_SECRET is configured.',
            code: 'STRIPE_WEBHOOK_NOT_CONFIGURED',
          },
          { status: 503 },
        );
      }
      const stripeVerify = verifyStripeWebhookSignature(rawBody, sigHeader, stripeWebhookSecret);
      if (!stripeVerify.valid) {
        const status = stripeVerify.reason === 'missing_signature' ? 400 : 401;
        return NextResponse.json(
          {
            ok: false,
            error:
              stripeVerify.reason === 'missing_signature'
                ? 'Missing stripe-signature header'
                : `Invalid Stripe webhook signature (${stripeVerify.reason})`,
            code: stripeVerify.reason.toUpperCase(),
          },
          { status },
        );
      }
    } else if (stripeWebhookSecret && !sigHeader && !paypalSigHeader && !looksLikePayPal) {
      return NextResponse.json(
        { ok: false, error: 'Missing stripe-signature header' },
        { status: 400 },
      );
    }

    // 2. Signature Verification for PayPal Webhooks
    if (looksLikePayPal) {
      const isValidPayPal = await verifyPayPalWebhookSignature(req.headers, rawBody);
      if (!isValidPayPal) {
        return NextResponse.json(
          { ok: false, error: 'Invalid PayPal webhook signature' },
          { status: 401 },
        );
      }
    }

    const eventId = event.id || (event.data?.object?.id as string) || `evt_${Date.now()}`;
    const eventType = event.event_type || event.type || 'unknown';

    // 3. Idempotent Delivery Tracking
    const db = getDatabase();
    const alreadyProcessed = await db.isWebhookProcessed(eventId);
    if (alreadyProcessed) {
      return NextResponse.json({
        received: true,
        status: 'already_processed',
        event: eventType,
      });
    }

    // 4. PayPal Subscription Lifecycle Processing
    if (event.event_type && (event.event_type.startsWith('BILLING.SUBSCRIPTION.') || event.event_type === 'PAYMENT.SALE.COMPLETED')) {
      const sub = event.resource;
      const subId = sub?.id;
      const planId = sub?.plan_id;
      let tenantId = sub?.custom_id;

      // Trusted fallback: lookup tenant by subscription_id if custom_id is missing from webhook metadata
      if (!tenantId && subId && typeof db.getTenantBySubscriptionId === 'function') {
        const matchingTenant = await db.getTenantBySubscriptionId(subId);
        if (matchingTenant) {
          tenantId = matchingTenant.id;
        }
      }

      if (!tenantId) {
        await db.recordWebhookDelivery(
          eventId,
          eventType,
          paypalSigHeader || sigHeader || 'unsigned_test',
        );
        return NextResponse.json({
          received: true,
          status: 'tenant_not_found',
          event: eventType,
          subscriptionId: subId || null,
        });
      }

      switch (event.event_type) {
        case 'BILLING.SUBSCRIPTION.ACTIVATED':
        case 'BILLING.SUBSCRIPTION.RE-ACTIVATED':
        case 'BILLING.SUBSCRIPTION.RENEWED': {
          const plan = planId ? ACTIVE_PLAN_MAP[planId] || 'repository' : 'repository';
          await db.updateTenantPlan(tenantId, plan, subId, 'ACTIVE');
          break;
        }
        case 'BILLING.SUBSCRIPTION.CANCELLED':
        case 'BILLING.SUBSCRIPTION.EXPIRED':
        case 'BILLING.SUBSCRIPTION.SUSPENDED':
        case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
          const status = event.event_type.replace('BILLING.SUBSCRIPTION.', '');
          await db.updateTenantPlan(tenantId, 'developer', subId, status);
          break;
        }
        default:
          break;
      }
    }

    // 5. Stripe Event Lifecycle Processing (only reached after HMAC verification)
    switch (event.type) {
      case 'checkout.session.completed': {
        const obj = event.data?.object as {
          client_reference_id?: string;
          subscription?: string;
          metadata?: { plan?: string };
        };
        const tenantId = obj?.client_reference_id;
        if (tenantId) {
          const planMeta = obj?.metadata?.plan;
          const plan =
            planMeta === 'organization' || planMeta === 'enterprise' || planMeta === 'repository'
              ? planMeta
              : 'repository';
          await db.updateTenantPlan(tenantId, plan, obj.subscription || undefined, 'active');
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const obj = event.data?.object as { metadata?: { tenantId?: string; tenant_id?: string } };
        const tenantId = obj?.metadata?.tenantId || obj?.metadata?.tenant_id;
        if (tenantId) {
          await db.updateTenantPlan(tenantId, 'developer', undefined, 'canceled');
        }
        break;
      }
      default:
        break;
    }

    // 6. Record processed webhook delivery for idempotency
    await db.recordWebhookDelivery(
      eventId,
      eventType,
      paypalSigHeader || sigHeader || 'unsigned_test',
    );

    return NextResponse.json({ received: true, event: eventType });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook handler error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
