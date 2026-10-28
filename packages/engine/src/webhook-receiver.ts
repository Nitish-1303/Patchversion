import http from 'http';
import crypto from 'crypto';
import { PatchversionEngine } from './engine';

/** Maximum accepted webhook payload size: 1 MB of raw bytes. */
const MAX_BODY_BYTES = 1024 * 1024;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringProperty(value: unknown, key: string): string | undefined {
  const property = asRecord(value)?.[key];
  return typeof property === 'string' ? property : undefined;
}

/**
 * GitHub App webhook receiver.
 *
 * Logs small summaries for installation, installation_repositories, and push
 * events. Other event types are logged as unhandled; no event triggers work.
 *
 * Prototype only: this class starts a plain HTTP server for local
 * development. It is not wired to a Next.js route or deployed webhook
 * endpoint, and it does not create jobs or process repository changes.
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

      // Buffer RAW bytes. Per-chunk toString('utf8') would corrupt multibyte
      // characters split across chunk boundaries (replacement chars), and the
      // HMAC must be computed over the exact original request bytes.
      const chunks: Buffer[] = [];
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
          chunks.length = 0; // release what was buffered
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => {
        // Size is enforced before signature verification or event processing.
        if (tooLarge) {
          res.writeHead(413).end('Payload too large');
          return;
        }
        const rawBody = Buffer.concat(chunks, bodyBytes);
        // Verify the signature over the exact original bytes BEFORE decoding.
        if (this.webhookSecret) {
          const signature = req.headers['x-hub-signature-256'] as string | undefined;
          if (!this.verifySignature(rawBody, signature)) {
            res.writeHead(401).end('Invalid signature');
            return;
          }
        }

        const event = req.headers['x-github-event'] as string;
        try {
          // Decode for JSON parsing only after the signature has been verified.
          const payload = asRecord(JSON.parse(rawBody.toString('utf8')));
          if (!payload) throw new Error('Webhook payload must be a JSON object');
          this.handleEvent(event, payload);
          res.writeHead(200).end('OK');
        } catch {
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

  private verifySignature(body: Buffer, signature: string | undefined): boolean {
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
          account: stringProperty(asRecord(payload.installation)?.account, 'login'),
        });
        break;

      case 'installation_repositories':
        store.logEvent('installation_repos', {
          action: payload.action,
          added: Array.isArray(payload.repositories_added) ? payload.repositories_added.length : 0,
          removed: Array.isArray(payload.repositories_removed) ? payload.repositories_removed.length : 0,
        });
        break;

      case 'push':
        store.logEvent('push', {
          repo: stringProperty(payload.repository, 'full_name'),
          ref: payload.ref,
        });
        break;

      default:
        store.logEvent('webhook_unhandled', { event });
    }
  }
}
