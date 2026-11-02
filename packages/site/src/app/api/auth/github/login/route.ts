import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      {
        error: 'GitHub OAuth is not configured on this server. GITHUB_CLIENT_ID is missing.',
        code: 'GITHUB_CLIENT_ID_MISSING',
      },
      { status: 503 },
    );
  }

  // Generate secure random state token
  const state = crypto.randomBytes(24).toString('hex');
  const redirectUri = new URL('/api/auth/github/callback', request.nextUrl.origin).toString();

  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', 'read:user,user:email');
  authorizeUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(authorizeUrl);
  // Set state in a short-lived secure HTTP-only cookie for CSRF validation
  response.cookies.set('github_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  });

  return response;
}
