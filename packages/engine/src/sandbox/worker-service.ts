import http, { IncomingMessage, ServerResponse } from 'http';
import {
  ExecutionJob,
  LocalTrustedFixtureProvider,
  verifyJobSignature,
  assertStrongSigningSecret,
  parseRequiredTenantId,
} from './execution-provider';

export interface WorkerServiceConfig {
  port?: number;
  authToken: string;
  signingSecret: string;
}

export class WorkerExecutionService {
  private server: http.Server | null = null;
  private provider: LocalTrustedFixtureProvider;
  private authToken: string;
  private signingSecret: string;

  constructor(config: WorkerServiceConfig) {
    if (!config.authToken || config.authToken.trim().length < 16) {
      throw new Error(
        'WorkerExecutionService requires a non-empty WORKER_AUTH_TOKEN (min 16 chars). Unauthenticated workers are refused.',
      );
    }
    this.signingSecret = assertStrongSigningSecret(config.signingSecret);
    this.authToken = config.authToken;
    this.provider = new LocalTrustedFixtureProvider(config.signingSecret);
  }

  start(port = 8080): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        try {
          await this.handleRequest(req, res);
        } catch (err) {
          console.error('[worker-service] Unhandled error:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      });

      this.server.listen(port, () => {
        const address = this.server?.address();
        const actualPort = typeof address === 'object' && address ? address.port : port;
        resolve(actualPort);
      });

      this.server.on('error', reject);
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        if (typeof this.server.closeAllConnections === 'function') {
          this.server.closeAllConnections();
        }
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    const method = req.method?.toUpperCase();

    // Liveness only. Does not imply isolation qualification.
    if (method === 'GET' && (pathname === '/health' || pathname === '/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          worker: 'trypatchbay-local-fixture-worker',
          version: '0.1.0',
          isolationQualified: false,
          note: 'Host child_process for bundled fixtures only. Not a microVM.',
        }),
      );
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${this.authToken}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized: invalid or missing worker bearer token' }));
      return;
    }

    if (method === 'GET' && pathname === '/v1/fleet/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'unqualified',
          fleetId: 'trypatchbay-local-fixture-worker',
          provider: 'local-trusted-fixture-worker',
          region: process.env.FLY_REGION || process.env.AWS_REGION || 'iad',
          activeMicroVMs: 0,
          availableCapacity: 0,
          maxCapacity: 0,
          averageBootDurationMs: 0,
          isolationQualified: false,
          egressPolicySupported: ['none'],
          memoryLimitsMb: { min: 128, max: 4096, default: 512 },
          version: '0.1.0',
          note: 'This worker is a local fixture runner. It is not Firecracker, netns, or cgroups isolation.',
        }),
      );
      return;
    }

    // 1. POST /v1/jobs
    if (method === 'POST' && pathname === '/v1/jobs') {
      const body = await this.readBodyJson<ExecutionJob>(req);
      if (!body || !body.jobId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid execution job payload' }));
        return;
      }

      const sig = verifyJobSignature(body, this.signingSecret);
      if (!sig.valid) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Signature verification failed: ${sig.reason}` }));
        return;
      }

      const result = await this.provider.submitJob(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    const jobMatch = pathname.match(/^\/v1\/jobs\/([^/]+)(\/(status|cancel|artifacts))?$/);
    if (jobMatch) {
      const jobId = decodeURIComponent(jobMatch[1]);
      const subAction = jobMatch[3];
      const tenantId = parseRequiredTenantId(url.searchParams.get('tenantId'));
      if (!tenantId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: 'tenantId query parameter is required and must be a valid tenant identifier',
          }),
        );
        return;
      }

      if (method === 'GET' && (!subAction || subAction === 'status')) {
        const status = await this.provider.getJobStatus(jobId, tenantId);
        if (!status) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Job ${jobId} not found` }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status));
        return;
      }

      if (method === 'POST' && subAction === 'cancel') {
        const cancelled = await this.provider.cancelJob(jobId, tenantId);
        if (!cancelled) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Job ${jobId} not found` }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ cancelled: true }));
        return;
      }

      if (method === 'GET' && subAction === 'artifacts') {
        const artifacts = await this.provider.collectArtifacts(jobId, tenantId);
        if (!artifacts) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Artifacts for job ${jobId} not ready or found` }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(artifacts));
        return;
      }

      if (method === 'DELETE') {
        const deleted = await this.provider.cleanupJob(jobId, tenantId);
        if (!deleted) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Job ${jobId} not found` }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ deleted: true }));
        return;
      }
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  }

  private readBodyJson<T>(req: IncomingMessage): Promise<T | null> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      let size = 0;
      const MAX_SIZE = 5 * 1024 * 1024; // 5 MB max payload

      req.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_SIZE) {
          resolve(null);
          return;
        }
        chunks.push(chunk);
      });

      req.on('end', () => {
        try {
          const raw = Buffer.concat(chunks).toString('utf8');
          resolve(JSON.parse(raw) as T);
        } catch {
          resolve(null);
        }
      });

      req.on('error', () => resolve(null));
    });
  }
}

if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  const port = parseInt(process.env.PORT || '8080', 10);
  const authToken = process.env.WORKER_AUTH_TOKEN;
  const signingSecret = process.env.WORKER_SIGNING_SECRET;

  try {
    if (!authToken || authToken.trim().length < 16) {
      throw new Error('WORKER_AUTH_TOKEN is required');
    }
    const worker = new WorkerExecutionService({
      port,
      authToken,
      signingSecret: signingSecret ?? '',
    });
    worker.start(port).then((p) => {
      console.log(`[trypatchbay-worker] Local fixture worker listening on port ${p} (isolationQualified=false)`);
    }).catch((err) => {
      console.error('[trypatchbay-worker] Failed to start worker:', err);
      process.exit(1);
    });
  } catch (err) {
    console.error('[trypatchbay-worker] Refusing to start:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
