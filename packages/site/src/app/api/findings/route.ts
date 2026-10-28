import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, getDatabase } from '@/app/api/backend';
import { FindingRecord } from '@patchversion/shared';

export async function GET(request: NextRequest) {
  const auth = getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const repositoryId = searchParams.get('repositoryId') ?? undefined;

  const db = getDatabase();
  const findings = db.listFindings(auth.tenant.id, repositoryId);

  const enriched = findings.map((finding: FindingRecord) => {
    const patch = db.getPatchByFinding(auth.tenant.id, finding.id);
    const validation = patch ? db.getValidationByPatch(auth.tenant.id, patch.id) : null;
    const approval = patch ? db.getActiveApproval(auth.tenant.id, patch.id) : null;
    const pr = db.getPullRequestByFinding(auth.tenant.id, finding.id);

    return {
      ...finding,
      patch,
      validation,
      approval,
      pullRequest: pr,
    };
  });

  return NextResponse.json({ findings: enriched });
}
