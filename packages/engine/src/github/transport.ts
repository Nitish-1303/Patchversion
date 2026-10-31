/**
 * Error thrown when an operation requires GitHub App configuration (appId and privateKey),
 * but GitHubClient is unconfigured.
 */
export class GitHubAppNotConfiguredError extends Error {
  constructor(operation: string) {
    super(
      `GitHub App is not configured. Operation "${operation}" requires GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY.`,
    );
    this.name = 'GitHubAppNotConfiguredError';
  }
}

/**
 * Error thrown when a Git tree response is truncated by GitHub.
 */
export class RepositoryTreeTruncatedError extends Error {
  constructor(owner: string, repo: string, ref: string) {
    super(
      `GitHub Git tree for ${owner}/${repo} at ref "${ref}" was truncated (exceeded 100,000 entries or 7MB limit). Partial scans are unsafe.`,
    );
    this.name = 'RepositoryTreeTruncatedError';
  }
}

/**
 * Standard HTTP Transport interface for all GitHub API requests.
 */
export interface GitHubTransport {
  fetch(
    input: string | URL,
    init?: RequestInit,
  ): Promise<Response>;
}

/**
 * Real production network transport using global fetch.
 */
export class NetworkGitHubTransport implements GitHubTransport {
  fetch(input: string | URL, init?: RequestInit): Promise<Response> {
    const targetUrl = typeof input === 'string' ? input : input.toString();
    return fetch(targetUrl, init);
  }
}

/**
 * Custom handler signature for mock endpoints.
 */
export type MockHandler = (
  url: URL,
  init?: RequestInit,
) => Promise<Response> | Response;

interface RegisteredMockRoute {
  method: string;
  pathname: string;
  handler: MockHandler;
}

/**
 * Error thrown when an offline mock transport receives an unhandled request.
 */
export class UnhandledMockRequestError extends Error {
  constructor(method: string, url: string, availableRoutes: string[]) {
    super(
      `Unhandled mock request: [${method}] ${url}. Available routes: [${availableRoutes.join(', ')}]`,
    );
    this.name = 'UnhandledMockRequestError';
  }
}

/**
 * Deterministic in-memory mock transport for offline unit testing.
 * Strictly compares normalized HTTP method and pathname, preserving query params and request body.
 * Throws immediately if no route matches. Never falls back to the real network.
 */
export class OfflineMockTransport implements GitHubTransport {
  private routes: RegisteredMockRoute[] = [];

  register(
    method: string,
    pathname: string,
    handler: MockHandler,
  ): this {
    const normalizedMethod = method.toUpperCase();
    const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
    this.routes.push({
      method: normalizedMethod,
      pathname: normalizedPath,
      handler,
    });
    return this;
  }

  get(pathname: string, handler: MockHandler): this {
    return this.register('GET', pathname, handler);
  }

  post(pathname: string, handler: MockHandler): this {
    return this.register('POST', pathname, handler);
  }

  put(pathname: string, handler: MockHandler): this {
    return this.register('PUT', pathname, handler);
  }

  delete(pathname: string, handler: MockHandler): this {
    return this.register('DELETE', pathname, handler);
  }

  clear(): void {
    this.routes = [];
  }

  async fetch(input: string | URL, init?: RequestInit): Promise<Response> {
    const rawUrl = typeof input === 'string' ? input : input.toString();
    const url = new URL(rawUrl);
    const method = (init?.method || 'GET').toUpperCase();

    const match = this.routes.find(
      (r) => r.method === method && r.pathname === url.pathname,
    );

    if (!match) {
      const available = this.routes.map((r) => `[${r.method}] ${r.pathname}`);
      throw new UnhandledMockRequestError(method, rawUrl, available);
    }

    return await match.handler(url, init);
  }
}
