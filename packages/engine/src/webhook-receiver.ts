import http from 'http';
import crypto from 'crypto';
import { PatchversionEngine } from './engine';

/** Maximum accepted webhook payload size: 1 MB of raw bytes. */
const MAX_BODY_BYTES = 1024 * 1024;

/**
 * GitHub App webhook receiver.
 *
 * Handles:
 * - installation.created / installation.deleted (track installs)
 * - installation_repositories.added / .removed (track repos)
 * - push (trigger re-scan on push)
 * - check_suite (for CI integration)
 *
 * Deployed as a Vercel serverless function in production;
 * runs as a plain HTTP server locally for development.
 */
export class WebhookReceiver {
  private engine: PatchversionEngine;
  private webhookSecret: string | null;
  private server: http.Server | null = null;

  constructor(engine: PatchversionEngine, webhookSecret?: string) {
    this.engine = engine;
    this.webhookSecret = webhookSecret ?? null;
  }

  start(port = 3000): void {
    // Fail closed: in production a missing secret must stop the receiver,
    // not silently accept unauthenticated webhooks. Outside production the
    // receiver may run secret-less for local development, with a warning.
    if (!this.webhookSecret && process.env.NODE_ENV === 'production') {
      throw new Error(
        'Webhook secret is required in production; refusing to start an unauthenticated receiver.',
      );
    }
    this.server = http.createServer((req, res) => {
      if (req.method !== 'POST') {
        res.writeHead(405).end('Method not allowed');
        return;
      }

      let body = '';
      let bodyBytes = 0;
      let tooLarge = false;
      req.on('data', (chunk: Buffer) => {
        // Cap payload size - unbounded buffering is a memory-exhaustion risk.
        // Once the limit is exceeded, drain the rest of the request without
        // buffering so it can be rejected with 413 when it ends.
        if (tooLarge) return;
        // chunk is a Buffer, so chunk.length is the raw byte count - NOT the
        // string character count (multibyte UTF-8 counts correctly).
        bodyBytes += chunk.length;
        if (bodyBytes > MAX_BODY_BYTES) {
          tooLarge = true;
          body = ''; // release what was buffered
          return;
        }
        body += chunk.toString('utf8');
      });
      req.on('end', () => {
        // Size is enforced before signature verification or event processing.
        if (tooLarge) {
          res.writeHead(413).end('Payload too large');
          return;
        }
        // Verify webhook signature if secret is configured
        if (this.webhookSecret) {
          const signature = req.headers['x-hub-signature-256'] as string | undefined;
          if (!this.verifySignature(body, signature)) {
            res.writeHead(401).end('Invalid signature');
            return;
          }
        }

        const event = req.headers['x-github-event'] as string;
        try {
          const payload = JSON.parse(body);
          this.handleEvent(event, payload);
          res.writeHead(200).end('OK');
        } catch (err) {
          res.writeHead(400).end('Invalid payload');
        }
      });
    });

    this.server.listen(port, () => {
      if (!this.webhookSecret) {
        console.warn('[webhook] WARNING: no webhook secret configured - signature verification is OFF (development only)');
      }
      console.log(`Webhook receiver listening on :${port}`);
    });
  }

  stop(): void {
    this.server?.close();
  }

  private verifySignature(body: string, signature: string | undefined): boolean {
    if (!this.webhookSecret) return true;
    if (typeof signature !== 'string' || signature.length === 0) return false;
    const expected = 'sha256=' + crypto
      .createHmac('sha256', this.webhookSecret)
      .update(body)
      .digest('hex');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    // timingSafeEqual throws on length mismatch - check first
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  private handleEvent(event: string, payload: Record<string, unknown>): void {
    const store = this.engine.getStore();

    switch (event) {
      case 'installation':
        store.logEvent('installation', {
          action: payload.action,
          account: (payload.installation as any)?.account?.login,
        });
        break;

      case 'installation_repositories':
        store.logEvent('installation_repos', {
          action: payload.action,
          added: ((payload.repositories_added as any[]) ?? []).length,
          removed: ((payload.repositories_removed as any[]) ?? []).length,
        });
        break;

      case 'push':
        store.logEvent('push', {
          repo: (payload.repository as any)?.full_name,
          ref: payload.ref,
        });
        break;

      default:
        store.logEvent('webhook_unhandled', { event });
    }
  }
}
