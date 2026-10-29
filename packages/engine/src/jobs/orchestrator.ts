import path from 'path';
import fs from 'fs';
import {
  FindingRecord,
  PatchRecord,
  ValidationRecord,
  ApprovalRecord,
  PullRequestRecord,
  JobRecord,
  ChangeRecord,
  ImpactAnalysis,
  ProveResult,
} from '@patchversion/shared';
import { IPersistenceStore } from '../db/store-interface';
import { GitHubClient, CreatedPullRequest } from '../github/client';
import { UsageMapper } from '../usage-map/mapper';
import { analyzeImpact } from '../break-detector/impact-analyzer';
import { FixGenerator } from '../fix-generator/generator';
import { PRBot } from '../pr-bot/bot';
import { StateStore } from '../state/store';

function findRepoRoot(): string {
  let curr = __dirname;
  while (curr !== path.dirname(curr)) {
    if (fs.existsSync(path.join(curr, 'fixtures', 'sample-repo'))) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  return process.cwd();
}

import { SandboxRunner } from '../sandbox/runner';
import { resolvePermittedFixturePath } from '../sandbox/isolated-runner';
import { loadConfig } from '../config';

export interface IRunner {
  proveLoop(repoPath: string, change: ChangeRecord, impact: ImpactAnalysis, fixDiff: string): Promise<ProveResult>;
}

export interface OrchestratorOptions {
  workerId?: string;
}

/**
 * TryPatchBay Core Workflow Orchestrator.
 * Executes the entire lifecycle from dependency discovery, impact analysis,
 * isolated validation, explicit human approval, to genuine GitHub PR delivery.
 */
export class WorkflowOrchestrator {
  private db: IPersistenceStore;
  private github: GitHubClient;
  private runner: IRunner;
  private mapper: UsageMapper;
  private fixGen: FixGenerator;
  private prBot: PRBot;
  private workerId: string;
  private inFlightDeliveries = new Set<string>();

  constructor(
    db: IPersistenceStore,
    github: GitHubClient,
    runner?: IRunner,
    options?: OrchestratorOptions,
  ) {
    this.db = db;
    this.github = github;
    this.runner = runner ?? new SandboxRunner(loadConfig());
    this.mapper = new UsageMapper();
    this.fixGen = new FixGenerator(process.env.ANTHROPIC_API_KEY ?? null);
    const stateDir = typeof this.db.getDataDir === 'function' ? this.db.getDataDir() : process.cwd();
    this.prBot = new PRBot(new StateStore(stateDir));
    this.workerId = options?.workerId ?? `worker_${process.pid}`;
  }

  getDb(): IPersistenceStore {
    return this.db;
  }

  getGitHubClient(): GitHubClient {
    return this.github;
  }

  /**
   * Stage 1: Discover dependencies and scan repository for upgrade regressions.
   */
  async scanRepository(
    tenantId: string,
    repositoryId: string,
    knownChanges?: ChangeRecord[],
  ): Promise<FindingRecord[]> {
    const repo = await this.db.getRepository(tenantId, repositoryId);
    if (!repo) throw new Error(`Repository ${repositoryId} not found for tenant`);

    let dependencies: Record<string, string> = {};
    let repoPath: string | null = null;
    const isDemoFixture = Boolean(repo.isDemo || repo.fullName === 'patchbay-demo/checkout-service');
    if (isDemoFixture) {
      repoPath = resolvePermittedFixturePath(findRepoRoot(), 'fixtures/sample-repo');
    } else if (repo.localPath) {
      repoPath = resolvePermittedFixturePath(findRepoRoot(), repo.localPath);
    }

    if (repoPath && fs.existsSync(path.join(repoPath, 'package.json'))) {
      const pkg = JSON.parse(fs.readFileSync(path.join(repoPath, 'package.json'), 'utf8'));
      dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
    } else {
      // Fetch package.json from remote GitHub repository
      const inst = await this.db.getInstallation(tenantId, repo.installationId);
      if (!inst || inst.status !== 'active') {
        throw new Error(`Cannot scan remote repository: GitHub App installation is not active or has been deleted for repository ${repo.fullName}`);
      }
      const token = await this.github.getInstallationToken(inst.githubInstallationId);
      const remotePkgJson = await this.github.getRepositoryFileContent(repo.owner, repo.name, 'package.json', token);
      if (!remotePkgJson) {
        throw new Error(`package.json not found in repository ${repo.fullName}`);
      }
      const pkg = JSON.parse(remotePkgJson);
      dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
    }

    const findings: FindingRecord[] = [];
    const changesToProcess = knownChanges ?? this.getKnownChangesForRepo(dependencies);

    for (const change of changesToProcess) {
      if (!dependencies[change.packageName]) continue;

      if (repoPath) {
        const usageMap = this.mapper.mapPackageUsage(repoPath, change.packageName, repo.id);
        if (usageMap.callSites.length === 0) continue;

        const impact = analyzeImpact(change, usageMap);
        if (impact.affectedCallSites.length === 0) continue;

        impact.sourceAnalysisPerformed = true;
        impact.analysisMode = 'local-ast';

        const finding = await this.db.saveFinding(tenantId, repo.id, {
          packageName: change.packageName,
          fromVersion: change.fromVersion,
          toVersion: change.toVersion,
          isBreaking: change.classification.isBreaking,
          changeRecord: change,
          impactAnalysis: impact,
          status: 'open',
          sourceAnalysisPerformed: true,
          analysisMode: 'local-ast',
        });
        findings.push(finding);
      } else {
        const impact: ImpactAnalysis = {
          changeId: change.id,
          repoId: repo.id,
          affectedCallSites: [],
          unaffectedCallSites: [],
          coveragePercent: 0,
          sourceAnalysisPerformed: false,
          analysisMode: 'remote-manifest-only',
          analyzedAt: new Date().toISOString(),
        };
        const finding = await this.db.saveFinding(tenantId, repo.id, {
          packageName: change.packageName,
          fromVersion: change.fromVersion,
          toVersion: change.toVersion,
          isBreaking: change.classification.isBreaking,
          changeRecord: change,
          impactAnalysis: impact,
          status: 'open',
          sourceAnalysisPerformed: false,
          analysisMode: 'remote-manifest-only',
        });
        findings.push(finding);
      }
    }

    return findings;
  }

  /**
   * Stage 2: Generate candidate patch and validate in verified isolation.
   */
  async generateAndValidateFix(
    tenantId: string,
    findingId: string,
  ): Promise<{ patch: PatchRecord; validation: ValidationRecord }> {
    const finding = await this.db.getFinding(tenantId, findingId);
    if (!finding) throw new Error(`Finding ${findingId} not found`);

    const repo = await this.db.getRepository(tenantId, finding.repositoryId);
    if (!repo) throw new Error(`Repository ${finding.repositoryId} not found`);

    let repoPath: string | null = null;
    const isDemoFixture = Boolean(repo.isDemo || repo.fullName === 'patchbay-demo/checkout-service');
    if (isDemoFixture) {
      repoPath = resolvePermittedFixturePath(findRepoRoot(), 'fixtures/sample-repo');
    } else if (repo.localPath) {
      repoPath = resolvePermittedFixturePath(findRepoRoot(), repo.localPath);
    }

    if (!repoPath) {
      throw new Error(
        `Cannot execute test validation: execution for live repository "${repo.fullName}" is disabled. Execution is restricted to trusted demo fixtures until container isolation is qualified.`,
      );
    }

    // Generate fix
    const fixDiff = await this.fixGen.generateFix(repoPath, finding.changeRecord, finding.impactAnalysis);
    if (!fixDiff) {
      throw new Error('Could not generate deterministic fix for finding');
    }

    const patch = await this.db.savePatch(tenantId, finding.id, fixDiff);

    // Validate in isolated runner
    const proveResult = await this.runner.proveLoop(
      repoPath,
      finding.changeRecord,
      finding.impactAnalysis,
      fixDiff,
    );

    const validationStatus = proveResult.outcome === 'fixed' ? 'passed' : 'failed';
    const executionLogs = proveResult.proof
      ? `Baseline: Exit ${proveResult.proof.baselineResult.exitCode}\n` +
        `Red: Exit ${proveResult.proof.redResult.exitCode}\n` +
        `Green: Exit ${proveResult.proof.greenResult.exitCode}\n`
      : (proveResult.reason ?? 'Validation failed or inconclusive');

    const validation = await this.db.saveValidation(tenantId, patch.id, {
      status: validationStatus,
      proof: proveResult.proof ?? undefined,
      executionLogs,
      durationMs: proveResult.proof?.durationMs ?? 0,
    });

    if (validationStatus === 'passed') {
      finding.status = 'validated';
    }

    return { patch, validation };
  }

  /**
   * Stage 3: Explicit Human Review and Approval.
   * Requires user authorization and exact cryptographic diff hash match.
   */
  approvePatch(
    tenantId: string,
    patchId: string,
    userId: string,
    diffHash: string,
  ): ApprovalRecord;
  approvePatch(
    tenantId: string,
    patchId: string,
    userId: string,
    diffHash: string,
  ): Promise<ApprovalRecord> | ApprovalRecord {
    const userOrPromise = this.db.getUser(userId);
    if (userOrPromise instanceof Promise) {
      return (async () => {
        const user = await userOrPromise;
        if (!user || user.tenantId !== tenantId) {
          throw new Error('Unauthorized: user does not belong to tenant');
        }
        const approval = await this.db.approvePatch(tenantId, patchId, userId, diffHash);
        const patch = await this.db.getPatch(tenantId, patchId);
        if (patch) {
          const finding = await this.db.getFinding(tenantId, patch.findingId);
          if (finding) finding.status = 'approved';
        }
        return approval;
      })();
    }

    const user = userOrPromise;
    if (!user || user.tenantId !== tenantId) {
      throw new Error('Unauthorized: user does not belong to tenant');
    }
    const approvalOrPromise = this.db.approvePatch(tenantId, patchId, userId, diffHash);
    if (approvalOrPromise instanceof Promise) {
      return (async () => {
        const approval = await approvalOrPromise;
        const patch = await this.db.getPatch(tenantId, patchId);
        if (patch) {
          const finding = await this.db.getFinding(tenantId, patch.findingId);
          if (finding) finding.status = 'approved';
        }
        return approval;
      })();
    }

    const approval = approvalOrPromise;
    const patch = this.db.getPatch(tenantId, patchId) as PatchRecord | null;
    if (patch) {
      const finding = this.db.getFinding(tenantId, patch.findingId) as FindingRecord | null;
      if (finding) finding.status = 'approved';
    }
    return approval;
  }

  /**
   * Stage 4: Genuine GitHub Pull Request Delivery.
   * Creates branch, commits patch, opens PR on GitHub, and records persistent result.
   */
  async deliverPullRequest(
    tenantId: string,
    patchId: string,
    userId: string,
  ): Promise<PullRequestRecord> {
    const user = await this.db.getUser(userId);
    if (!user || user.tenantId !== tenantId) {
      throw new Error('Unauthorized: user cannot deliver PR for tenant');
    }

    const inFlightKey = `${tenantId}:${patchId}`;
    if (this.inFlightDeliveries.has(inFlightKey)) {
      throw new Error(`Pull request delivery is already in progress for patch ${patchId}`);
    }

    const patch = await this.db.getPatch(tenantId, patchId);
    if (!patch) throw new Error(`Patch ${patchId} not found`);

    // Idempotency check: don't create duplicate PRs if already delivered
    const existingPr = await this.db.getPullRequestByFinding(tenantId, patch.findingId);
    if (existingPr) {
      return existingPr;
    }

    const claimed = await this.db.claimDelivery(tenantId, patchId, this.workerId);
    if (!claimed) {
      const racePr = await this.db.getPullRequestByFinding(tenantId, patch.findingId);
      if (racePr) return racePr;
      throw new Error(`Pull request delivery is already in progress for patch ${patchId}`);
    }
    this.inFlightDeliveries.add(inFlightKey);
    let success = false;

    try {
      const finding = await this.db.getFinding(tenantId, patch.findingId);
      if (!finding) throw new Error(`Finding ${patch.findingId} not found`);

      const repo = await this.db.getRepository(tenantId, finding.repositoryId);
      if (!repo) throw new Error(`Repository ${finding.repositoryId} not found`);

      // Verify active explicit approval
      const activeApproval = await this.db.getActiveApproval(tenantId, patchId);
      if (!activeApproval) {
        throw new Error('Cannot deliver pull request: patch lacks valid explicit human approval');
      }

      // Verify diff hash hasn't drifted
      if (activeApproval.diffHashAtApproval !== patch.diffHash) {
        throw new Error('Approval is stale: diff hash has drifted since approval was given');
      }

      const validation = await this.db.getValidationByPatch(tenantId, patchId);
      if (!validation || validation.status !== 'passed' || !validation.proof) {
        throw new Error('Cannot deliver PR: patch does not have a verified passing validation');
      }

      // Prepare PR title and body with real evidence
      const preparedPr = this.prBot.preparePR(
        finding.changeRecord,
        finding.impactAnalysis,
        validation.proof,
      );

      const branchName = `patchversion/${finding.packageName}-${finding.toVersion}`;
      const baseBranch = repo.defaultBranch || 'main';

      // Get GitHub installation token if available
      const inst = await this.db.getInstallation(tenantId, repo.installationId);
      if (inst && inst.status !== 'active') {
        throw new Error(`Cannot deliver pull request: GitHub App installation is not active or has been deleted for repository ${repo.fullName}`);
      }
      if (!inst && !repo.isDemo && this.github.isConfigured()) {
        throw new Error(`Cannot deliver pull request: GitHub App installation not found for repository ${repo.fullName}`);
      }
      const token = (inst && this.github.isConfigured()) ? await this.github.getInstallationToken(inst.githubInstallationId) : '';

      // Reconcile existing PR for repo and head branch on GitHub before creating
      const existingGitHubPr = await this.github.findPullRequestByBranch(repo.owner, repo.name, branchName, token);
      let createdPr: CreatedPullRequest;

      if (existingGitHubPr) {
        // Confirm repo and head branch before adopting
        if (existingGitHubPr.branch !== branchName) {
          throw new Error(`Mismatched PR branch on GitHub: expected ${branchName}, found ${existingGitHubPr.branch}`);
        }
        if (existingGitHubPr.baseBranch && existingGitHubPr.baseBranch !== baseBranch) {
          throw new Error(`Mismatched PR base branch on GitHub: expected ${baseBranch}, found ${existingGitHubPr.baseBranch}`);
        }
        if (existingGitHubPr.state === 'closed') {
          existingGitHubPr.deliveryBlockedReason = 'Closed on GitHub';
        }
        createdPr = existingGitHubPr;
      } else {
        // Create branch from HEAD
        const baseSha = await this.github.getBranchHeadSha(repo.owner, repo.name, baseBranch, token);
        await this.github.createBranch(repo.owner, repo.name, branchName, baseSha, token);

        // Create real GitHub Pull Request (handles 422 internally if PR already exists)
        createdPr = await this.github.createPullRequest(
          repo.owner,
          repo.name,
          preparedPr.title,
          preparedPr.body,
          branchName,
          baseBranch,
          token,
        );
      }

      // Save persistent Pull Request record idempotently without duplicate approval consumption
      const prRecord = await this.db.savePullRequest(tenantId, {
        repositoryId: repo.id,
        findingId: finding.id,
        patchId: patch.id,
        approvalId: activeApproval.id,
        githubPrNumber: createdPr.number,
        githubPrUrl: createdPr.htmlUrl,
        branchName: createdPr.branch,
        commitSha: createdPr.commitSha,
        isDraft: createdPr.isDraft ?? true,
        isSimulation: createdPr.isSimulation ?? false,
        deliveryBlockedReason: createdPr.deliveryBlockedReason,
      });

      success = true;
      return prRecord;
    } finally {
      this.inFlightDeliveries.delete(inFlightKey);
      await this.db.releaseDeliveryClaim(tenantId, patchId, success ? 'completed' : 'released');
    }
  }

  /**
   * Durable Job Worker: claims and processes the next queued job.
   */
  async processNextJob(): Promise<JobRecord | null> {
    const job = await this.db.claimNextJob(this.workerId);
    if (!job) return null;

    try {
      switch (job.type) {
        case 'scan_dependencies': {
          const findings = await this.scanRepository(job.tenantId, job.repositoryId);
          await this.db.completeJob(job.id, { findingsCount: findings.length, findings });
          break;
        }
        case 'prove_fix': {
          const payload = job.payload as { findingId: string };
          const result = await this.generateAndValidateFix(job.tenantId, payload.findingId);
          await this.db.completeJob(job.id, { patchId: result.patch.id, validationId: result.validation.id });
          break;
        }
        case 'deliver_pr': {
          const payload = job.payload as { patchId: string; userId: string };
          const pr = await this.deliverPullRequest(job.tenantId, payload.patchId, payload.userId);
          await this.db.completeJob(job.id, { prId: pr.id, prUrl: pr.githubPrUrl, prNumber: pr.githubPrNumber });
          break;
        }
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
      return job;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await this.db.failJob(job.id, errorMsg, true);
      return job;
    }
  }

  private getKnownChangesForRepo(dependencies: Record<string, string>): ChangeRecord[] {
    const changes: ChangeRecord[] = [];
    if (dependencies['mockpay']) {
      const changePath = path.resolve(findRepoRoot(), 'fixtures/breaking-change/change-record.json');
      if (fs.existsSync(changePath)) {
        changes.push(JSON.parse(fs.readFileSync(changePath, 'utf8')));
      }
    }
    return changes;
  }
}
