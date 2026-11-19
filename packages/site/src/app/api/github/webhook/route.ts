import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getWebhookSecret } from '@/app/api/backend';
import {
  verifyGitHubWebhookSignature,
  isAllowedGitHubWebhookEvent,
  isWebhookReplayOutsideWindow,
  extractWebhookEventTime,
  processVerifiedGitHubWebhook,
  WEBHOOK_PROCESSING_RETRY_AFTER_MS,
} from '@patchversion/engine';

export async function POST(request: NextRequest) {
  const deliveryId = request.headers.get('x-github-delivery');
  const signature = request.headers.get('x-hub-signature-256') ?? undefined;
  const event = request.headers.get('x-github-event') ?? 'unknown';

  if (!deliveryId) {
    return NextResponse.json({ error: 'Missing x-github-delivery header' }, { status: 400 });
  }

  if (!isAllowedGitHubWebhookEvent(event)) {
    return NextResponse.json(
      { error: 'Unsupported webhook event', code: 'EVENT_NOT_ALLOWED' },
      { status: 400 },
    );
  }

  // Read raw bytes for exact HMAC calculation
  const rawArrayBuffer = await request.arrayBuffer();
  const rawBody = Buffer.from(rawArrayBuffer);

  // Payload size limit: 1 MiB
  if (rawBody.length > 1024 * 1024) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  // Obtain webhook secret independently of GitHub App API credentials
  const webhookSecret = getWebhookSecret();

  // Signature verification
  const verification = verifyGitHubWebhookSignature(rawBody, signature, webhookSecret);
  if (!verification.valid) {
    if (verification.reason === 'whitespace_in_secret') {
      console.error(
        '[webhook] Webhook secret contains whitespace characters. Refusing verification until configuration is corrected.',
      );
    } else if (verification.reason === 'missing_secret' || verification.reason === 'empty_secret') {
      console.error('[webhook] Webhook secret is not configured.');
    }
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  // Parse JSON payload before recording delivery as processed
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }

  const eventTimeMs = extractWebhookEventTime(payload);
  if (isWebhookReplayOutsideWindow(eventTimeMs)) {
    return NextResponse.json(
      { error: 'Stale webhook event outside replay window', code: 'WEBHOOK_REPLAY_REJECTED' },
      { status: 400 },
    );
  }

  // Deduplication check: reject replayed deliveries
  const db = getDatabase();
  const isNew = await db.recordWebhookDelivery(deliveryId, event, signature ?? '');
  if (!isNew) {
    return NextResponse.json({ message: 'Delivery already processed' }, { status: 200 });
  }

  try {
    const result = await processVerifiedGitHubWebhook({ db, event, payload });
    return NextResponse.json({
      status: 'accepted',
      deliveryId,
      event,
      handled: result.handled,
      ignoredReason: result.ignoredReason,
    });
  } catch (err) {
    console.error('[webhook] Processing error:', err);
    return NextResponse.json(
      { error: `Webhook processing failed: ${err instanceof Error ? err.message : String(err)}` },
      {
        status: 500,
        headers: { 'Retry-After': String(Math.ceil(WEBHOOK_PROCESSING_RETRY_AFTER_MS / 1000)) },
      },
    );
  }
}
