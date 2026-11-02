/**
 * @jest-environment node
 */
import path from 'path';
import fs from 'fs';
import os from 'os';
import { NextRequest } from 'next/server';
import { GET as loginGET } from '../src/app/api/auth/github/login/route';
import { GET as callbackGET } from '../src/app/api/auth/github/callback/route';
import { _resetInstancesForTest, ensureDemoTenantAndUser } from '../src/app/api/backend';

describe('GitHub OAuth 1-Click Login', () => {
  const originalEnv = process.env;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patchbay-oauth-test-'));
    process.env = {
      ...originalEnv,
      PATCHVERSION_STATE_DIR: tmpDir,
      GITHUB_CLIENT_ID: 'test-client-id-123',
      GITHUB_CLIENT_SECRET: 'test-client-secret-456',
    };
    _resetInstancesForTest();
    await ensureDemoTenantAndUser();
  });

  afterEach(() => {
    process.env = originalEnv;
    _resetInstancesForTest();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('GET /api/auth/github/login', () => {
    it('redirects to GitHub OAuth authorize with state and CSRF cookie', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/github/login');
      const res = await loginGET(req);

      expect(res.status).toBe(307); // NextResponse.redirect default
      const location = res.headers.get('location') || '';
      expect(location).toContain('https://github.com/login/oauth/authorize');
      expect(location).toContain('client_id=test-client-id-123');
      expect(location).toContain('scope=read%3Auser%2Cuser%3Aemail');

      // Check CSRF cookie was set
      const cookies = res.cookies.get('github_oauth_state');
      expect(cookies).toBeDefined();
      expect(cookies?.value).toBeTruthy();
    });

    it('returns 503 if GITHUB_CLIENT_ID is not configured', async () => {
      delete process.env.GITHUB_CLIENT_ID;
      const req = new NextRequest('http://localhost:3000/api/auth/github/login');
      const res = await loginGET(req);

      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.code).toBe('GITHUB_CLIENT_ID_MISSING');
    });
  });

  describe('GET /api/auth/github/callback', () => {
    it('rejects if CSRF state token does not match', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/github/callback?code=mock_code&state=bad_state', {
        headers: {
          cookie: 'github_oauth_state=expected_state',
        },
      });

      const res = await callbackGET(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe('CSRF_STATE_MISMATCH');
    });

    it('rejects if code or state parameter is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/github/callback');
      const res = await callbackGET(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe('INVALID_OAUTH_PARAMS');
    });
  });
});
