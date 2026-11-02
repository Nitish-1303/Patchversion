import crypto from 'crypto';

export interface WebhookVerificationResult {
  valid: boolean;
  reason?:
    | 'missing_secret'
    | 'empty_secret'
    | 'whitespace_in_secret'
    | 'missing_signature'
    | 'malformed_signature'
    | 'signature_mismatch';
  error?: string;
}

/**
 * Validates a GitHub webhook HMAC-SHA256 signature against the exact raw request bytes.
 *
 * Rules:
 * 1. Requires a non-empty secret without leading, trailing, or internal whitespace.
 *    If whitespace is detected, fails safely without modifying/trimming the secret.
 * 2. Requires a valid X-Hub-Signature-256 header in format 'sha256=' followed by 64 hex characters.
 * 3. Uses crypto.timingSafeEqual to prevent timing attacks.
 * 4. Fails closed under all error conditions.
 */
export function verifyGitHubWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined | null,
  secret: string | undefined | null,
): WebhookVerificationResult {
  if (secret === undefined || secret === null) {
    return {
      valid: false,
      reason: 'missing_secret',
      error: 'Webhook secret is not configured',
    };
  }

  if (secret.length === 0) {
    return {
      valid: false,
      reason: 'empty_secret',
      error: 'Webhook secret is empty',
    };
  }

  // Fail safely if secret is contaminated with whitespace (newlines, tabs, spaces).
  // Do NOT silently trim, as that conceals configuration errors or leads to divergent HMACs.
  if (/\s/.test(secret)) {
    return {
      valid: false,
      reason: 'whitespace_in_secret',
      error: 'Webhook secret contains whitespace characters; configuration must be corrected without whitespace',
    };
  }

  if (!signatureHeader || typeof signatureHeader !== 'string') {
    return {
      valid: false,
      reason: 'missing_signature',
      error: 'Missing or non-string signature header',
    };
  }

  if (!signatureHeader.startsWith('sha256=')) {
    return {
      valid: false,
      reason: 'malformed_signature',
      error: 'Signature header must start with sha256=',
    };
  }

  const hash = signatureHeader.slice(7);
  if (hash.length !== 64 || !/^[0-9a-f]{64}$/i.test(hash)) {
    return {
      valid: false,
      reason: 'malformed_signature',
      error: 'Signature hash must be exactly 64 hexadecimal characters',
    };
  }

  const expected =
    'sha256=' +
    crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

  const sigBuf = Buffer.from(signatureHeader.toLowerCase());
  const expBuf = Buffer.from(expected.toLowerCase());

  if (sigBuf.length !== expBuf.length) {
    return {
      valid: false,
      reason: 'signature_mismatch',
      error: 'Signature length mismatch',
    };
  }

  const matches = crypto.timingSafeEqual(sigBuf, expBuf);
  if (!matches) {
    return {
      valid: false,
      reason: 'signature_mismatch',
      error: 'HMAC signature mismatch',
    };
  }

  return { valid: true };
}
