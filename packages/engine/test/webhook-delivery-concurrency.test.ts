/**
 * Concurrent delivery-id uniqueness, payload-hash conflict, and store lookup.
 * Uses in-memory PatchversionDatabase — no Neon / production credentials.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { PatchversionDatabase } from '../src/db/database';
import {
  encodeGitHubWebhookDeliverySignature,
  hashGitHubWebhookPayload,
  extractGitHubWebhookPayloadHash,
  WEBHOOK_PAYLOAD_HASH_PREFIX,
} from '../src/github/webhook-security';
import { handleGitHubWebhookHttp } from '../src/github/webhook-http-handler';
import { verifyGitHubWebhookSignature } from '../src/github/webhook-verifier';

const SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function sign(raw: Buffer): string {
  return `sha256=${crypto.createHmac('sha256', SECRET).update(raw).digest('hex')}`;
}

describe('webhook delivery store + concurrency (Phase 1B.2)', () => {
  let tmpDir: string;
  let db: PatchversionDatabase;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-wh-conc-'));
    process.env.PATCHVERSION_STATE_DIR = tmpDir;
    db = new PatchversionDatabase(tmpDir);
  });

  afterEach(() => {
    delete process.env.PATCHVERSION_STATE_DIR;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('recordWebhookDelivery uniqueness: second insert returns false', () => {
    const ok1 = db.recordWebhookDelivery('d1', 'ping', 'sig-a');
    const ok2 = db.recordWebhookDelivery('d1', 'ping', 'sig-b');
    expect(ok1).toBe(true);
    expect(ok2).toBe(false);
    const row = db.getWebhookDelivery('d1');
    expect(row?.signature).toBe('sig-a');
  });

  test('getWebhookDelivery returns null for unknown id', () => {
    expect(db.getWebhookDelivery('missing')).toBeNull();
  });

  test('payload-hash helpers round-trip for conflict detection', () => {
    const body = Buffer.from('{"zen":"x"}', 'utf8');
    const hash = hashGitHubWebhookPayload(body);
    const stored = encodeGitHubWebhookDeliverySignature(sign(body), hash);
    expect(stored.startsWith(WEBHOOK_PAYLOAD_HASH_PREFIX)).toBe(true);
    expect(extractGitHubWebhookPayloadHash(stored)).toBe(hash);
    expect(verifyGitHubWebhookSignature(body, sign(body), SECRET).valid).toBe(true);
  });

  test('concurrent duplicate same payload: exactly one accepted processing path', async () => {
    const deliveryId = 'conc-dup-same';
    const rawBody = Buffer.from(JSON.stringify({ zen: 'same' }), 'utf8');
    const signature = sign(rawBody);
    const headers = {
      'x-github-delivery': deliveryId,
      'x-hub-signature-256': signature,
      'x-github-event': 'ping',
    };

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        handleGitHubWebhookHttp({ rawBody, headers, webhookSecret: SECRET, db }),
      ),
    );

    const accepted = results.filter((r) => r.status === 200 && (r.body as { status?: string }).status === 'accepted');
    const duplicates = results.filter(
      (r) => r.status === 200 && (r.body as { message?: string }).message === 'Delivery already processed',
    );
    expect(accepted.length).toBe(1);
    expect(duplicates.length).toBe(7);
    expect(db.getWebhookDelivery(deliveryId)).not.toBeNull();
  });

  test('concurrent same delivery id different payloads: 409 conflict observed', async () => {
    const deliveryId = 'conc-dup-diff';
    const bodyA = Buffer.from(JSON.stringify({ zen: 'a' }), 'utf8');
    const bodyB = Buffer.from(JSON.stringify({ zen: 'b' }), 'utf8');

    const run = (rawBody: Buffer) =>
      handleGitHubWebhookHttp({
        rawBody,
        headers: {
          'x-github-delivery': deliveryId,
          'x-hub-signature-256': sign(rawBody),
          'x-github-event': 'ping',
        },
        webhookSecret: SECRET,
        db,
      });

    // Seed winner first so race has a prior hash; then flood alternate payload.
    const first = await run(bodyA);
    expect(first.status).toBe(200);

    const conflicts = await Promise.all(Array.from({ length: 8 }, () => run(bodyB)));
    expect(conflicts.every((r) => r.status === 409)).toBe(true);
    expect((conflicts[0].body as { code?: string }).code).toBe('WEBHOOK_PAYLOAD_CONFLICT');
  });

  test('legacy row without ph=: different HMAC header → 409 conflict', async () => {
    const deliveryId = 'legacy-no-ph';
    const bodyA = Buffer.from(JSON.stringify({ zen: 'legacy-a' }), 'utf8');
    const bodyB = Buffer.from(JSON.stringify({ zen: 'legacy-b' }), 'utf8');
    // Simulate pre-SoT row that stored only the raw signature header.
    expect(db.recordWebhookDelivery(deliveryId, 'ping', sign(bodyA))).toBe(true);

    const conflict = await handleGitHubWebhookHttp({
      rawBody: bodyB,
      headers: {
        'x-github-delivery': deliveryId,
        'x-hub-signature-256': sign(bodyB),
        'x-github-event': 'ping',
      },
      webhookSecret: SECRET,
      db,
    });
    expect(conflict.status).toBe(409);
    expect((conflict.body as { code?: string }).code).toBe('WEBHOOK_PAYLOAD_CONFLICT');

    const same = await handleGitHubWebhookHttp({
      rawBody: bodyA,
      headers: {
        'x-github-delivery': deliveryId,
        'x-hub-signature-256': sign(bodyA),
        'x-github-event': 'ping',
      },
      webhookSecret: SECRET,
      db,
    });
    expect(same.status).toBe(200);
    expect((same.body as { message?: string }).message).toBe('Delivery already processed');
  });

  test('partial failure after record: retry returns already processed (idempotent)', async () => {
    const deliveryId = 'partial-fail-retry';
    const rawBody = Buffer.from(JSON.stringify({ zen: 'retry' }), 'utf8');
    const signature = sign(rawBody);
    const headers = {
      'x-github-delivery': deliveryId,
      'x-hub-signature-256': signature,
      'x-github-event': 'ping',
    };

    const first = await handleGitHubWebhookHttp({
      rawBody,
      headers,
      webhookSecret: SECRET,
      db,
    });
    expect(first.status).toBe(200);
    expect((first.body as { status?: string }).status).toBe('accepted');

    // Simulate GitHub retry after handler crash post-record: must not re-process.
    const retry = await handleGitHubWebhookHttp({
      rawBody,
      headers,
      webhookSecret: SECRET,
      db,
    });
    expect(retry.status).toBe(200);
    expect((retry.body as { message?: string }).message).toBe('Delivery already processed');
  });
});
