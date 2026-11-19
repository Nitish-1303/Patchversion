import { NextRequest, NextResponse } from 'next/server';
import {
  generateOAuthStateToken,
  oauthStateCookieOptions,
  buildGitHubOAuthCallbackUrl,
  GITHUB_OAUTH_STATE_COOKIE,
  GITHUB_OAUTH_STATE_TTL_SECONDS,
} from '@patchversion/engine';

/** Marks that durable oauth_states consume is required on callback. */
const GITHUB_OAUTH_DURABLE_COOKIE = 'github_oauth_durable';

export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    const allowDemoLogin =
      process.env.ALLOW_DEMO_GITHUB_LOGIN === 'true' &&
      process.env.NODE_ENV !== 'production' &&
      (process.env.NODE_ENV === 'test' ? request.nextUrl.searchParams.has('demo') : true);

    if (!allowDemoLogin) {
      return NextResponse.json(
        {
          error: 'GitHub OAuth is not configured on this server. GITHUB_CLIENT_ID is missing.',
          code: 'GITHUB_CLIENT_ID_MISSING',
        },
        { status: 503 },
      );
    }

    // Non-production demo fallback only when explicitly enabled
    const { ensureDemoTenantAndUser, getDatabase } = await import('@/app/api/backend');
    const demo = await ensureDemoTenantAndUser();
    const db = getDatabase();
    const session = await db.createSession(demo.user.id);
    const redirectUrl = new URL('/dashboard', request.nextUrl.origin);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set('trypatchbay_session', session.token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 3600,
    });
    return response;
  }

  const redirectUri = buildGitHubOAuthCallbackUrl(request.nextUrl.origin);
  let state = generateOAuthStateToken();
  let durable = false;

  try {
    const { getDatabase } = await import('@/app/api/backend');
    const db = getDatabase();
    if (typeof db.createOAuthState === 'function') {
      const issued = await db.createOAuthState(GITHUB_OAUTH_STATE_TTL_SECONDS);
      state = issued.token;
      durable = Boolean(issued.persisted);
    }
  } catch {
    // Cookie-only CSRF state if persistence is unavailable
  }

  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', 'read:user,user:email');
  authorizeUrl.searchParams.set('state', state);

  const cookieOpts = oauthStateCookieOptions();
  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(GITHUB_OAUTH_STATE_COOKIE, state, cookieOpts);
  if (durable) {
    response.cookies.set(GITHUB_OAUTH_DURABLE_COOKIE, '1', cookieOpts);
  } else {
    response.cookies.set(GITHUB_OAUTH_DURABLE_COOKIE, '', { ...cookieOpts, maxAge: 0 });
  }

  return response;
}
