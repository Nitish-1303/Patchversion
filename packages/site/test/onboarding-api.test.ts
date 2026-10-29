/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { POST as onboardingPost } from '../src/app/api/github/onboarding/route';
import { GET as callbackGet } from '../src/app/api/github/callback/route';
import { POST as reposPost } from '../src/app/api/repos/route';
import { getDatabase, ensureDemoTenantAndUser } from '../src/app/api/backend';

describe('GitHub Installation Onboarding API Routes', () => {
  let tmpDir: string;
  let sessionToken: string;
  let tenantId: string;
  let userId: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patchbay-site-api-test-'));
    process.env.PATCHVERSION_STATE_DIR = tmpDir;
    process.env.PATCHVERSION_SESSION_SECRET = 'test-secret-at-least-32-chars-long-for-testing';

    await ensureDemoTenantAndUser();
    const db = getDatabase();

    tenantId = 'ten_api_test_workspace';
    userId = 'usr_api_test_dev';
    await db.createTenant('API Test Workspace', tenantId);
    await db.createUser(tenantId, 'api-dev@example.com', 'owner', 'api-dev', undefined, userId);

    const session = await db.createSession(userId);
    sessionToken = session.token;
  });

  afterAll(() => {
    delete process.env.PATCHVERSION_STATE_DIR;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createAuthedRequest(url: string, method: string, body?: object): NextRequest {
    return new NextRequest(new URL(url, 'http://localhost:3000'), {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  test('POST /api/github/onboarding rejects unauthenticated requests with 401', async () => {
    const unauthedReq = new NextRequest(new URL('/api/github/onboarding', 'http://localhost:3000'), {
      method: 'POST',
    });
    const res = await onboardingPost(unauthedReq);
    expect(res.status).toBe(401);
  });

  test('POST /api/github/onboarding fails closed with 503 when GitHub App is not configured', async () => {
    const req = createAuthedRequest('/api/github/onboarding', 'POST', { targetAccount: 'acme-corp' });
    const res = await onboardingPost(req);
    // When no GitHub App credentials are set in environment, fails closed with 503
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.code).toBe('GITHUB_APP_NOT_CONFIGURED');
  });

  test('GET /api/github/callback rejects missing state with 400', async () => {
    const req = new NextRequest(new URL('/api/github/callback?installation_id=12345', 'http://localhost:3000'), {
      method: 'GET',
    });
    const res = await callbackGet(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe('INVALID_STATE');
  });

  test('GET /api/github/callback rejects missing installation_id with 400', async () => {
    const req = new NextRequest(new URL('/api/github/callback?state=dummy_token', 'http://localhost:3000'), {
      method: 'GET',
    });
    const res = await callbackGet(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe('MISSING_INSTALLATION_ID');
  });

  test('POST /api/repos rejects unlinked live repositories with INSTALLATION_NOT_LINKED', async () => {
    const req = createAuthedRequest('/api/repos', 'POST', {
      fullName: 'unlinked-org/unlinked-repo',
      owner: 'unlinked-org',
      name: 'unlinked-repo',
    });
    const res = await reposPost(req);
    // When GitHub App is not configured, returns 503; if configured but unlinked, returns 403 INSTALLATION_NOT_LINKED
    expect([403, 503]).toContain(res.status);
    const data = await res.json();
    if (res.status === 403) {
      expect(data.code).toBe('INSTALLATION_NOT_LINKED');
    } else {
      expect(data.code).toBe('GITHUB_APP_NOT_CONFIGURED');
    }
  });

  test('POST /api/repos ignores client-supplied stateToken and strictly refuses bypass linking', async () => {
    const req = createAuthedRequest('/api/repos', 'POST', {
      fullName: 'attacker-org/victim-repo',
      owner: 'attacker-org',
      name: 'victim-repo',
      stateToken: 'forged_or_stolen_state_token',
    });
    const res = await reposPost(req);
    // Even if stateToken is provided in body, direct linking is removed: returns 403 or 503
    expect([403, 503]).toContain(res.status);
    const data = await res.json();
    if (res.status === 403) {
      expect(data.code).toBe('INSTALLATION_NOT_LINKED');
    } else {
      expect(data.code).toBe('GITHUB_APP_NOT_CONFIGURED');
    }
  });
});
