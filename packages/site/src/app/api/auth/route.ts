import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, getDatabase, ensureDemoTenantAndUser } from '@/app/api/backend';

export async function GET(request: NextRequest) {
  const auth = getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: auth.user,
    tenant: auth.tenant,
    expiresAt: auth.session.expiresAt,
  });
}

export async function POST(request: NextRequest) {
  const db = getDatabase();
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim() : 'developer@trypatchbay.dev';

  let user = db.getUserByEmail(email);
  if (!user) {
    const demo = ensureDemoTenantAndUser();
    user = demo.user;
  }

  const session = db.createSession(user.id);
  const tenant = db.getTenant(user.tenantId)!;

  const response = NextResponse.json({
    authenticated: true,
    user,
    tenant,
    token: session.token,
    expiresAt: session.expiresAt,
  });

  // Set secure HTTP-only session cookie
  response.cookies.set('trypatchbay_session', session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 3600,
  });

  return response;
}

export async function DELETE(request: NextRequest) {
  const auth = getAuthContext(request);
  if (auth) {
    getDatabase().revokeSession(auth.session.token);
  }

  const response = NextResponse.json({ authenticated: false });
  response.cookies.delete('trypatchbay_session');
  return response;
}
