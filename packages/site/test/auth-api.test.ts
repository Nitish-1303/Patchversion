/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { GET, POST, DELETE } from '../src/app/api/auth/route';
import { _resetInstancesForTest } from '../src/app/api/backend';

describe('/api/auth API Endpoint', () => {
  let tmpDir: string;
  const originalEnv = process.env;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-test-auth-api-'));
    process.env = { ...originalEnv };
    process.env.PATCHVERSION_STATE_DIR = tmpDir;
    process.env.PATCHVERSION_SESSION_SECRET = 'test-secret-at-least-32-chars-long-auth-api-12345';
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    _resetInstancesForTest();
  });

  afterEach(() => {
    _resetInstancesForTest();
    process.env = originalEnv;
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  test('registers a new user and workspace successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'register',
        email: 'carol@innovate.co',
        password: 'securePassword123!',
        tenantName: 'Innovate Co',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.authenticated).toBe(true);
    expect(data.user.email).toBe('carol@innovate.co');
    expect(data.user.passwordHash).toBeUndefined(); // Password hash must never be returned to client
    expect(data.tenant.name).toBe('Innovate Co');
    expect(data.token).toBeDefined();

    // Verify session cookie was set
    const cookieHeader = res.headers.get('set-cookie');
    expect(cookieHeader).toContain('trypatchbay_session=');
  });

  test('rejects duplicate registration with 409 conflict', async () => {
    const req1 = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'register',
        email: 'duplicate@test.com',
        password: 'securePassword123!',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res1 = await POST(req1);
    expect(res1.status).toBe(200);

    const req2 = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'register',
        email: 'duplicate@test.com',
        password: 'anotherPassword456!',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(409);
    const data = await res2.json();
    expect(data.error).toContain('already exists');
  });

  test('rejects short passwords on registration', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'register',
        email: 'short@test.com',
        password: 'short',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('at least 8 characters');
  });

  test('authenticates registered user with valid password and rejects invalid password', async () => {
    // 1. Register user
    const regReq = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'register',
        email: 'david@security.org',
        password: 'superSecretPassword99!',
        tenantName: 'Security Org',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    await POST(regReq);

    // 2. Attempt login with wrong password
    const wrongReq = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'login',
        email: 'david@security.org',
        password: 'wrongPassword!',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const wrongRes = await POST(wrongReq);
    expect(wrongRes.status).toBe(401);

    // 3. Attempt login with correct password
    const correctReq = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'login',
        email: 'david@security.org',
        password: 'superSecretPassword99!',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const correctRes = await POST(correctReq);
    expect(correctRes.status).toBe(200);
    const data = await correctRes.json();
    expect(data.authenticated).toBe(true);
    expect(data.user.email).toBe('david@security.org');
    expect(data.user.passwordHash).toBeUndefined();
  });

  test('GET returns 401 without cookie and 200 with valid session cookie', async () => {
    // Unauthenticated GET
    const unauthReq = new NextRequest('http://localhost:3000/api/auth', { method: 'GET' });
    const unauthRes = await GET(unauthReq);
    expect(unauthRes.status).toBe(401);

    // Register to obtain session token
    const regReq = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'register',
        email: 'session-user@test.com',
        password: 'password12345',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const regRes = await POST(regReq);
    const regData = await regRes.json();
    const token = regData.token;

    // Authenticated GET with Cookie header
    const authReq = new NextRequest('http://localhost:3000/api/auth', {
      method: 'GET',
      headers: { Cookie: `trypatchbay_session=${token}` },
    });
    const authRes = await GET(authReq);
    expect(authRes.status).toBe(200);
    const authData = await authRes.json();
    expect(authData.authenticated).toBe(true);
    expect(authData.user.email).toBe('session-user@test.com');
  });

  test('DELETE revokes session and clears cookie', async () => {
    const regReq = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'register',
        email: 'revoke-user@test.com',
        password: 'password12345',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const regRes = await POST(regReq);
    const { token } = await regRes.json();

    const delReq = new NextRequest('http://localhost:3000/api/auth', {
      method: 'DELETE',
      headers: { Cookie: `trypatchbay_session=${token}` },
    });
    const delRes = await DELETE(delReq);
    expect(delRes.status).toBe(200);

    // Verify session is revoked
    const checkReq = new NextRequest('http://localhost:3000/api/auth', {
      method: 'GET',
      headers: { Cookie: `trypatchbay_session=${token}` },
    });
    const checkRes = await GET(checkReq);
    expect(checkRes.status).toBe(401);
  });

  test('demo sign-in cannot impersonate an existing password-protected account', async () => {
    // 1. Register legitimate customer account
    const regReq = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'register',
        email: 'customer@acmecorp.com',
        password: 'securePassword789!',
        tenantName: 'Acme Corp',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    await POST(regReq);

    // 2. Attempt to demo sign-in using that registered email
    const demoImpersonationReq = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'demo',
        email: 'customer@acmecorp.com',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(demoImpersonationReq);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Please sign in with your password');
  });
});
