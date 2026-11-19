import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, getDatabase, getGitHubClient } from '@/app/api/backend';

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const github = getGitHubClient();
  if (!github.isConfigured()) {
    return NextResponse.json(
      { error: 'GitHub App is not configured.', code: 'GITHUB_APP_NOT_CONFIGURED' },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const { owner, repo, issueNumber, comment } = body;

  if (!owner || !repo || !issueNumber || !comment) {
    return NextResponse.json(
      { error: 'Missing required parameters: owner, repo, issueNumber, comment' },
      { status: 400 },
    );
  }

  try {
    const db = getDatabase();
    const tenantInstallations = await db.listInstallations(auth.tenant.id);
    const linked = tenantInstallations.find(
      (i) => i.status === 'active' && i.accountLogin.toLowerCase() === String(owner).toLowerCase(),
    );
    if (!linked) {
      return NextResponse.json(
        {
          error: `No active GitHub App installation linked to your workspace for account "${owner}".`,
          code: 'INSTALLATION_NOT_LINKED',
        },
        { status: 403 },
      );
    }

    const token = await github.getInstallationToken(linked.githubInstallationId);
    const result = await github.createComment(owner, repo, Number(issueNumber), String(comment), token);

    return NextResponse.json({
      success: true,
      commentId: result.id,
      htmlUrl: result.htmlUrl,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
