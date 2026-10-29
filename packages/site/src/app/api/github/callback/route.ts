import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getGitHubClient } from '@/app/api/backend';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const installationIdStr = searchParams.get('installation_id');
  const setupAction = searchParams.get('setup_action');
  const stateToken = searchParams.get('state');

  if (!stateToken) {
    return NextResponse.json(
      { error: 'Missing state parameter for installation onboarding.', code: 'INVALID_STATE' },
      { status: 400 },
    );
  }

  if (!installationIdStr) {
    return NextResponse.json(
      { error: 'Missing installation_id parameter.', code: 'MISSING_INSTALLATION_ID' },
      { status: 400 },
    );
  }

  const installationId = parseInt(installationIdStr, 10);
  if (isNaN(installationId) || installationId <= 0) {
    return NextResponse.json(
      { error: 'Invalid installation_id parameter.', code: 'INVALID_INSTALLATION_ID' },
      { status: 400 },
    );
  }

  const github = getGitHubClient();
  if (!github.isConfigured()) {
    return NextResponse.json(
      {
        error: 'GitHub App is not configured. Cannot verify installation authenticity.',
        code: 'GITHUB_APP_NOT_CONFIGURED',
      },
      { status: 503 },
    );
  }

  const db = getDatabase();

  // Validate state token exists, is pending, not expired
  const state = await db.getOnboardingState(stateToken);
  if (!state) {
    return NextResponse.json(
      { error: 'Invalid or unknown onboarding state token.', code: 'INVALID_STATE' },
      { status: 400 },
    );
  }

  if (new Date(state.expiresAt).getTime() < Date.now()) {
    return NextResponse.json(
      { error: 'Onboarding state token has expired. Please initiate installation again.', code: 'STATE_EXPIRED' },
      { status: 400 },
    );
  }

  if (state.status !== 'pending') {
    return NextResponse.json(
      { error: 'Onboarding state token has already been consumed (replay rejected).', code: 'STATE_REPLAY_REJECTED' },
      { status: 400 },
    );
  }

  // Verify the installation exists on GitHub and find its account
  let accountLogin: string;
  let accountType: 'User' | 'Organization' = 'User';

  try {
    const installations = await github.listAppInstallations();
    const inst = installations.find(i => i.id === installationId);
    if (!inst) {
      return NextResponse.json(
        {
          error: `GitHub App installation ${installationId} could not be confirmed via GitHub API.`,
          code: 'INSTALLATION_NOT_FOUND',
        },
        { status: 404 },
      );
    }
    accountLogin = inst.account;
    accountType = inst.targetType === 'Organization' ? 'Organization' : 'User';
  } catch (err) {
    return NextResponse.json(
      {
        error: `Failed to verify installation with GitHub: ${err instanceof Error ? err.message : String(err)}`,
        code: 'GITHUB_VERIFICATION_FAILED',
      },
      { status: 502 },
    );
  }

  // If a target account was specified during onboarding initiation, verify account match
  if (state.targetAccount && state.targetAccount.toLowerCase() !== accountLogin.toLowerCase()) {
    return NextResponse.json(
      {
        error: `GitHub account mismatch: expected "${state.targetAccount}", got "${accountLogin}". Linking rejected.`,
        code: 'ACCOUNT_MISMATCH',
      },
      { status: 403 },
    );
  }

  // Atomically link installation to the tenant and consume state token
  try {
    const linked = await db.verifyAndLinkInstallation(stateToken, installationId, accountLogin, accountType);

    // Check if client requested JSON or browser redirect
    const acceptHeader = request.headers.get('accept') || '';
    if (acceptHeader.includes('application/json')) {
      return NextResponse.json({
        success: true,
        installation: linked,
        setupAction: setupAction || 'install',
      });
    }

    // Redirect to dashboard with confirmation query params
    const dashboardUrl = new URL('/dashboard', request.nextUrl.origin);
    dashboardUrl.searchParams.set('installation_success', 'true');
    dashboardUrl.searchParams.set('account', accountLogin);
    return NextResponse.redirect(dashboardUrl);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err), code: 'LINKING_FAILED' },
      { status: 400 },
    );
  }
}
