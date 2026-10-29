import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, getDatabase, getStorageModeInfo } from '@/app/api/backend';
import { WatchTargetRecord } from '@patchversion/shared';

// Official npm package name validation rules
// - Max 214 chars, no leading . or _, lowercase/URL-safe, optional scope @org/pkg
const NPM_PACKAGE_NAME_REGEX = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

export function isValidPackageName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 214) return false;
  if (trimmed.startsWith('.') || trimmed.startsWith('_')) return false;
  return NPM_PACKAGE_NAME_REGEX.test(trimmed);
}

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDatabase();
  let packages = await db.listWatchTargets(auth.tenant.id);

  if (packages.length === 0) {
    const defaultTargets: Omit<WatchTargetRecord, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>[] = [
      {
        packageName: 'mockpay',
        ecosystem: 'npm',
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        lastCheckedAt: new Date().toISOString(),
        status: 'upgrade_available',
        isDemo: true,
        notes: "BREAKING CHANGE: 'source' renamed to 'payment_method' in charges.create (Demo fixture)",
        source: 'fixture-demo',
      },
      {
        packageName: 'lodash',
        ecosystem: 'npm',
        currentVersion: '3.10.1',
        latestVersion: '4.17.21',
        lastCheckedAt: new Date().toISOString(),
        status: 'upgrade_available',
        isDemo: false,
        notes: "BREAKING CHANGE: Renamed '_.contains' to '_.includes'",
        source: 'registry',
      },
      {
        packageName: 'stripe',
        ecosystem: 'npm',
        currentVersion: '14.25.0',
        latestVersion: '14.25.0',
        lastCheckedAt: new Date().toISOString(),
        status: 'up_to_date',
        isDemo: false,
        notes: 'Monitored manifest dependency; no breaking changes detected',
        source: 'registry',
      },
    ];
    for (const dt of defaultTargets) {
      await db.saveWatchTarget(auth.tenant.id, dt);
    }
    packages = await db.listWatchTargets(auth.tenant.id);
  }

  return NextResponse.json({
    packages,
    persistence: process.env.PATCHVERSION_STATE_DIR ? 'configured-storage' : 'transient (ephemeral serverless /tmp)',
    storage: getStorageModeInfo(),
  });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const rawPackageName = body.packageName;

  if (typeof rawPackageName !== 'string' || !rawPackageName.trim()) {
    return NextResponse.json({ error: 'packageName is required' }, { status: 400 });
  }

  const packageName = rawPackageName.trim();
  if (!isValidPackageName(packageName)) {
    return NextResponse.json({
      error: `Invalid package name '${packageName}'. Must conform to npm package naming rules (1-214 chars, URL-safe, lowercase, optional @scope/).`,
    }, { status: 400 });
  }

  const db = getDatabase();
  let pkg = await db.getWatchTarget(auth.tenant.id, packageName);

  if (!pkg) {
    pkg = await db.saveWatchTarget(auth.tenant.id, {
      packageName,
      ecosystem: (body.ecosystem as 'npm' | 'pypi' | 'remote-api') || 'npm',
      currentVersion: typeof body.currentVersion === 'string' ? body.currentVersion : '1.0.0',
      latestVersion: 'unknown',
      lastCheckedAt: new Date().toISOString(),
      status: 'up_to_date',
      source: packageName === 'mockpay' ? 'fixture-demo' : 'registry',
      isDemo: packageName === 'mockpay',
    });
  }

  if (packageName === 'mockpay') {
    // Local demo fixture observation
    const updated = await db.saveWatchTarget(auth.tenant.id, {
      ...pkg,
      lastCheckedAt: new Date().toISOString(),
      latestVersion: '2.0.0',
      status: 'upgrade_available',
      lastError: undefined,
      isDemo: true,
      source: 'fixture-demo',
      notes: "Demo SDK fixture for Stripe breaking change scenario",
    });

    return NextResponse.json({
      success: true,
      package: updated,
      persistence: process.env.PATCHVERSION_STATE_DIR ? 'configured-storage' : 'transient (ephemeral serverless /tmp)',
    });
  }

  // Authoritative external registry check with bounded 5000ms timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const encodedPkg = packageName.startsWith('@')
      ? `@${encodeURIComponent(packageName.slice(1))}`
      : encodeURIComponent(packageName);

    const res = await fetch(`https://registry.npmjs.org/${encodedPkg}/latest`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'TryPatchBay-Watcher' },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorMsg = res.status === 404
        ? `Package '${packageName}' was not found in npm registry (HTTP 404)`
        : `npm registry returned HTTP ${res.status}`;
      const updated = await db.saveWatchTarget(auth.tenant.id, {
        ...pkg,
        lastCheckedAt: new Date().toISOString(),
        status: 'error',
        lastError: errorMsg,
        source: 'registry',
      });

      return NextResponse.json({
        success: false,
        package: updated,
        error: errorMsg,
        persistence: process.env.PATCHVERSION_STATE_DIR ? 'configured-storage' : 'transient (ephemeral serverless /tmp)',
      }, { status: res.status === 404 ? 404 : 502 });
    }

    const data = (await res.json()) as { version: string };
    const latestVersion = data.version || 'unknown';
    const status = pkg.currentVersion === latestVersion ? 'up_to_date' : 'upgrade_available';
    const updated = await db.saveWatchTarget(auth.tenant.id, {
      ...pkg,
      lastCheckedAt: new Date().toISOString(),
      latestVersion,
      status,
      lastError: undefined,
      source: 'registry',
    });

    return NextResponse.json({
      success: true,
      package: updated,
      persistence: process.env.PATCHVERSION_STATE_DIR ? 'configured-storage' : 'transient (ephemeral serverless /tmp)',
    });
  } catch (err) {
    const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted'));
    const errorMsg = isAbort
      ? 'Registry request timed out after 5000ms'
      : err instanceof Error ? err.message : String(err);

    let updated = null;
    try {
      updated = await db.updateWatchTarget(auth.tenant.id, packageName, {
        lastCheckedAt: new Date().toISOString(),
        status: 'error',
        lastError: errorMsg,
        source: 'registry',
      });
    } catch (dbErr) {
      console.error('[packages/route] Failed to persist watch target error status:', dbErr);
    }

    return NextResponse.json({
      success: false,
      package: updated,
      error: errorMsg,
      persistence: process.env.PATCHVERSION_STATE_DIR ? 'configured-storage' : 'transient (ephemeral serverless /tmp)',
    }, { status: 504 });
  }
}
