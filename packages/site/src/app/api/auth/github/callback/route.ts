import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/api/backend';
import {
  timingSafeEqualString,
  buildDashboardUrl,
  GITHUB_OAUTH_STATE_COOKIE,
  oauthStateCookieOptions,
} from '@patchversion/engine';

function clearOAuthStateCookie(response: NextResponse): void {
  const opts = oauthStateCookieOptions();
  response.cookies.set(GITHUB_OAUTH_STATE_COOKIE, '', {
    ...opts,
    maxAge: 0,
  });
  response.cookies.set('github_oauth_durable', '', {
    ...opts,
    maxAge: 0,
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    const errorUrl = new URL(buildDashboardUrl(request.nextUrl.origin));
    errorUrl.searchParams.set('auth_error', errorDescription || error);
    const response = NextResponse.redirect(errorUrl);
    clearOAuthStateCookie(response);
    return response;
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: 'Missing code or state parameter.', code: 'INVALID_OAUTH_PARAMS' },
      { status: 400 },
    );
  }

  const storedState = request.cookies.get(GITHUB_OAUTH_STATE_COOKIE)?.value;
  if (!storedState || !timingSafeEqualString(storedState, state)) {
    const errResponse = NextResponse.json(
      { error: 'Invalid or expired OAuth state parameter (CSRF protection).', code: 'CSRF_STATE_MISMATCH' },
      { status: 403 },
    );
    clearOAuthStateCookie(errResponse);
    return errResponse;
  }

  const db = getDatabase();
  // When login marked durable oauth_states persistence, require one-time consume.
  const durableCookie = request.cookies.get('github_oauth_durable')?.value === '1';
  if (durableCookie && typeof db.consumeOAuthState === 'function') {
    const consumed = await db.consumeOAuthState(state);
    if (!consumed) {
      const errResponse = NextResponse.json(
        {
          error: 'Invalid, expired, or already-used OAuth state parameter.',
          code: 'OAUTH_STATE_REPLAY',
        },
        { status: 403 },
      );
      clearOAuthStateCookie(errResponse);
      return errResponse;
    }
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'GitHub OAuth is not configured on this server.', code: 'GITHUB_OAUTH_NOT_CONFIGURED' },
      { status: 503 },
    );
  }

  try {
    // 1. Exchange authorization code for user access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.json(
        { error: tokenData.error_description || 'Failed to exchange OAuth code for access token.', code: tokenData.error || 'TOKEN_EXCHANGE_FAILED' },
        { status: 400 },
      );
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch authenticated GitHub user profile
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'TryPatchBay-App',
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userRes.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch GitHub user profile.', code: 'GITHUB_PROFILE_FETCH_FAILED' },
        { status: 502 },
      );
    }

    const ghUser = await userRes.json();
    const githubLogin = ghUser.login as string;
    const githubUserId = String(ghUser.id);
    let email = ghUser.email as string | null;

    // 3. If primary email is private, fetch from /user/emails
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'TryPatchBay-App',
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (emailsRes.ok) {
        const emails = await emailsRes.json();
        // SECURITY: Only accept emails that are BOTH primary AND verified.
        const primary = Array.isArray(emails)
          ? emails.find((e: { primary: boolean; verified: boolean; email: string }) => e.primary && e.verified)
          : null;
        if (primary?.email) {
          email = primary.email;
        }
      }
    }

    // SECURITY: Fall back to unique noreply address when verified email is unavailable.
    const userEmail = email || `${githubUserId}+${githubLogin}@users.noreply.github.com`;

    // 4. Resolve or create Tenant & User in TryPatchBay database
    // Check if another account already owns this GitHub User ID (identity conflict guard)
    const existingByGithubId = db.getUserByGithubUserId
      ? await db.getUserByGithubUserId(githubUserId)
      : null;
    if (existingByGithubId && existingByGithubId.email !== userEmail) {
      return NextResponse.json(
        {
          error: 'This GitHub account is already linked to a different TryPatchBay account.',
          code: 'GITHUB_IDENTITY_CONFLICT',
        },
        { status: 409 },
      );
    }

    let user = await db.getUserByEmail(userEmail);

    if (!user) {
      const tenantName = `${githubLogin}'s Workspace`;
      const tenant = await db.createTenant(tenantName);
      user = await db.createUser(
        tenant.id,
        userEmail,
        'owner',
        githubLogin,
        githubUserId,
      );
    } else if (user.githubUserId && user.githubUserId !== githubUserId) {
      return NextResponse.json(
        {
          error: 'This TryPatchBay account is already linked to a different GitHub identity. Please sign in with your password or contact support.',
          code: 'GITHUB_IDENTITY_CONFLICT',
        },
        { status: 409 },
      );
    } else if (!user.githubLogin || user.githubLogin !== githubLogin || !user.githubUserId) {
      user = await db.linkGithubAccount(user.id, githubLogin, githubUserId);
    }

    // 5. Create session
    const session = await db.createSession(user.id);

    // 6. Redirect to dashboard with session cookie
    const dashboardUrl = new URL(buildDashboardUrl(request.nextUrl.origin));
    dashboardUrl.searchParams.set('auth', 'github_success');
    dashboardUrl.searchParams.set('account', githubLogin);

    const response = NextResponse.redirect(dashboardUrl);
    response.cookies.set('trypatchbay_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 3600,
    });
    clearOAuthStateCookie(response);

    return response;
  } catch (err) {
    return NextResponse.json(
      { error: `GitHub OAuth callback failed: ${err instanceof Error ? err.message : String(err)}`, code: 'OAUTH_INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
