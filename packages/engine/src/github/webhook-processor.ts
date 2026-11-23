import { ProofArtifact } from '@patchversion/shared';
import { IPersistenceStore } from '../db/store-interface';
import {
  extractWebhookEventTime,
  isOutOfOrderWebhookEvent,
  webhookInstallationId,
} from './webhook-security';

export interface WebhookProcessResult {
  handled: boolean;
  ignoredReason?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export async function processVerifiedGitHubWebhook(options: {
  db: IPersistenceStore;
  event: string;
  payload: Record<string, unknown>;
}): Promise<WebhookProcessResult> {
  const { db, event, payload } = options;
  const githubInstallationId = webhookInstallationId(payload);
  const incomingEventTime = extractWebhookEventTime(payload);

  if (githubInstallationId !== null) {
    const inst = await db.getInstallationByGithubId(githubInstallationId);
    if (inst) {
      const last = inst.lastEventAt ? new Date(inst.lastEventAt).getTime() : null;
      if (isOutOfOrderWebhookEvent(incomingEventTime, last)) {
        return { handled: false, ignoredReason: 'out_of_order' };
      }
    }
  }

  if (event === 'installation') {
    if (githubInstallationId === null) {
      return { handled: false, ignoredReason: 'missing_installation' };
    }
    const inst = await db.getInstallationByGithubId(githubInstallationId);
    if (!inst) {
      return { handled: false, ignoredReason: 'unknown_installation' };
    }
    if (payload.action === 'deleted') {
      await db.updateInstallationStatus(inst.tenantId, githubInstallationId, 'deleted', incomingEventTime ?? undefined);
    } else if (payload.action === 'suspend') {
      await db.updateInstallationStatus(inst.tenantId, githubInstallationId, 'suspended', incomingEventTime ?? undefined);
    } else if (payload.action === 'unsuspend') {
      await db.updateInstallationStatus(inst.tenantId, githubInstallationId, 'active', incomingEventTime ?? undefined);
    }
    return { handled: true };
  }

  if (event === 'installation_repositories' || (event === 'repository' && payload.action === 'deleted')) {
    if (githubInstallationId === null) {
      return { handled: false, ignoredReason: 'missing_installation' };
    }
    const inst = await db.getInstallationByGithubId(githubInstallationId);
    if (!inst || inst.status === 'deleted') {
      return { handled: false, ignoredReason: 'installation_not_active' };
    }
    const removed = [
      ...(Array.isArray(payload.repositories_removed) ? payload.repositories_removed : []),
      event === 'repository' ? payload.repository : null,
    ].filter(Boolean) as Array<{ id?: number; full_name?: string }>;
    for (const item of removed) {
      if (typeof item.id === 'number' && db.revokeRepositoryByGithubId) {
        await db.revokeRepositoryByGithubId(inst.tenantId, item.id);
      } else if (item.full_name) {
        const repo = await db.getRepository(inst.tenantId, item.full_name);
        if (repo && db.revokeRepository) {
          await db.revokeRepository(inst.tenantId, repo.id);
        }
      }
    }
    return { handled: true };
  }

  if (event === 'check_run' || event === 'check_suite') {
    const node = asRecord(event === 'check_run' ? payload.check_run : payload.check_suite);
    if (payload.action !== 'completed' || typeof node?.head_sha !== 'string') {
      return { handled: false, ignoredReason: 'not_completed' };
    }
    if (!db.getPullRequestByCommitSha) {
      return { handled: false, ignoredReason: 'unsupported_store' };
    }
    if (githubInstallationId === null) {
      return { handled: false, ignoredReason: 'missing_installation' };
    }
    const pr = await db.getPullRequestByCommitSha(node.head_sha);
    if (!pr) {
      return { handled: false, ignoredReason: 'unknown_pull_request' };
    }
    const inst = await db.getInstallationByGithubId(githubInstallationId);
    if (!inst || inst.tenantId !== pr.tenantId) {
      return { handled: false, ignoredReason: 'installation_tenant_mismatch' };
    }
    const conclusion = typeof node.conclusion === 'string' ? node.conclusion : '';
    const status = conclusion === 'success' ? 'passed' : 'failed';
    await db.saveValidation(pr.tenantId, pr.patchId, {
      status,
      proof: {
        type: event === 'check_run' ? 'github_actions_ci' : 'github_actions_suite',
        checkRunId: node.id,
        checkSuiteId: node.id,
        name: node.name,
        conclusion,
        htmlUrl: node.html_url,
        headSha: node.head_sha,
        completedAt: (typeof node.completed_at === 'string' ? node.completed_at : null) || new Date().toISOString(),
      } as unknown as ProofArtifact,
      executionLogs: `GitHub Actions ${event} finished with conclusion: ${conclusion}`,
      durationMs: 0,
    });
    if (status === 'passed') {
      const finding = await db.getFinding(pr.tenantId, pr.findingId);
      if (finding && finding.status !== 'validated') {
        await db.saveFinding(pr.tenantId, pr.repositoryId, {
          ...finding,
          status: 'validated',
        });
      }
    }
    return { handled: true };
  }

  if (event === 'pull_request') {
    const prPayload = asRecord(payload.pull_request);
    const headSha = asRecord(prPayload?.head)?.sha;
    if (payload.action !== 'closed' || typeof headSha !== 'string') {
      return { handled: false, ignoredReason: 'not_closed' };
    }
    if (!db.getPullRequestByCommitSha || !db.updatePullRequestStatus) {
      return { handled: false, ignoredReason: 'unsupported_store' };
    }
    if (githubInstallationId === null) {
      return { handled: false, ignoredReason: 'missing_installation' };
    }
    const pr = await db.getPullRequestByCommitSha(headSha);
    if (!pr) {
      return { handled: false, ignoredReason: 'unknown_pull_request' };
    }
    const prInst = await db.getInstallationByGithubId(githubInstallationId);
    if (!prInst || prInst.tenantId !== pr.tenantId) {
      return { handled: false, ignoredReason: 'installation_tenant_mismatch' };
    }
    const status = prPayload?.merged ? 'merged' : 'closed';
    await db.updatePullRequestStatus(pr.tenantId, pr.id, status);
    return { handled: true };
  }

  return { handled: false, ignoredReason: 'no_mutation' };
}
