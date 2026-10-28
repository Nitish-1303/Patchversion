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
  const isNew = db.recordWebhookDelivery(deliveryId, event, signature ?? '');
  if (!isNew) {
    return NextResponse.json({ message: 'Delivery already processed' }, { status: 200 });
  }

  try {
    const payload = JSON.parse(rawBody.toString('utf8'));
    // Process event
    if (event === 'installation' && payload.action === 'deleted') {
      const inst = db.getInstallationByGithubId(payload.installation.id);
      if (inst) {
        inst.status = 'deleted';
        inst.updatedAt = new Date().toISOString();
      }
    }

    return NextResponse.json({ status: 'accepted', deliveryId, event });
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }
}
