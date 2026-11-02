import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/api/backend';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    const errorUrl = new URL('/dashboard', request.nextUrl.origin);
    errorUrl.searchParams.set('auth_error', errorDescription || error);
    return NextResponse.redirect(errorUrl);
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: 'Missing code or state parameter.', code: 'INVALID_OAUTH_PARAMS' },
      { status: 400 },
    );
  }

  const storedState = request.cookies.get('github_oauth_state')?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.json(
      { error: 'Invalid or expired OAuth state parameter (CSRF protection).', code: 'CSRF_STATE_MISMATCH' },
      { status: 403 },
    );
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
        const primary = Array.isArray(emails)
          ? emails.find((e: { primary: boolean; verified: boolean; email: string }) => e.primary && e.verified) || emails[0]
          : null;
        if (primary?.email) {
          email = primary.email;
        }
      }
    }

    const userEmail = email || `${githubLogin}@users.noreply.github.com`;

    // 4. Resolve or create Tenant & User in TryPatchBay database
    const db = getDatabase();
    let user = await db.getUserByEmail(userEmail);

    if (!user) {
      // Create new tenant and user
      const tenantName = `${githubLogin}'s Workspace`;
      const tenant = await db.createTenant(tenantName);
      user = await db.createUser(
        tenant.id,
        userEmail,
        'owner',
        githubLogin,
        githubUserId,
      );
    }

    // 5. Create session
    const session = await db.createSession(user.id);

    // 6. Redirect to dashboard with session cookie
    const dashboardUrl = new URL('/dashboard', request.nextUrl.origin);
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
    // Clear OAuth state cookie
    response.cookies.delete('github_oauth_state');

    return response;
  } catch (err) {
    return NextResponse.json(
      { error: `GitHub OAuth callback failed: ${err instanceof Error ? err.message : String(err)}`, code: 'OAUTH_INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
