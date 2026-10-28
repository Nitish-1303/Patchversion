import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/app/api/backend';

export interface MonitoredPackage {
  packageName: string;
  ecosystem: 'npm' | 'pypi' | 'remote-api';
  currentVersion: string;
  latestVersion: string;
  lastCheckedAt: string;
  status: 'up_to_date' | 'upgrade_available' | 'error';
  notes?: string;
  lastError?: string;
}

// In-memory / tenant-scoped cache of monitored packages
const monitoredPackages: MonitoredPackage[] = [
  {
    packageName: 'mockpay',
    ecosystem: 'npm',
    currentVersion: '1.0.0',
    latestVersion: '2.0.0',
    lastCheckedAt: new Date().toISOString(),
    status: 'upgrade_available',
    notes: "BREAKING CHANGE: 'source' renamed to 'payment_method' in charges.create",
  },
  {
    packageName: 'lodash',
    ecosystem: 'npm',
    currentVersion: '3.10.1',
    latestVersion: '4.17.21',
    lastCheckedAt: new Date().toISOString(),
    status: 'upgrade_available',
    notes: "BREAKING CHANGE: Renamed '_.contains' to '_.includes'",
  },
  {
    packageName: 'stripe',
    ecosystem: 'npm',
    currentVersion: '14.25.0',
    latestVersion: '14.25.0',
    lastCheckedAt: new Date().toISOString(),
    status: 'up_to_date',
    notes: 'Monitored manifest dependency; no breaking changes detected',
  },
];

export async function GET(request: NextRequest) {
  const auth = getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ packages: monitoredPackages });
}

export async function POST(request: NextRequest) {
  const auth = getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const packageName = body.packageName;

  if (!packageName) {
    return NextResponse.json({ error: 'packageName is required' }, { status: 400 });
  }

  const pkg = monitoredPackages.find(p => p.packageName === packageName);
  if (!pkg) {
    return NextResponse.json({ error: `Package ${packageName} not found in monitored list` }, { status: 404 });
  }

  try {
    if (packageName === 'mockpay') {
      // Local fixture registry observation
      pkg.lastCheckedAt = new Date().toISOString();
      pkg.latestVersion = '2.0.0';
      pkg.status = 'upgrade_available';
      pkg.lastError = undefined;
    } else {
      // Query authoritative npm registry with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`https://registry.npmjs.org/${packageName}/latest`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'TryPatchBay-Watcher' },
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`npm registry returned HTTP ${res.status}`);
      }

      const data = await res.json() as { version: string };
      pkg.lastCheckedAt = new Date().toISOString();
      pkg.latestVersion = data.version;
      pkg.status = pkg.currentVersion === data.version ? 'up_to_date' : 'upgrade_available';
      pkg.lastError = undefined;
    }

    return NextResponse.json({ success: true, package: pkg });
  } catch (err) {
    pkg.lastCheckedAt = new Date().toISOString();
    pkg.status = 'error';
    pkg.lastError = err instanceof Error ? err.message : String(err);

    return NextResponse.json({
      success: false,
      package: pkg,
      error: pkg.lastError,
    });
  }
}
