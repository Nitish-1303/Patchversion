import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Pool, PoolConfig } from 'pg';
import {
  Tenant,
  User,
  Session,
  InstallationRecord,
  RepositoryRecord,
  JobRecord,
  FindingRecord,
  PatchRecord,
  ValidationRecord,
  ApprovalRecord,
  PullRequestRecord,
  WatchTargetRecord,
  InstallationOnboardingState,
  DeliveryClaimRecord,
} from '@patchversion/shared';
import { IPersistenceStore } from './store-interface';

export interface PostgresStoreConfig {
  connectionString?: string;
  pool?: Pool;
  poolConfig?: PoolConfig;
}

/**
 * Production-ready PostgreSQL persistent store for TryPatchBay.
 * Provides distributed multi-tenant isolation, ACID transaction boundaries,
 * foreign key integrity, and row-level concurrency protection.
 */
export class PostgresStore implements IPersistenceStore {
  private pool: Pool;

  constructor(config?: PostgresStoreConfig) {
    if (config?.pool) {
      this.pool = config.pool;
      return;
    }
    const connectionString =
      config?.connectionString ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      'postgres://postgres:postgres@localhost:5432/patchversion';

    this.pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ...config?.poolConfig,
    });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async query<T = unknown>(text: string, params: unknown[] = []): Promise<T[]> {
    const res = await this.pool.query(text, params);
    return res.rows as T[];
  }

  /**
   * Initializes database tables and indexes from schema.sql.
   */
  async initSchema(schemaPath?: string): Promise<void> {
    const defaultPath = path.resolve(__dirname, 'schema.sql');
    const resolvedPath = schemaPath || defaultPath;
    const ddl = fs.readFileSync(/*turbopackIgnore: true*/ resolvedPath, 'utf8');
    await this.pool.query(ddl);
  }

  private getSessionSigningSecret(): string {
    const secret = process.env.PATCHVERSION_SESSION_SECRET;
    if (secret && secret.trim().length >= 32) {
      return secret.trim();
    }
    if (secret && secret.trim().length > 0) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'SECURITY VIOLATION: PATCHVERSION_SESSION_SECRET must be at least 32 characters long in production environments.'
        );
      }
      return secret.trim();
    }
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SECURITY VIOLATION: PATCHVERSION_SESSION_SECRET is required in production environments. Refusing to use fallback secret.'
      );
    }
    return 'patchversion-serverless-dev-secret-v1';
  }

  // --- Tenants & Users ---

  async createTenant(name: string, id?: string): Promise<Tenant> {
    const tenantId = id || `tenant_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    await this.pool.query(
      'INSERT INTO tenants (id, name, created_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
      [tenantId, name, now],
    );
    return { id: tenantId, name, createdAt: now };
  }

  async getTenant(id: string): Promise<Tenant | null> {
    const rows = await this.query<{ id: string; name: string; created_at: string }>(
      'SELECT id, name, created_at FROM tenants WHERE id = $1',
      [id],
    );
    if (!rows[0]) return null;
    return {
      id: rows[0].id,
      name: rows[0].name,
      createdAt: rows[0].created_at,
    };
  }

  async createUser(
    tenantId: string,
    email: string,
    role: 'owner' | 'admin' | 'member' = 'member',
    githubLogin?: string,
    githubUserId?: string,
    id?: string,
  ): Promise<User> {
    const userId = id || `user_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO users (id, tenant_id, email, role, github_user_id, github_login, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET email = $3, role = $4, github_login = $6`,
      [userId, tenantId, email, role, githubUserId || null, githubLogin || null, now],
    );
    return {
      id: userId,
      tenantId,
      email,
      role,
      githubUserId,
      githubLogin,
      createdAt: now,
    };
  }

  async getUser(id: string): Promise<User | null> {
    const rows = await this.query<{
      id: string;
      tenant_id: string;
      email: string;
      role: 'owner' | 'admin' | 'member';
      github_user_id?: string;
      github_login?: string;
      created_at: string;
    }>('SELECT id, tenant_id, email, role, github_user_id, github_login, created_at FROM users WHERE id = $1', [id]);
    if (!rows[0]) return null;
    return {
      id: rows[0].id,
      tenantId: rows[0].tenant_id,
      email: rows[0].email,
      role: rows[0].role,
      githubUserId: rows[0].github_user_id,
      githubLogin: rows[0].github_login,
      createdAt: rows[0].created_at,
    };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const rows = await this.query<{
      id: string;
      tenant_id: string;
      email: string;
      role: 'owner' | 'admin' | 'member';
      github_user_id?: string;
      github_login?: string;
      created_at: string;
    }>('SELECT id, tenant_id, email, role, github_user_id, github_login, created_at FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (!rows[0]) return null;
    return {
      id: rows[0].id,
      tenantId: rows[0].tenant_id,
      email: rows[0].email,
      role: rows[0].role,
      githubUserId: rows[0].github_user_id,
      githubLogin: rows[0].github_login,
      createdAt: rows[0].created_at,
    };
  }

  // --- Sessions & Auth ---

  async createSession(userId: string, expiresInHours = 24): Promise<Session> {
    const user = await this.getUser(userId);
    if (!user) throw new Error(`User ${userId} does not exist`);

    const id = `sess_${crypto.randomUUID()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInHours * 3600 * 1000).toISOString();
    const secret = this.getSessionSigningSecret();
    const body = Buffer.from(
      JSON.stringify({
        id,
        userId: user.id,
        tenantId: user.tenantId,
        expiresAt,
        createdAt: now.toISOString(),
      }),
    ).toString('base64url');

    const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
    const token = `v1.${body}.${sig}`;

    const session: Session = {
      id,
      userId: user.id,
      tenantId: user.tenantId,
      token,
      expiresAt,
      createdAt: now.toISOString(),
    };

    await this.pool.query(
      `INSERT INTO sessions (id, user_id, tenant_id, token, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET token = $4, expires_at = $5`,
      [session.id, session.userId, session.tenantId, session.token, session.expiresAt, session.createdAt],
    );

    return session;
  }

  async getSession(token: string): Promise<Session | null> {
    if (token.startsWith('v1.')) {
      const parts = token.split('.');
      if (parts.length === 3) {
        const [, body, sig] = parts;
        try {
          const secret = this.getSessionSigningSecret();
          const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
          const sigBuf = Buffer.from(sig);
          const expectedBuf = Buffer.from(expectedSig);
          if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
            const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
            if (new Date(payload.expiresAt).getTime() < Date.now()) {
              return null;
            }
            if (await this.isSessionRevoked(payload.id)) {
              return null;
            }
            return {
              id: payload.id,
              userId: payload.userId,
              tenantId: payload.tenantId,
              token,
              expiresAt: payload.expiresAt,
              createdAt: payload.createdAt,
            };
          }
          return null;
        } catch {
          return null;
        }
      }
    }

    const rows = await this.query<{
      id: string;
      user_id: string;
      tenant_id: string;
      token: string;
      expires_at: string;
      created_at: string;
    }>('SELECT * FROM sessions WHERE token = $1', [token]);

    if (!rows[0]) return null;
    const s = rows[0];
    if (new Date(s.expires_at).getTime() < Date.now()) {
      await this.pool.query('DELETE FROM sessions WHERE id = $1', [s.id]);
      return null;
    }
    if (await this.isSessionRevoked(s.id)) {
      return null;
    }
    return {
      id: s.id,
      userId: s.user_id,
      tenantId: s.tenant_id,
      token: s.token,
      expiresAt: s.expires_at,
      createdAt: s.created_at,
    };
  }

  async revokeSession(tokenOrSessionId: string): Promise<boolean> {
    let sessionId: string | null = null;
    if (tokenOrSessionId.startsWith('v1.')) {
      const parts = tokenOrSessionId.split('.');
      if (parts.length === 3) {
        try {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
          sessionId = payload.id;
        } catch {
          // ignore
        }
      }
    } else if (tokenOrSessionId.startsWith('sess_')) {
      sessionId = tokenOrSessionId;
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      if (sessionId) {
        await client.query(
          'INSERT INTO revoked_sessions (session_id, revoked_at) VALUES ($1, NOW()) ON CONFLICT (session_id) DO NOTHING',
          [sessionId],
        );
      }
      await client.query('DELETE FROM sessions WHERE token = $1 OR id = $2', [tokenOrSessionId, sessionId || tokenOrSessionId]);
      await client.query('COMMIT');
      return true;
    } catch {
      await client.query('ROLLBACK');
      return false;
    } finally {
      client.release();
    }
  }

  async isSessionRevoked(sessionId: string): Promise<boolean> {
    const rows = await this.query('SELECT 1 FROM revoked_sessions WHERE session_id = $1', [sessionId]);
    return rows.length > 0;
  }

  // --- Installations & Repositories ---

  async saveInstallation(
    tenantId: string,
    githubInstallationId: number,
    accountLogin: string,
    accountType: 'User' | 'Organization' = 'User',
  ): Promise<InstallationRecord> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const existing = await client.query(
        'SELECT id, tenant_id FROM installations WHERE github_installation_id = $1',
        [githubInstallationId],
      );
      if (existing.rows.length > 0 && existing.rows[0].tenant_id !== tenantId) {
        throw new Error(
          `Cross-tenant collision: GitHub installation ${githubInstallationId} is already owned by tenant ${existing.rows[0].tenant_id}`,
        );
      }

      const id = existing.rows.length > 0 ? existing.rows[0].id : `inst_${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      await client.query(
        `INSERT INTO installations (id, tenant_id, github_installation_id, account_login, account_type, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'active', $6, $6)
         ON CONFLICT (github_installation_id) DO UPDATE SET
           account_login = EXCLUDED.account_login,
           status = 'active',
           updated_at = EXCLUDED.updated_at`,
        [id, tenantId, githubInstallationId, accountLogin, accountType, now],
      );
      await client.query('COMMIT');
      return {
        id,
        tenantId,
        githubInstallationId,
        accountLogin,
        accountType,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getInstallation(tenantId: string, id: string): Promise<InstallationRecord | null> {
    const rows = await this.query<{
      id: string;
      tenant_id: string;
      github_installation_id: number;
      account_login: string;
      account_type: 'User' | 'Organization';
      status: 'active' | 'suspended' | 'deleted';
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM installations WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    if (!rows[0]) return null;
    return {
      id: rows[0].id,
      tenantId: rows[0].tenant_id,
      githubInstallationId: Number(rows[0].github_installation_id),
      accountLogin: rows[0].account_login,
      accountType: rows[0].account_type,
      status: rows[0].status,
      createdAt: rows[0].created_at,
      updatedAt: rows[0].updated_at,
    };
  }

  async getInstallationByGithubId(githubInstallationId: number): Promise<InstallationRecord | null> {
    const rows = await this.query<{
      id: string;
      tenant_id: string;
      github_installation_id: number;
      account_login: string;
      account_type: 'User' | 'Organization';
      status: 'active' | 'suspended' | 'deleted';
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM installations WHERE github_installation_id = $1', [githubInstallationId]);
    if (!rows[0]) return null;
    return {
      id: rows[0].id,
      tenantId: rows[0].tenant_id,
      githubInstallationId: Number(rows[0].github_installation_id),
      accountLogin: rows[0].account_login,
      accountType: rows[0].account_type,
      status: rows[0].status,
      createdAt: rows[0].created_at,
      updatedAt: rows[0].updated_at,
    };
  }

  async listInstallations(tenantId: string): Promise<InstallationRecord[]> {
    const rows = await this.query<{
      id: string;
      tenant_id: string;
      github_installation_id: number;
      account_login: string;
      account_type: 'User' | 'Organization';
      status: 'active' | 'suspended' | 'deleted';
      created_at: string;
      updated_at: string;
    }>("SELECT * FROM installations WHERE tenant_id = $1 AND status = 'active' ORDER BY created_at DESC", [tenantId]);
    return rows.map(r => ({
      id: r.id,
      tenantId: r.tenant_id,
      githubInstallationId: Number(r.github_installation_id),
      accountLogin: r.account_login,
      accountType: r.account_type,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async updateInstallationStatus(
    tenantId: string,
    githubInstallationId: number,
    status: 'active' | 'suspended' | 'deleted',
  ): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const now = new Date().toISOString();
      const res = await client.query(
        `UPDATE installations
         SET status = $3, updated_at = $4
         WHERE tenant_id = $1 AND github_installation_id = $2
           AND (status != 'deleted' OR $3 = 'deleted')
         RETURNING id`,
        [tenantId, githubInstallationId, status, now],
      );
      if (res.rows.length === 0) {
        await client.query('COMMIT');
        return false;
      }
      const installationId = res.rows[0].id;
      if (status === 'deleted') {
        await client.query(
          `UPDATE repositories
           SET status = 'revoked', updated_at = $2
           WHERE tenant_id = $1 AND installation_id = $3`,
          [tenantId, now, installationId],
        );
      }
      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async saveRepository(
    tenantId: string,
    installationId: string,
    data: Omit<RepositoryRecord, 'id' | 'tenantId' | 'installationId' | 'status' | 'createdAt' | 'updatedAt'> & {
      id?: string;
      status?: 'connected' | 'disconnected' | 'revoked';
    },
  ): Promise<RepositoryRecord> {
    const inst = await this.getInstallation(tenantId, installationId);
    if (!inst) {
      throw new Error(`Installation ${installationId} not found for tenant ${tenantId}`);
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const existing = await client.query(
        'SELECT id, tenant_id FROM repositories WHERE github_repo_id = $1',
        [data.githubRepoId],
      );
      if (existing.rows.length > 0 && existing.rows[0].tenant_id !== tenantId) {
        throw new Error(
          `Cross-tenant collision: GitHub repository ID ${data.githubRepoId} is already owned by tenant ${existing.rows[0].tenant_id}`,
        );
      }

      const id = data.id || (existing.rows.length > 0 ? existing.rows[0].id : `repo_${crypto.randomUUID()}`);
      const now = new Date().toISOString();
      const status = data.status || 'connected';
      const isDemo = Boolean(data.isDemo);

      await client.query(
        `INSERT INTO repositories (id, tenant_id, installation_id, github_repo_id, full_name, owner, name, default_branch, is_private, status, local_path, is_demo, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
         ON CONFLICT (github_repo_id) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           owner = EXCLUDED.owner,
           name = EXCLUDED.name,
           default_branch = EXCLUDED.default_branch,
           is_private = EXCLUDED.is_private,
           status = EXCLUDED.status,
           local_path = EXCLUDED.local_path,
           is_demo = EXCLUDED.is_demo,
           updated_at = EXCLUDED.updated_at`,
        [
          id,
          tenantId,
          installationId,
          data.githubRepoId,
          data.fullName,
          data.owner,
          data.name,
          data.defaultBranch || 'main',
          data.isPrivate,
          status,
          data.localPath || null,
          isDemo,
          now,
        ],
      );
      await client.query('COMMIT');
      return {
        id,
        tenantId,
        installationId,
        githubRepoId: data.githubRepoId,
        fullName: data.fullName,
        owner: data.owner,
        name: data.name,
        defaultBranch: data.defaultBranch || 'main',
        isPrivate: data.isPrivate,
        status,
        localPath: data.localPath,
        isDemo,
        createdAt: now,
        updatedAt: now,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getRepository(tenantId: string, idOrFullName: string): Promise<RepositoryRecord | null> {
    const rows = await this.query<{
      id: string;
      tenant_id: string;
      installation_id: string;
      github_repo_id: number;
      full_name: string;
      owner: string;
      name: string;
      default_branch: string;
      is_private: boolean;
      status: 'connected' | 'disconnected' | 'revoked';
      local_path?: string;
      is_demo: boolean;
      created_at: string;
      updated_at: string;
    }>(
      'SELECT * FROM repositories WHERE tenant_id = $1 AND (id = $2 OR LOWER(full_name) = LOWER($2))',
      [tenantId, idOrFullName],
    );
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      id: r.id,
      tenantId: r.tenant_id,
      installationId: r.installation_id,
      githubRepoId: Number(r.github_repo_id),
      fullName: r.full_name,
      owner: r.owner,
      name: r.name,
      defaultBranch: r.default_branch,
      isPrivate: r.is_private,
      status: r.status,
      localPath: r.local_path,
      isDemo: r.is_demo,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async listRepositories(tenantId: string): Promise<RepositoryRecord[]> {
    const rows = await this.query<{
      id: string;
      tenant_id: string;
      installation_id: string;
      github_repo_id: number;
      full_name: string;
      owner: string;
      name: string;
      default_branch: string;
      is_private: boolean;
      status: 'connected' | 'disconnected' | 'revoked';
      local_path?: string;
      is_demo: boolean;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM repositories WHERE tenant_id = $1 ORDER BY created_at DESC', [tenantId]);
    return rows.map(r => ({
      id: r.id,
      tenantId: r.tenant_id,
      installationId: r.installation_id,
      githubRepoId: Number(r.github_repo_id),
      fullName: r.full_name,
      owner: r.owner,
      name: r.name,
      defaultBranch: r.default_branch,
      isPrivate: r.is_private,
      status: r.status,
      localPath: r.local_path,
      isDemo: r.is_demo,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  // --- Onboarding Flow ---

  async createOnboardingState(
    tenantId: string,
    userId: string,
    targetAccount?: string,
    ttlMinutes = 15,
  ): Promise<InstallationOnboardingState> {
    const user = await this.getUser(userId);
    if (!user || user.tenantId !== tenantId) {
      throw new Error(`Unauthorized: user ${userId} does not belong to tenant ${tenantId}`);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const id = `onb_${crypto.randomUUID()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString();

    await this.pool.query(
      `INSERT INTO onboarding_states (id, token, tenant_id, user_id, target_account, status, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)`,
      [id, token, tenantId, userId, targetAccount || null, now.toISOString(), expiresAt],
    );

    return {
      id,
      token,
      tenantId,
      userId,
      targetAccount,
      status: 'pending',
      createdAt: now.toISOString(),
      expiresAt,
    };
  }

  async getOnboardingState(token: string): Promise<InstallationOnboardingState | null> {
    const rows = await this.query<{
      id: string;
      token: string;
      tenant_id: string;
      user_id: string;
      target_account?: string;
      status: 'pending' | 'completed' | 'expired';
      created_at: string;
      expires_at: string;
      completed_at?: string;
      installation_id?: number;
    }>('SELECT * FROM onboarding_states WHERE token = $1', [token]);
    if (!rows[0]) return null;
    const s = rows[0];
    if (new Date(s.expires_at).getTime() < Date.now() && s.status === 'pending') {
      await this.pool.query("UPDATE onboarding_states SET status = 'expired' WHERE id = $1", [s.id]);
      s.status = 'expired';
    }
    return {
      id: s.id,
      token: s.token,
      tenantId: s.tenant_id,
      userId: s.user_id,
      targetAccount: s.target_account,
      status: s.status,
      createdAt: s.created_at,
      expiresAt: s.expires_at,
      completedAt: s.completed_at,
      installationId: s.installation_id ? Number(s.installation_id) : undefined,
    };
  }

  async verifyAndLinkInstallation(
    stateToken: string,
    githubInstallationId: number,
    accountLogin: string,
    accountType: 'User' | 'Organization' = 'User',
  ): Promise<InstallationRecord> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const stateRes = await client.query(
        'SELECT * FROM onboarding_states WHERE token = $1 FOR UPDATE',
        [stateToken],
      );
      const state = stateRes.rows[0];
      if (!state) {
        throw new Error('Invalid or unknown onboarding state token');
      }
      if (new Date(state.expires_at).getTime() < Date.now()) {
        await client.query("UPDATE onboarding_states SET status = 'expired' WHERE id = $1", [state.id]);
        throw new Error('Onboarding state token has expired');
      }
      if (state.status !== 'pending') {
        throw new Error(`Onboarding state token has already been consumed (status: ${state.status})`);
      }
      if (state.target_account && state.target_account.toLowerCase() !== accountLogin.toLowerCase()) {
        throw new Error(`GitHub account mismatch: expected "${state.target_account}", got "${accountLogin}"`);
      }

      // Check existing installation
      const instRes = await client.query(
        'SELECT id, tenant_id FROM installations WHERE github_installation_id = $1',
        [githubInstallationId],
      );
      if (instRes.rows.length > 0 && instRes.rows[0].tenant_id !== state.tenant_id) {
        throw new Error(`GitHub installation ${githubInstallationId} is already linked to another workspace`);
      }

      const instId = instRes.rows.length > 0 ? instRes.rows[0].id : `inst_${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      await client.query(
        `INSERT INTO installations (id, tenant_id, github_installation_id, account_login, account_type, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'active', $6, $6)
         ON CONFLICT (github_installation_id) DO UPDATE SET
           account_login = EXCLUDED.account_login,
           status = 'active',
           updated_at = EXCLUDED.updated_at`,
        [instId, state.tenant_id, githubInstallationId, accountLogin, accountType, now],
      );

      await client.query(
        "UPDATE onboarding_states SET status = 'completed', completed_at = $1, installation_id = $2 WHERE id = $3",
        [now, githubInstallationId, state.id],
      );

      await client.query('COMMIT');
      return {
        id: instId,
        tenantId: state.tenant_id,
        githubInstallationId,
        accountLogin,
        accountType,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // --- Findings ---

  async saveFinding(
    tenantId: string,
    repositoryId: string,
    data: Omit<FindingRecord, 'id' | 'tenantId' | 'repositoryId' | 'createdAt'> & { id?: string; status?: 'open' | 'fixing' | 'validated' | 'approved' | 'pr_created' | 'dismissed' },
  ): Promise<FindingRecord> {
    const id = data.id || `finding_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const status = data.status || 'open';

    await this.pool.query(
      `INSERT INTO findings (id, tenant_id, repository_id, package_name, from_version, to_version, is_breaking, change_record, impact_analysis, status, source_analysis_performed, analysis_mode, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (tenant_id, repository_id, package_name, from_version, to_version) DO UPDATE SET
         is_breaking = EXCLUDED.is_breaking,
         change_record = EXCLUDED.change_record,
         impact_analysis = EXCLUDED.impact_analysis,
         status = EXCLUDED.status,
         source_analysis_performed = EXCLUDED.source_analysis_performed,
         analysis_mode = EXCLUDED.analysis_mode`,
      [
        id,
        tenantId,
        repositoryId,
        data.packageName,
        data.fromVersion,
        data.toVersion,
        data.isBreaking,
        JSON.stringify(data.changeRecord),
        JSON.stringify(data.impactAnalysis),
        status,
        Boolean(data.sourceAnalysisPerformed),
        data.analysisMode || null,
        now,
      ],
    );

    return {
      id,
      tenantId,
      repositoryId,
      packageName: data.packageName,
      fromVersion: data.fromVersion,
      toVersion: data.toVersion,
      isBreaking: data.isBreaking,
      changeRecord: data.changeRecord,
      impactAnalysis: data.impactAnalysis,
      status,
      sourceAnalysisPerformed: data.sourceAnalysisPerformed,
      analysisMode: data.analysisMode,
      createdAt: now,
    };
  }

  async getFinding(tenantId: string, id: string): Promise<FindingRecord | null> {
    const rows = await this.query<{
      id: string;
      tenant_id: string;
      repository_id: string;
      package_name: string;
      from_version: string;
      to_version: string;
      is_breaking: boolean;
      change_record: unknown;
      impact_analysis: unknown;
      status: 'open' | 'fixing' | 'validated' | 'approved' | 'pr_created' | 'dismissed';
      source_analysis_performed?: boolean;
      analysis_mode?: 'local-ast' | 'remote-manifest-only';
      created_at: string;
    }>('SELECT * FROM findings WHERE tenant_id = $1 AND id = $2', [tenantId, id]);
    if (!rows[0]) return null;
    const f = rows[0];
    return {
      id: f.id,
      tenantId: f.tenant_id,
      repositoryId: f.repository_id,
      packageName: f.package_name,
      fromVersion: f.from_version,
      toVersion: f.to_version,
      isBreaking: f.is_breaking,
      changeRecord: typeof f.change_record === 'string' ? JSON.parse(f.change_record) : f.change_record as FindingRecord['changeRecord'],
      impactAnalysis: typeof f.impact_analysis === 'string' ? JSON.parse(f.impact_analysis) : f.impact_analysis as FindingRecord['impactAnalysis'],
      status: f.status,
      sourceAnalysisPerformed: f.source_analysis_performed,
      analysisMode: f.analysis_mode,
      createdAt: f.created_at,
    };
  }

  async listFindings(tenantId: string, repositoryId?: string): Promise<FindingRecord[]> {
    const query = repositoryId
      ? 'SELECT * FROM findings WHERE tenant_id = $1 AND repository_id = $2 ORDER BY created_at DESC'
      : 'SELECT * FROM findings WHERE tenant_id = $1 ORDER BY created_at DESC';
    const params = repositoryId ? [tenantId, repositoryId] : [tenantId];
    const rows = await this.query<{
      id: string;
      tenant_id: string;
      repository_id: string;
      package_name: string;
      from_version: string;
      to_version: string;
      is_breaking: boolean;
      change_record: unknown;
      impact_analysis: unknown;
      status: 'open' | 'fixing' | 'validated' | 'approved' | 'pr_created' | 'dismissed';
      source_analysis_performed?: boolean;
      analysis_mode?: 'local-ast' | 'remote-manifest-only';
      created_at: string;
    }>(query, params);

    return rows.map(f => ({
      id: f.id,
      tenantId: f.tenant_id,
      repositoryId: f.repository_id,
      packageName: f.package_name,
      fromVersion: f.from_version,
      toVersion: f.to_version,
      isBreaking: f.is_breaking,
      changeRecord: typeof f.change_record === 'string' ? JSON.parse(f.change_record) : f.change_record as FindingRecord['changeRecord'],
      impactAnalysis: typeof f.impact_analysis === 'string' ? JSON.parse(f.impact_analysis) : f.impact_analysis as FindingRecord['impactAnalysis'],
      status: f.status,
      sourceAnalysisPerformed: f.source_analysis_performed,
      analysisMode: f.analysis_mode,
      createdAt: f.created_at,
    }));
  }

  // --- Patches & Validations ---

  async savePatch(
    tenantId: string,
    findingId: string,
    diffContent: string,
    lockfileUpdates?: string,
  ): Promise<PatchRecord> {
    const finding = await this.getFinding(tenantId, findingId);
    if (!finding) throw new Error(`Finding ${findingId} not found for tenant ${tenantId}`);

    const id = `patch_${crypto.randomUUID()}`;
    const diffHash = crypto.createHash('sha256').update(diffContent).digest('hex');
    const now = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO patches (id, tenant_id, finding_id, diff_content, diff_hash, lockfile_updates, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'generated', $7)`,
      [id, tenantId, findingId, diffContent, diffHash, lockfileUpdates || null, now],
    );

    return {
      id,
      tenantId,
      findingId,
      diffContent,
      diffHash,
      lockfileUpdates,
      status: 'generated',
      createdAt: now,
    };
  }

  async getPatch(tenantId: string, id: string): Promise<PatchRecord | null> {
    const rows = await this.query<{
      id: string;
      tenant_id: string;
      finding_id: string;
      diff_content: string;
      diff_hash: string;
      lockfile_updates?: string;
      status: 'generated' | 'validated' | 'rejected';
      created_at: string;
    }>('SELECT * FROM patches WHERE tenant_id = $1 AND id = $2', [tenantId, id]);
    if (!rows[0]) return null;
    const p = rows[0];
    return {
      id: p.id,
      tenantId: p.tenant_id,
      findingId: p.finding_id,
      diffContent: p.diff_content,
      diffHash: p.diff_hash,
      lockfileUpdates: p.lockfile_updates,
      status: p.status,
      createdAt: p.created_at,
    };
  }

  async getPatchByFinding(tenantId: string, findingId: string): Promise<PatchRecord | null> {
    const rows = await this.query<{
      id: string;
      tenant_id: string;
      finding_id: string;
      diff_content: string;
      diff_hash: string;
      lockfile_updates?: string;
      status: 'generated' | 'validated' | 'rejected';
      created_at: string;
    }>('SELECT * FROM patches WHERE tenant_id = $1 AND finding_id = $2 ORDER BY created_at DESC LIMIT 1', [tenantId, findingId]);
    if (!rows[0]) return null;
    const p = rows[0];
    return {
      id: p.id,
      tenantId: p.tenant_id,
      findingId: p.finding_id,
      diffContent: p.diff_content,
      diffHash: p.diff_hash,
      lockfileUpdates: p.lockfile_updates,
      status: p.status,
      createdAt: p.created_at,
    };
  }

  async saveValidation(
    tenantId: string,
    patchId: string,
    data: Omit<ValidationRecord, 'id' | 'tenantId' | 'patchId' | 'createdAt'> & { id?: string },
  ): Promise<ValidationRecord> {
    const patch = await this.getPatch(tenantId, patchId);
    if (!patch) throw new Error(`Patch ${patchId} not found for tenant ${tenantId}`);

    const id = data.id || `val_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO validations (id, tenant_id, patch_id, status, proof, execution_logs, duration_ms, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          tenantId,
          patchId,
          data.status,
          data.proof ? JSON.stringify(data.proof) : null,
          data.executionLogs,
          data.durationMs,
          now,
        ],
      );

      const patchStatus = data.status === 'passed' ? 'validated' : 'rejected';
      await client.query('UPDATE patches SET status = $1 WHERE id = $2', [patchStatus, patchId]);

      if (data.status !== 'passed') {
        await client.query(
          "UPDATE approvals SET status = 'invalidated', invalidated_at = NOW(), invalidation_reason = 'Validation rerun failed or inconclusive' WHERE tenant_id = $1 AND patch_id = $2 AND status = 'active'",
          [tenantId, patchId],
        );
      }
      await client.query('COMMIT');

      return {
        id,
        tenantId,
        patchId,
        status: data.status,
        proof: data.proof,
        executionLogs: data.executionLogs,
        durationMs: data.durationMs,
        createdAt: now,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getValidation(tenantId: string, id: string): Promise<ValidationRecord | null> {
    const rows = await this.query<{
      id: string;
      tenant_id: string;
      patch_id: string;
      status: 'passed' | 'failed' | 'inconclusive';
      proof: unknown;
      execution_logs: string;
      duration_ms: number;
      created_at: string;
    }>('SELECT * FROM validations WHERE tenant_id = $1 AND id = $2', [tenantId, id]);
    if (!rows[0]) return null;
    const v = rows[0];
    return {
      id: v.id,
      tenantId: v.tenant_id,
      patchId: v.patch_id,
      status: v.status,
      proof: typeof v.proof === 'string' ? JSON.parse(v.proof) : v.proof as ValidationRecord['proof'],
      executionLogs: v.execution_logs,
      durationMs: Number(v.duration_ms),
      createdAt: v.created_at,
    };
  }

  async getValidationByPatch(tenantId: string, patchId: string): Promise<ValidationRecord | null> {
    const rows = await this.query<{
      id: string;
      tenant_id: string;
      patch_id: string;
      status: 'passed' | 'failed' | 'inconclusive';
      proof: unknown;
      execution_logs: string;
      duration_ms: number;
      created_at: string;
    }>('SELECT * FROM validations WHERE tenant_id = $1 AND patch_id = $2 ORDER BY created_at DESC LIMIT 1', [tenantId, patchId]);
    if (!rows[0]) return null;
    const v = rows[0];
    return {
      id: v.id,
      tenantId: v.tenant_id,
      patchId: v.patch_id,
      status: v.status,
      proof: typeof v.proof === 'string' ? JSON.parse(v.proof) : v.proof as ValidationRecord['proof'],
      executionLogs: v.execution_logs,
      durationMs: Number(v.duration_ms),
      createdAt: v.created_at,
    };
  }

  // --- Approvals ---

  async approvePatch(
    tenantId: string,
    patchId: string,
    userId: string,
    expectedDiffHash: string,
  ): Promise<ApprovalRecord> {
    const user = await this.getUser(userId);
    if (!user || user.tenantId !== tenantId) {
      throw new Error(`Unauthorized: user ${userId} does not belong to tenant ${tenantId}`);
    }

    const patch = await this.getPatch(tenantId, patchId);
    if (!patch) throw new Error(`Patch ${patchId} not found`);

    if (patch.diffHash !== expectedDiffHash) {
      throw new Error(`Diff hash mismatch: cannot approve modified patch. Expected ${patch.diffHash}, got ${expectedDiffHash}`);
    }

    const validation = await this.getValidationByPatch(tenantId, patchId);
    if (!validation || validation.status !== 'passed') {
      throw new Error('Cannot approve patch without a verified passing validation');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        "UPDATE approvals SET status = 'invalidated', invalidated_at = NOW(), invalidation_reason = 'Superseded by new approval' WHERE tenant_id = $1 AND patch_id = $2 AND status = 'active'",
        [tenantId, patchId],
      );

      const id = `appr_${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      await client.query(
        `INSERT INTO approvals (id, tenant_id, patch_id, approved_by_user_id, diff_hash_at_approval, status, approved_at)
         VALUES ($1, $2, $3, $4, $5, 'active', $6)`,
        [id, tenantId, patchId, userId, expectedDiffHash, now],
      );
      await client.query('COMMIT');

      return {
        id,
        tenantId,
        patchId,
        approvedByUserId: userId,
        diffHashAtApproval: expectedDiffHash,
        status: 'active',
        approvedAt: now,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getActiveApproval(tenantId: string, patchId: string): Promise<ApprovalRecord | null> {
    const patch = await this.getPatch(tenantId, patchId);
    if (!patch) return null;

    const rows = await this.query<{
      id: string;
      tenant_id: string;
      patch_id: string;
      approved_by_user_id: string;
      diff_hash_at_approval: string;
      status: 'active' | 'invalidated' | 'used';
      approved_at: string;
      invalidated_at?: string;
      invalidation_reason?: string;
    }>("SELECT * FROM approvals WHERE tenant_id = $1 AND patch_id = $2 AND status = 'active' ORDER BY approved_at DESC LIMIT 1", [tenantId, patchId]);

    if (!rows[0]) return null;
    const a = rows[0];
    if (a.diff_hash_at_approval !== patch.diffHash) {
      await this.pool.query("UPDATE approvals SET status = 'invalidated', invalidated_at = NOW() WHERE id = $1", [a.id]);
      return null;
    }
    return {
      id: a.id,
      tenantId: a.tenant_id,
      patchId: a.patch_id,
      approvedByUserId: a.approved_by_user_id,
      diffHashAtApproval: a.diff_hash_at_approval,
      status: a.status,
      approvedAt: a.approved_at,
      invalidatedAt: a.invalidated_at,
      invalidationReason: a.invalidation_reason,
    };
  }

  async invalidateApprovalsForPatch(tenantId: string, patchId: string, reason?: string): Promise<void> {
    await this.pool.query(
      "UPDATE approvals SET status = 'invalidated', invalidated_at = NOW(), invalidation_reason = $3 WHERE tenant_id = $1 AND patch_id = $2 AND status = 'active'",
      [tenantId, patchId, reason || null],
    );
  }

  // --- Pull Requests ---

  async savePullRequest(
    tenantId: string,
    data: {
      repositoryId: string;
      findingId: string;
      patchId: string;
      approvalId: string;
      githubPrNumber: number;
      githubPrUrl: string;
      branchName: string;
      commitSha: string;
      isDraft?: boolean;
      isSimulation?: boolean;
      deliveryBlockedReason?: string;
    },
  ): Promise<PullRequestRecord> {
    const repo = await this.getRepository(tenantId, data.repositoryId);
    if (!repo) throw new Error(`Repository ${data.repositoryId} not found for tenant ${tenantId}`);

    const finding = await this.getFinding(tenantId, data.findingId);
    if (!finding) throw new Error(`Finding ${data.findingId} not found for tenant ${tenantId}`);

    const patch = await this.getPatch(tenantId, data.patchId);
    if (!patch) throw new Error(`Patch ${data.patchId} not found for tenant ${tenantId}`);

    // Immutable parent integrity
    if (finding.repositoryId !== repo.id) {
      throw new Error(`Inconsistent parent relationship: finding ${finding.id} does not belong to repository ${repo.id}`);
    }
    if (patch.findingId !== finding.id) {
      throw new Error(`Inconsistent parent relationship: patch ${patch.id} does not belong to finding ${finding.id}`);
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Idempotency: return existing PR if already created for this patch
      const existing = await client.query('SELECT * FROM pull_requests WHERE tenant_id = $1 AND patch_id = $2', [tenantId, data.patchId]);
      if (existing.rows.length > 0) {
        await client.query('COMMIT');
        const p = existing.rows[0];
        return {
          id: p.id,
          tenantId: p.tenant_id,
          repositoryId: p.repository_id,
          findingId: p.finding_id,
          patchId: p.patch_id,
          approvalId: p.approval_id,
          githubPrNumber: Number(p.github_pr_number),
          githubPrUrl: p.github_pr_url,
          branchName: p.branch_name,
          commitSha: p.commit_sha,
          status: p.status,
          isDraft: p.is_draft,
          isSimulation: p.is_simulation,
          deliveryBlockedReason: p.delivery_blocked_reason,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        };
      }

      const appRes = await client.query('SELECT * FROM approvals WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [data.approvalId, tenantId]);
      const approval = appRes.rows[0];
      if (!approval) throw new Error(`Approval ${data.approvalId} not found for tenant ${tenantId}`);
      if (approval.patch_id !== patch.id) {
        throw new Error(`Inconsistent parent relationship: approval ${approval.id} does not belong to patch ${patch.id}`);
      }
      if (approval.diff_hash_at_approval !== patch.diffHash) {
        throw new Error(`Approval diff hash mismatch: approval was for ${approval.diff_hash_at_approval}, but patch is ${patch.diffHash}`);
      }
      if (approval.status !== 'active') {
        throw new Error(`Approval ${approval.id} is not active (current status: ${approval.status})`);
      }

      // Mark approval as used
      await client.query("UPDATE approvals SET status = 'used' WHERE id = $1", [approval.id]);

      const id = `pr_${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      await client.query(
        `INSERT INTO pull_requests (id, tenant_id, repository_id, finding_id, patch_id, approval_id, github_pr_number, github_pr_url, branch_name, commit_sha, status, is_draft, is_simulation, delivery_blocked_reason, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'open', $11, $12, $13, $14, $14)`,
        [
          id,
          tenantId,
          data.repositoryId,
          data.findingId,
          data.patchId,
          data.approvalId,
          data.githubPrNumber,
          data.githubPrUrl,
          data.branchName,
          data.commitSha,
          Boolean(data.isDraft),
          Boolean(data.isSimulation),
          data.deliveryBlockedReason || null,
          now,
        ],
      );

      await client.query("UPDATE findings SET status = 'pr_created' WHERE id = $1", [finding.id]);
      await client.query('COMMIT');

      return {
        id,
        tenantId,
        ...data,
        status: 'open',
        createdAt: now,
        updatedAt: now,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getPullRequest(tenantId: string, id: string): Promise<PullRequestRecord | null> {
    const rows = await this.query<{
      id: string;
      tenant_id: string;
      repository_id: string;
      finding_id: string;
      patch_id: string;
      approval_id: string;
      github_pr_number: number;
      github_pr_url: string;
      branch_name: string;
      commit_sha: string;
      status: 'open' | 'merged' | 'closed';
      is_draft?: boolean;
      is_simulation?: boolean;
      delivery_blocked_reason?: string;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM pull_requests WHERE tenant_id = $1 AND id = $2', [tenantId, id]);
    if (!rows[0]) return null;
    const p = rows[0];
    return {
      id: p.id,
      tenantId: p.tenant_id,
      repositoryId: p.repository_id,
      findingId: p.finding_id,
      patchId: p.patch_id,
      approvalId: p.approval_id,
      githubPrNumber: Number(p.github_pr_number),
      githubPrUrl: p.github_pr_url,
      branchName: p.branch_name,
      commitSha: p.commit_sha,
      status: p.status,
      isDraft: p.is_draft,
      isSimulation: p.is_simulation,
      deliveryBlockedReason: p.delivery_blocked_reason,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    };
  }

  async getPullRequestByFinding(tenantId: string, findingId: string): Promise<PullRequestRecord | null> {
    const rows = await this.query<{
      id: string;
      tenant_id: string;
      repository_id: string;
      finding_id: string;
      patch_id: string;
      approval_id: string;
      github_pr_number: number;
      github_pr_url: string;
      branch_name: string;
      commit_sha: string;
      status: 'open' | 'merged' | 'closed';
      is_draft?: boolean;
      is_simulation?: boolean;
      delivery_blocked_reason?: string;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM pull_requests WHERE tenant_id = $1 AND finding_id = $2', [tenantId, findingId]);
    if (!rows[0]) return null;
    const p = rows[0];
    return {
      id: p.id,
      tenantId: p.tenant_id,
      repositoryId: p.repository_id,
      findingId: p.finding_id,
      patchId: p.patch_id,
      approvalId: p.approval_id,
      githubPrNumber: Number(p.github_pr_number),
      githubPrUrl: p.github_pr_url,
      branchName: p.branch_name,
      commitSha: p.commit_sha,
      status: p.status,
      isDraft: p.is_draft,
      isSimulation: p.is_simulation,
      deliveryBlockedReason: p.delivery_blocked_reason,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    };
  }

  async listPullRequests(tenantId: string, repositoryId?: string): Promise<PullRequestRecord[]> {
    const query = repositoryId
      ? 'SELECT * FROM pull_requests WHERE tenant_id = $1 AND repository_id = $2 ORDER BY created_at DESC'
      : 'SELECT * FROM pull_requests WHERE tenant_id = $1 ORDER BY created_at DESC';
    const params = repositoryId ? [tenantId, repositoryId] : [tenantId];
    const rows = await this.query<{
      id: string;
      tenant_id: string;
      repository_id: string;
      finding_id: string;
      patch_id: string;
      approval_id: string;
      github_pr_number: number;
      github_pr_url: string;
      branch_name: string;
      commit_sha: string;
      status: 'open' | 'merged' | 'closed';
      is_draft?: boolean;
      is_simulation?: boolean;
      delivery_blocked_reason?: string;
      created_at: string;
      updated_at: string;
    }>(query, params);

    return rows.map(p => ({
      id: p.id,
      tenantId: p.tenant_id,
      repositoryId: p.repository_id,
      findingId: p.finding_id,
      patchId: p.patch_id,
      approvalId: p.approval_id,
      githubPrNumber: Number(p.github_pr_number),
      githubPrUrl: p.github_pr_url,
      branchName: p.branch_name,
      commitSha: p.commit_sha,
      status: p.status,
      isDraft: p.is_draft,
      isSimulation: p.is_simulation,
      deliveryBlockedReason: p.delivery_blocked_reason,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
  }

  // --- Distributed Delivery Claims ---

  async claimDelivery(
    tenantId: string,
    patchId: string,
    workerId: string,
    ttlSeconds = 120,
  ): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Fast idempotency: check if PR exists
      const prRes = await client.query(
        'SELECT id FROM pull_requests WHERE tenant_id = $1 AND patch_id = $2',
        [tenantId, patchId],
      );
      if (prRes.rows.length > 0) {
        await client.query('ROLLBACK');
        return false;
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
      const claimId = `claim_${crypto.randomUUID()}`;

      // Insert or update if expired or released
      const claimRes = await client.query(
        `INSERT INTO delivery_claims (id, tenant_id, patch_id, worker_id, claimed_at, expires_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         ON CONFLICT (patch_id) DO UPDATE SET
           worker_id = EXCLUDED.worker_id,
           claimed_at = EXCLUDED.claimed_at,
           expires_at = EXCLUDED.expires_at,
           status = 'active'
         WHERE delivery_claims.status = 'released' OR delivery_claims.expires_at < NOW()
         RETURNING id`,
        [claimId, tenantId, patchId, workerId, now.toISOString(), expiresAt],
      );

      const acquired = claimRes.rows.length > 0;
      await client.query('COMMIT');
      return acquired;
    } catch {
      await client.query('ROLLBACK');
      return false;
    } finally {
      client.release();
    }
  }

  async releaseDeliveryClaim(
    tenantId: string,
    patchId: string,
    status: 'released' | 'completed',
  ): Promise<void> {
    await this.pool.query(
      'UPDATE delivery_claims SET status = $1 WHERE tenant_id = $2 AND patch_id = $3',
      [status, tenantId, patchId],
    );
  }

  async getDeliveryClaim(patchId: string): Promise<DeliveryClaimRecord | null> {
    const rows = await this.query<{
      id: string;
      tenant_id: string;
      patch_id: string;
      worker_id: string;
      claimed_at: string;
      expires_at: string;
      status: 'active' | 'released' | 'completed';
    }>('SELECT * FROM delivery_claims WHERE patch_id = $1', [patchId]);
    if (!rows[0]) return null;
    const c = rows[0];
    return {
      id: c.id,
      tenantId: c.tenant_id,
      patchId: c.patch_id,
      workerId: c.worker_id,
      claimedAt: c.claimed_at,
      expiresAt: c.expires_at,
      status: c.status,
    };
  }

  // --- Watch Targets ---

  async listWatchTargets(tenantId: string): Promise<WatchTargetRecord[]> {
    const rows = await this.query<{
      id: string;
      tenant_id: string;
      package_name: string;
      ecosystem: 'npm' | 'pypi' | 'remote-api';
      current_version: string;
      latest_version: string;
      last_checked_at: string;
      status: 'up_to_date' | 'upgrade_available' | 'error';
      is_demo: boolean;
      notes?: string;
      last_error?: string;
      source: 'registry' | 'fixture-demo' | 'manual';
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM watch_targets WHERE tenant_id = $1', [tenantId]);

    return rows.map(w => ({
      id: w.id,
      tenantId: w.tenant_id,
      packageName: w.package_name,
      ecosystem: w.ecosystem,
      currentVersion: w.current_version,
      latestVersion: w.latest_version,
      lastCheckedAt: w.last_checked_at,
      status: w.status,
      isDemo: w.is_demo,
      notes: w.notes,
      lastError: w.last_error,
      source: w.source,
      createdAt: w.created_at,
      updatedAt: w.updated_at,
    }));
  }

  async getWatchTarget(tenantId: string, packageName: string): Promise<WatchTargetRecord | null> {
    const rows = await this.query<{
      id: string;
      tenant_id: string;
      package_name: string;
      ecosystem: 'npm' | 'pypi' | 'remote-api';
      current_version: string;
      latest_version: string;
      last_checked_at: string;
      status: 'up_to_date' | 'upgrade_available' | 'error';
      is_demo: boolean;
      notes?: string;
      last_error?: string;
      source: 'registry' | 'fixture-demo' | 'manual';
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM watch_targets WHERE tenant_id = $1 AND package_name = $2', [tenantId, packageName]);
    if (!rows[0]) return null;
    const w = rows[0];
    return {
      id: w.id,
      tenantId: w.tenant_id,
      packageName: w.package_name,
      ecosystem: w.ecosystem,
      currentVersion: w.current_version,
      latestVersion: w.latest_version,
      lastCheckedAt: w.last_checked_at,
      status: w.status,
      isDemo: w.is_demo,
      notes: w.notes,
      lastError: w.last_error,
      source: w.source,
      createdAt: w.created_at,
      updatedAt: w.updated_at,
    };
  }

  async saveWatchTarget(
    tenantId: string,
    target: Omit<WatchTargetRecord, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
  ): Promise<WatchTargetRecord> {
    const id = `wt_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO watch_targets (id, tenant_id, package_name, ecosystem, current_version, latest_version, last_checked_at, status, is_demo, notes, last_error, source, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
       ON CONFLICT (tenant_id, package_name) DO UPDATE SET
         ecosystem = EXCLUDED.ecosystem,
         current_version = EXCLUDED.current_version,
         latest_version = EXCLUDED.latest_version,
         last_checked_at = EXCLUDED.last_checked_at,
         status = EXCLUDED.status,
         is_demo = EXCLUDED.is_demo,
         notes = EXCLUDED.notes,
         last_error = EXCLUDED.last_error,
         source = EXCLUDED.source,
         updated_at = EXCLUDED.updated_at`,
      [
        id,
        tenantId,
        target.packageName,
        target.ecosystem,
        target.currentVersion,
        target.latestVersion,
        target.lastCheckedAt,
        target.status,
        Boolean(target.isDemo),
        target.notes || null,
        target.lastError || null,
        target.source,
        now,
      ],
    );

    return {
      id,
      tenantId,
      ...target,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateWatchTarget(
    tenantId: string,
    packageName: string,
    updates: Partial<WatchTargetRecord>,
  ): Promise<WatchTargetRecord | null> {
    const existing = await this.getWatchTarget(tenantId, packageName);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await this.pool.query(
      `UPDATE watch_targets SET
         current_version = $3,
         latest_version = $4,
         last_checked_at = $5,
         status = $6,
         notes = $7,
         last_error = $8,
         updated_at = $9
       WHERE tenant_id = $1 AND package_name = $2`,
      [
        tenantId,
        packageName,
        updated.currentVersion,
        updated.latestVersion,
        updated.lastCheckedAt,
        updated.status,
        updated.notes || null,
        updated.lastError || null,
        updated.updatedAt,
      ],
    );
    return updated;
  }

  // --- Webhook Deduplication ---

  async recordWebhookDelivery(deliveryId: string, event: string, signature: string): Promise<boolean> {
    const id = `wh_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const res = await this.pool.query(
      `INSERT INTO webhook_deliveries (id, delivery_id, event, signature, processed_at, status)
       VALUES ($1, $2, $3, $4, $5, 'processed')
       ON CONFLICT (delivery_id) DO NOTHING
       RETURNING id`,
      [id, deliveryId, event, signature, now],
    );
    return res.rows.length > 0;
  }

  async isWebhookProcessed(deliveryId: string): Promise<boolean> {
    const rows = await this.query('SELECT 1 FROM webhook_deliveries WHERE delivery_id = $1', [deliveryId]);
    return rows.length > 0;
  }

  // --- Durable Job Queue ---

  async claimNextJob(workerId: string): Promise<JobRecord | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `SELECT * FROM jobs
         WHERE status = 'queued' AND run_after <= NOW()
         ORDER BY run_after ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED`,
      );
      if (res.rows.length === 0) {
        await client.query('COMMIT');
        return null;
      }
      const job = res.rows[0];
      const now = new Date().toISOString();
      await client.query(
        "UPDATE jobs SET status = 'running', locked_at = $1, locked_by = $2, attempts = attempts + 1, updated_at = $1 WHERE id = $3",
        [now, workerId, job.id],
      );
      await client.query('COMMIT');
      return {
        id: job.id,
        tenantId: job.tenant_id,
        repositoryId: job.repository_id,
        type: job.type,
        status: 'running',
        payload: typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload,
        result: job.result ? (typeof job.result === 'string' ? JSON.parse(job.result) : job.result) : undefined,
        error: job.error,
        attempts: job.attempts + 1,
        maxAttempts: job.max_attempts,
        runAfter: job.run_after,
        lockedAt: now,
        lockedBy: workerId,
        createdAt: job.created_at,
        updatedAt: now,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async completeJob(jobId: string, result?: unknown): Promise<void> {
    const now = new Date().toISOString();
    await this.pool.query(
      "UPDATE jobs SET status = 'completed', result = $1, locked_at = NULL, locked_by = NULL, updated_at = $2 WHERE id = $3",
      [result ? JSON.stringify(result) : null, now, jobId],
    );
  }

  async failJob(jobId: string, error: string, retryable = true): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query('SELECT attempts, max_attempts FROM jobs WHERE id = $1 FOR UPDATE', [jobId]);
      if (res.rows.length === 0) {
        await client.query('ROLLBACK');
        return;
      }
      const { attempts, max_attempts } = res.rows[0];
      const now = new Date();
      if (retryable && attempts < max_attempts) {
        const backoffSeconds = Math.pow(2, attempts) * 10;
        const nextRun = new Date(now.getTime() + backoffSeconds * 1000).toISOString();
        await client.query(
          "UPDATE jobs SET status = 'queued', error = $1, run_after = $2, locked_at = NULL, locked_by = NULL, updated_at = $3 WHERE id = $4",
          [error, nextRun, now.toISOString(), jobId],
        );
      } else {
        await client.query(
          "UPDATE jobs SET status = 'failed', error = $1, locked_at = NULL, locked_by = NULL, updated_at = $2 WHERE id = $3",
          [error, now.toISOString(), jobId],
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
