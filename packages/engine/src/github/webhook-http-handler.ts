import { IPersistenceStore } from '../db/store-interface';
import { verifyGitHubWebhookSignature } from './webhook-verifier';
import {
  encodeGitHubWebhookDeliverySignature,
  extractGitHubWebhookPayloadHash,
  extractWebhookEventTime,
  hashGitHubWebhookPayload,
  isAllowedGitHubWebhookEvent,
  isWebhookReplayOutsideWindow,
  WEBHOOK_PROCESSING_RETRY_AFTER_MS,
} from './webhook-security';
import { processVerifiedGitHubWebhook } from './webhook-processor';

export const GITHUB_WEBHOOK_PATH = '/api/github/webhook';
export const GITHUB_WEBHOOK_MAX_BODY_BYTES = 1024 * 1024;

export interface GitHubWebhookHttpHeaders {
  'x-github-delivery'?: string | null;
  'x-hub-signature-256'?: string | null;
  'x-github-event'?: string | null;
}

export interface GitHubWebhookHttpResult {
  status: number;
  body: Record<string, unknown> | { error: string; code?: string; message?: string };
  headers?: Record<string, string>;
}

/**
 * Shared GitHub webhook HTTP handler (source of truth for the Next.js route).
 * Keeps HMAC, replay, delivery-id idempotency, altered-body conflict, and
 * processVerifiedGitHubWebhook in one place. The prototype WebhookReceiver
 * remains a separate local listener and is not wired to this handler.
 */
export async function handleGitHubWebhookHttp(options: {
  rawBody: Buffer;
  headers: GitHubWebhookHttpHeaders;
  webhookSecret: string | null | undefined;
  db: IPersistenceStore;
}): Promise<GitHubWebhookHttpResult> {
  const deliveryId = options.headers['x-github-delivery'] ?? undefined;
  const signature = options.headers['x-hub-signature-256'] ?? undefined;
  const event = options.headers['x-github-event'] ?? 'unknown';

  if (!deliveryId) {
    return { status: 400, body: { error: 'Missing x-github-delivery header' } };
  }

  if (!isAllowedGitHubWebhookEvent(event)) {
    return {
      status: 400,
      body: { error: 'Unsupported webhook event', code: 'EVENT_NOT_ALLOWED' },
    };
  }

  if (options.rawBody.length > GITHUB_WEBHOOK_MAX_BODY_BYTES) {
    return { status: 413, body: { error: 'Payload too large' } };
  }

  const verification = verifyGitHubWebhookSignature(
    options.rawBody,
    signature,
    options.webhookSecret,
  );
  if (!verification.valid) {
    return { status: 401, body: { error: 'Invalid webhook signature' } };
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(options.rawBody.toString('utf8'));
  } catch {
    return { status: 400, body: { error: 'Malformed JSON payload' } };
  }

  const eventTimeMs = extractWebhookEventTime(payload);
  if (isWebhookReplayOutsideWindow(eventTimeMs)) {
    return {
      status: 400,
      body: { error: 'Stale webhook event outside replay window', code: 'WEBHOOK_REPLAY_REJECTED' },
    };
  }

  const payloadHash = hashGitHubWebhookPayload(options.rawBody);
  const sigMaterial = encodeGitHubWebhookDeliverySignature(signature ?? '', payloadHash);
  const db = options.db;

  const payloadConflict = (): GitHubWebhookHttpResult => ({
    status: 409,
    body: {
      error: 'Webhook delivery id reused with a different payload',
      code: 'WEBHOOK_PAYLOAD_CONFLICT',
    },
  });

  /**
   * True when a prior delivery row conflicts with this request body.
   * Prefers ph= payload-hash; legacy rows (raw HMAC header only) conflict when
   * the stored material matches neither the current signature header nor the
   * new encoded form.
   */
  const conflictsWithPrior = (storedSignature: string): boolean => {
    const priorHash = extractGitHubWebhookPayloadHash(storedSignature);
    if (priorHash) return priorHash !== payloadHash;
    return storedSignature !== (signature ?? '') && storedSignature !== sigMaterial;
  };

  const prior =
    typeof db.getWebhookDelivery === 'function' ? await db.getWebhookDelivery(deliveryId) : null;
  if (prior) {
    if (conflictsWithPrior(prior.signature)) return payloadConflict();
    return { status: 200, body: { message: 'Delivery already processed' } };
  }

  const isNew = await db.recordWebhookDelivery(deliveryId, event, sigMaterial);
  if (!isNew) {
    const raced =
      typeof db.getWebhookDelivery === 'function' ? await db.getWebhookDelivery(deliveryId) : null;
    if (raced && conflictsWithPrior(raced.signature)) return payloadConflict();
    return { status: 200, body: { message: 'Delivery already processed' } };
  }

  try {
    const result = await processVerifiedGitHubWebhook({ db, event, payload });
    return {
      status: 200,
      body: {
        status: 'accepted',
        deliveryId,
        event,
        handled: result.handled,
        ignoredReason: result.ignoredReason,
      },
    };
  } catch (err) {
    return {
      status: 500,
      body: {
        error: `Webhook processing failed: ${err instanceof Error ? err.message : String(err)}`,
      },
      headers: {
        'Retry-After': String(Math.ceil(WEBHOOK_PROCESSING_RETRY_AFTER_MS / 1000)),
      },
    };
  }
}
