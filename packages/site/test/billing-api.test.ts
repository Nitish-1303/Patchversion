/**
 * @jest-environment node
 */
import { GET as getCheckout, POST as postCheckout } from '../src/app/api/billing/checkout/route';
import { POST as postWebhook } from '../src/app/api/billing/webhook/route';
import { GET as getPaypal, POST as postPaypal } from '../src/app/api/billing/paypal/route';

describe('Stripe Billing API & Checkout Endpoints', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  test('GET /api/billing/checkout returns plan price and configuration status', async () => {
    const req = new Request('https://trypatchbay.vercel.app/api/billing/checkout?plan=repository');
    const res = await getCheckout(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.plan).toBe('repository');
    expect(body.priceCents).toBe(4900);
    expect(body.configured).toBe(false);
  });

  test('POST /api/billing/checkout falls back gracefully to preview mode when Stripe is unconfigured', async () => {
    const req = new Request('https://trypatchbay.vercel.app/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'repository', tenantId: 'tenant-test-123' }),
    });

    const res = await postCheckout(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.demo).toBe(true);
    expect(body.plan).toBe('repository');
    expect(body.amountCents).toBe(4900);
    expect(body.redirectUrl).toContain('/signup?plan=repository');
  });

  test('POST /api/billing/checkout initiates Stripe session when STRIPE_SECRET_KEY is present', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock_stripe_key_12345';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'cs_test_mock_session_id',
        url: 'https://checkout.stripe.com/c/pay/cs_test_mock_session_id',
      }),
    } as unknown as Response);

    const req = new Request('https://trypatchbay.vercel.app/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'organization', tenantId: 'tenant-org-789' }),
    });

    const res = await postCheckout(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sessionId).toBe('cs_test_mock_session_id');
    expect(body.url).toBe('https://checkout.stripe.com/c/pay/cs_test_mock_session_id');
  });

  test('POST /api/billing/webhook rejects missing signature when webhook secret is configured', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

    const req = new Request('https://trypatchbay.vercel.app/api/billing/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'checkout.session.completed' }),
    });

    const res = await postWebhook(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('Missing stripe-signature');
  });

  test('POST /api/billing/webhook handles valid payload cleanly', async () => {
    const payload = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_mock_session',
          client_reference_id: 'tenant-test-123',
          subscription: 'sub_test_mock_subscription',
        },
      },
    };

    const req = new Request('https://trypatchbay.vercel.app/api/billing/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await postWebhook(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.received).toBe(true);
    expect(body.event).toBe('checkout.session.completed');
  });

  describe('PayPal Multi-Tier Checkout & Billing API', () => {
    test('GET /api/billing/paypal returns multi-tier plans and pricing ($49, $299, $15,000)', async () => {
      const req = new Request('https://trypatchbay.vercel.app/api/billing/paypal?plan=organization');
      const res = await getPaypal(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.provider).toBe('paypal');
      expect(body.plan).toBe('organization');
      expect(body.priceUsd).toBe(299);
      expect(body.plans.repository.priceUsd).toBe(49);
      expect(body.plans.organization.priceUsd).toBe(299);
      expect(body.plans.enterprise.priceUsd).toBe(15000);
    });

    test('POST /api/billing/paypal activates requested tier with subscription ID', async () => {
      const req = new Request('https://trypatchbay.vercel.app/api/billing/paypal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'organization',
          subscriptionId: 'sub_paypal_org_test_123',
        }),
      });

      const res = await postPaypal(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.active).toBe(true);
      expect(body.plan).toBe('organization');
      expect(body.priceUsd).toBe(299);
      expect(body.subscriptionId).toBe('sub_paypal_org_test_123');
    });

    test('POST /api/billing/checkout returns tier-specific PayPal payment URL when configured', async () => {
      process.env.PAYPAL_PAYMENT_URL_ORGANIZATION = 'https://www.paypal.com/ncp/payment/ORG123';

      const req = new Request('https://trypatchbay.vercel.app/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'organization', provider: 'paypal' }),
      });

      const res = await postCheckout(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.provider).toBe('paypal');
      expect(body.url).toBe('https://www.paypal.com/ncp/payment/ORG123');
    });
  });
});
