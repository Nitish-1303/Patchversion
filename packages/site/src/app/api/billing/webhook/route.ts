import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const sigHeader = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // If webhook secret is configured, require signature verification header
    if (webhookSecret && !sigHeader) {
      return NextResponse.json(
        { ok: false, error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    let event: { type?: string; data?: { object?: Record<string, unknown> } } = {};
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Process event types
    switch (event.type) {
      case 'checkout.session.completed': {
        // In live mode with database connected, update tenant subscription record
        break;
      }
      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        // Handle subscription lifecycle transitions
        break;
      }
      default:
        // Acknowledge receipt for unhandled events
        break;
    }

    return NextResponse.json({ received: true, event: event.type || 'unknown' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook handler error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
