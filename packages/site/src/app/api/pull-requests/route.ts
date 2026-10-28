import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, getOrchestrator } from '@/app/api/backend';

export async function GET(request: NextRequest) {
  const auth = getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const repositoryId = searchParams.get('repositoryId') ?? undefined;

  const db = getOrchestrator().getDb();
  const prs = db.listPullRequests(auth.tenant.id, repositoryId);
  return NextResponse.json({ pullRequests: prs });
}

export async function POST(request: NextRequest) {
  const auth = getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
