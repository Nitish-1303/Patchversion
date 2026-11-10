import { Pool, type PoolConfig } from 'pg';
import { parseRequiredJobId, parseRequiredTenantId } from './execution-provider';
import type { LifecycleOp } from './lifecycle-capability';

export type MutatingLifecycleOp = Extract<LifecycleOp, 'cancel' | 'cleanup'>;

export interface LifecycleReplayRecord {
  jti: string;
  tenantId: string;
  jobId: string;
  op: MutatingLifecycleOp;
  exp: number;
}

export type LifecycleReplayConsumeResult = 'consumed' | 'replay';

export class LifecycleReplayStoreUnavailableError extends Error {
  constructor(message = 'Lifecycle replay store is unavailable') {
    super(message);
    this.name = 'LifecycleReplayStoreUnavailableError';
  }
}

export interface ILifecycleReplayStore {
  consumeMutatingJti(record: LifecycleReplayRecord): Promise<LifecycleReplayConsumeResult>;
  close?(): Promise<void>;
}

function normalizeRecord(record: LifecycleReplayRecord): LifecycleReplayRecord | null {
  const tenantId = parseRequiredTenantId(record.tenantId);
  const jobId = parseRequiredJobId(record.jobId);
  const jti = typeof record.jti === 'string' ? record.jti.trim() : '';
  if (!tenantId || !jobId || !/^[A-Za-z0-9_-]{8,128}$/.test(jti)) return null;
    if (record.op !== 'cancel' && record.op !== 'cleanup') return null;
  if (!Number.isFinite(record.exp) || record.exp <= Date.now()) return null;
  return { jti, tenantId, jobId, op: record.op, exp: record.exp };
}

function bindingsMatch(
  stored: { tenantId: string; jobId: string; op: string },
  expected: LifecycleReplayRecord,
): boolean {
  return (
    stored.tenantId === expected.tenantId &&
    stored.jobId === expected.jobId &&
    stored.op === expected.op
  );
}

/**
 * Process-shared atomic map for tests. Not durable. Production workers must use Postgres.
 */
export class MemoryLifecycleReplayStore implements ILifecycleReplayStore {
  private rows = new Map<
    string,
    { tenantId: string; jobId: string; op: MutatingLifecycleOp; exp: number }
  >();
  private chain: Promise<void> = Promise.resolve();
  constructor(private readonly contentionDelayMs = 0) {}

  consumeMutatingJti(record: LifecycleReplayRecord): Promise<LifecycleReplayConsumeResult> {
    const run = this.chain.then(() => this.consumeExclusive(record));
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async consumeExclusive(record: LifecycleReplayRecord): Promise<LifecycleReplayConsumeResult> {
    const normalized = normalizeRecord(record);
    if (!normalized) {
      throw new LifecycleReplayStoreUnavailableError('Malformed lifecycle replay record');
    }
    if (this.contentionDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.contentionDelayMs));
    }
    const existing = this.rows.get(normalized.jti);
    if (existing) {
      return 'replay';
    }
    this.rows.set(normalized.jti, {
      tenantId: normalized.tenantId,
      jobId: normalized.jobId,
      op: normalized.op,
      exp: normalized.exp,
    });
    return 'consumed';
  }
}

export interface PostgresLifecycleReplayStoreConfig {
  connectionString?: string;
  pool?: Pool;
  poolConfig?: PoolConfig;
}

/**
 * INSERT … ON CONFLICT DO NOTHING is the atomic consume. Unique `jti` is the lock.
 */
export class PostgresLifecycleReplayStore implements ILifecycleReplayStore {
  private pool: Pool;
  private ownsPool: boolean;

  constructor(config?: PostgresLifecycleReplayStoreConfig) {
    if (config?.pool) {
      this.pool = config.pool;
      this.ownsPool = false;
      return;
    }
    const connectionString = config?.connectionString || process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString || connectionString.trim() === '') {
      throw new LifecycleReplayStoreUnavailableError(
        'DATABASE_URL / POSTGRES_URL is required for durable lifecycle replay protection.',
      );
    }
    this.pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ...config?.poolConfig,
    });
    this.ownsPool = true;
  }

  async consumeMutatingJti(record: LifecycleReplayRecord): Promise<LifecycleReplayConsumeResult> {
    const normalized = normalizeRecord(record);
    if (!normalized) {
      throw new LifecycleReplayStoreUnavailableError('Malformed lifecycle replay record');
    }
    try {
      const inserted = await this.pool.query<{ jti: string }>(
        `INSERT INTO lifecycle_capability_replays (jti, tenant_id, job_id, op, expires_at_ms)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (jti) DO NOTHING
         RETURNING jti`,
        [normalized.jti, normalized.tenantId, normalized.jobId, normalized.op, normalized.exp],
      );
      if (inserted.rowCount === 1) {
        return 'consumed';
      }
      const existing = await this.pool.query<{
        tenant_id: string;
        job_id: string;
        op: string;
        expires_at_ms: string;
      }>(
        `SELECT tenant_id, job_id, op, expires_at_ms FROM lifecycle_capability_replays WHERE jti = $1`,
        [normalized.jti],
      );
      if (existing.rowCount === 0) {
        throw new LifecycleReplayStoreUnavailableError('Replay row missing after conflict');
      }
      const row = existing.rows[0];
      void bindingsMatch(
        { tenantId: row.tenant_id, jobId: row.job_id, op: row.op },
        normalized,
      );
      return 'replay';
    } catch (err) {
      if (err instanceof LifecycleReplayStoreUnavailableError) throw err;
      throw new LifecycleReplayStoreUnavailableError(
        err instanceof Error ? err.message : 'PostgreSQL lifecycle replay consume failed',
      );
    }
  }

  async close(): Promise<void> {
    if (this.ownsPool) {
      await this.pool.end();
    }
  }
}

export function createWorkerReplayStoreFromEnv(): ILifecycleReplayStore {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString || connectionString.trim() === '') {
    throw new LifecycleReplayStoreUnavailableError(
      'WorkerExecutionService requires DATABASE_URL for durable mutating lifecycle replay protection.',
    );
  }
  return new PostgresLifecycleReplayStore({ connectionString });
}
