import crypto from 'crypto';
import { verifyGitHubWebhookSignature } from '../src/github/webhook-verifier';

describe('verifyGitHubWebhookSignature utility', () => {
  const secret = 'valid-test-secret-at-least-32-bytes-long';
  const rawBody = Buffer.from(JSON.stringify({ zen: 'Keep it logically awesome.', hook_id: 12345 }), 'utf8');

  function computeValidSig(body: Buffer, sec: string): string {
    return 'sha256=' + crypto.createHmac('sha256', sec).update(body).digest('hex');
  }

  test('1. Valid HMAC signature is accepted', () => {
    const sig = computeValidSig(rawBody, secret);
    const result = verifyGitHubWebhookSignature(rawBody, sig, secret);
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  test('2. Invalid signature is rejected with signature_mismatch', () => {
    const invalidSig = 'sha256=' + '0'.repeat(64);
    const result = verifyGitHubWebhookSignature(rawBody, invalidSig, secret);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('signature_mismatch');
  });

  test('3. Missing signature header is rejected with missing_signature', () => {
    expect(verifyGitHubWebhookSignature(rawBody, undefined, secret).reason).toBe('missing_signature');
    expect(verifyGitHubWebhookSignature(rawBody, null, secret).reason).toBe('missing_signature');
    expect(verifyGitHubWebhookSignature(rawBody, '', secret).reason).toBe('missing_signature');
  });

  test('4. Malformed signature header is rejected with malformed_signature', () => {
    // Missing sha256= prefix
    expect(verifyGitHubWebhookSignature(rawBody, '0'.repeat(64), secret).reason).toBe('malformed_signature');
    // sha1= instead of sha256=
    expect(verifyGitHubWebhookSignature(rawBody, 'sha1=' + '0'.repeat(40), secret).reason).toBe('malformed_signature');
    // Too short (63 chars)
    expect(verifyGitHubWebhookSignature(rawBody, 'sha256=' + 'a'.repeat(63), secret).reason).toBe('malformed_signature');
    // Too long (65 chars)
    expect(verifyGitHubWebhookSignature(rawBody, 'sha256=' + 'a'.repeat(65), secret).reason).toBe('malformed_signature');
    // Non-hex characters
    expect(verifyGitHubWebhookSignature(rawBody, 'sha256=' + 'z'.repeat(64), secret).reason).toBe('malformed_signature');
  });

  test('5. Missing webhook secret is rejected with missing_secret', () => {
    const sig = computeValidSig(rawBody, secret);
    expect(verifyGitHubWebhookSignature(rawBody, sig, undefined).reason).toBe('missing_secret');
    expect(verifyGitHubWebhookSignature(rawBody, sig, null).reason).toBe('missing_secret');
  });

  test('6. Empty webhook secret is rejected with empty_secret', () => {
    const sig = computeValidSig(rawBody, secret);
    expect(verifyGitHubWebhookSignature(rawBody, sig, '').reason).toBe('empty_secret');
  });

  test('7. Whitespace-contaminated secret fails safely without trimming', () => {
    const sig = computeValidSig(rawBody, secret);
    // Trailing newline
    expect(verifyGitHubWebhookSignature(rawBody, sig, `${secret}\n`).reason).toBe('whitespace_in_secret');
    // Leading space
    expect(verifyGitHubWebhookSignature(rawBody, sig, ` ${secret}`).reason).toBe('whitespace_in_secret');
    // Internal whitespace
    expect(verifyGitHubWebhookSignature(rawBody, sig, 'secret with spaces').reason).toBe('whitespace_in_secret');
    // Carriage return
    expect(verifyGitHubWebhookSignature(rawBody, sig, `${secret}\r\n`).reason).toBe('whitespace_in_secret');
  });

  test('8. Raw-body byte difference causes signature mismatch', () => {
    const sig = computeValidSig(rawBody, secret);
    // Alter single byte
    const alteredBody = Buffer.from(rawBody);
    alteredBody[0] = alteredBody[0] ^ 1;

    const result = verifyGitHubWebhookSignature(alteredBody, sig, secret);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('signature_mismatch');
  });
});
