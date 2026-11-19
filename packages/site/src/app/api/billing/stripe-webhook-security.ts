import crypto from 'crypto';

export const STRIPE_WEBHOOK_TOLERANCE_SECONDS = 300;

export type StripeWebhookVerifyReason =
  | 'missing_secret'
  | 'empty_secret'
  | 'missing_signature'
  | 'malformed_signature'
  | 'timestamp_tolerance'
  | 'signature_mismatch'
  | 'ok';

export interface StripeWebhookVerifyResult {
  valid: boolean;
  reason: StripeWebhookVerifyReason;
  timestamp?: number;
}

/**
 * Verifies a Stripe webhook signature header against the raw request body.
 * Implements Stripe's `t=,v1=` HMAC-SHA256 scheme without requiring the Stripe SDK.
 *
 * @see https://stripe.com/docs/webhooks/signatures
 */
export function verifyStripeWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null | undefined,
  webhookSecret: string | null | undefined,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = STRIPE_WEBHOOK_TOLERANCE_SECONDS,
): StripeWebhookVerifyResult {
  if (webhookSecret === undefined || webhookSecret === null) {
    return { valid: false, reason: 'missing_secret' };
  }
  const secret = webhookSecret.trim();
  if (!secret) {
    return { valid: false, reason: 'empty_secret' };
  }
  if (!signatureHeader || !String(signatureHeader).trim()) {
    return { valid: false, reason: 'missing_signature' };
  }

  const parts = String(signatureHeader).split(',').map((p) => p.trim());
  let timestamp: number | null = null;
  const v1Signatures: string[] = [];
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const key = part.slice(0, eq);
    const value = part.slice(eq + 1);
    if (key === 't') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) timestamp = parsed;
    } else if (key === 'v1' && value) {
      v1Signatures.push(value);
    }
  }

  if (timestamp === null || v1Signatures.length === 0) {
    return { valid: false, reason: 'malformed_signature' };
  }

  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return { valid: false, reason: 'timestamp_tolerance', timestamp };
  }

  const signedPayload = `${timestamp}.${typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8')}`;
  const key = decodeStripeWebhookSecret(secret);
  const expected = crypto.createHmac('sha256', key).update(signedPayload, 'utf8').digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');

  for (const candidate of v1Signatures) {
    const candidateBuf = Buffer.from(candidate, 'utf8');
    if (
      candidateBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(candidateBuf, expectedBuf)
    ) {
      return { valid: true, reason: 'ok', timestamp };
    }
  }

  return { valid: false, reason: 'signature_mismatch', timestamp };
}

function decodeStripeWebhookSecret(secret: string): Buffer {
  if (secret.startsWith('whsec_')) {
    const encoded = secret.slice('whsec_'.length);
    try {
      return Buffer.from(encoded, 'base64');
    } catch {
      return Buffer.from(secret, 'utf8');
    }
  }
  return Buffer.from(secret, 'utf8');
}

export function isStripeEventPayload(event: { type?: string; event_type?: string }): boolean {
  return typeof event.type === 'string' && event.type.length > 0 && !event.event_type;
}

export function createStripeTestSignatureHeader(
  rawBody: string,
  webhookSecret: string,
  timestamp = Math.floor(Date.now() / 1000),
): string {
  const key = decodeStripeWebhookSecret(webhookSecret.trim());
  const signedPayload = `${timestamp}.${rawBody}`;
  const v1 = crypto.createHmac('sha256', key).update(signedPayload, 'utf8').digest('hex');
  return `t=${timestamp},v1=${v1}`;
}
