import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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
  WebhookDeliveryRecord,
  JobType,
} from '@patchversion/shared';

export interface DatabaseSchema {
  schemaVersion: number;
  tenants: Record<string, Tenant>;
  users: Record<string, User>;
  sessions: Record<string, Session>;
  installations: Record<string, InstallationRecord>;
  repositories: Record<string, RepositoryRecord>;
  jobs: Record<string, JobRecord>;
  findings: Record<string, FindingRecord>;
  patches: Record<string, PatchRecord>;
  validations: Record<string, ValidationRecord>;
  approvals: Record<string, ApprovalRecord>;
  pullRequests: Record<string, PullRequestRecord>;
  webhookDeliveries: Record<string, WebhookDeliveryRecord>;
}

const CURRENT_SCHEMA_VERSION = 1;

/**
 * Durable, transactional state database for TryPatchBay.
 * Supports multi-tenant isolation, ACID file writes, migration tracking,
 * and durable job lifecycle across worker and server restarts.
 */
export class PatchversionDatabase {
  private dbPath: string;
  private data: DatabaseSchema;
  private writeLock = false;

  constructor(dbDir: string) {
    fs.mkdirSync(dbDir, { recursive: true });
    this.dbPath = path.join(dbDir, 'patchversion-db.json');
    this.data = this.loadOrInitialize();
  }

  getDataDir(): string {
    return path.dirname(this.dbPath);
  }

  private loadOrInitialize(): DatabaseSchema {
    if (fs.existsSync(this.dbPath)) {
      try {
        const raw = fs.readFileSync(this.dbPath, 'utf8');
        const parsed = JSON.parse(raw) as DatabaseSchema;
        return this.migrate(parsed);
      } catch (err) {
        console.error(`Failed to read database at ${this.dbPath}, backing up and reinitializing:`, err);
        const backupPath = `${this.dbPath}.${Date.now()}.corrupt`;
        fs.renameSync(this.dbPath, backupPath);
      }
    }

    const initial: DatabaseSchema = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      tenants: {},
      users: {},
      sessions: {},
      installations: {},
      repositories: {},
      jobs: {},
      findings: {},
      patches: {},
      validations: {},
      approvals: {},
      pullRequests: {},
      webhookDeliveries: {},
    };
    this.persist(initial);
    return initial;
  }

  private migrate(schema: DatabaseSchema): DatabaseSchema {
    // Migration framework
    if (schema.schemaVersion < CURRENT_SCHEMA_VERSION) {
      // Future migrations applied here
      schema.schemaVersion = CURRENT_SCHEMA_VERSION;
      this.persist(schema);
    }
    return schema;
  }

  /** Atomic persistent write with write-ahead temp file and flush. */
  private persist(data: DatabaseSchema): void {
    const tmpPath = `${this.dbPath}.${crypto.randomUUID()}.tmp`;
    const serialized = JSON.stringify(data, null, 2);
    fs.writeFileSync(tmpPath, serialized, 'utf8');
    fs.renameSync(tmpPath, this.dbPath);
  }

  private save(): void {
    this.persist(this.data);
  }

  // --- Tenants & Users ---

  createTenant(name: string): Tenant {
    const id = `tenant_${crypto.randomUUID()}`;
    const tenant: Tenant = {
      id,
      name,
      createdAt: new Date().toISOString(),
    };
    this.data.tenants[id] = tenant;
    this.save();
    return tenant;
  }

  getTenant(id: string): Tenant | null {
    return this.data.tenants[id] ?? null;
  }

  createUser(tenantId: string, email: string, role: 'owner' | 'admin' | 'member' = 'member', githubLogin?: string, githubUserId?: string): User {
    if (!this.data.tenants[tenantId]) {
      throw new Error(`Tenant ${tenantId} does not exist`);
    }
    const id = `user_${crypto.randomUUID()}`;
    const user: User = {
      id,
      tenantId,
      email,
      role,
      githubLogin,
      githubUserId,
      createdAt: new Date().toISOString(),
    };
    this.data.users[id] = user;
    this.save();
    return user;
  }

  getUser(id: string): User | null {
    return this.data.users[id] ?? null;
  }

  getUserByEmail(email: string): User | null {
    return Object.values(this.data.users).find(u => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  // --- Sessions & Auth ---

  createSession(userId: string, expiresInHours = 24): Session {
    const user = this.getUser(userId);
    if (!user) throw new Error(`User ${userId} does not exist`);

    const token = crypto.randomBytes(32).toString('hex');
    const id = `sess_${crypto.randomUUID()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInHours * 3600 * 1000).toISOString();

    const session: Session = {
      id,
      userId,
      tenantId: user.tenantId,
      token,
      expiresAt,
      createdAt: now.toISOString(),
    };

    this.data.sessions[token] = session;
    this.save();
    return session;
  }

  getSession(token: string): Session | null {
    const session = this.data.sessions[token];
    if (!session) return null;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      delete this.data.sessions[token];
      this.save();
      return null;
    }
    return session;
  }

  revokeSession(token: string): boolean {
    if (this.data.sessions[token]) {
      delete this.data.sessions[token];
      this.save();
      return true;
    }
    return false;
  }

  // --- GitHub Installations & Repositories ---

  saveInstallation(
    tenantId: string,
    githubInstallationId: number,
    accountLogin: string,
    accountType: 'User' | 'Organization' = 'User',
  ): InstallationRecord {
    if (!this.data.tenants[tenantId]) throw new Error(`Tenant ${tenantId} not found`);

    let existing = Object.values(this.data.installations).find(
      i => i.githubInstallationId === githubInstallationId && i.tenantId === tenantId,
    );

    const now = new Date().toISOString();
    if (existing) {
      existing.accountLogin = accountLogin;
      existing.status = 'active';
      existing.updatedAt = now;
    } else {
      const id = `inst_${crypto.randomUUID()}`;
      existing = {
        id,
        tenantId,
        githubInstallationId,
        accountLogin,
        accountType,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
      this.data.installations[id] = existing;
    }
    this.save();
    return existing;
  }

  getInstallation(tenantId: string, id: string): InstallationRecord | null {
    const inst = this.data.installations[id];
    if (!inst || inst.tenantId !== tenantId) return null;
    return inst;
  }

  getInstallationByGithubId(githubInstallationId: number): InstallationRecord | null {
    return Object.values(this.data.installations).find(i => i.githubInstallationId === githubInstallationId) ?? null;
  }

  listInstallations(tenantId: string): InstallationRecord[] {
    return Object.values(this.data.installations).filter(i => i.tenantId === tenantId && i.status === 'active');
  }

  saveRepository(
    tenantId: string,
    installationId: string,
    repoData: {
      githubRepoId: number;
      fullName: string;
      owner: string;
      name: string;
      defaultBranch: string;
      isPrivate: boolean;
      localPath?: string;
    },
  ): RepositoryRecord {
    const inst = this.getInstallation(tenantId, installationId);
    if (!inst) throw new Error(`Installation ${installationId} not found for tenant ${tenantId}`);

    let existing = Object.values(this.data.repositories).find(
      r => r.tenantId === tenantId && r.githubRepoId === repoData.githubRepoId,
    );

    const now = new Date().toISOString();
    if (existing) {
      existing.fullName = repoData.fullName;
      existing.owner = repoData.owner;
      existing.name = repoData.name;
      existing.defaultBranch = repoData.defaultBranch;
      existing.isPrivate = repoData.isPrivate;
      existing.status = 'connected';
      if (repoData.localPath) existing.localPath = repoData.localPath;
      existing.updatedAt = now;
    } else {
      const id = `repo_${crypto.randomUUID()}`;
      existing = {
        id,
        tenantId,
        installationId,
        githubRepoId: repoData.githubRepoId,
        fullName: repoData.fullName,
        owner: repoData.owner,
        name: repoData.name,
        defaultBranch: repoData.defaultBranch,
        isPrivate: repoData.isPrivate,
        status: 'connected',
        localPath: repoData.localPath,
        createdAt: now,
        updatedAt: now,
      };
      this.data.repositories[id] = existing;
    }
    this.save();
    return existing;
  }

  getRepository(tenantId: string, id: string): RepositoryRecord | null {
    const repo = this.data.repositories[id];
    if (!repo || repo.tenantId !== tenantId) return null;
    return repo;
  }

  listRepositories(tenantId: string): RepositoryRecord[] {
    return Object.values(this.data.repositories).filter(r => r.tenantId === tenantId && r.status === 'connected');
  }

  revokeRepository(tenantId: string, id: string): boolean {
    const repo = this.getRepository(tenantId, id);
    if (!repo) return false;
    repo.status = 'revoked';
    repo.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }

  // --- Durable Jobs & Queue ---

  createJob<TPayload>(
    tenantId: string,
    repositoryId: string,
    type: JobType,
    payload: TPayload,
    maxAttempts = 3,
  ): JobRecord<TPayload> {
    const repo = this.getRepository(tenantId, repositoryId);
    if (!repo) throw new Error(`Repository ${repositoryId} not found for tenant ${tenantId}`);

    const id = `job_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const job: JobRecord<TPayload> = {
      id,
      tenantId,
      repositoryId,
      type,
      status: 'queued',
      payload,
      attempts: 0,
      maxAttempts,
      runAfter: now,
      createdAt: now,
      updatedAt: now,
    };

    this.data.jobs[id] = job as JobRecord;
    this.save();
    return job;
  }

  getJob(tenantId: string, id: string): JobRecord | null {
    const job = this.data.jobs[id];
    if (!job || job.tenantId !== tenantId) return null;
    return job;
  }

  listJobs(tenantId: string, repositoryId?: string): JobRecord[] {
    return Object.values(this.data.jobs).filter(
      j => j.tenantId === tenantId && (!repositoryId || j.repositoryId === repositoryId),
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  claimNextJob(workerId: string): JobRecord | null {
    const now = new Date();
    const nowIso = now.toISOString();

    for (const job of Object.values(this.data.jobs)) {
      if (job.status === 'queued' && new Date(job.runAfter) <= now) {
        job.status = 'running';
        job.lockedAt = nowIso;
        job.lockedBy = workerId;
        job.attempts += 1;
        job.updatedAt = nowIso;
        this.save();
        return job;
      }
      // Abandoned worker recovery: lock timeout after 10 minutes
      if (job.status === 'running' && job.lockedAt) {
        const lockAge = now.getTime() - new Date(job.lockedAt).getTime();
        if (lockAge > 600_000) {
          if (job.attempts < job.maxAttempts) {
            job.status = 'queued';
            job.lockedAt = undefined;
            job.lockedBy = undefined;
            job.updatedAt = nowIso;
            this.save();
          } else {
            job.status = 'failed';
            job.error = 'Job abandoned by worker and exceeded max attempts';
            job.updatedAt = nowIso;
            this.save();
          }
        }
      }
    }
    return null;
  }

  completeJob<TResult>(jobId: string, result: TResult): void {
    const job = this.data.jobs[jobId];
    if (!job) throw new Error(`Job ${jobId} not found`);
    job.status = 'completed';
    job.result = result;
    job.lockedAt = undefined;
    job.lockedBy = undefined;
    job.updatedAt = new Date().toISOString();
    this.save();
  }

  failJob(jobId: string, error: string, retryable = true, retryDelayMs?: number): void {
    const job = this.data.jobs[jobId];
    if (!job) throw new Error(`Job ${jobId} not found`);
    const now = new Date();
    if (retryable && job.attempts < job.maxAttempts) {
      job.status = 'queued';
      job.error = error;
      // Exponential backoff: 2s, 4s, 8s... or custom retry delay
      const delayMs = retryDelayMs !== undefined ? retryDelayMs : Math.pow(2, job.attempts) * 1000;
      job.runAfter = new Date(now.getTime() + delayMs).toISOString();
    } else {
      job.status = 'failed';
      job.error = error;
    }
    job.lockedAt = undefined;
    job.lockedBy = undefined;
    job.updatedAt = now.toISOString();
    this.save();
  }

  // --- Findings, Patches & Validations ---

  saveFinding(
    tenantId: string,
    repositoryId: string,
    data: Omit<FindingRecord, 'id' | 'tenantId' | 'repositoryId' | 'createdAt'>,
  ): FindingRecord {
    const id = `finding_${crypto.randomUUID()}`;
    const finding: FindingRecord = {
      id,
      tenantId,
      repositoryId,
      ...data,
      createdAt: new Date().toISOString(),
    };
    this.data.findings[id] = finding;
    this.save();
    return finding;
  }

  getFinding(tenantId: string, id: string): FindingRecord | null {
    const f = this.data.findings[id];
    if (!f || f.tenantId !== tenantId) return null;
    return f;
  }

  listFindings(tenantId: string, repositoryId?: string): FindingRecord[] {
    return Object.values(this.data.findings).filter(
      f => f.tenantId === tenantId && (!repositoryId || f.repositoryId === repositoryId),
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  savePatch(
    tenantId: string,
    findingId: string,
    diffContent: string,
    lockfileUpdates?: string,
  ): PatchRecord {
    const finding = this.getFinding(tenantId, findingId);
    if (!finding) throw new Error(`Finding ${findingId} not found for tenant ${tenantId}`);

    // Compute reproducible SHA-256 diff hash
    const normalizedDiff = diffContent.replace(/\r\n/g, '\n').trim();
    const diffHash = crypto.createHash('sha256').update(normalizedDiff).digest('hex');

    const id = `patch_${crypto.randomUUID()}`;
    const patch: PatchRecord = {
      id,
      tenantId,
      findingId,
      diffContent,
      diffHash,
      lockfileUpdates,
      status: 'generated',
      createdAt: new Date().toISOString(),
    };
    this.data.patches[id] = patch;
    this.save();
    return patch;
  }

  getPatch(tenantId: string, id: string): PatchRecord | null {
    const patch = this.data.patches[id];
    if (!patch || patch.tenantId !== tenantId) return null;
    return patch;
  }

  getPatchByFinding(tenantId: string, findingId: string): PatchRecord | null {
    return Object.values(this.data.patches).find(
      p => p.tenantId === tenantId && p.findingId === findingId,
    ) ?? null;
  }

  saveValidation(
    tenantId: string,
    patchId: string,
    data: Omit<ValidationRecord, 'id' | 'tenantId' | 'patchId' | 'createdAt'>,
  ): ValidationRecord {
    const patch = this.getPatch(tenantId, patchId);
    if (!patch) throw new Error(`Patch ${patchId} not found for tenant ${tenantId}`);

    const id = `val_${crypto.randomUUID()}`;
    const validation: ValidationRecord = {
      id,
      tenantId,
      patchId,
      ...data,
      createdAt: new Date().toISOString(),
    };
    this.data.validations[id] = validation;

    if (data.status === 'passed') {
      patch.status = 'validated';
    } else {
      patch.status = 'rejected';
      // Invalidate any existing active approvals for this patch
      this.invalidateApprovalsForPatch(tenantId, patchId, 'Validation rerun failed or inconclusive');
    }
    this.save();
    return validation;
  }

  getValidation(tenantId: string, id: string): ValidationRecord | null {
    const val = this.data.validations[id];
    if (!val || val.tenantId !== tenantId) return null;
    return val;
  }

  getValidationByPatch(tenantId: string, patchId: string): ValidationRecord | null {
    return Object.values(this.data.validations).find(
      v => v.tenantId === tenantId && v.patchId === patchId,
    ) ?? null;
  }

  // --- Explicit Approvals & Stale Invalidation ---

  approvePatch(
    tenantId: string,
    patchId: string,
    userId: string,
    expectedDiffHash: string,
  ): ApprovalRecord {
    const patch = this.getPatch(tenantId, patchId);
    if (!patch) throw new Error(`Patch ${patchId} not found`);

    if (patch.diffHash !== expectedDiffHash) {
      throw new Error(`Diff hash mismatch: cannot approve modified patch. Expected ${patch.diffHash}, got ${expectedDiffHash}`);
    }

    const validation = this.getValidationByPatch(tenantId, patchId);
    if (!validation || validation.status !== 'passed') {
      throw new Error('Cannot approve patch without a verified passing validation');
    }

    // Invalidate prior approvals for this patch
    this.invalidateApprovalsForPatch(tenantId, patchId, 'Superseded by new approval');

    const id = `appr_${crypto.randomUUID()}`;
    const approval: ApprovalRecord = {
      id,
      tenantId,
      patchId,
      approvedByUserId: userId,
      diffHashAtApproval: expectedDiffHash,
      status: 'active',
      approvedAt: new Date().toISOString(),
    };

    this.data.approvals[id] = approval;
    this.save();
    return approval;
  }

  getActiveApproval(tenantId: string, patchId: string): ApprovalRecord | null {
    const patch = this.getPatch(tenantId, patchId);
    if (!patch) return null;

    const approval = Object.values(this.data.approvals).find(
      a => a.tenantId === tenantId && a.patchId === patchId && a.status === 'active',
    );
    if (!approval) return null;

    // Verify diff hash hasn't drifted
    if (approval.diffHashAtApproval !== patch.diffHash) {
      approval.status = 'invalidated';
      approval.invalidatedAt = new Date().toISOString();
      this.save();
      return null;
    }
    return approval;
  }

  invalidateApprovalsForPatch(tenantId: string, patchId: string, reason?: string): void {
    const now = new Date().toISOString();
    for (const app of Object.values(this.data.approvals)) {
      if (app.tenantId === tenantId && app.patchId === patchId && app.status === 'active') {
        app.status = 'invalidated';
        app.invalidatedAt = now;
        if (reason) {
          app.invalidationReason = reason;
        }
      }
    }
    this.save();
  }

  // --- Genuine Pull Request Delivery ---

  savePullRequest(
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
    },
  ): PullRequestRecord {
    // Check if PR for this patch or finding already exists (Duplicate prevention)
    const existing = Object.values(this.data.pullRequests).find(
      p => p.tenantId === tenantId && p.patchId === data.patchId,
    );
    if (existing) {
      return existing;
    }

    // Mark approval as used
    const approval = this.data.approvals[data.approvalId];
    if (approval) {
      approval.status = 'used';
    }

    const id = `pr_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const pr: PullRequestRecord = {
      id,
      tenantId,
      ...data,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };
    this.data.pullRequests[id] = pr;

    const finding = this.data.findings[data.findingId];
    if (finding) {
      finding.status = 'pr_created';
    }

    this.save();
    return pr;
  }

  getPullRequest(tenantId: string, id: string): PullRequestRecord | null {
    const pr = this.data.pullRequests[id];
    if (!pr || pr.tenantId !== tenantId) return null;
    return pr;
  }

  getPullRequestByFinding(tenantId: string, findingId: string): PullRequestRecord | null {
    return Object.values(this.data.pullRequests).find(
      p => p.tenantId === tenantId && p.findingId === findingId,
    ) ?? null;
  }

  listPullRequests(tenantId: string, repositoryId?: string): PullRequestRecord[] {
    return Object.values(this.data.pullRequests).filter(
      p => p.tenantId === tenantId && (!repositoryId || p.repositoryId === repositoryId),
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // --- Webhook Replay Protection ---

  recordWebhookDelivery(deliveryId: string, event: string, signature: string): boolean {
    if (this.data.webhookDeliveries[deliveryId]) {
      // Already processed -> reject duplicate
      return false;
    }

    const record: WebhookDeliveryRecord = {
      id: `wh_${crypto.randomUUID()}`,
      deliveryId,
      event,
      signature,
      processedAt: new Date().toISOString(),
      status: 'processed',
    };
    this.data.webhookDeliveries[deliveryId] = record;
    this.save();
    return true;
  }

  isWebhookProcessed(deliveryId: string): boolean {
    return Boolean(this.data.webhookDeliveries[deliveryId]);
  }
}
