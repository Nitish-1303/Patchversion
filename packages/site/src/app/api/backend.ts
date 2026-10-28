import path from 'path';
import fs from 'fs';
import { NextRequest } from 'next/server';
import {
  PatchversionDatabase,
  GitHubClient,
  WorkflowOrchestrator,
} from '@patchversion/engine';
import { User, Tenant, Session } from '@patchversion/shared';

// Global singleton instances across Next.js API route invocations
let dbInstance: PatchversionDatabase | null = null;
let githubInstance: GitHubClient | null = null;
let orchestratorInstance: WorkflowOrchestrator | null = null;

function resolveDataDir(): string {
  // Use state directory inside workspace
  let root = process.cwd();
  if (root.endsWith('packages' + path.sep + 'site')) {
    root = path.resolve(root, '..', '..');
  }
  return path.join(root, '.patchversion-state');
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

  const user = db.getUser(session.userId);
  if (!user || user.tenantId !== session.tenantId) return null;

  const tenant = db.getTenant(session.tenantId);
  if (!tenant) return null;

  return { user, tenant, session };
}

/**
 * Ensures a default demo/developer tenant and user exist for evaluation.
 */
export function ensureDemoTenantAndUser(): { tenant: Tenant; user: User } {
  const db = getDatabase();
  let user = db.getUserByEmail('developer@trypatchbay.dev');

  if (!user) {
    const tenant = db.createTenant('TryPatchBay Demo Workspace');
    user = db.createUser(tenant.id, 'developer@trypatchbay.dev', 'owner', 'patchbay-demo');

    // Pre-register demo installation and repository
    const inst = db.saveInstallation(tenant.id, 10001, 'patchbay-demo');
    let fixtureRepoPath = path.resolve(process.cwd(), 'fixtures/sample-repo');
    if (!fs.existsSync(fixtureRepoPath)) {
      fixtureRepoPath = path.resolve(process.cwd(), '../../fixtures/sample-repo');
    }

    db.saveRepository(tenant.id, inst.id, {
      githubRepoId: 20001,
      fullName: 'patchbay-demo/checkout-service',
      owner: 'patchbay-demo',
      name: 'checkout-service',
      defaultBranch: 'main',
      isPrivate: false,
      localPath: fixtureRepoPath,
    });

    return { tenant, user };
  }

  const tenant = db.getTenant(user.tenantId)!;
  return { tenant, user };
}
