import { NextResponse } from 'next/server';
import { getDatabase } from '@/app/api/backend';

export async function GET() {
  try {
    getDatabase();
    return NextResponse.json({
      status: 'healthy',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      service: 'trypatchbay',
    });
  } catch (err) {
    return NextResponse.json(
      { status: 'unhealthy', error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
