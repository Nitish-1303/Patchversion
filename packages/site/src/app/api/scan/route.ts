import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, getOrchestrator, DEMO_REPO_ID, CIPHERBILL_REPO_ID, ensureDemoTenantAndUser } from '@/app/api/backend';

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const repositoryId = request.nextUrl.searchParams.get('repositoryId');
  if (!repositoryId) {
    return NextResponse.json({ error: 'repositoryId is required' }, { status: 400 });
  }

  const orchestrator = getOrchestrator();
  const db = orchestrator.getDb();

  let repo = await db.getRepository(auth.tenant.id, repositoryId);
  if (!repo && (repositoryId === DEMO_REPO_ID || repositoryId === 'patchbay-demo/checkout-service' || repositoryId === CIPHERBILL_REPO_ID || repositoryId === 'Nitish-1303/CipherBill')) {
    await ensureDemoTenantAndUser();
    repo = await db.getRepository(auth.tenant.id, repositoryId) ?? await db.getRepository(auth.tenant.id, CIPHERBILL_REPO_ID);
  }

  if (!repo) {
    return NextResponse.json({ error: 'Repository not found for tenant' }, { status: 404 });
  }

  try {
    const scan = await db.getLatestScanResult(auth.tenant.id, repo.id);
    return NextResponse.json({
      success: true,
      repositoryId: repo.id,
      scan: scan ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const repositoryId = body.repositoryId;
  if (!repositoryId) {
    return NextResponse.json({ error: 'repositoryId is required' }, { status: 400 });
  }

  const orchestrator = getOrchestrator();
  const db = orchestrator.getDb();

  let repo = await db.getRepository(auth.tenant.id, repositoryId);
  if (!repo && (repositoryId === DEMO_REPO_ID || repositoryId === 'patchbay-demo/checkout-service' || repositoryId === CIPHERBILL_REPO_ID || repositoryId === 'Nitish-1303/CipherBill')) {
    await ensureDemoTenantAndUser();
    repo = await db.getRepository(auth.tenant.id, repositoryId) ?? await db.getRepository(auth.tenant.id, CIPHERBILL_REPO_ID);
  }

  if (!repo) {
    return NextResponse.json({ error: 'Repository not found for tenant' }, { status: 404 });
  }

  try {
    // 1. Scan repo for dependencies, build graph, and discover upgrade regressions
    const scanResult = await orchestrator.scanRepositoryWithDependencyMap(auth.tenant.id, repo.id);
    const findings = scanResult.findings;

    // 2. For each finding, generate fix and run isolated red-to-green validation
    const results = [];
    for (const finding of findings) {
      try {
        const fixResult = await orchestrator.generateAndValidateFix(auth.tenant.id, finding.id);
        results.push({
          finding,
          patch: fixResult.patch,
          validation: fixResult.validation,
        });
      } catch (fixErr) {
        results.push({
          finding,
          error: fixErr instanceof Error ? fixErr.message : String(fixErr),
        });
      }
    }

    return NextResponse.json({
      success: true,
      repositoryId: repo.id,
      repositoryFullName: repo.fullName,
      scan: scanResult,
      findingsCount: findings.length,
      results,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
