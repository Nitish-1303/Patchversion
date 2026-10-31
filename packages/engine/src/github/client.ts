import crypto from 'crypto';
import {
  GitHubTransport,
  NetworkGitHubTransport,
  OfflineMockTransport,
  GitHubAppNotConfiguredError,
  RepositoryTreeTruncatedError,
  UnhandledMockRequestError,
} from './transport';

export {
  type GitHubTransport,
  NetworkGitHubTransport,
  OfflineMockTransport,
  GitHubAppNotConfiguredError,
  RepositoryTreeTruncatedError,
  UnhandledMockRequestError,
};

export interface GitHubAppConfig {
  appId: string;
  privateKey: string;
  webhookSecret: string;
  clientId?: string;
  clientSecret?: string;
  transport?: GitHubTransport;
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
 * All HTTP requests route exclusively through an injectable GitHubTransport.
 */
export class GitHubClient {
  private config: GitHubAppConfig | null;
  private transport: GitHubTransport;
  private tokenCache: Map<number, { token: string; expiresAt: number }> = new Map();
  private mockPullRequests: Map<string, CreatedPullRequest> = new Map();
  private isTransportExplicitlyInjected = false;

  constructor(config?: GitHubAppConfig | null, transport?: GitHubTransport) {
    this.config = config ?? null;
    if (transport) {
      this.transport = transport;
      this.isTransportExplicitlyInjected = true;
    } else if (config?.transport) {
      this.transport = config.transport;
      this.isTransportExplicitlyInjected = true;
    } else {
      this.transport = new NetworkGitHubTransport();
      this.isTransportExplicitlyInjected = false;
    }
  }

  setTransport(transport: GitHubTransport): void {
    this.transport = transport;
    this.isTransportExplicitlyInjected = true;
  }

  getTransport(): GitHubTransport {
    return this.transport;
  }

  setConfig(config: GitHubAppConfig | null): void {
    this.config = config;
    if (config?.transport) {
      this.transport = config.transport;
      this.isTransportExplicitlyInjected = true;
    }
  }

  isConfigured(): boolean {
    return Boolean(this.config?.appId && this.config?.privateKey);
  }

  /**
   * Generates a signed RS256 JWT for GitHub App authentication.
   */
  generateAppJwt(): string {
    if (!this.config?.appId || !this.config?.privateKey) {
      throw new GitHubAppNotConfiguredError('generateAppJwt');
    }

    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60, // 60 seconds in the past for clock drift
      exp: now + 9 * 60, // 9 minutes expiration (max 10 minutes)
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
    const signature = signer
      .sign(this.config.privateKey, 'base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${message}.${signature}`;
  }

  /**
   * Gets an installation access token for a given GitHub App installation ID.
   * Path 1: POST https://api.github.com/app/installations/:id/access_tokens
   */
  async getInstallationToken(installationId: number): Promise<string> {
    const cached = this.tokenCache.get(installationId);
    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return cached.token;
    }

    if (!this.isConfigured()) {
      throw new GitHubAppNotConfiguredError('getInstallationToken');
    }

    const jwt = this.generateAppJwt();
    const response = await this.transport.fetch(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'TryPatchBay-Engine',
        },
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `Failed to get installation token for ${installationId}: ${response.status} ${errText}`,
      );
    }

    const data = (await response.json()) as { token: string; expires_at: string };
    const expiresAt = new Date(data.expires_at).getTime();
    this.tokenCache.set(installationId, { token: data.token, expiresAt });
    return data.token;
  }

  /**
   * Lists all installations of this GitHub App using App JWT.
   * Path 2: GET https://api.github.com/app/installations?per_page=100
   */
  async listAppInstallations(): Promise<
    Array<{ id: number; account: string; targetType: string }>
  > {
    if (!this.isConfigured()) {
      throw new GitHubAppNotConfiguredError('listAppInstallations');
    }

    const jwt = this.generateAppJwt();
    const response = await this.transport.fetch(
      'https://api.github.com/app/installations?per_page=100',
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'TryPatchBay-Engine',
        },
      },
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to list app installations: ${response.status} ${err}`);
    }

    const data = (await response.json()) as Array<{
      id: number;
      account: { login: string; type?: string };
      target_type?: string;
    }>;

    return data.map((i) => ({
      id: i.id,
      account: i.account.login,
      targetType: i.target_type ?? i.account.type ?? 'User',
    }));
  }

  /**
   * Lists repositories accessible to an installation.
   * Path 3: GET https://api.github.com/installation/repositories?per_page=100
   */
  async listInstallationRepositories(installationId: number): Promise<GitHubRepoInfo[]> {
    if (!this.isConfigured()) {
      throw new GitHubAppNotConfiguredError('listInstallationRepositories');
    }

    const token = await this.getInstallationToken(installationId);
    const response = await this.transport.fetch(
      'https://api.github.com/installation/repositories?per_page=100',
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'TryPatchBay-Engine',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to list installation repositories: ${response.status}`);
    }

    const data = (await response.json()) as {
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

    return data.repositories.map((r) => ({
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
   * Fetches file content from a GitHub repository via contents API or public fallback.
   * Path 4: GET https://api.github.com/repos/:owner/:repo/contents/:path
   * Path 5: GET https://raw.githubusercontent.com/:owner/:repo/:branch/:path (public fallback)
   */
  async getRepositoryFileContent(
    owner: string,
    repo: string,
    filePath: string,
    token?: string,
    ref?: string,
  ): Promise<string | null> {
    const url = new URL(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`);
    if (ref) url.searchParams.set('ref', ref);

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'TryPatchBay-Engine',
    };
    if (token) {
      headers.Authorization = `token ${token}`;
    }

    try {
      const response = await this.transport.fetch(url.toString(), { headers });

      if (response.status === 404) {
        return null;
      }

      if (response.ok) {
        const data = (await response.json()) as { content?: string; encoding?: string };
        if (!data.content) return null;
        if (data.encoding === 'base64') {
          return Buffer.from(data.content, 'base64').toString('utf8');
        }
        return data.content;
      }
    } catch {
      // Fall through to public raw fetch
    }

    // Public fallback to raw.githubusercontent.com for public repositories
    try {
      const targetBranch = ref || 'main';
      const rawRes = await this.transport.fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${targetBranch}/${filePath}`,
        { headers: { 'User-Agent': 'TryPatchBay-Engine' } },
      );
      if (rawRes.ok) {
        return await rawRes.text();
      }
    } catch {
      // ignore
    }

    return null;
  }

  /**
   * Lists file paths in a GitHub repository using the Git tree API.
   * Path 6: GET https://api.github.com/repos/:owner/:repo/git/trees/:ref?recursive=1
   */
  async listRepositoryFiles(
    owner: string,
    repo: string,
    token?: string,
    ref = 'HEAD',
  ): Promise<string[]> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'TryPatchBay-Engine',
    };
    if (token) {
      headers.Authorization = `token ${token}`;
    }

    const encodedOwner = encodeURIComponent(owner);
    const encodedRepo = encodeURIComponent(repo);
    const encodedRef = encodeURIComponent(ref);

    const response = await this.transport.fetch(
      `https://api.github.com/repos/${encodedOwner}/${encodedRepo}/git/trees/${encodedRef}?recursive=1`,
      { headers },
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `Failed to list repository files for ${owner}/${repo} at ref "${ref}": ${response.status} ${errText}`,
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(
        `Failed to parse GitHub Git tree response for ${owner}/${repo} at ref "${ref}": malformed JSON`,
      );
    }

    if (
      typeof data !== 'object' ||
      data === null ||
      !('tree' in data) ||
      !Array.isArray((data as { tree?: unknown }).tree)
    ) {
      throw new Error(
        `Malformed Git tree response for ${owner}/${repo} at ref "${ref}": missing or invalid "tree" array`,
      );
    }

    const treeData = data as {
      tree: unknown[];
      truncated?: boolean;
    };

    if (treeData.truncated) {
      throw new RepositoryTreeTruncatedError(owner, repo, ref);
    }

    const validTreeEntryTypes = new Set(['blob', 'tree', 'commit']);
    const blobPaths: string[] = [];

    for (let i = 0; i < treeData.tree.length; i++) {
      const entry = treeData.tree[i];
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
        throw new Error(
          `Malformed Git tree entry at index ${i} for ${owner}/${repo} at ref "${ref}": entry must be a non-null object`,
        );
      }

      const { path, type } = entry as { path?: unknown; type?: unknown };

      if (typeof path !== 'string' || path.length === 0) {
        throw new Error(
          `Malformed Git tree entry at index ${i} for ${owner}/${repo} at ref "${ref}": "path" must be a non-empty string`,
        );
      }

      if (typeof type !== 'string' || !validTreeEntryTypes.has(type)) {
        throw new Error(
          `Malformed Git tree entry "${path}" for ${owner}/${repo} at ref "${ref}": invalid entry type "${String(type)}" (expected "blob", "tree", or "commit")`,
        );
      }

      if (type === 'blob') {
        blobPaths.push(path);
      }
    }

    return blobPaths;
  }

  /**
   * Fetches the SHA of the HEAD of a branch.
   * Path 7: GET https://api.github.com/repos/:owner/:repo/commits/:branch
   */
  async getBranchHeadSha(
    owner: string,
    repo: string,
    branch: string,
    token?: string,
  ): Promise<string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'TryPatchBay-Engine',
    };
    if (token) {
      headers.Authorization = `token ${token}`;
    }

    try {
      const response = await this.transport.fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`,
        { headers },
      );

      if (response.ok) {
        const data = (await response.json()) as { sha?: string };
        if (data.sha) return data.sha;
      }
    } catch {
      // ignore
    }

    throw new Error(`Failed to get ref for branch ${branch} on ${owner}/${repo}`);
  }

  /**
   * Creates a new branch on the remote repository.
   * Path 8: POST https://api.github.com/repos/:owner/:repo/git/refs
   */
  async createBranch(
    owner: string,
    repo: string,
    branch: string,
    baseSha: string,
    token: string,
  ): Promise<void> {
    const response = await this.transport.fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      {
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
      },
    );

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
   * Path 9: GET https://api.github.com/repos/:owner/:repo/pulls?head=:owner::branch&state=all
   * Path 10: GET https://api.github.com/repos/:owner/:repo/pulls?head=:branch&state=all (fallback)
   */
  async findPullRequestByBranch(
    owner: string,
    repo: string,
    headBranch: string,
    token: string,
  ): Promise<CreatedPullRequest | null> {
    const prKey = `${owner}/${repo}#${headBranch}`;
    if (this.mockPullRequests.has(prKey)) {
      return this.mockPullRequests.get(prKey)!;
    }

    try {
      const res = await this.transport.fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls?head=${encodeURIComponent(
          `${owner}:${headBranch}`,
        )}&state=all`,
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
        const fallbackRes = await this.transport.fetch(
          `https://api.github.com/repos/${owner}/${repo}/pulls?head=${encodeURIComponent(
            headBranch,
          )}&state=all`,
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
   * Explicit test fixture helper: Registers a mock pull request for isolated integration tests.
   */
  registerMockPullRequest(
    owner: string,
    repo: string,
    headBranch: string,
    pr: CreatedPullRequest,
  ): void {
    const prKey = `${owner}/${repo}#${headBranch}`;
    this.mockPullRequests.set(prKey, pr);
  }

  /**
   * Creates a genuine Pull Request on GitHub.
   * Path 11: POST https://api.github.com/repos/:owner/:repo/pulls
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
    const prKey = `${owner}/${repo}#${headBranch}`;
    if (this.mockPullRequests.has(prKey)) {
      return this.mockPullRequests.get(prKey)!;
    }

    const response = await this.transport.fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
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
      },
    );

    if (!response.ok) {
      const err = await response.text();
      // On 422 Unprocessable Entity ("A pull request already exists for ..."), recover by finding and adopting the existing PR
      if (
        response.status === 422 &&
        (err.includes('already exists') || err.includes('A pull request already exists'))
      ) {
        const existing = await this.findPullRequestByBranch(owner, repo, headBranch, token);
        if (existing) {
          return existing;
        }
      }
      throw new Error(`GitHub PR creation failed with ${response.status}: ${err}`);
    }

    const data = (await response.json()) as {
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

    const expected =
      'sha256=' +
      crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);

    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  }
}
