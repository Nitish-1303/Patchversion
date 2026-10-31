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
  RepositoryScanResult,
} from '@patchversion/shared';

export interface IPersistenceStore {
  // Lifecycle
  close?(): Promise<void>;
  getDataDir?(): string;

  // Tenants & Users
  createTenant(name: string, id?: string): Promise<Tenant> | Tenant;
  getTenant(id: string): Promise<Tenant | null> | Tenant | null;
  createUser(
    tenantId: string,
    email: string,
    role?: 'owner' | 'admin' | 'member' | 'reviewer',
    githubLogin?: string,
    githubUserId?: string,
    id?: string,
    passwordHash?: string,
  ): Promise<User> | User;
  getUser(id: string): Promise<User | null> | User | null;
  getUserByEmail(email: string): Promise<User | null> | User | null;

  // Sessions & Revocation
  createSession(userId: string, expiresInHours?: number): Promise<Session> | Session;
  getSession(token: string): Promise<Session | null> | Session | null;
  revokeSession(token: string): Promise<boolean> | boolean;
  isSessionRevoked(sessionId: string): Promise<boolean> | boolean;

  // Installations & Repositories
  saveInstallation(
    tenantId: string,
    githubInstallationId: number,
    accountLogin: string,
    accountType?: 'User' | 'Organization',
  ): Promise<InstallationRecord> | InstallationRecord;
  getInstallation(tenantId: string, id: string): Promise<InstallationRecord | null> | InstallationRecord | null;
  getInstallationByGithubId(githubInstallationId: number): Promise<InstallationRecord | null> | InstallationRecord | null;
  listInstallations(tenantId: string): Promise<InstallationRecord[]> | InstallationRecord[];
  updateInstallationStatus(
    tenantId: string,
    githubInstallationId: number,
    status: 'active' | 'suspended' | 'deleted',
  ): Promise<boolean> | boolean;
  saveRepository(
    tenantId: string,
    installationId: string,
    data: Omit<RepositoryRecord, 'id' | 'tenantId' | 'installationId' | 'status' | 'createdAt' | 'updatedAt'> & {
      id?: string;
      status?: 'connected' | 'disconnected' | 'revoked';
    },
  ): Promise<RepositoryRecord> | RepositoryRecord;
  getRepository(tenantId: string, idOrFullName: string): Promise<RepositoryRecord | null> | RepositoryRecord | null;
  listRepositories(tenantId: string): Promise<RepositoryRecord[]> | RepositoryRecord[];

  // Onboarding
  createOnboardingState(
    tenantId: string,
    userId: string,
    targetAccount?: string,
    ttlMinutes?: number,
  ): Promise<InstallationOnboardingState> | InstallationOnboardingState;
  getOnboardingState(token: string): Promise<InstallationOnboardingState | null> | InstallationOnboardingState | null;
  verifyAndLinkInstallation(
    stateToken: string,
    githubInstallationId: number,
    accountLogin: string,
    accountType?: 'User' | 'Organization',
  ): Promise<InstallationRecord> | InstallationRecord;

  // Findings
  saveFinding(
    tenantId: string,
    repositoryId: string,
    data: Omit<FindingRecord, 'id' | 'tenantId' | 'repositoryId' | 'createdAt'> & { id?: string; status?: 'open' | 'fixing' | 'validated' | 'approved' | 'pr_created' | 'dismissed' },
  ): Promise<FindingRecord> | FindingRecord;
  getFinding(tenantId: string, id: string): Promise<FindingRecord | null> | FindingRecord | null;
  listFindings(tenantId: string, repositoryId?: string): Promise<FindingRecord[]> | FindingRecord[];

  // Patches & Validations
  savePatch(
    tenantId: string,
    findingId: string,
    diffContent: string,
    lockfileUpdates?: string,
    id?: string,
  ): Promise<PatchRecord> | PatchRecord;
  getPatch(tenantId: string, id: string): Promise<PatchRecord | null> | PatchRecord | null;
  getPatchByFinding(tenantId: string, findingId: string): Promise<PatchRecord | null> | PatchRecord | null;
  saveValidation(
    tenantId: string,
    patchId: string,
    data: Omit<ValidationRecord, 'id' | 'tenantId' | 'patchId' | 'createdAt'> & { id?: string },
  ): Promise<ValidationRecord> | ValidationRecord;
  getValidation(tenantId: string, id: string): Promise<ValidationRecord | null> | ValidationRecord | null;
  getValidationByPatch(tenantId: string, patchId: string): Promise<ValidationRecord | null> | ValidationRecord | null;

  // Approvals
  approvePatch(
    tenantId: string,
    patchId: string,
    userId: string,
    expectedDiffHash: string,
  ): Promise<ApprovalRecord> | ApprovalRecord;
  getActiveApproval(tenantId: string, patchId: string): Promise<ApprovalRecord | null> | ApprovalRecord | null;
  invalidateApprovalsForPatch(tenantId: string, patchId: string, reason?: string): Promise<void> | void;

  // Pull Requests
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
      isDraft?: boolean;
      isSimulation?: boolean;
      deliveryBlockedReason?: string;
    },
  ): Promise<PullRequestRecord> | PullRequestRecord;
  getPullRequest(tenantId: string, id: string): Promise<PullRequestRecord | null> | PullRequestRecord | null;
  getPullRequestByFinding(tenantId: string, findingId: string): Promise<PullRequestRecord | null> | PullRequestRecord | null;
  listPullRequests(tenantId: string, repositoryId?: string): Promise<PullRequestRecord[]> | PullRequestRecord[];

  // Distributed Delivery Claims
  claimDelivery(
    tenantId: string,
    patchId: string,
    workerId: string,
    ttlSeconds?: number,
  ): Promise<boolean> | boolean;
  releaseDeliveryClaim(
    tenantId: string,
    patchId: string,
    status: 'released' | 'completed',
  ): Promise<void> | void;
  getDeliveryClaim(patchId: string): Promise<DeliveryClaimRecord | null> | DeliveryClaimRecord | null;

  // Watch Targets
  listWatchTargets(tenantId: string): Promise<WatchTargetRecord[]> | WatchTargetRecord[];
  getWatchTarget(tenantId: string, packageName: string): Promise<WatchTargetRecord | null> | WatchTargetRecord | null;
  saveWatchTarget(
    tenantId: string,
    target: Omit<WatchTargetRecord, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
  ): Promise<WatchTargetRecord> | WatchTargetRecord;
  updateWatchTarget(
    tenantId: string,
    packageName: string,
    updates: Partial<WatchTargetRecord>,
  ): Promise<WatchTargetRecord | null> | WatchTargetRecord | null;

  // Webhooks
  recordWebhookDelivery(deliveryId: string, event: string, signature: string): Promise<boolean> | boolean;
  isWebhookProcessed(deliveryId: string): Promise<boolean> | boolean;

  // Jobs
  claimNextJob(workerId: string): Promise<JobRecord | null> | JobRecord | null;
  completeJob(jobId: string, result?: unknown): Promise<void> | void;
  failJob(jobId: string, error: string, retryable?: boolean): Promise<void> | void;

  // Repository Scans & Dependency Mapping
  saveScanResult(tenantId: string, repositoryId: string, result: RepositoryScanResult): Promise<void> | void;
  getLatestScanResult(tenantId: string, repositoryId: string): Promise<RepositoryScanResult | null> | RepositoryScanResult | null;
}
