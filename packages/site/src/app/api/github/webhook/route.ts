import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getWebhookSecret } from '@/app/api/backend';
import { handleGitHubWebhookHttp } from '@patchversion/engine';

export async function POST(request: NextRequest) {
  const rawArrayBuffer = await request.arrayBuffer();
  const rawBody = Buffer.from(rawArrayBuffer);

  const result = await handleGitHubWebhookHttp({
    rawBody,
    headers: {
      'x-github-delivery': request.headers.get('x-github-delivery'),
      'x-hub-signature-256': request.headers.get('x-hub-signature-256'),
      'x-github-event': request.headers.get('x-github-event'),
    },
    webhookSecret: getWebhookSecret(),
    db: getDatabase(),
  });

  if (
    result.body &&
    typeof result.body === 'object' &&
    'error' in result.body &&
    result.body.error === 'Invalid webhook signature'
  ) {
    const secret = getWebhookSecret();
    // Preserve existing operational logging without leaking secret values.
    if (secret && /\s/.test(secret)) {
      console.error(
        '[webhook] Webhook secret contains whitespace characters. Refusing verification until configuration is corrected.',
      );
    } else if (!secret) {
      console.error('[webhook] Webhook secret is not configured.');
    }
  }

  if (result.status >= 500) {
    console.error('[webhook] Processing error:', (result.body as { error?: string }).error);
  }

  return NextResponse.json(result.body, {
    status: result.status,
    headers: result.headers,
  });
}
