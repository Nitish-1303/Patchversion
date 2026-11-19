/**
 * @jest-environment node
 */
import { GET as getCheckout, POST as postCheckout } from '../src/app/api/billing/checkout/route';
import { POST as postWebhook } from '../src/app/api/billing/webhook/route';
import { GET as getPaypal, POST as postPaypal } from '../src/app/api/billing/paypal/route';
import {
  createStripeTestSignatureHeader,
  verifyStripeWebhookSignature,
} from '../src/app/api/billing/stripe-webhook-security';

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

  test('POST /api/billing/webhook refuses Stripe events when webhook secret is not configured', async () => {
    const payload = {
      id: 'evt_test_unconfigured',
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
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe('STRIPE_WEBHOOK_NOT_CONFIGURED');
  });

  test('POST /api/billing/webhook rejects invalid Stripe signatures', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dGVzdF9zdHJpcGVfc2VjcmV0X2Zvcl91bml0X3Rlc3Rz';
    const payload = JSON.stringify({
      id: 'evt_test_bad_sig',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_x', client_reference_id: 'tenant-test-123' } },
    });

    const req = new Request('https://trypatchbay.vercel.app/api/billing/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=1700000000,v1=00'.padEnd(70, '0'),
      },
      body: payload,
    });

    const res = await postWebhook(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  test('POST /api/billing/webhook accepts HMAC-verified Stripe payloads', async () => {
    const secret = 'whsec_dGVzdF9zdHJpcGVfc2VjcmV0X2Zvcl91bml0X3Rlc3Rz';
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    const payload = JSON.stringify({
      id: `evt_test_ok_${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_mock_session',
          client_reference_id: 'tenant-test-123',
          subscription: 'sub_test_mock_subscription',
          metadata: { plan: 'repository' },
        },
      },
    });
    const signature = createStripeTestSignatureHeader(payload, secret);
    expect(verifyStripeWebhookSignature(payload, signature, secret).valid).toBe(true);

    const req = new Request('https://trypatchbay.vercel.app/api/billing/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
      },
      body: payload,
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

    test('POST /api/billing/paypal rejects request when subscriptionId is missing', async () => {
      const req = new Request('https://trypatchbay.vercel.app/api/billing/paypal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'repository' }),
      });

      const res = await postPaypal(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toContain('Subscription ID is required');
    });

    test('POST /api/billing/paypal rejects unverified subscription in non-test mode', async () => {
      const prevNodeEnv = process.env.NODE_ENV;
      delete process.env.ALLOW_DEMO_BILLING;
      delete process.env.ALLOW_TEST_PAYPAL;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true });

      const req = new Request('https://trypatchbay.vercel.app/api/billing/paypal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'repository', subscriptionId: 'fake_subscription_id_123' }),
      });

      const res = await postPaypal(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toContain('PAYPAL_CLIENT_SECRET');
      Object.defineProperty(process.env, 'NODE_ENV', { value: prevNodeEnv, configurable: true });
    });

    test('POST /api/billing/webhook enforces idempotent delivery handling', async () => {
      const eventPayload = {
        id: 'evt_paypal_idempotent_test_999',
        event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
        resource: {
          id: 'I-TEST-999',
          plan_id: 'P-3J256502HE020922SNLVRT7A',
          status: 'ACTIVE',
          custom_id: 'tenant_idempotent_test',
        },
      };

      const req1 = new Request('https://trypatchbay.vercel.app/api/billing/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-webhook-bypass': 'true',
        },
        body: JSON.stringify(eventPayload),
      });

      const res1 = await postWebhook(req1);
      expect(res1.status).toBe(200);
      const body1 = await res1.json();
      expect(body1.received).toBe(true);

      // Replay identical event
      const req2 = new Request('https://trypatchbay.vercel.app/api/billing/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-webhook-bypass': 'true',
        },
        body: JSON.stringify(eventPayload),
      });

      const res2 = await postWebhook(req2);
      expect(res2.status).toBe(200);
      const body2 = await res2.json();
      expect(body2.status).toBe('already_processed');
    });

    test('POST /api/billing/webhook resolves tenant by subscription_id fallback when custom_id is missing', async () => {
      const { getDatabase } = await import('../src/app/api/backend');
      const db = getDatabase();
      const uniqueSubId = `I-SUB-FALLBACK-${Date.now()}`;
      const uniqueTenantId = `tenant_fallback_${Date.now()}`;
      const testTenant = await db.createTenant('Tenant Missing CustomId', uniqueTenantId);
      await db.updateTenantPlan(testTenant.id, 'repository', uniqueSubId, 'ACTIVE');

      const eventPayload = {
        id: `evt_paypal_fallback_${Date.now()}_${Math.random()}`,
        event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
        resource: {
          id: uniqueSubId,
          plan_id: 'P-3J256502HE020922SNLVRT7A',
          status: 'CANCELLED',
        },
      };

      const req = new Request('https://trypatchbay.vercel.app/api/billing/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-webhook-bypass': 'true',
        },
        body: JSON.stringify(eventPayload),
      });

      const res = await postWebhook(req);
      expect(res.status).toBe(200);

      const updated = await db.getTenant(testTenant.id);
      expect(updated?.plan).toBe('developer');
      expect(updated?.subscriptionStatus).toBe('CANCELLED');
    });

    test('POST /api/billing/webhook handles unknown subscription_id gracefully without throwing', async () => {
      const eventPayload = {
        id: `evt_paypal_unknown_${Date.now()}_${Math.random()}`,
        event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
        resource: {
          id: 'I-NONEXISTENT-SUB-99999',
          plan_id: 'P-3J256502HE020922SNLVRT7A',
          status: 'CANCELLED',
        },
      };

      const req = new Request('https://trypatchbay.vercel.app/api/billing/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-webhook-bypass': 'true',
        },
        body: JSON.stringify(eventPayload),
      });

      const res = await postWebhook(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('tenant_not_found');
    });

    test('POST /api/billing/webhook rejects invalid signature with 401', async () => {
      process.env.PAYPAL_WEBHOOK_ID = 'webhook_id_live_123';

      const eventPayload = {
        id: `evt_paypal_bad_sig_${Date.now()}_${Math.random()}`,
        event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
        resource: { id: 'I-SUB-123' },
      };

      const req = new Request('https://trypatchbay.vercel.app/api/billing/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'paypal-transmission-sig': 'invalid_forged_signature',
        },
        body: JSON.stringify(eventPayload),
      });

      const res = await postWebhook(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain('Invalid PayPal webhook signature');
    });

    test('POST /api/billing/webhook rejects unsigned PayPal lifecycle events when verification is not configured', async () => {
      delete process.env.PAYPAL_WEBHOOK_ID;
      delete process.env.PAYPAL_CLIENT_ID;
      delete process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
      delete process.env.PAYPAL_CLIENT_SECRET;

      const req = new Request('https://trypatchbay.vercel.app/api/billing/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'evt_unsigned_paypal_test',
          event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
          resource: {
            id: 'I-UNSIGNED-TEST',
            custom_id: 'tenant_unsigned_test',
          },
        }),
      });

      const res = await postWebhook(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain('Invalid PayPal webhook signature');
    });

    test('POST /api/billing/webhook handles SUSPENDED and PAYMENT.FAILED lifecycle events', async () => {
      const { getDatabase } = await import('../src/app/api/backend');
      const db = getDatabase();
      const uniqueTenantId = `tenant_failed_${Date.now()}`;
      const uniqueSubId = `I-SUB-FAIL-${Date.now()}`;
      const testTenant = await db.createTenant('Tenant Failure Test', uniqueTenantId);
      await db.updateTenantPlan(testTenant.id, 'repository', uniqueSubId, 'ACTIVE');

      const failedEvent = {
        id: `evt_paypal_failed_${Date.now()}_${Math.random()}`,
        event_type: 'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
        resource: {
          id: uniqueSubId,
          custom_id: testTenant.id,
        },
      };

      const req = new Request('https://trypatchbay.vercel.app/api/billing/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-webhook-bypass': 'true',
        },
        body: JSON.stringify(failedEvent),
      });

      const res = await postWebhook(req);
      expect(res.status).toBe(200);

      const updated = await db.getTenant(testTenant.id);
      expect(updated?.plan).toBe('developer');
      expect(updated?.subscriptionStatus).toBe('PAYMENT.FAILED');
    });

  });
});
