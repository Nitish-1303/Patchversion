import crypto from 'crypto';

export interface GitHubAppConfig {
  appId: string;
  privateKey: string;
  webhookSecret: string;
  clientId?: string;
  clientSecret?: string;
}

export interface GitHubRepoInfo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  isPrivate: boolean;
  htmlUrl: string;
}

export interface CreatedPullRequest {
  number: number;
  url: string;
  htmlUrl: string;
  branch: string;
  commitSha: string;
  title: string;
  body: string;
  state: 'open' | 'closed';
}

/**
 * Robust GitHub API Client for TryPatchBay.
 * Supports GitHub App JWT authentication, installation tokens,
 * repository discovery, branch creation, commit creation, and real PR creation.
 * Also provides an in-memory test provider for unit tests and disposable sandbox environments.
 */
export class GitHubClient {
  private config: GitHubAppConfig | null;
  private tokenCache: Map<number, { token: string; expiresAt: number }> = new Map();
  private mockRepositories: Map<string, GitHubRepoInfo> = new Map();
  private mockPullRequests: Map<string, CreatedPullRequest> = new Map();

  constructor(config?: GitHubAppConfig | null) {
    this.config = config ?? null;
  }

  /**
   * Generates a signed RS256 JWT for GitHub App authentication.
   */
  generateAppJwt(): string {
    if (!this.config?.appId || !this.config?.privateKey) {
      throw new Error('GitHub App ID and private key must be configured to generate App JWT');
    }

    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60, // 60 seconds in the past for clock drift
      exp: now + (9 * 60), // 9 minutes expiration (max 10 minutes)
      iss: this.config.appId,
    };

    const encodeBase64Url = (obj: object): string => {
      return Buffer.from(JSON.stringify(obj))
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    };

    const encodedHeader = encodeBase64Url(header);
    const encodedPayload = encodeBase64Url(payload);
    const message = `${encodedHeader}.${encodedPayload}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(message);
    const signature = signer.sign(this.config.privateKey, 'base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${message}.${signature}`;
  }

  /**
   * Gets an installation access token for a given GitHub App installation ID.
   */
  async getInstallationToken(installationId: number): Promise<string> {
    const cached = this.tokenCache.get(installationId);
    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return cached.token;
    }

    if (!this.config) {
      // In mock/test mode without credentials, return mock token
      return `mock_token_${installationId}`;
    }

    const jwt = this.generateAppJwt();
    const response = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'TryPatchBay-Engine',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to get installation token for ${installationId}: ${response.status} ${errText}`);
    }

    const data = await response.json() as { token: string; expires_at: string };
    const expiresAt = new Date(data.expires_at).getTime();
    this.tokenCache.set(installationId, { token: data.token, expiresAt });
    return data.token;
  }

  /**
   * Lists repositories accessible to an installation.
   */
  async listInstallationRepositories(installationId: number): Promise<GitHubRepoInfo[]> {
    if (!this.config) {
      // Return configured mock repositories or default disposable mock repo
      return Array.from(this.mockRepositories.values());
    }

    const token = await this.getInstallationToken(installationId);
    const response = await fetch('https://api.github.com/installation/repositories?per_page=100', {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'TryPatchBay-Engine',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list installation repositories: ${response.status}`);
    }

    const data = await response.json() as {
      repositories: Array<{
        id: number;
        name: string;
        full_name: string;
        owner: { login: string };
        default_branch: string;
        private: boolean;
        html_url: string;
      }>;
    };

    return data.repositories.map(r => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      owner: r.owner.login,
      defaultBranch: r.default_branch,
      isPrivate: r.private,
      htmlUrl: r.html_url,
    }));
  }

  /**
   * Fetches the SHA of the HEAD of a branch.
   */
  async getBranchHeadSha(owner: string, repo: string, branch: string, token: string): Promise<string> {
    if (!this.config) {
      return '0000000000000000000000000000000000000001';
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'TryPatchBay-Engine',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get ref for branch ${branch}: ${response.status}`);
    }

    const data = await response.json() as { object: { sha: string } };
    return data.object.sha;
  }

  /**
   * Creates a new branch on the remote repository.
   */
  async createBranch(owner: string, repo: string, branch: string, baseSha: string, token: string): Promise<void> {
    if (!this.config) {
      return;
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'TryPatchBay-Engine',
      },
      body: JSON.stringify({
        ref: `refs/heads/${branch}`,
        sha: baseSha,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      // If branch already exists (422), continue safely
      if (response.status !== 422) {
        throw new Error(`Failed to create branch ${branch}: ${response.status} ${err}`);
      }
    }
  }

  /**
   * Creates a genuine Pull Request on GitHub.
   */
  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    body: string,
    headBranch: string,
    baseBranch: string,
    token: string,
  ): Promise<CreatedPullRequest> {
    if (!this.config) {
      // Mock / Offline mode PR creation
      const prKey = `${owner}/${repo}#${headBranch}`;
      if (this.mockPullRequests.has(prKey)) {
        return this.mockPullRequests.get(prKey)!;
      }

      const mockNumber = Math.floor(100 + Math.random() * 900);
      const mockPr: CreatedPullRequest = {
        number: mockNumber,
        url: `https://api.github.com/repos/${owner}/${repo}/pulls/${mockNumber}`,
        htmlUrl: `https://github.com/${owner}/${repo}/pull/${mockNumber}`,
        branch: headBranch,
        commitSha: 'mock_sha_' + crypto.randomUUID().slice(0, 8),
        title,
        body,
        state: 'open',
      };
      this.mockPullRequests.set(prKey, mockPr);
      return mockPr;
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'TryPatchBay-Engine',
      },
      body: JSON.stringify({
        title,
        body,
        head: headBranch,
        base: baseBranch,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`GitHub PR creation failed with ${response.status}: ${err}`);
    }

    const data = await response.json() as {
      number: number;
      url: string;
      html_url: string;
      head: { sha: string; ref: string };
      title: string;
      body: string;
      state: 'open' | 'closed';
    };

    return {
      number: data.number,
      url: data.url,
      htmlUrl: data.html_url,
      branch: data.head.ref,
      commitSha: data.head.sha,
      title: data.title,
      body: data.body,
      state: data.state,
    };
  }

  /**
   * Registers a mock repository for local verification and testing.
   */
  registerMockRepo(repo: GitHubRepoInfo): void {
    this.mockRepositories.set(repo.fullName, repo);
  }

  /**
   * Verifies an incoming webhook HMAC signature.
   */
  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
    const secret = this.config?.webhookSecret;
    if (!secret) return true;
    if (!signature || !signature.startsWith('sha256=')) return false;

    const expected = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);

    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  }
}
