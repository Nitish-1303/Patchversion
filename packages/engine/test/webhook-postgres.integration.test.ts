import { Pool } from 'pg';
import crypto from 'crypto';
import { createRequire } from 'module';
import { PostgresStore } from '../src/db/postgres-store';
import {
  encodeGitHubWebhookDeliverySignature,
  hashGitHubWebhookPayload,
  extractGitHubWebhookPayloadHash,
} from '../src/github/webhook-security';
import { handleGitHubWebhookHttp } from '../src/github/webhook-http-handler';

const { assertDisposableLocalDatabase } = createRequire(__filename)(
  '../../../scripts/hosted-db-guard.js',
) as { assertDisposableLocalDatabase: (value: string) => string };

/**
 * Disposable local PostgreSQL webhook persistence + concurrency.
 * Uses only the hosted-db-guard local-test URL. Never Neon / production.
 * Skips unless DATABASE_URL is the disposable patchbay_test fixture
 * (npm run test:postgres).
 */
const connectionString = assertDisposableLocalDatabase(
  process.env.DATABASE_URL || process.env.POSTGRES_URL || '',
);
const isStrictCi = process.env.STRICT_DB_CHECK === 'true' || process.env.CI_STRICT_DB === 'true';

if (isStrictCi && !connectionString) {
  test('Webhook PostgreSQL strict CI failure', () => {
    throw new Error(
      'STRICT_DB_CHECK is enabled, but disposable DATABASE_URL/POSTGRES_URL is not configured.',
    );
  });
}

const describeLive = connectionString ? describe : describe.skip;

const SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function sign(raw: Buffer): string {
  return `sha256=${crypto.createHmac('sha256', SECRET).update(raw).digest('hex')}`;
}

describeLive('Webhook PostgreSQL persistence + concurrency (Phase 1B.2)', () => {
  let pool: Pool;
  let testSchema: string;
  let store: PostgresStore;

  beforeAll(async () => {
    if (!connectionString) return;

    pool = new Pool({ connectionString });
    const schemaSuffix = crypto.randomBytes(4).toString('hex');
    testSchema = `patchbay_webhook_test_${schemaSuffix}`;

    pool.on('connect', (client) => {
      client.query(`SET search_path TO ${testSchema}, public;`);
    });

    const client = await pool.connect();
    try {
      await client.query(`CREATE SCHEMA ${testSchema};`);
      await client.query(`SET search_path TO ${testSchema}, public;`);
    } finally {
      client.release();
    }

    store = new PostgresStore({ pool, schema: testSchema });
    await store.runMigrations();
  });

  afterAll(async () => {
    if (!pool || !testSchema) return;
    const client = await pool.connect();
    try {
      await client.query(`DROP SCHEMA IF EXISTS ${testSchema} CASCADE;`);
    } finally {
      client.release();
      await pool.end();
    }
  });

  test('delivery_id UNIQUE: second insert returns false and preserves first signature', async () => {
    const deliveryId = `pg-uniq-${crypto.randomBytes(4).toString('hex')}`;
    const ok1 = await store.recordWebhookDelivery(deliveryId, 'ping', 'sig-first');
    const ok2 = await store.recordWebhookDelivery(deliveryId, 'ping', 'sig-second');
    expect(ok1).toBe(true);
    expect(ok2).toBe(false);

    const row = await store.getWebhookDelivery(deliveryId);
    expect(row).not.toBeNull();
    expect(row?.signature).toBe('sig-first');
    expect(row?.event).toBe('ping');
    expect(row?.status).toBe('processed');
  });

  test('schema enforces UNIQUE(delivery_id) under concurrent inserts', async () => {
    const deliveryId = `pg-conc-ins-${crypto.randomBytes(4).toString('hex')}`;
    const results = await Promise.all(
      Array.from({ length: 16 }, (_, i) =>
        store.recordWebhookDelivery(deliveryId, 'ping', `sig-${i}`),
      ),
    );
    const winners = results.filter(Boolean);
    expect(winners).toHaveLength(1);

    const count = await pool.query(
      'SELECT COUNT(*)::int AS c FROM webhook_deliveries WHERE delivery_id = $1',
      [deliveryId],
    );
    expect(count.rows[0].c).toBe(1);
  });

  test('HTTP handler: concurrent same payload → one accepted, rest already processed', async () => {
    const deliveryId = `pg-http-same-${crypto.randomBytes(4).toString('hex')}`;
    const rawBody = Buffer.from(JSON.stringify({ zen: 'pg-same' }), 'utf8');
    const signature = sign(rawBody);
    const headers = {
      'x-github-delivery': deliveryId,
      'x-hub-signature-256': signature,
      'x-github-event': 'ping',
    };

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        handleGitHubWebhookHttp({ rawBody, headers, webhookSecret: SECRET, db: store }),
      ),
    );

    const accepted = results.filter(
      (r) => r.status === 200 && (r.body as { status?: string }).status === 'accepted',
    );
    const duplicates = results.filter(
      (r) => r.status === 200 && (r.body as { message?: string }).message === 'Delivery already processed',
    );
    expect(accepted.length).toBe(1);
    expect(duplicates.length).toBe(7);

    const stored = await store.getWebhookDelivery(deliveryId);
    expect(stored).not.toBeNull();
    const hash = hashGitHubWebhookPayload(rawBody);
    expect(extractGitHubWebhookPayloadHash(stored!.signature)).toBe(hash);
  });

  test('HTTP handler: same delivery id different payloads → 409 conflict', async () => {
    const deliveryId = `pg-http-diff-${crypto.randomBytes(4).toString('hex')}`;
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
        db: store,
      });

    const first = await run(bodyA);
    expect(first.status).toBe(200);

    const conflicts = await Promise.all(Array.from({ length: 6 }, () => run(bodyB)));
    expect(conflicts.every((r) => r.status === 409)).toBe(true);
    expect((conflicts[0].body as { code?: string }).code).toBe('WEBHOOK_PAYLOAD_CONFLICT');

    const stored = await store.getWebhookDelivery(deliveryId);
    expect(extractGitHubWebhookPayloadHash(stored!.signature)).toBe(hashGitHubWebhookPayload(bodyA));
  });

  test('payload-hash encoding round-trip matches store material', async () => {
    const deliveryId = `pg-hash-${crypto.randomBytes(4).toString('hex')}`;
    const rawBody = Buffer.from(JSON.stringify({ zen: 'hash' }), 'utf8');
    const payloadHash = hashGitHubWebhookPayload(rawBody);
    const material = encodeGitHubWebhookDeliverySignature(sign(rawBody), payloadHash);
    const ok = await store.recordWebhookDelivery(deliveryId, 'ping', material);
    expect(ok).toBe(true);
    const row = await store.getWebhookDelivery(deliveryId);
    expect(extractGitHubWebhookPayloadHash(row!.signature)).toBe(payloadHash);
  });

  test('legacy row without ph=: different HMAC header → 409; same header → already processed', async () => {
    const deliveryId = `pg-legacy-${crypto.randomBytes(4).toString('hex')}`;
    const bodyA = Buffer.from(JSON.stringify({ zen: 'legacy-a' }), 'utf8');
    const bodyB = Buffer.from(JSON.stringify({ zen: 'legacy-b' }), 'utf8');
    expect(await store.recordWebhookDelivery(deliveryId, 'ping', sign(bodyA))).toBe(true);

    const conflict = await handleGitHubWebhookHttp({
      rawBody: bodyB,
      headers: {
        'x-github-delivery': deliveryId,
        'x-hub-signature-256': sign(bodyB),
        'x-github-event': 'ping',
      },
      webhookSecret: SECRET,
      db: store,
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
      db: store,
    });
    expect(same.status).toBe(200);
    expect((same.body as { message?: string }).message).toBe('Delivery already processed');
  });
});
