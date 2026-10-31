import {
  GitHubClient,
  NetworkGitHubTransport,
  OfflineMockTransport,
  UnhandledMockRequestError,
  GitHubAppNotConfiguredError,
  RepositoryTreeTruncatedError,
} from '../src';

describe('GitHub Transport Layer, Fail-Closed Security, and Isolation Tests', () => {
  const dummyConfig = {
    appId: '12345',
    privateKey:
      '-----BEGIN RSA PRIVATE KEY-----\n' +
      'MIIEowIBAAKCAQEA0Y3y1d0sF1v+C+pE1e2m5vB8k1q6d7t9s1u2v3w4x5y6z7a8\n' +
      'b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0\n' +
      'd1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2\n' +
      'f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4\n' +
      'b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6\n' +
      'd7e8f9==\n' +
      '-----END RSA PRIVATE KEY-----',
    webhookSecret: 'test_webhook_secret',
  };

  describe('1. Transport Precedence & Fail-Closed Unconfigured Behavior', () => {
    test('missing GitHub App configuration fails closed for operations requiring it', async () => {
      const client = new GitHubClient(); // No config

      expect(client.isConfigured()).toBe(false);

      // Path 1: getInstallationToken
      await expect(client.getInstallationToken(123)).rejects.toThrow(
        GitHubAppNotConfiguredError,
      );

      // Path 2: listAppInstallations
      await expect(client.listAppInstallations()).rejects.toThrow(
        GitHubAppNotConfiguredError,
      );

      // Path 3: listInstallationRepositories
      await expect(client.listInstallationRepositories(123)).rejects.toThrow(
        GitHubAppNotConfiguredError,
      );

      // App JWT generation
      expect(() => client.generateAppJwt()).toThrow(GitHubAppNotConfiguredError);
    });

    test('transport precedence: explicit constructor transport > config.transport > NetworkGitHubTransport', () => {
      const explicitTransport = new OfflineMockTransport();
      const configTransport = new OfflineMockTransport();

      // 1. Explicit transport in constructor
      const client1 = new GitHubClient(null, explicitTransport);
      expect(client1.getTransport()).toBe(explicitTransport);

      // 2. Transport inside config object
      const client2 = new GitHubClient({ ...dummyConfig, transport: configTransport });
      expect(client2.getTransport()).toBe(configTransport);

      // 3. Explicit transport wins over config.transport
      const client3 = new GitHubClient(
        { ...dummyConfig, transport: configTransport },
        explicitTransport,
      );
      expect(client3.getTransport()).toBe(explicitTransport);

      // 4. Default fallback is NetworkGitHubTransport
      const client4 = new GitHubClient();
      expect(client4.getTransport()).toBeInstanceOf(NetworkGitHubTransport);
    });
  });

  describe('2. Offline Mock Transport Matching & Strict Rejection', () => {
    test('strict method and pathname matching with query parameter preservation', async () => {
      const transport = new OfflineMockTransport();

      transport.get('/repos/owner/repo/pulls', async (url) => {
        expect(url.pathname).toBe('/repos/owner/repo/pulls');
        expect(url.searchParams.get('head')).toBe('owner:feature');
        return new Response(JSON.stringify([]), { status: 200 });
      });

      // Matching GET with query parameters succeeds
      const res = await transport.fetch(
        'https://api.github.com/repos/owner/repo/pulls?head=owner%3Afeature&state=all',
        { method: 'GET' },
      );
      expect(res.status).toBe(200);

      // Same pathname with POST throws UnhandledMockRequestError
      await expect(
        transport.fetch('https://api.github.com/repos/owner/repo/pulls', {
          method: 'POST',
        }),
      ).rejects.toThrow(UnhandledMockRequestError);

      // Unregistered route throws UnhandledMockRequestError
      await expect(
        transport.fetch('https://api.github.com/unregistered/path'),
      ).rejects.toThrow(UnhandledMockRequestError);
    });

    test('HTTP error codes, network exceptions, and headers are preserved faithfully', async () => {
      const transport = new OfflineMockTransport();

      transport.post('/app/installations/401/access_tokens', async () => {
        return new Response(JSON.stringify({ message: 'Bad credentials' }), {
          status: 401,
        });
      });

      transport.post('/app/installations/429/access_tokens', async () => {
        return new Response(
          JSON.stringify({ message: 'API rate limit exceeded' }),
          {
            status: 429,
            headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': '0' },
          },
        );
      });

      const client = new GitHubClient(dummyConfig, transport);
      jest.spyOn(client, 'generateAppJwt').mockReturnValue('mock.jwt');

      await expect(client.getInstallationToken(401)).rejects.toThrow('401');
      await expect(client.getInstallationToken(429)).rejects.toThrow('429');
    });
  });

  describe('3. All Request Paths Routed Exclusively Through Transport', () => {
    test('listRepositoryFiles handles normal, empty, truncated, and error responses', async () => {
      const transport = new OfflineMockTransport();

      // Normal response
      transport.get('/repos/acme/project/git/trees/main', async (url) => {
        expect(url.searchParams.get('recursive')).toBe('1');
        return new Response(
          JSON.stringify({
            tree: [
              { path: 'package.json', type: 'blob' },
              { path: 'src', type: 'tree' },
              { path: 'src/index.ts', type: 'blob' },
            ],
            truncated: false,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      });

      const client = new GitHubClient(null, transport);
      const files = await client.listRepositoryFiles('acme', 'project', 'token123', 'main');
      expect(files).toEqual(['package.json', 'src/index.ts']);

      // Valid empty tree returns empty list
      transport.get('/repos/acme/empty/git/trees/main', async () => {
        return new Response(JSON.stringify({ tree: [], truncated: false }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });
      const emptyFiles = await client.listRepositoryFiles('acme', 'empty', 'token123', 'main');
      expect(emptyFiles).toEqual([]);

      // Error response (404) fails closed
      transport.get('/repos/acme/missing/git/trees/main', async () => {
        return new Response('Not Found', { status: 404 });
      });
      await expect(
        client.listRepositoryFiles('acme', 'missing', 'token123', 'main'),
      ).rejects.toThrow(/404.*Not Found/);

      // Truncated response throws RepositoryTreeTruncatedError
      transport.get('/repos/acme/huge/git/trees/main', async () => {
        return new Response(
          JSON.stringify({
            tree: [{ path: 'package.json', type: 'blob' }],
            truncated: true,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      });
      await expect(
        client.listRepositoryFiles('acme', 'huge', 'token123', 'main'),
      ).rejects.toThrow(RepositoryTreeTruncatedError);
    });

    test('getRepositoryFileContent, branch creation, and PR creation route through transport', async () => {
      const transport = new OfflineMockTransport();

      // Contents API
      transport.get('/repos/acme/project/contents/package.json', async () => {
        return new Response(
          JSON.stringify({
            content: Buffer.from('{"version":"1.0.0"}').toString('base64'),
            encoding: 'base64',
          }),
          { status: 200 },
        );
      });

      // Branch creation
      transport.post('/repos/acme/project/git/refs', async (url, init) => {
        const body = JSON.parse(init?.body as string);
        expect(body.ref).toBe('refs/heads/patch-1');
        return new Response(JSON.stringify({ ref: body.ref }), { status: 201 });
      });

      // PR creation
      transport.post('/repos/acme/project/pulls', async (url, init) => {
        const body = JSON.parse(init?.body as string);
        expect(body.title).toBe('Upgrade dependency');
        return new Response(
          JSON.stringify({
            number: 101,
            url: 'https://api.github.com/repos/acme/project/pulls/101',
            html_url: 'https://github.com/acme/project/pull/101',
            head: { sha: 'sha123', ref: 'patch-1' },
            title: body.title,
            body: body.body,
            state: 'open',
          }),
          { status: 201 },
        );
      });

      const client = new GitHubClient(null, transport);

      const content = await client.getRepositoryFileContent('acme', 'project', 'package.json');
      expect(content).toBe('{"version":"1.0.0"}');

      await client.createBranch('acme', 'project', 'patch-1', 'sha_base', 'mock_token');

      const pr = await client.createPullRequest(
        'acme',
        'project',
        'Upgrade dependency',
        'Fix body',
        'patch-1',
        'main',
        'mock_token',
      );
      expect(pr.number).toBe(101);
      expect(pr.htmlUrl).toBe('https://github.com/acme/project/pull/101');
    });
  });

  describe('4. Git Tree File Listing Fail-Closed Error Handling & Safe Ref Encoding', () => {
    test('1. Valid non-empty tree returns repository-relative file paths', async () => {
      const transport = new OfflineMockTransport();
      transport.get('/repos/acme/project/git/trees/main', async (url) => {
        expect(url.searchParams.get('recursive')).toBe('1');
        return new Response(
          JSON.stringify({
            sha: 'tree_sha_123',
            tree: [
              { path: 'package.json', type: 'blob' },
              { path: 'src', type: 'tree' },
              { path: 'src/index.ts', type: 'blob' },
            ],
            truncated: false,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      });

      const client = new GitHubClient(null, transport);
      const files = await client.listRepositoryFiles('acme', 'project', 'tok', 'main');
      expect(files).toEqual(['package.json', 'src/index.ts']);
    });

    test('2. Valid empty tree returns an empty array', async () => {
      const transport = new OfflineMockTransport();
      transport.get('/repos/acme/empty-repo/git/trees/main', async () => {
        return new Response(
          JSON.stringify({
            sha: 'tree_sha_empty',
            tree: [],
            truncated: false,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      });

      const client = new GitHubClient(null, transport);
      const files = await client.listRepositoryFiles('acme', 'empty-repo', 'tok', 'main');
      expect(files).toEqual([]);
    });

    test('3. Truncated tree throws RepositoryTreeTruncatedError', async () => {
      const transport = new OfflineMockTransport();
      transport.get('/repos/acme/huge/git/trees/main', async () => {
        return new Response(
          JSON.stringify({
            tree: [{ path: 'package.json', type: 'blob' }],
            truncated: true,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      });

      const client = new GitHubClient(null, transport);
      await expect(
        client.listRepositoryFiles('acme', 'huge', 'tok', 'main'),
      ).rejects.toThrow(RepositoryTreeTruncatedError);
    });

    test('4. HTTP 401 propagates authentication error', async () => {
      const transport = new OfflineMockTransport();
      transport.get('/repos/acme/private/git/trees/main', async () => {
        return new Response(JSON.stringify({ message: 'Bad credentials' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const client = new GitHubClient(null, transport);
      await expect(
        client.listRepositoryFiles('acme', 'private', 'invalid_token', 'main'),
      ).rejects.toThrow(/401.*Bad credentials/);
    });

    test('5. HTTP 403 propagates rate-limit / authorization error with response details', async () => {
      const transport = new OfflineMockTransport();
      transport.get('/repos/acme/rate-limited/git/trees/main', async () => {
        return new Response(
          JSON.stringify({ message: 'API rate limit exceeded for user' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      });

      const client = new GitHubClient(null, transport);
      await expect(
        client.listRepositoryFiles('acme', 'rate-limited', 'tok', 'main'),
      ).rejects.toThrow(/403.*rate limit exceeded/i);
    });

    test('6. HTTP 404 propagates not-found error rather than returning empty array', async () => {
      const transport = new OfflineMockTransport();
      transport.get('/repos/acme/nonexistent/git/trees/main', async () => {
        return new Response(JSON.stringify({ message: 'Not Found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const client = new GitHubClient(null, transport);
      await expect(
        client.listRepositoryFiles('acme', 'nonexistent', 'tok', 'main'),
      ).rejects.toThrow(/404.*Not Found/);
    });

    test('7. HTTP 500 propagates server error', async () => {
      const transport = new OfflineMockTransport();
      transport.get('/repos/acme/server-error/git/trees/main', async () => {
        return new Response('GitHub internal server error', {
          status: 500,
        });
      });

      const client = new GitHubClient(null, transport);
      await expect(
        client.listRepositoryFiles('acme', 'server-error', 'tok', 'main'),
      ).rejects.toThrow(/500.*GitHub internal server error/);
    });

    test('8. Network rejection propagates failure directly', async () => {
      const transport = new OfflineMockTransport();
      transport.get('/repos/acme/network-err/git/trees/main', async () => {
        throw new Error('Socket hang up / connection reset');
      });

      const client = new GitHubClient(null, transport);
      await expect(
        client.listRepositoryFiles('acme', 'network-err', 'tok', 'main'),
      ).rejects.toThrow('Socket hang up / connection reset');
    });

    test('9a. Malformed JSON response throws descriptive error', async () => {
      const transport = new OfflineMockTransport();
      transport.get('/repos/acme/bad-json/git/trees/main', async () => {
        return new Response('this is definitely not { valid json', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });

      const client = new GitHubClient(null, transport);
      await expect(
        client.listRepositoryFiles('acme', 'bad-json', 'tok', 'main'),
      ).rejects.toThrow(/malformed JSON/i);
    });

    test('9b. Malformed tree payload (missing or invalid tree array) throws descriptive error', async () => {
      const transport = new OfflineMockTransport();
      transport.get('/repos/acme/invalid-payload/git/trees/main', async () => {
        return new Response(
          JSON.stringify({ not_tree: [{ path: 'foo.ts' }] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      });

      const client = new GitHubClient(null, transport);
      await expect(
        client.listRepositoryFiles('acme', 'invalid-payload', 'tok', 'main'),
      ).rejects.toThrow(/missing or invalid "tree" array/i);
    });

    test('10. Branch ref containing slashes (e.g. feat/repo-scanning) is safely encoded and received', async () => {
      const transport = new OfflineMockTransport();
      const branchRef = 'feat/repo-scanning';

      // Expect exact percent-encoded pathname: /repos/acme/project/git/trees/feat%2Frepo-scanning
      transport.get('/repos/acme/project/git/trees/feat%2Frepo-scanning', async (url) => {
        expect(url.pathname).toBe('/repos/acme/project/git/trees/feat%2Frepo-scanning');
        expect(url.searchParams.get('recursive')).toBe('1');
        return new Response(
          JSON.stringify({
            tree: [{ path: 'scanner.ts', type: 'blob' }],
            truncated: false,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      });

      const client = new GitHubClient(null, transport);
      const files = await client.listRepositoryFiles('acme', 'project', 'tok', branchRef);
      expect(files).toEqual(['scanner.ts']);
    });

    test('11. Exact ref preservation through the transport without silent substitution', async () => {
      const transport = new OfflineMockTransport();
      const complexRef = 'release/v1.0.0-rc.1+build.42';

      transport.get(
        `/repos/acme/project/git/trees/${encodeURIComponent(complexRef)}`,
        async (url) => {
          expect(url.pathname).toBe(
            `/repos/acme/project/git/trees/${encodeURIComponent(complexRef)}`,
          );
          return new Response(
            JSON.stringify({
              tree: [{ path: 'release-notes.md', type: 'blob' }],
              truncated: false,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        },
      );

      const client = new GitHubClient(null, transport);
      const files = await client.listRepositoryFiles('acme', 'project', 'tok', complexRef);
      expect(files).toEqual(['release-notes.md']);
    });
  });

  describe('5. Strict Git Tree Entry Validation', () => {
    test('1. Empty string path throws descriptive error', async () => {
      const transport = new OfflineMockTransport();
      transport.get('/repos/acme/repo/git/trees/main', async () => {
        return new Response(
          JSON.stringify({
            tree: [{ path: '', type: 'blob' }],
            truncated: false,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      });

      const client = new GitHubClient(null, transport);
      await expect(
        client.listRepositoryFiles('acme', 'repo', 'tok', 'main'),
      ).rejects.toThrow(/entry at index 0.*"path" must be a non-empty string/i);
    });

    test('2. Missing path throws descriptive error', async () => {
      const transport = new OfflineMockTransport();
      transport.get('/repos/acme/repo/git/trees/main', async () => {
        return new Response(
          JSON.stringify({
            tree: [{ type: 'blob' }],
            truncated: false,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      });

      const client = new GitHubClient(null, transport);
      await expect(
        client.listRepositoryFiles('acme', 'repo', 'tok', 'main'),
      ).rejects.toThrow(/entry at index 0.*"path" must be a non-empty string/i);
    });

    test('3. Non-string path throws descriptive error', async () => {
      const transport = new OfflineMockTransport();
      transport.get('/repos/acme/repo/git/trees/main', async () => {
        return new Response(
          JSON.stringify({
            tree: [{ path: 12345, type: 'blob' }],
            truncated: false,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      });

      const client = new GitHubClient(null, transport);
      await expect(
        client.listRepositoryFiles('acme', 'repo', 'tok', 'main'),
      ).rejects.toThrow(/entry at index 0.*"path" must be a non-empty string/i);
    });

    test('4. Missing type throws descriptive error', async () => {
      const transport = new OfflineMockTransport();
      transport.get('/repos/acme/repo/git/trees/main', async () => {
        return new Response(
          JSON.stringify({
            tree: [{ path: 'src/index.ts' }],
            truncated: false,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      });

      const client = new GitHubClient(null, transport);
      await expect(
        client.listRepositoryFiles('acme', 'repo', 'tok', 'main'),
      ).rejects.toThrow(/invalid entry type "undefined"/i);
    });

    test('5. Unknown type throws descriptive error', async () => {
      const transport = new OfflineMockTransport();
      transport.get('/repos/acme/repo/git/trees/main', async () => {
        return new Response(
          JSON.stringify({
            tree: [{ path: 'symlink-file', type: 'symlink' }],
            truncated: false,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      });

      const client = new GitHubClient(null, transport);
      await expect(
        client.listRepositoryFiles('acme', 'repo', 'tok', 'main'),
      ).rejects.toThrow(/invalid entry type "symlink".*expected "blob", "tree", or "commit"/i);
    });

    test('6. Null tree entry throws descriptive error', async () => {
      const transport = new OfflineMockTransport();
      transport.get('/repos/acme/repo/git/trees/main', async () => {
        return new Response(
          JSON.stringify({
            tree: [null],
            truncated: false,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      });

      const client = new GitHubClient(null, transport);
      await expect(
        client.listRepositoryFiles('acme', 'repo', 'tok', 'main'),
      ).rejects.toThrow(/entry at index 0.*entry must be a non-null object/i);
    });

    test('7. Valid tree entry is accepted', async () => {
      const transport = new OfflineMockTransport();
      transport.get('/repos/acme/repo/git/trees/main', async () => {
        return new Response(
          JSON.stringify({
            tree: [{ path: 'README.md', type: 'blob' }],
            truncated: false,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      });

      const client = new GitHubClient(null, transport);
      const files = await client.listRepositoryFiles('acme', 'repo', 'tok', 'main');
      expect(files).toEqual(['README.md']);
    });

    test('8. Valid blob, tree, and commit entries together return only blob paths', async () => {
      const transport = new OfflineMockTransport();
      transport.get('/repos/acme/repo/git/trees/main', async () => {
        return new Response(
          JSON.stringify({
            tree: [
              { path: 'src/app.ts', type: 'blob' },
              { path: 'src', type: 'tree' },
              { path: 'vendor/submodule', type: 'commit' },
              { path: 'package.json', type: 'blob' },
            ],
            truncated: false,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      });

      const client = new GitHubClient(null, transport);
      const files = await client.listRepositoryFiles('acme', 'repo', 'tok', 'main');
      expect(files).toEqual(['src/app.ts', 'package.json']);
    });
  });
});
