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
      {
        error: 'GitHub App is not configured on this server. Configure GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY before onboarding installations.',
        code: 'GITHUB_APP_NOT_CONFIGURED',
      },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const targetAccount = body.targetAccount ? String(body.targetAccount).trim() : undefined;

  const db = getDatabase();
  const state = await db.createOnboardingState(auth.tenant.id, auth.user.id, targetAccount, 15);

  const appSlug = process.env.GITHUB_APP_SLUG || process.env.GITHUB_APP_NAME;
  const installUrl = appSlug
    ? `https://github.com/apps/${encodeURIComponent(appSlug)}/installations/new?state=${encodeURIComponent(state.token)}`
    : null;

  return NextResponse.json({
    token: state.token,
    expiresAt: state.expiresAt,
    targetAccount: state.targetAccount,
    installUrl,
    instructions: appSlug
      ? 'Redirect user to installUrl to grant permissions. GitHub will return with the state token upon completion.'
      : 'GitHub App slug not configured in GITHUB_APP_SLUG. Install the app via your organization settings and supply the state token.',
  });
}
