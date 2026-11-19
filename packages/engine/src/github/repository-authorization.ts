import { InstallationRecord, RepositoryRecord } from '@patchversion/shared';
import { IPersistenceStore } from '../db/store-interface';
import { GitHubClient } from './client';

export class RepositoryAuthorizationError extends Error {
  code:
    | 'REPOSITORY_NOT_FOUND'
    | 'REPOSITORY_REVOKED'
    | 'INSTALLATION_INACTIVE'
    | 'INSTALLATION_NOT_LINKED'
    | 'CROSS_TENANT_REPOSITORY'
    | 'REPOSITORY_NOT_ON_INSTALLATION'
    | 'INSUFFICIENT_GITHUB_PERMISSIONS'
    | 'GITHUB_API_FAILURE';

  constructor(
    code: RepositoryAuthorizationError['code'],
    message: string,
  ) {
    super(message);
    this.name = 'RepositoryAuthorizationError';
    this.code = code;
  }
}

export function installationCanCreatePullRequests(permissions: Record<string, string> | undefined): boolean {
  if (!permissions || Object.keys(permissions).length === 0) {
    return false;
  }
  const contents = permissions.contents;
  const pullRequests = permissions.pull_requests;
  return (contents === 'write' || contents === 'admin') && (pullRequests === 'write' || pullRequests === 'admin');
}

export function installationCanReadContents(permissions: Record<string, string> | undefined): boolean {
  if (!permissions || Object.keys(permissions).length === 0) {
    return false;
  }
  const contents = permissions.contents;
  return contents === 'read' || contents === 'write' || contents === 'admin';
}

export async function authorizeTenantRepository(options: {
  db: IPersistenceStore;
  tenantId: string;
  repositoryId: string;
  github?: GitHubClient | null;
  revalidateRemote?: boolean;
  requirePullRequestPermissions?: boolean;
}): Promise<{ repo: RepositoryRecord; installation: InstallationRecord | null }> {
  const repo = await options.db.getRepository(options.tenantId, options.repositoryId);
  if (!repo) {
    throw new RepositoryAuthorizationError(
      'REPOSITORY_NOT_FOUND',
      `Repository ${options.repositoryId} not found for tenant`,
    );
  }
  if (repo.tenantId !== options.tenantId) {
    throw new RepositoryAuthorizationError(
      'CROSS_TENANT_REPOSITORY',
      'Repository does not belong to the authenticated tenant',
    );
  }
  if (repo.status === 'revoked' || repo.status === 'disconnected') {
    throw new RepositoryAuthorizationError(
      'REPOSITORY_REVOKED',
      `Repository ${repo.fullName} is no longer authorized`,
    );
  }

  const installation = repo.installationId
    ? await options.db.getInstallation(options.tenantId, repo.installationId)
    : null;

  if (repo.isDemo) {
    return { repo, installation };
  }

  if (!installation || installation.tenantId !== options.tenantId) {
    throw new RepositoryAuthorizationError(
      'INSTALLATION_NOT_LINKED',
      `GitHub App installation is not linked to tenant for repository ${repo.fullName}`,
    );
  }
  if (installation.status !== 'active') {
    throw new RepositoryAuthorizationError(
      'INSTALLATION_INACTIVE',
      `GitHub App installation is ${installation.status} for repository ${repo.fullName}`,
    );
  }

  const github = options.github;
  if (github?.isConfigured() && options.revalidateRemote && !repo.localPath) {
    try {
      const remote = await github.getAppInstallation(installation.githubInstallationId);
      if (!remote || remote.suspended) {
        await options.db.updateInstallationStatus(
          options.tenantId,
          installation.githubInstallationId,
          remote ? 'suspended' : 'deleted',
        );
        throw new RepositoryAuthorizationError(
          'INSTALLATION_INACTIVE',
          `GitHub App installation is not active for repository ${repo.fullName}`,
        );
      }
      const accessible = await github.listInstallationRepositories(installation.githubInstallationId);
      const stillPresent = accessible.some((item) => item.id === repo.githubRepoId);
      if (!stillPresent) {
        if (options.db.revokeRepository) {
          await options.db.revokeRepository(options.tenantId, repo.id);
        }
        throw new RepositoryAuthorizationError(
          'REPOSITORY_NOT_ON_INSTALLATION',
          `Repository ${repo.fullName} is not accessible on the authorized installation`,
        );
      }
      if (options.requirePullRequestPermissions) {
        const access = await github.getInstallationAccess(installation.githubInstallationId);
        if (!installationCanCreatePullRequests(access.permissions)) {
          throw new RepositoryAuthorizationError(
            'INSUFFICIENT_GITHUB_PERMISSIONS',
            'GitHub App installation lacks contents:write and pull_requests:write',
          );
        }
      }
    } catch (err) {
      if (err instanceof RepositoryAuthorizationError) throw err;
      throw new RepositoryAuthorizationError(
        'GITHUB_API_FAILURE',
        `GitHub authorization revalidation failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  } else if (options.requirePullRequestPermissions && github?.isConfigured() && installation) {
    try {
      const access = await github.getInstallationAccess(installation.githubInstallationId);
      if (access.permissions && Object.keys(access.permissions).length > 0) {
        if (!installationCanCreatePullRequests(access.permissions)) {
          throw new RepositoryAuthorizationError(
            'INSUFFICIENT_GITHUB_PERMISSIONS',
            'GitHub App installation lacks contents:write and pull_requests:write',
          );
        }
      }
    } catch (err) {
      if (err instanceof RepositoryAuthorizationError) throw err;
      throw new RepositoryAuthorizationError(
        'GITHUB_API_FAILURE',
        `GitHub permission check failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { repo, installation };
}
