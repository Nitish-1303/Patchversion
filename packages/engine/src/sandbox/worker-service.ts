import crypto from 'crypto';
import http, { IncomingMessage, ServerResponse } from 'http';
import {
  ExecutionJob,
  LocalTrustedFixtureProvider,
  verifyJobSignature,
  assertStrongSigningSecret,
  parseRequiredTenantId,
  parseRequiredJobId,
} from './execution-provider';
import {
  LIFECYCLE_CAPABILITY_HEADER,
  type LifecycleOp,
  verifyLifecycleCapability,
} from './lifecycle-capability';
import {
  createWorkerReplayStoreFromEnv,
  type ILifecycleReplayStore,
} from './lifecycle-replay-store';

/**
 * Timing-safe comparison of the request Authorization header against the
 * shared fleet WORKER_AUTH_TOKEN. Fail-closed on missing, non-string, or
 * unequal-length values (timingSafeEqual throws on length mismatch).
 */
export function authorizationMatchesWorkerBearer(
  authorization: string | string[] | undefined,
  authToken: string,
): boolean {
  if (typeof authorization !== 'string' || typeof authToken !== 'string' || authToken.length === 0) {
    return false;
  }
  const provided = Buffer.from(authorization, 'utf8');
  const expected = Buffer.from(`Bearer ${authToken}`, 'utf8');
  if (provided.length !== expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(provided, expected);
}

export interface WorkerServiceConfig {
  port?: number;
  authToken: string;
  signingSecret: string;
  replayStore: ILifecycleReplayStore;
}

export class WorkerExecutionService {
  private server: http.Server | null = null;
  private provider: LocalTrustedFixtureProvider;
  private authToken: string;
  private signingSecret: string;
  private replayStore: ILifecycleReplayStore;
  private revokedLifecycleJtis = new Map<string, number>();

  constructor(config: WorkerServiceConfig) {
    if (!config.authToken || config.authToken.trim().length < 16) {
      throw new Error(
        'WorkerExecutionService requires a non-empty WORKER_AUTH_TOKEN (min 16 chars). Unauthenticated workers are refused.',
      );
    }
    if (!config.replayStore) {
      throw new Error(
        'WorkerExecutionService requires a durable lifecycle replay store. Mutating capabilities cannot be authorized in-memory.',
      );
    }
    this.signingSecret = assertStrongSigningSecret(config.signingSecret);
    this.authToken = config.authToken;
    this.replayStore = config.replayStore;
    this.provider = new LocalTrustedFixtureProvider(config.signingSecret);
  }

  start(port = 8080): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        try {
          await this.handleRequest(req, res);
        } catch (err) {
          console.error('[worker-service] Unhandled error');
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

    if (!authorizationMatchesWorkerBearer(req.headers.authorization, this.authToken)) {
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
      let pathJobId: string;
      try {
        pathJobId = decodeURIComponent(jobMatch[1]);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'jobId is required and must be a valid job identifier' }));
        return;
      }
      const subAction = jobMatch[3];
      let requiredOp: LifecycleOp | null = null;
      if (method === 'GET' && (!subAction || subAction === 'status')) requiredOp = 'status';
      else if (method === 'POST' && subAction === 'cancel') requiredOp = 'cancel';
      else if (method === 'GET' && subAction === 'artifacts') requiredOp = 'artifacts';
      else if (method === 'DELETE' && !subAction) requiredOp = 'cleanup';

      if (!requiredOp) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint not found' }));
        return;
      }

      const rawCap = req.headers[LIFECYCLE_CAPABILITY_HEADER];
      const capHeader = Array.isArray(rawCap) ? rawCap[0] : rawCap;
      const verified = verifyLifecycleCapability(capHeader, this.signingSecret, {
        jobId: pathJobId,
        op: requiredOp,
      });
      if (!verified.valid) {
        this.rejectCapability(res, verified.reason);
        return;
      }
      const claims = verified.claims;
      this.pruneLifecycleJtis();
      if (this.revokedLifecycleJtis.has(claims.jti)) {
        this.rejectCapability(res, 'revoked');
        return;
      }
      const queryTenantRaw = url.searchParams.get('tenantId');
      if (queryTenantRaw !== null && queryTenantRaw !== '') {
        const queryTenant = parseRequiredTenantId(queryTenantRaw);
        if (!queryTenant || queryTenant !== claims.tenantId) {
          this.rejectCapability(res, 'scope_mismatch');
          return;
        }
      }

      const tenantId = claims.tenantId;
      const jobId = claims.jobId;
      if (!parseRequiredJobId(pathJobId) || jobId !== parseRequiredJobId(pathJobId)) {
        this.rejectCapability(res, 'scope_mismatch');
        return;
      }

      if (requiredOp === 'cancel' || requiredOp === 'cleanup') {
        try {
          const consume = await this.replayStore.consumeMutatingJti({
            jti: claims.jti,
            tenantId: claims.tenantId,
            jobId: claims.jobId,
            op: requiredOp,
            exp: claims.exp,
          });
          if (consume !== 'consumed') {
            this.rejectCapability(res, 'replay');
            return;
          }
        } catch (err) {
          void err;
          this.rejectCapability(res, 'replay_unavailable');
          return;
        }
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

  revokeLifecycleJti(jti: string): void {
    if (typeof jti !== 'string' || jti.length < 8) return;
    this.revokedLifecycleJtis.set(jti, Date.now() + 5 * 60_000);
    this.pruneLifecycleJtis();
  }

  private pruneLifecycleJtis(): void {
    const now = Date.now();
    for (const [jti, exp] of this.revokedLifecycleJtis) {
      if (exp <= now) this.revokedLifecycleJtis.delete(jti);
    }
  }

  private rejectCapability(
    res: ServerResponse,
    reason: string,
  ): void {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Forbidden: invalid lifecycle capability', reason }));
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
      replayStore: createWorkerReplayStoreFromEnv(),
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
