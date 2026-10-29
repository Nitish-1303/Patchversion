import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, getDatabase } from '@/app/api/backend';
import { FindingRecord } from '@patchversion/shared';

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const repositoryId = searchParams.get('repositoryId') ?? undefined;

  const db = getDatabase();
  const findings = await db.listFindings(auth.tenant.id, repositoryId);

  const enriched = await Promise.all(
    findings.map(async (finding: FindingRecord) => {
      const patch = await db.getPatchByFinding(auth.tenant.id, finding.id);
      const validation = patch ? await db.getValidationByPatch(auth.tenant.id, patch.id) : null;
      const approval = patch ? await db.getActiveApproval(auth.tenant.id, patch.id) : null;
      const pr = await db.getPullRequestByFinding(auth.tenant.id, finding.id);

      return {
        ...finding,
        patch,
        validation,
        approval,
        pullRequest: pr,
      };
    }),
  );

  return NextResponse.json({ findings: enriched });
}
