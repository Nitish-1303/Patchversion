import path from 'path';
import fs from 'fs';
import os from 'os';
import { NextRequest } from 'next/server';
import {
  PatchversionDatabase,
  GitHubClient,
  WorkflowOrchestrator,
} from '@patchversion/engine';
import { User, Tenant, Session, ChangeRecord } from '@patchversion/shared';

// Global singleton instances across Next.js API route invocations
let dbInstance: PatchversionDatabase | null = null;
let githubInstance: GitHubClient | null = null;
let orchestratorInstance: WorkflowOrchestrator | null = null;

function resolveDataDir(): string {
  if (process.env.PATCHVERSION_STATE_DIR) {
    return process.env.PATCHVERSION_STATE_DIR;
  }
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), '.patchversion-state');
  }
  let root = process.cwd();
  if (root.endsWith('packages' + path.sep + 'site')) {
    root = path.resolve(root, '..', '..');
  }
  const candidate = path.join(root, '.patchversion-state');
  try {
    fs.mkdirSync(candidate, { recursive: true });
    return candidate;
  } catch {
    return path.join(os.tmpdir(), '.patchversion-state');
  }
}

export function getDatabase(): PatchversionDatabase {
  if (!dbInstance) {
    const dataDir = resolveDataDir();
    dbInstance = new PatchversionDatabase(dataDir);
  }
  return dbInstance;
}

export function getGitHubClient(): GitHubClient {
  if (!githubInstance) {
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET ?? 'trypatchbay_dev_webhook_secret';

    if (appId && privateKey) {
      githubInstance = new GitHubClient({
        appId,
        privateKey,
        webhookSecret,
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      });
    } else {
      // Mock / Offline provider when live GitHub credentials are not supplied
      githubInstance = new GitHubClient(null);
    }
  }
  return githubInstance;
}

export function getOrchestrator(): WorkflowOrchestrator {
  if (!orchestratorInstance) {
    const db = getDatabase();
    const github = getGitHubClient();
    orchestratorInstance = new WorkflowOrchestrator(db, github);
  }
  return orchestratorInstance;
}

export const DEMO_TENANT_ID = 'ten_demo_workspace';
export const DEMO_USER_ID = 'usr_demo_developer';
export const DEMO_REPO_ID = 'repo_demo_checkout_service';

export interface AuthContext {
  user: User;
  tenant: Tenant;
  session: Session;
}

/**
 * Extracts and verifies the session token from cookies or Authorization header.
 * Enforces server-side authorization. Returns null if unauthenticated.
 */
export function getAuthContext(request: NextRequest): AuthContext | null {
  const db = getDatabase();

  // Try cookie first
  let token = request.cookies.get('trypatchbay_session')?.value;

  // Fallback to Bearer token header
  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) return null;

  const session = db.getSession(token);
  if (!session) return null;

  let user = db.getUser(session.userId);
  let tenant = db.getTenant(session.tenantId);

  // If running in an ephemeral/fresh serverless instance, reconstitute deterministic demo data
  if ((!user || !tenant) && (session.userId === DEMO_USER_ID || session.tenantId === DEMO_TENANT_ID)) {
    const demo = ensureDemoTenantAndUser();
    user = demo.user;
    tenant = demo.tenant;
  }

  if (!user || user.tenantId !== session.tenantId) return null;
  if (!tenant) return null;

  return { user, tenant, session };
}

/**
 * Ensures a default demo/developer tenant and user exist for evaluation.
 */
export function ensureDemoTenantAndUser(): { tenant: Tenant; user: User } {
  const db = getDatabase();
  let tenant = db.getTenant(DEMO_TENANT_ID);
  if (!tenant) {
    tenant = db.createTenant('TryPatchBay Demo Workspace', DEMO_TENANT_ID);
  }

  let user = db.getUser(DEMO_USER_ID) ?? db.getUserByEmail('developer@trypatchbay.dev');
  if (!user) {
    user = db.createUser(tenant.id, 'developer@trypatchbay.dev', 'owner', 'patchbay-demo', undefined, DEMO_USER_ID);
  }

  // Pre-register demo installation and repository if not already present
  const installations = db.listInstallations(tenant.id);
  let inst = installations[0];
  if (!inst) {
    inst = db.saveInstallation(tenant.id, 10001, 'patchbay-demo');
  }

  let repo = db.getRepository(tenant.id, DEMO_REPO_ID);
  if (!repo) {
    let fixtureRepoPath = path.resolve(process.cwd(), 'fixtures/sample-repo');
    if (!fs.existsSync(fixtureRepoPath)) {
      fixtureRepoPath = path.resolve(process.cwd(), '../../fixtures/sample-repo');
    }

    repo = db.saveRepository(tenant.id, inst.id, {
      githubRepoId: 20001,
      fullName: 'patchbay-demo/checkout-service',
      owner: 'patchbay-demo',
      name: 'checkout-service',
      defaultBranch: 'main',
      isPrivate: false,
      localPath: fixtureRepoPath,
    });
  }

  // Seed package watch target for mockpay if none exist
  const watchTargets = db.listWatchTargets(tenant.id);
  if (watchTargets.length === 0) {
    db.saveWatchTarget(tenant.id, {
      packageName: 'mockpay',
      ecosystem: 'npm',
      currentVersion: '1.0.0',
      latestVersion: '2.0.0',
      lastCheckedAt: new Date().toISOString(),
      status: 'upgrade_available',
      isDemo: true,
      notes: 'Demo SDK fixture for Stripe breaking change scenario',
      source: 'fixture-demo',
    });
  }

  const existingFindings = db.listFindings(tenant.id, repo.id);
  if (existingFindings.length === 0) {
    // Seed verified fixture finding, patch, and proof for demo readiness
    const mockpayChange: ChangeRecord = {
      id: 'change_mockpay_1_0_0_to_2_0_0',
      packageName: 'mockpay',
      ecosystem: 'npm',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      detectedAt: new Date().toISOString(),
      source: 'registry',
      sourceUrl: 'https://www.npmjs.com/package/mockpay/v/2.0.0',
      rawNotes: "BREAKING CHANGE: The 'source' parameter in charges.create has been renamed to 'payment_method'.",
      classification: {
        isBreaking: true,
        confidence: 1.0,
        affectedExports: ['charges.create'],
        reason: "BREAKING CHANGE: The 'source' parameter in charges.create has been renamed to 'payment_method'.",
      },
      severity: 'breaking',
      offlineVersions: {
        '1.0.0': 'fixtures/mockpay-1.0.0',
        '2.0.0': 'fixtures/mockpay-2.0.0',
      },
    };

    const sampleDiff = '--- a/src/createCharge.js\n+++ b/src/createCharge.js\n@@ -4,1 +4,1 @@\n-  return mockpay.charges.create({ amount, currency, source: token });\n+  return mockpay.charges.create({ amount, currency, payment_method: token });\n';

    const finding = db.saveFinding(tenant.id, repo.id, {
      packageName: 'mockpay',
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      isBreaking: true,
      changeRecord: mockpayChange,
      impactAnalysis: {
        changeId: mockpayChange.id,
        repoId: repo.id,
        affectedCallSites: [
          {
            filePath: 'src/createCharge.js',
            line: 4,
            column: 18,
            importStatement: "const mockpay = require('mockpay');",
            callExpression: 'mockpay.charges.create({ amount, currency, source: token })',
            packageName: 'mockpay',
            exportedSymbol: 'charges.create',
          },
        ],
        unaffectedCallSites: [],
        potentialCallSites: [
          {
            filePath: 'src/createCharge.js',
            line: 14,
            column: 18,
            importStatement: "const mockpay = require('mockpay');",
            callExpression: 'mockpay.refunds.create({ chargeId })',
            packageName: 'mockpay',
            exportedSymbol: 'refunds.create',
          },
        ],
        coveragePercent: 100,
        analyzedAt: new Date().toISOString(),
      },
      status: 'validated',
    });

    const patch = db.savePatch(tenant.id, finding.id, sampleDiff);

    db.saveValidation(tenant.id, patch.id, {
      status: 'passed',
      proof: {
        id: 'proof_mockpay_2_0_0',
        changeId: mockpayChange.id,
        repoId: repo.id,
        baselineResult: {
          passed: 3,
          failed: 0,
          total: 3,
          output: 'PASS src/createCharge.test.js (3 passed, 0 failed, 3 total)',
          exitCode: 0,
        },
        redResult: {
          passed: 1,
          failed: 2,
          total: 3,
          output: "FAIL src/createCharge.test.js\n  ● createCharge › passes token as payment_method\n    TypeError: Parameter 'source' is no longer supported; use 'payment_method'",
          exitCode: 1,
        },
        greenResult: {
          passed: 3,
          failed: 0,
          total: 3,
          output: 'PASS src/createCharge.test.js (3 passed, 0 failed, 3 total)',
          exitCode: 0,
        },
        fixDiff: sampleDiff,
        fixedFiles: ['src/createCharge.js'],
        coverageVerified: 1,
        coverageTotal: 1,
        unverifiable: [],
        producedAt: new Date().toISOString(),
        sandboxType: 'local-process',
        durationMs: 55700,
      },
      executionLogs:
        'Baseline (1.0.0): Exit 0 - 3 passed, 0 failed, 3 total\n' +
        'Bumped (2.0.0):   Exit 1 - 1 passed, 2 failed, 3 total\n' +
        'After fix (2.0.0): Exit 0 - 3 passed, 0 failed, 3 total\n' +
        'Sandbox: isolated copy, secret-scrubbed, 100% call-site coverage verified.',
      durationMs: 55700,
    });
  }

  return { tenant, user };
}

