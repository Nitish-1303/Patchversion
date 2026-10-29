import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getGitHubClient } from '@/app/api/backend';

export async function POST(request: NextRequest) {
  const deliveryId = request.headers.get('x-github-delivery');
  const signature = request.headers.get('x-hub-signature-256') ?? undefined;
  const event = request.headers.get('x-github-event') ?? 'unknown';

  if (!deliveryId) {
    return NextResponse.json({ error: 'Missing x-github-delivery header' }, { status: 400 });
  }

  // Read raw bytes for exact HMAC calculation
  const rawArrayBuffer = await request.arrayBuffer();
  const rawBody = Buffer.from(rawArrayBuffer);

  // Payload size limit: 1 MiB
  if (rawBody.length > 1024 * 1024) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const github = getGitHubClient();
  const db = getDatabase();

  // Signature verification
  const isValid = github.verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  // Deduplication check: reject replayed deliveries
  const isNew = await db.recordWebhookDelivery(deliveryId, event, signature ?? '');
  if (!isNew) {
    return NextResponse.json({ message: 'Delivery already processed' }, { status: 200 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }

  try {
    // Process event
    if (event === 'installation' && payload.action === 'deleted') {
      const instPayload = payload.installation as { id?: number | string } | undefined;
      const githubInstallationId = instPayload?.id;
      if (typeof githubInstallationId === 'number' || typeof githubInstallationId === 'string') {
        const numericId = Number(githubInstallationId);
        const inst = await db.getInstallationByGithubId(numericId);
        if (inst) {
          // Verify tenant identity and persist tombstone status
          await db.updateInstallationStatus(inst.tenantId, numericId, 'deleted');
        }
      }
    }

    return NextResponse.json({ status: 'accepted', deliveryId, event });
  } catch (err) {
    console.error('[webhook] Processing error:', err);
    return NextResponse.json(
      { error: `Webhook processing failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
