import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { User } from '@patchversion/shared';
import { getAuthContext, getDatabase, ensureDemoTenantAndUser } from '@/app/api/backend';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

function verifyPassword(password: string, combinedHash: string): boolean {
  try {
    const [salt, key] = combinedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return keyBuffer.length === derivedKey.length && crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  const safe = { ...user };
  delete safe.passwordHash;
  return safe;
}

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: sanitizeUser(auth.user),
    tenant: auth.tenant,
    expiresAt: auth.session.expiresAt,
  });
}

export async function POST(request: NextRequest) {
  const db = getDatabase();
  const body = await request.json().catch(() => ({}));
  const action = body.action || (body.password ? 'login' : 'demo');
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const tenantName = typeof body.tenantName === 'string' ? body.tenantName.trim() : '';

  // 1. User Registration Flow
  if (action === 'register') {
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const existing = await db.getUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email address already exists. Please sign in instead.' },
        { status: 409 },
      );
    }

    const orgName = tenantName || `${email.split('@')[0]}'s Workspace`;
    const tenant = await db.createTenant(orgName);
    const passwordHash = hashPassword(password);
    const user = await db.createUser(tenant.id, email, 'owner', undefined, undefined, undefined, passwordHash);
    const session = await db.createSession(user.id);

    const response = NextResponse.json({
      authenticated: true,
      user: sanitizeUser(user),
      tenant,
      token: session.token,
      expiresAt: session.expiresAt,
    });

    response.cookies.set('trypatchbay_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 3600,
    });

    return response;
  }

  // 2. User Login Flow
  if (action === 'login') {
    if (!email) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    let user = await db.getUserByEmail(email);
    if (!user) {
      // In dev or demo mode, allow fallback for developer@trypatchbay.dev
      if (email === 'developer@trypatchbay.dev') {
        const demo = await ensureDemoTenantAndUser();
        user = demo.user;
      } else {
        return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
      }
    }

    // If user has a password hash, strictly verify credentials
    if (user.passwordHash) {
      if (!password || !verifyPassword(password, user.passwordHash)) {
        return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
      }
    }

    const session = await db.createSession(user.id);
    const tenant = (await db.getTenant(user.tenantId))!;

    const response = NextResponse.json({
      authenticated: true,
      user: sanitizeUser(user),
      tenant,
      token: session.token,
      expiresAt: session.expiresAt,
    });

    response.cookies.set('trypatchbay_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 3600,
    });

    return response;
  }

  // 3. Demo / Development Fallback Flow (Strictly isolated demo tenant)
  if (email) {
    const existing = await db.getUserByEmail(email);
    if (existing && existing.passwordHash) {
      return NextResponse.json(
        { error: 'An account with this email exists. Please sign in with your password.' },
        { status: 403 },
      );
    }
  }

  const demo = await ensureDemoTenantAndUser();
  const user = demo.user;

  const session = await db.createSession(user.id);
  const tenant = (await db.getTenant(user.tenantId))!;

  const response = NextResponse.json({
    authenticated: true,
    user: sanitizeUser(user),
    tenant,
    token: session.token,
    expiresAt: session.expiresAt,
  });

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
  const auth = await getAuthContext(request);
  if (auth) {
    await getDatabase().revokeSession(auth.session.token);
  }

  const response = NextResponse.json({ authenticated: false });
  response.cookies.delete('trypatchbay_session');
  return response;
}
