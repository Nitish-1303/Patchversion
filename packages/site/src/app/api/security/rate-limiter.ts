import { getPostgresStore } from '@/app/api/backend';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export const AUTH_RATE_LIMIT = {
  maxFailures: 5,
  windowMs: 60 * 1000, // 1 minute
};

export const SCAN_RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
};

/**
 * Durable and memory-backed sliding-window rate limiter.
 * Designed for serverless environments with atomic PostgreSQL backing and resilient in-memory fallback.
 */
export class RateLimiter {
  private static memoryStore = new Map<string, RateLimitRecord>();

  /**
   * Resets rate limiter memory state (primarily for test isolation).
   */
  public static resetForTest(): void {
    this.memoryStore.clear();
  }

  /**
   * Evaluates and records an attempt for a given rate-limit key.
   * If PostgreSQL is configured, executes an atomic sliding-window upsert shared across all instances.
   * Falls back gracefully to process-local memory if database is unavailable.
   */
  public static async checkAndIncrement(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; remaining: number; resetInMs: number }> {
    const now = Date.now();
    const pg = getPostgresStore();

    if (pg) {
      try {
        const rows = await pg.query<{ count: number; first_attempt_at: string | number }>(
          `INSERT INTO rate_limits (key, count, first_attempt_at, last_attempt_at)
           VALUES ($1, 1, $2, $2)
           ON CONFLICT (key) DO UPDATE
           SET count = CASE
                 WHEN rate_limits.first_attempt_at + $3 <= $2 THEN 1
                 ELSE rate_limits.count + 1
               END,
               first_attempt_at = CASE
                 WHEN rate_limits.first_attempt_at + $3 <= $2 THEN $2
                 ELSE rate_limits.first_attempt_at
               END,
               last_attempt_at = $2
           RETURNING count, first_attempt_at`,
          [key, now, windowMs],
        );

        if (rows && rows.length > 0) {
          const count = Number(rows[0].count);
          const firstAttempt = Number(rows[0].first_attempt_at);
          const resetInMs = Math.max(0, firstAttempt + windowMs - now);
          if (count > limit) {
            return { allowed: false, remaining: 0, resetInMs };
          }
          return { allowed: true, remaining: Math.max(0, limit - count), resetInMs };
        }
      } catch {
        // Fallback safely to process-local memory if database table or connection is temporarily unavailable
      }
    }

    const memoryRecord = this.memoryStore.get(key);

    // If memory record expired or missing, start new window
    if (!memoryRecord || now >= memoryRecord.resetAt) {
      this.memoryStore.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: limit - 1, resetInMs: windowMs };
    }

    if (memoryRecord.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetInMs: Math.max(0, memoryRecord.resetAt - now),
      };
    }

    memoryRecord.count += 1;
    return {
      allowed: true,
      remaining: Math.max(0, limit - memoryRecord.count),
      resetInMs: Math.max(0, memoryRecord.resetAt - now),
    };
  }

  /**
   * Checks whether the given key is currently rate limited without incrementing count.
   */
  public static async isRateLimited(key: string, limit: number, windowMs?: number): Promise<boolean> {
    const now = Date.now();
    const effectiveWindow = windowMs || 60 * 1000;
    const pg = getPostgresStore();

    if (pg) {
      try {
        const rows = await pg.query<{ count: number; first_attempt_at: string | number }>(
          `SELECT count, first_attempt_at FROM rate_limits WHERE key = $1`,
          [key],
        );
        if (rows && rows.length > 0) {
          const firstAttempt = Number(rows[0].first_attempt_at);
          const count = Number(rows[0].count);
          if (firstAttempt + effectiveWindow > now) {
            return count >= limit;
          }
          return false;
        }
      } catch {
        // Fallback to memory
      }
    }

    const memoryRecord = this.memoryStore.get(key);
    if (!memoryRecord || now >= memoryRecord.resetAt) {
      return false;
    }
    return memoryRecord.count >= limit;
  }

  /**
   * Clears the recorded count for a key (e.g. after a successful authentication).
   */
  public static async clearKey(key: string): Promise<void> {
    this.memoryStore.delete(key);
    const pg = getPostgresStore();
    if (pg) {
      try {
        await pg.query('DELETE FROM rate_limits WHERE key = $1', [key]);
      } catch {
        // Tolerant to missing table or network transient
      }
    }
  }
}

/**
 * Checks if the authentication identifier (IP + email/action) has reached max failed attempts.
 */
export async function isAuthRateLimited(identifier: string): Promise<boolean> {
  const key = `auth_fail:${identifier}`;
  return RateLimiter.isRateLimited(key, AUTH_RATE_LIMIT.maxFailures, AUTH_RATE_LIMIT.windowMs);
}

/**
 * Records a failed authentication attempt.
 */
export async function recordAuthFailure(identifier: string): Promise<{ allowed: boolean; remaining: number }> {
  const key = `auth_fail:${identifier}`;
  const res = await RateLimiter.checkAndIncrement(key, AUTH_RATE_LIMIT.maxFailures, AUTH_RATE_LIMIT.windowMs);
  return { allowed: res.allowed, remaining: res.remaining };
}

/**
 * Clears failed authentication attempts after successful authentication.
 */
export async function resetAuthFailures(identifier: string): Promise<void> {
  const key = `auth_fail:${identifier}`;
  await RateLimiter.clearKey(key);
}

/**
 * Checks and increments rate limit for repository scans per tenant.
 */
export async function checkScanRateLimit(
  tenantId: string,
): Promise<{ allowed: boolean; remaining: number; resetInMs: number }> {
  const key = `scan_tenant:${tenantId}`;
  return RateLimiter.checkAndIncrement(key, SCAN_RATE_LIMIT.maxRequests, SCAN_RATE_LIMIT.windowMs);
}
