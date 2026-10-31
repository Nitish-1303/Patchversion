import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, getOrchestrator, assertRole } from '@/app/api/backend';

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const repositoryId = searchParams.get('repositoryId') ?? undefined;

  const db = getOrchestrator().getDb();
  const prs = await db.listPullRequests(auth.tenant.id, repositoryId);
  return NextResponse.json({ pullRequests: prs });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    assertRole(auth.user, ['owner', 'admin']);
  } catch (err: unknown) {
    const errorObj = err as { message?: string; code?: string };
    return NextResponse.json(
      { error: errorObj.message || 'Forbidden', code: errorObj.code || 'FORBIDDEN_INSUFFICIENT_ROLE' },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const { patchId } = body;

  if (!patchId) {
    return NextResponse.json({ error: 'patchId is required' }, { status: 400 });
  }

  const orchestrator = getOrchestrator();

  try {
    const prRecord = await orchestrator.deliverPullRequest(auth.tenant.id, patchId, auth.user.id);
    return NextResponse.json({
      success: true,
      pullRequest: prRecord,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
