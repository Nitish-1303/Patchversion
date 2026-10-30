import { NextResponse } from 'next/server';
import { getDatabase } from '@/app/api/backend';
import { PostgresStore } from '@patchversion/engine';

function getSanitizedErrorCategory(err: unknown): string {
  if (err instanceof Error) {
    if (
      err.message === 'missing_production_config' ||
      err.message.includes('DATABASE_URL or POSTGRES_URL is required in production')
    ) {
      return 'missing_production_config';
    }
    if (err.message === 'unsupported_storage' || err.message.includes('not configured')) {
      return 'unsupported_storage';
    }
    if (err.message === 'invalid_ping_result' || err.message.includes('ping')) {
      return 'invalid_ping_result';
    }
  }
  return 'database_unavailable';
}

export async function GET() {
  try {
    // In production, ensure we never fall back to ephemeral / non-PostgreSQL storage
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
      throw new Error('missing_production_config');
    }

    const db = getDatabase();
    const isPostgres =
      db instanceof PostgresStore ||
      (typeof (db as any)?.query === 'function' && process.env.NODE_ENV !== 'production');

    if (!db || !isPostgres) {
      throw new Error('unsupported_storage');
    }

    // Execute read-only SQL query to verify database connectivity and readiness
    const rows = await (db as PostgresStore).query<{ ping: unknown }>('SELECT 1 AS ping');
    const ping = rows?.[0]?.ping;

    // Verify the SQL ping result contains exactly the expected value (ping === 1)
    if (rows?.length !== 1 || (ping !== 1 && Number(ping) !== 1)) {
      throw new Error('invalid_ping_result');
    }

    return NextResponse.json({
      status: 'healthy',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      service: 'trypatchbay',
    });
  } catch (err) {
    // Log a stable, sanitized error category without logging raw messages, stacks, or credentials
    const category = getSanitizedErrorCategory(err);
    console.error(`[health] Database check failed: category=${category}`);

    // Return sanitized 503 response to client - never leak credentials, hostnames, or raw errors
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Database service unavailable',
        timestamp: new Date().toISOString(),
        service: 'trypatchbay',
      },
      { status: 503 },
    );
  }
}
