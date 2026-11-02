/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { POST as webhookPost } from '../src/app/api/github/webhook/route';
import { _resetInstancesForTest, ensureDemoTenantAndUser } from '../src/app/api/backend';

describe('GitHub Webhook Authentication and Processing (Production-Safe)', () => {
  let tmpDir: string;
  const testSecret = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patchbay-webhook-auth-test-'));
    process.env.PATCHVERSION_STATE_DIR = tmpDir;
    process.env.PATCHVERSION_SESSION_SECRET = 'test-secret-at-least-32-chars-long-for-testing';
    process.env.GITHUB_APP_WEBHOOK_SECRET = testSecret;

    // Notice: GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY are deliberately omitted here
    // to test that webhook authentication functions independently of App credentials.
    delete process.env.GITHUB_APP_ID;
    delete process.env.GITHUB_APP_PRIVATE_KEY;

    _resetInstancesForTest();
    await ensureDemoTenantAndUser();
  });

  afterAll(() => {
    delete process.env.PATCHVERSION_STATE_DIR;
    delete process.env.GITHUB_APP_WEBHOOK_SECRET;
    delete process.env.GITHUB_WEBHOOK_SECRET;
    delete process.env.GITHUB_APP_ID;
    delete process.env.GITHUB_APP_PRIVATE_KEY;
    _resetInstancesForTest();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createSignature(payload: string, secretOverride?: string): string {
    const sec = secretOverride ?? testSecret;
    const hmac = crypto.createHmac('sha256', sec);
    hmac.update(Buffer.from(payload, 'utf8'));
    return `sha256=${hmac.digest('hex')}`;
  }

  function makeRequest(opts: {
    deliveryId?: string | null;
    event?: string;
    payload?: string | object;
    signature?: string | null;
  }): NextRequest {
    const bodyStr = typeof opts.payload === 'string'
      ? opts.payload
      : JSON.stringify(opts.payload ?? { action: 'ping', zen: 'Stay hungry, stay foolish.' });

    const sig = opts.signature === null
      ? undefined
      : (opts.signature ?? createSignature(bodyStr));

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-github-event': opts.event ?? 'ping',
    };

    if (opts.deliveryId !== null && opts.deliveryId !== undefined) {
      headers['x-github-delivery'] = opts.deliveryId;
    }
    if (sig) {
      headers['x-hub-signature-256'] = sig;
    }

    return new NextRequest('http://localhost:3000/api/github/webhook', {
      method: 'POST',
      headers,
      body: bodyStr,
    });
  }

  test('1. Valid HMAC signature is accepted with HTTP 200 (ping event)', async () => {
    const req = makeRequest({
      deliveryId: 'del_valid_ping_001',
      event: 'ping',
      payload: { zen: 'Keep it logically awesome.', hook_id: 123456 },
    });

    const res = await webhookPost(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('accepted');
    expect(data.deliveryId).toBe('del_valid_ping_001');
    expect(data.event).toBe('ping');
  });

  test('2. Invalid signature is rejected with HTTP 401', async () => {
    const req = makeRequest({
      deliveryId: 'del_invalid_sig_001',
      event: 'ping',
      signature: 'sha256=' + '0'.repeat(64),
    });

    const res = await webhookPost(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Invalid webhook signature');
  });

  test('3. Missing signature header is rejected with HTTP 401', async () => {
    const req = makeRequest({
      deliveryId: 'del_missing_sig_001',
      signature: null,
    });

    const res = await webhookPost(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Invalid webhook signature');
  });

  test('4. Malformed signature header is rejected with HTTP 401', async () => {
    // Missing prefix
    const req1 = makeRequest({
      deliveryId: 'del_malformed_001',
      signature: '0'.repeat(64),
    });
    expect((await webhookPost(req1)).status).toBe(401);

    // Wrong length
    const req2 = makeRequest({
      deliveryId: 'del_malformed_002',
      signature: 'sha256=' + 'a'.repeat(63),
    });
    expect((await webhookPost(req2)).status).toBe(401);

    // Non-hex characters
    const req3 = makeRequest({
      deliveryId: 'del_malformed_003',
      signature: 'sha256=' + 'z'.repeat(64),
    });
    expect((await webhookPost(req3)).status).toBe(401);
  });

  test('5. Missing webhook secret is rejected with HTTP 401', async () => {
    const saved = process.env.GITHUB_APP_WEBHOOK_SECRET;
    const prevEnv = process.env.NODE_ENV;
    try {
      delete process.env.GITHUB_APP_WEBHOOK_SECRET;
      delete process.env.GITHUB_WEBHOOK_SECRET;
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production'; // Enforce production fail-closed behavior

      const req = makeRequest({
        deliveryId: 'del_no_secret_001',
        payload: { action: 'ping' },
      });

      const res = await webhookPost(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Invalid webhook signature');
    } finally {
      process.env.GITHUB_APP_WEBHOOK_SECRET = saved;
      (process.env as Record<string, string | undefined>).NODE_ENV = prevEnv;
    }
  });

  test('6. Empty webhook secret is rejected with HTTP 401', async () => {
    const saved = process.env.GITHUB_APP_WEBHOOK_SECRET;
    try {
      process.env.GITHUB_APP_WEBHOOK_SECRET = '';

      const req = makeRequest({
        deliveryId: 'del_empty_secret_001',
        payload: { action: 'ping' },
      });

      const res = await webhookPost(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Invalid webhook signature');
    } finally {
      process.env.GITHUB_APP_WEBHOOK_SECRET = saved;
    }
  });

  test('7. Whitespace-contaminated secret fails safely with HTTP 401 without modifying secret', async () => {
    const saved = process.env.GITHUB_APP_WEBHOOK_SECRET;
    try {
      // Accidental trailing newline added in config
      process.env.GITHUB_APP_WEBHOOK_SECRET = `${testSecret}\n`;

      const req = makeRequest({
        deliveryId: 'del_whitespace_secret_001',
        payload: { action: 'ping' },
      });

      const res = await webhookPost(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Invalid webhook signature');
    } finally {
      process.env.GITHUB_APP_WEBHOOK_SECRET = saved;
    }
  });

  test('8. Raw-body byte difference causes signature mismatch (HTTP 401)', async () => {
    const originalBody = '{"action":"ping","status":"ok"}';
    const validSignatureForOriginal = createSignature(originalBody);

    // Request carries altered body but signature of original body
    const alteredReq = new NextRequest('http://localhost:3000/api/github/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-delivery': 'del_raw_diff_001',
        'x-github-event': 'ping',
        'x-hub-signature-256': validSignatureForOriginal,
      },
      body: '{"action":"ping","status":"no"}', // 1 char diff
    });

    const res = await webhookPost(alteredReq);
    expect(res.status).toBe(401);
  });

  test('9. Valid ping event returns HTTP 200 with delivery metadata', async () => {
    const req = makeRequest({
      deliveryId: 'del_ping_success_001',
      event: 'ping',
      payload: { zen: 'Mind your words, they become actions.', hook_id: 9988 },
    });

    const res = await webhookPost(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('accepted');
    expect(data.deliveryId).toBe('del_ping_success_001');
    expect(data.event).toBe('ping');
  });

  test('10. Duplicate delivery is idempotent and returns HTTP 200 without reprocessing', async () => {
    const deliveryId = 'del_duplicate_idempotent_001';
    const req1 = makeRequest({
      deliveryId,
      event: 'ping',
      payload: { zen: 'Idempotency test' },
    });

    const res1 = await webhookPost(req1);
    expect(res1.status).toBe(200);
    expect((await res1.json()).status).toBe('accepted');

    // Replay same delivery
    const req2 = makeRequest({
      deliveryId,
      event: 'ping',
      payload: { zen: 'Idempotency test' },
    });

    const res2 = await webhookPost(req2);
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.message).toBe('Delivery already processed');
  });

  test('11. Missing delivery ID returns HTTP 400', async () => {
    const req = makeRequest({
      deliveryId: null,
      event: 'ping',
    });

    const res = await webhookPost(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Missing x-github-delivery header');
  });

  test('12. Oversized payload (> 1MB) returns HTTP 413', async () => {
    const hugeString = 'x'.repeat(1024 * 1024 + 10);
    const payloadStr = JSON.stringify({ data: hugeString });
    const sig = createSignature(payloadStr);

    const req = new NextRequest('http://localhost:3000/api/github/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-delivery': 'del_huge_001',
        'x-github-event': 'push',
        'x-hub-signature-256': sig,
      },
      body: payloadStr,
    });

    const res = await webhookPost(req);
    expect(res.status).toBe(413);
    const data = await res.json();
    expect(data.error).toBe('Payload too large');
  });

  test('13. Missing GitHub App API credentials does NOT prevent webhook verification from succeeding', async () => {
    // Confirm App credentials are completely absent
    expect(process.env.GITHUB_APP_ID).toBeUndefined();
    expect(process.env.GITHUB_APP_PRIVATE_KEY).toBeUndefined();
    expect(process.env.GITHUB_APP_WEBHOOK_SECRET).toBe(testSecret);

    const req = makeRequest({
      deliveryId: 'del_no_app_creds_001',
      event: 'ping',
      payload: { zen: 'Decoupled authentication works.' },
    });

    const res = await webhookPost(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('accepted');
    expect(data.deliveryId).toBe('del_no_app_creds_001');
  });

  test('14. Installation suspend and unsuspend lifecycle events update database status', async () => {
    const { getDatabase } = require('../src/app/api/backend');
    const db = getDatabase();
    const tenant = await db.createTenant('Webhook Test Tenant', 'tenant_wh_test_14');
    const inst = await db.saveInstallation(tenant.id, 98765, 'test-org');
    expect(inst.status).toBe('active');

    // Send suspend event
    const suspendReq = makeRequest({
      deliveryId: 'del_suspend_001',
      event: 'installation',
      payload: { action: 'suspend', installation: { id: 98765 } },
    });
    const resSuspend = await webhookPost(suspendReq);
    expect(resSuspend.status).toBe(200);

    const suspendedInst = await db.getInstallationByGithubId(98765);
    expect(suspendedInst?.status).toBe('suspended');

    // Send unsuspend event
    const unsuspendReq = makeRequest({
      deliveryId: 'del_unsuspend_001',
      event: 'installation',
      payload: { action: 'unsuspend', installation: { id: 98765 } },
    });
    const resUnsuspend = await webhookPost(unsuspendReq);
    expect(resUnsuspend.status).toBe(200);

    const activeInst = await db.getInstallationByGithubId(98765);
    expect(activeInst?.status).toBe('active');
  });
});
