import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, getOrchestrator } from '@/app/api/backend';

export async function POST(request: NextRequest) {
  const auth = getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { patchId, diffHash } = body;

  if (!patchId || !diffHash) {
    return NextResponse.json({ error: 'patchId and diffHash are required' }, { status: 400 });
  }

  const orchestrator = getOrchestrator();

  try {
    const approval = orchestrator.approvePatch(auth.tenant.id, patchId, auth.user.id, diffHash);
    return NextResponse.json({ success: true, approval });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
