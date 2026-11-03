import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, getGitHubClient } from '@/app/api/backend';

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
    const insts = await github.listAppInstallations();
    const inst = insts.find(i => i.account.toLowerCase() === String(owner).toLowerCase());
    if (!inst) {
      return NextResponse.json(
        { error: `No active GitHub App installation found for account "${owner}".` },
        { status: 404 },
      );
    }

    const token = await github.getInstallationToken(inst.id);
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
