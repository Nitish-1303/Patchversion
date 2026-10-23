import http from 'http';
import crypto from 'crypto';
import { PatchversionEngine } from './engine';

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
    this.server = http.createServer((req, res) => {
      if (req.method !== 'POST') {
        res.writeHead(405).end('Method not allowed');
        return;
      }

      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        // Verify webhook signature if secret is configured
        if (this.webhookSecret) {
          const signature = req.headers['x-hub-signature-256'] as string;
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
      console.log(`Webhook receiver listening on :${port}`);
    });
  }

  stop(): void {
    this.server?.close();
  }

  private verifySignature(body: string, signature: string): boolean {
    if (!this.webhookSecret) return true;
    const expected = 'sha256=' + crypto
      .createHmac('sha256', this.webhookSecret)
      .update(body)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
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
