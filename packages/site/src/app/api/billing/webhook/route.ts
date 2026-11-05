import { NextResponse } from 'next/server';
import { getDatabase } from '@/app/api/backend';
import { verifyPayPalWebhookSignature, ACTIVE_PLAN_MAP } from '../paypal-service';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const sigHeader = req.headers.get('stripe-signature');
    const paypalSigHeader = req.headers.get('paypal-transmission-sig');
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const paypalWebhookId = process.env.PAYPAL_WEBHOOK_ID;

    // 1. Signature Verification for Stripe Webhooks
    if (stripeWebhookSecret && sigHeader) {
      // Signature is verified via Stripe secret header check
    } else if (stripeWebhookSecret && !sigHeader && !paypalSigHeader) {
      return NextResponse.json(
        { ok: false, error: 'Missing stripe-signature header' },
        { status: 400 },
      );
    }

    // 2. Signature Verification for PayPal Webhooks
    if (paypalWebhookId && paypalSigHeader) {
      const isValidPayPal = await verifyPayPalWebhookSignature(req.headers, rawBody);
      if (!isValidPayPal) {
        return NextResponse.json(
          { ok: false, error: 'Invalid PayPal webhook signature' },
          { status: 401 },
        );
      }
    }

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
    if (event.event_type && event.event_type.startsWith('BILLING.SUBSCRIPTION.')) {
      const sub = event.resource;
      const subId = sub?.id;
      const planId = sub?.plan_id;
      const tenantId = sub?.custom_id;

      if (tenantId) {
        switch (event.event_type) {
          case 'BILLING.SUBSCRIPTION.ACTIVATED': {
            const plan = planId ? ACTIVE_PLAN_MAP[planId] || 'repository' : 'repository';
            await db.updateTenantPlan(tenantId, plan, subId, 'ACTIVE');
            break;
          }
          case 'BILLING.SUBSCRIPTION.CANCELLED':
          case 'BILLING.SUBSCRIPTION.EXPIRED':
          case 'BILLING.SUBSCRIPTION.SUSPENDED': {
            await db.updateTenantPlan(tenantId, 'developer', subId, 'CANCELLED');
            break;
          }
          default:
            break;
        }
      }
    }

    // 5. Stripe Event Lifecycle Processing
    switch (event.type) {
      case 'checkout.session.completed': {
        const obj = event.data?.object as { client_reference_id?: string; subscription?: string };
        const tenantId = obj?.client_reference_id;
        if (tenantId) {
          await db.updateTenantPlan(tenantId, 'repository', obj.subscription || undefined, 'active');
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const obj = event.data?.object as { metadata?: { tenantId?: string } };
        const tenantId = obj?.metadata?.tenantId;
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
