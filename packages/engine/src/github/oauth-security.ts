import crypto from 'crypto';

export const GITHUB_OAUTH_STATE_COOKIE = 'github_oauth_state';
export const GITHUB_OAUTH_STATE_TTL_SECONDS = 600;
export const GITHUB_OAUTH_STATE_BYTES = 32;

export interface OAuthCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
}

export function generateOAuthStateToken(): string {
  return crypto.randomBytes(GITHUB_OAUTH_STATE_BYTES).toString('hex');
}

export function hashOAuthStateToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

export function timingSafeEqualString(left: string, right: string): boolean {
  const leftBuf = Buffer.from(String(left ?? ''), 'utf8');
  const rightBuf = Buffer.from(String(right ?? ''), 'utf8');
  if (leftBuf.length !== rightBuf.length) {
    if (leftBuf.length > 0) {
      crypto.timingSafeEqual(leftBuf, leftBuf);
    }
    return false;
  }
  if (leftBuf.length === 0) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuf, rightBuf);
}

export function oauthStateCookieOptions(ttlSeconds = GITHUB_OAUTH_STATE_TTL_SECONDS): OAuthCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/github/callback',
    maxAge: ttlSeconds,
  };
}

export function resolvePublicBaseUrl(requestOrigin: string): string {
  const configured =
    process.env.APP_BASE_URL || process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured && configured.trim()) {
    return configured.trim().replace(/\/+$/, '');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('APP_BASE_URL is required in production to prevent callback URL hijacking');
  }
  return requestOrigin.replace(/\/+$/, '');
}

export function buildGitHubOAuthCallbackUrl(requestOrigin: string): string {
  const base = resolvePublicBaseUrl(requestOrigin);
  return `${base}/api/auth/github/callback`;
}

export function buildDashboardUrl(requestOrigin: string): string {
  const base = resolvePublicBaseUrl(requestOrigin);
  return `${base}/dashboard`;
}

export function isAllowedOAuthCallbackUrl(candidate: string, requestOrigin: string): boolean {
  try {
    const expected = new URL(buildGitHubOAuthCallbackUrl(requestOrigin));
    const actual = new URL(candidate);
    return (
      actual.origin === expected.origin &&
      actual.pathname === expected.pathname &&
      actual.search === '' &&
      actual.hash === ''
    );
  } catch {
    return false;
  }
}

export function oauthStateExpiresAt(ttlSeconds = GITHUB_OAUTH_STATE_TTL_SECONDS, now = Date.now()): string {
  return new Date(now + ttlSeconds * 1000).toISOString();
}

export function isOAuthStateExpired(expiresAt: string, now = Date.now()): boolean {
  return new Date(expiresAt).getTime() <= now;
}
