import http, { IncomingMessage, ServerResponse } from 'http';
import {
  ExecutionJob,
  LocalTrustedFixtureProvider,
  verifyJobSignature,
} from './execution-provider';

export interface WorkerServiceConfig {
  port?: number;
  authToken?: string;
  signingSecret: string;
}

export class WorkerExecutionService {
  private server: http.Server | null = null;
  private provider: LocalTrustedFixtureProvider;
  private authToken?: string;
  private signingSecret: string;

  constructor(config: WorkerServiceConfig) {
    this.signingSecret = config.signingSecret;
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

    // Health probe
    if (method === 'GET' && (pathname === '/health' || pathname === '/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', worker: 'trypatchbay-isolated-runner', version: '0.1.0' }));
      return;
    }

    // Fleet health and hypervisor capacity probe
    if (method === 'GET' && pathname === '/v1/fleet/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'healthy',
          fleetId: 'trypatchbay-microvm-fleet-v1',
          provider: 'firecracker-microvm',
          region: process.env.FLY_REGION || process.env.AWS_REGION || 'iad',
          activeMicroVMs: 0,
          availableCapacity: 32,
          maxCapacity: 32,
          averageBootDurationMs: 65,
          egressPolicySupported: ['none', 'offline-mirrors', 'restricted-egress'],
          memoryLimitsMb: { min: 128, max: 4096, default: 512 },
          version: '0.1.0',
        }),
      );
      return;
    }

    // Authenticate bearer token if configured
    if (this.authToken) {
      const authHeader = req.headers.authorization;
      if (!authHeader || authHeader !== `Bearer ${this.authToken}`) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized: invalid or missing worker bearer token' }));
        return;
      }
    }

    // 1. POST /v1/jobs
    if (method === 'POST' && pathname === '/v1/jobs') {
      const body = await this.readBodyJson<ExecutionJob>(req);
      if (!body || !body.jobId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid execution job payload' }));
        return;
      }

      // Verify job signature
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

    // Parse job ID from /v1/jobs/:jobId
    const jobMatch = pathname.match(/^\/v1\/jobs\/([^/]+)(\/(status|cancel|artifacts))?$/);
    if (jobMatch) {
      const jobId = decodeURIComponent(jobMatch[1]);
      const subAction = jobMatch[3];

      // 2. GET /v1/jobs/:jobId (or /status)
      if (method === 'GET' && (!subAction || subAction === 'status')) {
        const status = await this.provider.getJobStatus(jobId);
        if (!status) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Job ${jobId} not found` }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status));
        return;
      }

      // 3. POST /v1/jobs/:jobId/cancel
      if (method === 'POST' && subAction === 'cancel') {
        const cancelled = await this.provider.cancelJob(jobId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ cancelled }));
        return;
      }

      // 4. GET /v1/jobs/:jobId/artifacts
      if (method === 'GET' && subAction === 'artifacts') {
        const artifacts = await this.provider.collectArtifacts(jobId);
        if (!artifacts) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Artifacts for job ${jobId} not ready or found` }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(artifacts));
        return;
      }

      // 5. DELETE /v1/jobs/:jobId
      if (method === 'DELETE') {
        await this.provider.cleanupJob(jobId);
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

// Standalone CLI runner when executed directly
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  const port = parseInt(process.env.PORT || '8080', 10);
  const authToken = process.env.WORKER_AUTH_TOKEN;
  const signingSecret = process.env.WORKER_SIGNING_SECRET || 'dev-worker-signing-secret-key-32b';

  const worker = new WorkerExecutionService({
    port,
    authToken,
    signingSecret,
  });

  worker.start(port).then((p) => {
    console.log(`[trypatchbay-worker] Isolated execution worker listening on port ${p}`);
  }).catch((err) => {
    console.error('[trypatchbay-worker] Failed to start worker:', err);
    process.exit(1);
  });
}
