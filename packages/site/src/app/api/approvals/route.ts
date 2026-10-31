import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, getOrchestrator, assertRole } from '@/app/api/backend';

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
  const { patchId, diffHash } = body;

  if (!patchId || !diffHash) {
    return NextResponse.json({ error: 'patchId and diffHash are required' }, { status: 400 });
  }

  const orchestrator = getOrchestrator();

  try {
    const approval = await orchestrator.approvePatch(auth.tenant.id, patchId, auth.user.id, diffHash);
    return NextResponse.json({ success: true, approval });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
