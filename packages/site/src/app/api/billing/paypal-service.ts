import type { PricingTier } from './paypal/route';

export interface VerifiedSubscription {
  valid: boolean;
  subscriptionId: string;
  plan: PricingTier;
  planId: string;
  status: string;
  payerEmail?: string;
  payerId?: string;
  isMockVerification?: boolean;
}

export const ACTIVE_PLAN_MAP: Record<string, PricingTier> = {
  'P-3J256502HE020922SNLVRT7A': 'repository',
  'P-5H742454KV472641MNLVR4QQ': 'organization',
  'P-1LP49683142123911NLVTCYA': 'enterprise',
};

export const REVERSE_PLAN_MAP: Record<PricingTier, string | null> = {
  developer: null,
  repository: 'P-3J256502HE020922SNLVRT7A',
  organization: 'P-5H742454KV472641MNLVR4QQ',
  enterprise: 'P-1LP49683142123911NLVTCYA',
};

function getPayPalApiBase(): string {
  const env = (process.env.PAYPAL_ENVIRONMENT || process.env.PAYPAL_MODE || 'live').toLowerCase();
  return env === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
}

/**
 * Fetches an OAuth2 Client Credentials access token from PayPal.
 */
export async function getPayPalAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(`${getPayPalApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal OAuth token acquisition failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Verifies a subscription ID against the official PayPal REST API v1.
 * Confirms subscription existence, active status, and matching plan ID.
 */
export async function verifyPayPalSubscription(
  subscriptionId: string,
  expectedPlan?: PricingTier,
): Promise<VerifiedSubscription> {
  const trimmedId = (subscriptionId || '').trim();
  if (!trimmedId) {
    throw new Error('Subscription ID is required for verification.');
  }

  const clientId = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  // In test / sandbox environments without server secrets, require explicit test flag
  if (!clientSecret) {
    const isTestMode =
      process.env.NODE_ENV === 'test' ||
      process.env.ALLOW_DEMO_BILLING === 'true' ||
      process.env.ALLOW_TEST_PAYPAL === 'true';

    if (isTestMode && (trimmedId.startsWith('sub_') || trimmedId.startsWith('I-'))) {
      const plan = expectedPlan || 'repository';
      return {
        valid: true,
        subscriptionId: trimmedId,
        plan,
        planId: REVERSE_PLAN_MAP[plan] || 'P-3J256502HE020922SNLVRT7A',
        status: 'ACTIVE',
        payerEmail: 'test-payer@example.com',
        isMockVerification: true,
      };
    }

    throw new Error(
      'PayPal server credentials (PAYPAL_CLIENT_SECRET) are not configured. ' +
      'Refusing unverified plan activation to prevent unauthorized entitlement escalation.',
    );
  }

  if (!clientId) {
    throw new Error('PAYPAL_CLIENT_ID is not configured.');
  }

  const accessToken = await getPayPalAccessToken(clientId, clientSecret);
  const response = await fetch(`${getPayPalApiBase()}/v1/billing/subscriptions/${encodeURIComponent(trimmedId)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`PayPal subscription ${trimmedId} was not found on PayPal servers.`);
    }
    const errText = await response.text();
    throw new Error(`PayPal subscription verification error (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as {
    id: string;
    status: string;
    plan_id: string;
    subscriber?: {
      email_address?: string;
      payer_id?: string;
    };
  };

  const status = (data.status || '').toUpperCase();
  if (status !== 'ACTIVE' && status !== 'APPROVED') {
    throw new Error(`PayPal subscription ${trimmedId} is in non-active status: ${data.status}`);
  }

  const mappedPlan = ACTIVE_PLAN_MAP[data.plan_id];
  if (!mappedPlan) {
    throw new Error(`PayPal subscription ${trimmedId} is associated with unrecognized plan ID: ${data.plan_id}`);
  }

  if (expectedPlan && expectedPlan !== 'developer' && mappedPlan !== expectedPlan) {
    throw new Error(
      `Plan mismatch: subscription is for ${mappedPlan} (plan ID: ${data.plan_id}), but requested plan is ${expectedPlan}.`,
    );
  }

  return {
    valid: true,
    subscriptionId: data.id,
    plan: mappedPlan,
    planId: data.plan_id,
    status: data.status,
    payerEmail: data.subscriber?.email_address,
    payerId: data.subscriber?.payer_id,
    isMockVerification: false,
  };
}

/**
 * Verifies PayPal Webhook cryptographic signatures using PayPal's verification endpoint.
 */
export async function verifyPayPalWebhookSignature(
  reqHeaders: Headers,
  rawBody: string,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  const clientId = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!webhookId || !clientId || !clientSecret) {
    // If webhook verification is not configured in test, check header
    if (process.env.NODE_ENV === 'test' && reqHeaders.get('x-test-webhook-bypass') === 'true') {
      return true;
    }
    return false;
  }

  try {
    const accessToken = await getPayPalAccessToken(clientId, clientSecret);
    let parsedBody: Record<string, unknown>;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return false;
    }

    const payload = {
      auth_algo: reqHeaders.get('paypal-auth-algo'),
      cert_url: reqHeaders.get('paypal-cert-url'),
      transmission_id: reqHeaders.get('paypal-transmission-id'),
      transmission_sig: reqHeaders.get('paypal-transmission-sig'),
      transmission_time: reqHeaders.get('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: parsedBody,
    };

    const response = await fetch(`${getPayPalApiBase()}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) return false;
    const result = (await response.json()) as { verification_status?: string };
    return result.verification_status === 'SUCCESS';
  } catch {
    return false;
  }
}
