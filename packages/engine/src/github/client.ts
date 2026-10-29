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
  baseBranch?: string;
  commitSha: string;
  title: string;
  body: string;
  state: 'open' | 'closed';
  isDraft?: boolean;
  isSimulation?: boolean;
  deliveryBlockedReason?: string;
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

  setConfig(config: GitHubAppConfig | null): void {
    this.config = config;
  }

  isConfigured(): boolean {
    return Boolean(this.config?.appId && this.config?.privateKey);
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
   * Lists all installations of this GitHub App using App JWT.
   */
  async listAppInstallations(): Promise<Array<{ id: number; account: string; targetType: string }>> {
    if (!this.config) {
      return [
        { id: 176251721, account: 'Nitish-1303', targetType: 'User' },
      ];
    }

    const jwt = this.generateAppJwt();
    const response = await fetch('https://api.github.com/app/installations?per_page=100', {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'TryPatchBay-Engine',
      },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to list app installations: ${response.status} ${err}`);
    }

    const data = await response.json() as Array<{
      id: number;
      account: { login: string; type?: string };
      target_type?: string;
    }>;

    return data.map(i => ({
      id: i.id,
      account: i.account.login,
      targetType: i.target_type ?? i.account.type ?? 'User',
    }));
  }

  /**
   * Lists repositories accessible to an installation.
   */
  async listInstallationRepositories(installationId: number): Promise<GitHubRepoInfo[]> {
    if (!this.config) {
      if (this.mockRepositories.size > 0) {
        return Array.from(this.mockRepositories.values());
      }
      return [
        {
          id: 98765432,
          name: 'CipherBill',
          fullName: 'Nitish-1303/CipherBill',
          owner: 'Nitish-1303',
          defaultBranch: 'main',
          isPrivate: false,
          htmlUrl: 'https://github.com/Nitish-1303/CipherBill',
        },
      ];
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
   * Fetches file content from a GitHub repository via contents API.
   * Returns string content, or null if file not found (404).
   */
  async getRepositoryFileContent(
    owner: string,
    repo: string,
    filePath: string,
    token: string,
    ref?: string,
  ): Promise<string | null> {
    if (!this.config) {
      // In offline/mock mode, provide mock package.json for CipherBill if requested
      if (repo.toLowerCase() === 'cipherbill' && filePath === 'package.json') {
        return JSON.stringify({
          name: 'cipherbill',
          version: '0.1.0',
          private: true,
          dependencies: {
            '@react-three/drei': '^9.114.3',
            '@react-three/fiber': '^8.17.10',
            '@starknet-io/get-starknet-discovery': '^6.0.3',
            '@starknet-io/get-starknet-wallet-standard': '^6.0.3',
            '@starknet-io/types-js': '^0.10.3',
            'framer-motion': '^13.1.1',
            next: '^15.4.6',
            react: '^18.3.1',
            'react-dom': '^18.3.1',
            starknet: '^10.4.0',
            three: '^0.169.0',
          },
          devDependencies: {
            '@types/node': '^22.17.2',
            '@types/react': '^18.3.24',
            '@types/react-dom': '^18.3.7',
            '@types/three': '^0.185.4',
            eslint: '^9.33.0',
            'eslint-config-next': '^15.4.6',
            typescript: '^5.9.2',
            vitest: '^4.1.11',
          },
        }, null, 2);
      }
      return null;
    }

    const url = new URL(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`);
    if (ref) url.searchParams.set('ref', ref);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'TryPatchBay-Engine',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to get file ${filePath} from ${owner}/${repo}: ${response.status} ${err}`);
    }

    const data = await response.json() as { content?: string; encoding?: string };
    if (!data.content) return null;
    if (data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf8');
    }
    return data.content;
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
   * Finds an existing Pull Request by head branch name.
   */
  async findPullRequestByBranch(
    owner: string,
    repo: string,
    headBranch: string,
    token: string,
  ): Promise<CreatedPullRequest | null> {
    if (!this.config) {
      const prKey = `${owner}/${repo}#${headBranch}`;
      return this.mockPullRequests.get(prKey) ?? null;
    }

    try {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls?head=${encodeURIComponent(`${owner}:${headBranch}`)}&state=all`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'TryPatchBay-Engine',
          },
        },
      );

      if (!res.ok) {
        return null;
      }

      const pulls = (await res.json()) as Array<{
        number: number;
        url: string;
        html_url: string;
        head: { sha: string; ref: string };
        base?: { ref: string };
        title: string;
        body: string;
        state: 'open' | 'closed';
        draft?: boolean;
      }>;

      if (!Array.isArray(pulls) || pulls.length === 0) {
        const fallbackRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/pulls?head=${encodeURIComponent(headBranch)}&state=all`,
          {
            headers: {
              Authorization: `token ${token}`,
              Accept: 'application/vnd.github.v3+json',
              'User-Agent': 'TryPatchBay-Engine',
            },
          },
        );
        if (fallbackRes.ok) {
          const fallbackPulls = (await fallbackRes.json()) as typeof pulls;
          if (Array.isArray(fallbackPulls) && fallbackPulls.length > 0) {
            const match = fallbackPulls[0];
            return {
              number: match.number,
              url: match.url,
              htmlUrl: match.html_url,
              branch: match.head.ref,
              baseBranch: match.base?.ref,
              commitSha: match.head.sha,
              title: match.title,
              body: match.body,
              state: match.state,
              isDraft: match.draft ?? false,
            };
          }
        }
        return null;
      }

      const match = pulls[0];
      return {
        number: match.number,
        url: match.url,
        htmlUrl: match.html_url,
        branch: match.head.ref,
        baseBranch: match.base?.ref,
        commitSha: match.head.sha,
        title: match.title,
        body: match.body,
        state: match.state,
        isDraft: match.draft ?? false,
      };
    } catch {
      return null;
    }
  }

  /**
   * Registers a mock pull request for testing and simulation.
   */
  registerMockPullRequest(owner: string, repo: string, headBranch: string, pr: CreatedPullRequest): void {
    const prKey = `${owner}/${repo}#${headBranch}`;
    this.mockPullRequests.set(prKey, pr);
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
        isDraft: true,
        isSimulation: true,
        deliveryBlockedReason: 'Real GitHub delivery blocked: GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY are not configured.',
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
        draft: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      // On 422 Unprocessable Entity ("A pull request already exists for ..."), recover by finding and adopting the existing PR
      if (response.status === 422 && (err.includes('already exists') || err.includes('A pull request already exists'))) {
        const existing = await this.findPullRequestByBranch(owner, repo, headBranch, token);
        if (existing) {
          return existing;
        }
      }
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
    if (!secret || secret.trim().length === 0) {
      return false;
    }
    if (!signature || typeof signature !== 'string') return false;
    if (!signature.startsWith('sha256=')) return false;
    const hash = signature.slice(7);
    if (hash.length !== 64 || !/^[0-9a-f]{64}$/i.test(hash)) {
      return false;
    }

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
