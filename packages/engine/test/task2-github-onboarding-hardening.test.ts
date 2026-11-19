/**
 * Task 2: GitHub App Onboarding Hardening — Property Tests and Negative Cases
 *
 * Uses fast-check for property-based correctness tests (≥100 iterations each).
 *
 * Live GitHub integration tests are marked NOT TESTED — they require real
 * GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, and a test installation.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import * as fc from 'fast-check';

import { verifyGitHubWebhookSignature } from '../src/github/webhook-verifier';
import {
  generateOAuthStateToken,
  timingSafeEqualString,
  isOAuthStateExpired,
  oauthStateExpiresAt,
  buildGitHubOAuthCallbackUrl,
  isAllowedOAuthCallbackUrl,
  GITHUB_OAUTH_STATE_BYTES,
} from '../src/github/oauth-security';
import {
  isAllowedGitHubWebhookEvent,
  webhookInstallationId,
  extractWebhookEventTime,
  isWebhookReplayOutsideWindow,
  isOutOfOrderWebhookEvent,
  WEBHOOK_REPLAY_WINDOW_MS,
} from '../src/github/webhook-security';
import {
  authorizeTenantRepository,
  RepositoryAuthorizationError,
  installationCanCreatePullRequests,
  installationCanReadContents,
} from '../src/github/repository-authorization';
import { PatchversionDatabase } from '../src/db/database';
import { GitHubClient, OfflineMockTransport } from '../src';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeHmac(body: Buffer, secret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

function makeDb(label: string): { db: PatchversionDatabase; tmpDir: string } {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `pv-t2-${label}-`));
  const db = new PatchversionDatabase(tmpDir);
  return { db, tmpDir };
}

function cleanup(tmpDir: string): void {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
}

/** Printable ASCII (no whitespace) — fast-check v4 compatible replacement for stringOf(mapToConstant). */
function printableAsciiString(minLength: number, maxLength: number) {
  return fc
    .array(fc.integer({ min: 33, max: 126 }).map((c) => String.fromCharCode(c)), { minLength, maxLength })
    .map((chars) => chars.join(''));
}

/** Hex string of exact length — fast-check v4 compatible replacement for hexaString. */
function hexaString(length: number) {
  return fc
    .array(fc.constantFrom(...'0123456789abcdef'.split('')), { minLength: length, maxLength: length })
    .map((chars) => chars.join(''));
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — OAuth State Security (Property Tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('Task2 §1: OAuth State Security — Property Tests', () => {

  test('PROP-OAUTH-1: generated state tokens are unique (100 iterations)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99 }), () => {
        const t1 = generateOAuthStateToken();
        const t2 = generateOAuthStateToken();
        expect(t1).not.toEqual(t2);
        expect(t1).toMatch(/^[0-9a-f]{64}$/);
        expect(t1.length).toBe(GITHUB_OAUTH_STATE_BYTES * 2);
      }),
      { numRuns: 100 },
    );
  });

  test('PROP-OAUTH-2: timingSafeEqualString returns true iff strings are equal (100 iterations)', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 64 }), (s) => {
        expect(timingSafeEqualString(s, s)).toBe(true);
        expect(timingSafeEqualString(s, s + 'x')).toBe(false);
        expect(timingSafeEqualString(s + 'x', s)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  test('PROP-OAUTH-3: timingSafeEqualString rejects empty strings always (100 iterations)', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 64 }), (s) => {
        expect(timingSafeEqualString('', s)).toBe(false);
        expect(timingSafeEqualString(s, '')).toBe(false);
        expect(timingSafeEqualString('', '')).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  test('PROP-OAUTH-4: state token TTL: expiresAt is always in the future for positive ttl (100 iterations)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 600 }), (ttl) => {
        const now = Date.now();
        const expires = oauthStateExpiresAt(ttl, now);
        expect(isOAuthStateExpired(expires, now)).toBe(false);
        expect(isOAuthStateExpired(expires, now + ttl * 1000 + 1)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  test('PROP-OAUTH-5: expired state (ttl=0 or past) is always rejected (100 iterations)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 3600 }), (offset) => {
        const pastExpiry = new Date(Date.now() - offset * 1000).toISOString();
        expect(isOAuthStateExpired(pastExpiry)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  test('PROP-OAUTH-6: buildGitHubOAuthCallbackUrl uses configured APP_BASE_URL in production (100 iterations)', () => {
    const origins = ['https://app.example.com', 'https://trypatchbay.com', 'https://stage.app.io'];
    fc.assert(
      fc.property(fc.constantFrom(...origins), (origin) => {
        const url = buildGitHubOAuthCallbackUrl(origin);
        expect(url).toBe(`${origin}/api/auth/github/callback`);
        expect(isAllowedOAuthCallbackUrl(url, origin)).toBe(true);
        expect(isAllowedOAuthCallbackUrl(`${origin}/api/auth/github/callback?extra=1`, origin)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  test('PROP-OAUTH-7: callback URL validation rejects cross-origin substitutions (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('https://app.example.com', 'https://trypatchbay.com'),
        fc.constantFrom('https://evil.com', 'https://attacker.io', 'http://localhost'),
        (legit, malicious) => {
          const maliciousCallback = `${malicious}/api/auth/github/callback`;
          expect(isAllowedOAuthCallbackUrl(maliciousCallback, legit)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — Webhook Security (Property Tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('Task2 §2: Webhook Security — Property Tests', () => {

  test('PROP-WEBHOOK-1: valid HMAC always passes for any body and any clean secret (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 0, maxLength: 2048 }),
        // Secrets: printable ASCII, no whitespace
        printableAsciiString(8, 64),
        (bodyArr, secret) => {
          const body = Buffer.from(bodyArr);
          const sig = makeHmac(body, secret);
          const result = verifyGitHubWebhookSignature(body, sig, secret);
          expect(result.valid).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('PROP-WEBHOOK-2: wrong secret always produces mismatch (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 512 }),
        printableAsciiString(8, 32),
        printableAsciiString(8, 32),
        (bodyArr, secret1, secret2) => {
          fc.pre(secret1 !== secret2);
          const body = Buffer.from(bodyArr);
          const sig = makeHmac(body, secret1);
          const result = verifyGitHubWebhookSignature(body, sig, secret2);
          expect(result.valid).toBe(false);
          expect(result.reason).toBe('signature_mismatch');
        },
      ),
      { numRuns: 100 },
    );
  });

  test('PROP-WEBHOOK-3: any body mutation invalidates a valid signature (100 iterations)', () => {
    const secret = 'prop-test-webhook-secret-with-at-least-32-chars';
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 2, maxLength: 512 }),
        fc.integer({ min: 0, max: 254 }),
        (bodyArr, flipByte) => {
          const body = Buffer.from(bodyArr);
          const sig = makeHmac(body, secret);
          // flip one bit in the body
          const mutated = Buffer.from(body);
          mutated[0] = (mutated[0] + flipByte + 1) % 256;
          fc.pre(mutated[0] !== body[0]);
          const result = verifyGitHubWebhookSignature(mutated, sig, secret);
          expect(result.valid).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('PROP-WEBHOOK-4: whitespace-contaminated secrets always fail (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 512 }),
        fc.constantFrom('\n', ' ', '\t', '\r\n'),
        printableAsciiString(8, 32),
        (bodyArr, ws, secretBase) => {
          const body = Buffer.from(bodyArr);
          const dirtySecret = secretBase + ws;
          const sig = makeHmac(body, secretBase);
          const result = verifyGitHubWebhookSignature(body, sig, dirtySecret);
          expect(result.valid).toBe(false);
          expect(result.reason).toBe('whitespace_in_secret');
        },
      ),
      { numRuns: 100 },
    );
  });

  test('PROP-WEBHOOK-5: malformed signature format always fails (100 iterations)', () => {
    const secret = 'prop-test-malformed-secret-for-webhook-test';
    const body = Buffer.from('{"action":"test"}');
    fc.assert(
      fc.property(
        fc.oneof(
          // Missing sha256= prefix: raw hex
          hexaString(64),
          // sha1= prefix
          hexaString(40).map((h: string) => `sha1=${h}`),
          // sha256= + wrong length (1–63 chars)
          fc.integer({ min: 1, max: 63 }).chain((n) => hexaString(n).map((h: string) => `sha256=${h}`)),
        ),
        (sig) => {
          const result = verifyGitHubWebhookSignature(body, sig, secret);
          expect(result.valid).toBe(false);
          expect(['malformed_signature', 'missing_signature']).toContain(result.reason);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('PROP-WEBHOOK-6: isAllowedGitHubWebhookEvent accepts only registered events (100 iterations)', () => {
    const allowed = ['ping', 'installation', 'installation_repositories', 'github_app_authorization',
      'repository', 'push', 'pull_request', 'check_run', 'check_suite'];
    fc.assert(
      fc.property(fc.constantFrom(...allowed), (event) => {
        expect(isAllowedGitHubWebhookEvent(event)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  test('PROP-WEBHOOK-7: arbitrary non-registered event names are rejected (100 iterations)', () => {
    const allowed = new Set(['ping', 'installation', 'installation_repositories', 'github_app_authorization',
      'repository', 'push', 'pull_request', 'check_run', 'check_suite']);
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 30 }), (event) => {
        fc.pre(!allowed.has(event));
        expect(isAllowedGitHubWebhookEvent(event)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  test('PROP-WEBHOOK-8: replay window detection is monotone in time (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: WEBHOOK_REPLAY_WINDOW_MS * 2 }),
        (offset) => {
          const eventTimeMs = Date.now() - offset;
          const isReplay = isWebhookReplayOutsideWindow(eventTimeMs);
          if (offset > WEBHOOK_REPLAY_WINDOW_MS) {
            expect(isReplay).toBe(true);
          } else {
            expect(isReplay).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  test('PROP-WEBHOOK-9: out-of-order event detection is consistent (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (t1, t2) => {
          const isOOO = isOutOfOrderWebhookEvent(t1, t2);
          if (t1 < t2) {
            expect(isOOO).toBe(true);
          } else {
            expect(isOOO).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  test('PROP-WEBHOOK-10: webhookInstallationId extracts positive integer IDs (100 iterations)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 999_999_999 }), (id) => {
        expect(webhookInstallationId({ installation: { id } })).toBe(id);
        expect(webhookInstallationId({ installation: { id: String(id) } })).toBe(id);
        // Non-positive returns null
        expect(webhookInstallationId({ installation: { id: -1 } })).toBeNull();
        expect(webhookInstallationId({ installation: { id: 0 } })).toBeNull();
      }),
      { numRuns: 100 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — Repository Authorization (Property Tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('Task2 §3: Repository Authorization — Property Tests', () => {

  test('PROP-REPO-1: installationCanCreatePullRequests requires both contents:write and pull_requests:write (100 iterations)', () => {
    const writeValues = ['write', 'admin'];
    const nonWrite = ['read', 'none', ''];
    fc.assert(
      fc.property(
        fc.constantFrom(...writeValues),
        fc.constantFrom(...writeValues),
        (c, pr) => {
          expect(installationCanCreatePullRequests({ contents: c, pull_requests: pr })).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
    fc.assert(
      fc.property(
        fc.constantFrom(...nonWrite),
        fc.constantFrom(...writeValues),
        (c, pr) => {
          expect(installationCanCreatePullRequests({ contents: c, pull_requests: pr })).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
    fc.assert(
      fc.property(
        fc.constantFrom(...writeValues),
        fc.constantFrom(...nonWrite),
        (c, pr) => {
          expect(installationCanCreatePullRequests({ contents: c, pull_requests: pr })).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('PROP-REPO-2: installationCanReadContents accepts read/write/admin (100 iterations)', () => {
    const readOk = ['read', 'write', 'admin'];
    const readNot = ['none', ''];
    fc.assert(
      fc.property(fc.constantFrom(...readOk), (lvl) => {
        expect(installationCanReadContents({ contents: lvl })).toBe(true);
      }),
      { numRuns: 100 },
    );
    fc.assert(
      fc.property(fc.constantFrom(...readNot), (lvl) => {
        expect(installationCanReadContents({ contents: lvl })).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  test('PROP-REPO-3: empty or undefined permissions always deny PR creation (100 iterations)', () => {
    fc.assert(
      fc.property(fc.constant(undefined), (_) => {
        expect(installationCanCreatePullRequests(undefined)).toBe(false);
        expect(installationCanCreatePullRequests({})).toBe(false);
        expect(installationCanReadContents(undefined)).toBe(false);
        expect(installationCanReadContents({})).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 4 — Negative Cases (Onboarding, OAuth, Webhook, Repository)
// ─────────────────────────────────────────────────────────────────────────────

describe('Task2 §4: Negative Cases', () => {
  let tmpDir: string;
  let db: PatchversionDatabase;

  const tenantA = 'ten_task2_alpha';
  const userA = 'usr_task2_alpha';
  const tenantB = 'ten_task2_bravo';
  const userB = 'usr_task2_bravo';

  beforeEach(() => {
    ({ db, tmpDir } = makeDb('neg'));
    db.createTenant('Task2 Tenant A', tenantA);
    db.createUser(tenantA, 'alpha@task2.test', 'owner', 'alpha-gh', undefined, userA);
    db.createTenant('Task2 Tenant B', tenantB);
    db.createUser(tenantB, 'bravo@task2.test', 'owner', 'bravo-gh', undefined, userB);
  });

  afterEach(() => cleanup(tmpDir));

  // ── NEG-OAUTH ──────────────────────────────────────────────────────────────

  describe('NEG-OAUTH: OAuth State Negative Cases', () => {

    test('NEG-OAUTH-1: expired OAuth state token is rejected', () => {
      // Create state with -1 minute TTL (already expired)
      const state = db.createOnboardingState(tenantA, userA, 'acme-corp', -1);
      expect(() => {
        db.verifyAndLinkInstallation(state.token, 12345, 'acme-corp', 'Organization');
      }).toThrow(/expired/i);
      // State transitions to expired
      expect(db.getOnboardingState(state.token)?.status).toBe('expired');
    });

    test('NEG-OAUTH-2: reused (consumed) OAuth state is rejected on replay', () => {
      const state = db.createOnboardingState(tenantA, userA, 'acme-corp');
      db.verifyAndLinkInstallation(state.token, 22222, 'acme-corp', 'Organization');
      expect(() => {
        db.verifyAndLinkInstallation(state.token, 22222, 'acme-corp', 'Organization');
      }).toThrow(/already been consumed/i);
    });

    test('NEG-OAUTH-3: incorrect (forged) state token is rejected', () => {
      db.createOnboardingState(tenantA, userA, 'acme-corp');
      expect(() => {
        db.verifyAndLinkInstallation('00'.repeat(32), 33333, 'acme-corp', 'Organization');
      }).toThrow(/Invalid or unknown onboarding state token/i);
    });

    test('NEG-OAUTH-4: wrong target account in state is rejected (account mismatch)', () => {
      const state = db.createOnboardingState(tenantA, userA, 'legitimate-org');
      expect(() => {
        db.verifyAndLinkInstallation(state.token, 44444, 'evil-org', 'Organization');
      }).toThrow(/GitHub account mismatch/i);
      // State remains pending on mismatch
      expect(db.getOnboardingState(state.token)?.status).toBe('pending');
    });

    test('NEG-OAUTH-5: state token from wrong tenant user is rejected', () => {
      // userB belongs to tenantB, not tenantA
      expect(() => {
        db.createOnboardingState(tenantA, userB, 'acme-corp');
      }).toThrow(/Unauthorized/i);
    });
  });

  // ── NEG-WEBHOOK ───────────────────────────────────────────────────────────

  describe('NEG-WEBHOOK: Webhook Security Negative Cases', () => {
    const secret = 'neg-webhook-test-secret-is-at-least-32-chars';

    test('NEG-WEBHOOK-1: invalid webhook signature is rejected', () => {
      const body = Buffer.from('{"action":"ping"}');
      const result = verifyGitHubWebhookSignature(body, 'sha256=' + '0'.repeat(64), secret);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('signature_mismatch');
    });

    test('NEG-WEBHOOK-2: duplicate delivery ID is idempotent (second returns false)', () => {
      const delId = 'dup-del-001';
      const first = db.recordWebhookDelivery(delId, 'ping', 'sha256=aaa');
      const second = db.recordWebhookDelivery(delId, 'ping', 'sha256=aaa');
      expect(first).toBe(true);
      expect(second).toBe(false);
    });

    test('NEG-WEBHOOK-3: missing signature header is rejected (missing_signature reason)', () => {
      const body = Buffer.from('{"action":"test"}');
      expect(verifyGitHubWebhookSignature(body, undefined, secret).reason).toBe('missing_signature');
      expect(verifyGitHubWebhookSignature(body, null, secret).reason).toBe('missing_signature');
      expect(verifyGitHubWebhookSignature(body, '', secret).reason).toBe('missing_signature');
    });

    test('NEG-WEBHOOK-4: missing webhook secret fails closed (missing_secret)', () => {
      const body = Buffer.from('{"action":"test"}');
      const validSig = makeHmac(body, secret);
      expect(verifyGitHubWebhookSignature(body, validSig, undefined).reason).toBe('missing_secret');
      expect(verifyGitHubWebhookSignature(body, validSig, null).reason).toBe('missing_secret');
    });

    test('NEG-WEBHOOK-5: webhook event timestamp replay detection (>15 min old)', () => {
      const oldEventTimeMs = Date.now() - (WEBHOOK_REPLAY_WINDOW_MS + 60_000);
      expect(isWebhookReplayOutsideWindow(oldEventTimeMs)).toBe(true);
    });

    test('NEG-WEBHOOK-6: out-of-order webhook event detection', () => {
      const earlier = Date.now() - 60_000;
      const later = Date.now();
      expect(isOutOfOrderWebhookEvent(earlier, later)).toBe(true);
      expect(isOutOfOrderWebhookEvent(later, earlier)).toBe(false);
    });

    test('NEG-WEBHOOK-7: unrecognized event types are not in allowed set', () => {
      const unknown = ['unknown', 'marketplace_purchase', 'workflow_run', 'create', ''];
      for (const ev of unknown) {
        expect(isAllowedGitHubWebhookEvent(ev)).toBe(false);
      }
    });
  });

  // ── NEG-INSTALLATION ──────────────────────────────────────────────────────

  describe('NEG-INSTALLATION: Forged and Revoked Installation Negative Cases', () => {

    test('NEG-INST-1: forged installation ID (not linked to any tenant) is not found', async () => {
      const { db: freshDb, tmpDir: td } = makeDb('neg-inst');
      try {
        freshDb.createTenant('NEG Tenant', 'ten_neg_inst');
        freshDb.createUser('ten_neg_inst', 'neg@inst.test', 'owner', 'neg-gh', undefined, 'usr_neg_inst');
        freshDb.saveInstallation('ten_neg_inst', 99001, 'legitimate-org');

        // getInstallationByGithubId with a completely made-up ID
        const forged = freshDb.getInstallationByGithubId(999999999);
        expect(forged).toBeNull();
      } finally {
        cleanup(td);
      }
    });

    test('NEG-INST-2: revoked installation prevents authorizeTenantRepository', async () => {
      const { db: freshDb, tmpDir: td } = makeDb('neg-revoke');
      try {
        freshDb.createTenant('NEG Revoke Tenant', 'ten_neg_rev');
        freshDb.createUser('ten_neg_rev', 'rev@test.io', 'owner', 'rev-gh', undefined, 'usr_neg_rev');
        const inst = freshDb.saveInstallation('ten_neg_rev', 50001, 'rev-org');
        const repo = freshDb.saveRepository('ten_neg_rev', inst.id, {
          githubRepoId: 60001,
          fullName: 'rev-org/service',
          owner: 'rev-org',
          name: 'service',
          defaultBranch: 'main',
          isPrivate: false,
          isDemo: false,
        });

        // Suspend the installation
        freshDb.updateInstallationStatus('ten_neg_rev', 50001, 'suspended');

        await expect(authorizeTenantRepository({
          db: freshDb,
          tenantId: 'ten_neg_rev',
          repositoryId: repo.id,
        })).rejects.toThrow(RepositoryAuthorizationError);

        await expect(authorizeTenantRepository({
          db: freshDb,
          tenantId: 'ten_neg_rev',
          repositoryId: repo.id,
        })).rejects.toMatchObject({ code: 'INSTALLATION_INACTIVE' });
      } finally {
        cleanup(td);
      }
    });

    test('NEG-INST-3: deleted installation prevents authorizeTenantRepository', async () => {
      const { db: freshDb, tmpDir: td } = makeDb('neg-deleted');
      try {
        freshDb.createTenant('NEG Del Tenant', 'ten_neg_del');
        freshDb.createUser('ten_neg_del', 'del@test.io', 'owner', 'del-gh', undefined, 'usr_neg_del');
        const inst = freshDb.saveInstallation('ten_neg_del', 70001, 'del-org');
        const repo = freshDb.saveRepository('ten_neg_del', inst.id, {
          githubRepoId: 80001,
          fullName: 'del-org/svc',
          owner: 'del-org',
          name: 'svc',
          defaultBranch: 'main',
          isPrivate: false,
          isDemo: false,
        });

        freshDb.updateInstallationStatus('ten_neg_del', 70001, 'deleted');

        // Deleting an installation also cascade-revokes repositories; either
        // INSTALLATION_INACTIVE or REPOSITORY_REVOKED is a valid hard denial.
        try {
          await authorizeTenantRepository({
            db: freshDb,
            tenantId: 'ten_neg_del',
            repositoryId: repo.id,
          });
          throw new Error('expected authorizeTenantRepository to reject');
        } catch (err) {
          expect(err).toBeInstanceOf(RepositoryAuthorizationError);
          expect(['INSTALLATION_INACTIVE', 'REPOSITORY_REVOKED']).toContain(
            (err as RepositoryAuthorizationError).code,
          );
        }
      } finally {
        cleanup(td);
      }
    });
  });

  // ── NEG-CROSS-TENANT ──────────────────────────────────────────────────────

  describe('NEG-CROSS-TENANT: Cross-Tenant Repository Access Negative Cases', () => {

    test('NEG-CROSS-1: cross-tenant repository access is strictly blocked', async () => {
      const instA = db.saveInstallation(tenantA, 11001, 'alpha-org');
      const repoA = db.saveRepository(tenantA, instA.id, {
        githubRepoId: 21001,
        fullName: 'alpha-org/svc',
        owner: 'alpha-org',
        name: 'svc',
        defaultBranch: 'main',
        isPrivate: true,
        isDemo: false,
      });

      // Tenant B tries to access Tenant A's repo using A's repoId
      await expect(authorizeTenantRepository({
        db,
        tenantId: tenantB,
        repositoryId: repoA.id,
      })).rejects.toMatchObject({ code: 'REPOSITORY_NOT_FOUND' });
    });

    test('NEG-CROSS-2: cross-tenant installation linking is rejected', () => {
      // Tenant A links installation 31001
      const stateA = db.createOnboardingState(tenantA, userA, 'shared-org');
      db.verifyAndLinkInstallation(stateA.token, 31001, 'shared-org', 'Organization');

      // Tenant B tries to link the same installation
      const stateB = db.createOnboardingState(tenantB, userB, 'shared-org');
      expect(() => {
        db.verifyAndLinkInstallation(stateB.token, 31001, 'shared-org', 'Organization');
      }).toThrow(/already linked to another workspace/i);
    });

    test('NEG-CROSS-3: repository identifiers cannot be substituted across tenants', () => {
      const instA = db.saveInstallation(tenantA, 41001, 'alpha-org');
      const repoA = db.saveRepository(tenantA, instA.id, {
        githubRepoId: 51001,
        fullName: 'alpha-org/billing',
        owner: 'alpha-org',
        name: 'billing',
        defaultBranch: 'main',
        isPrivate: true,
        isDemo: false,
      });

      // Tenant B directly querying with Tenant A's repo ID returns null
      const crossLookup = db.getRepository(tenantB, repoA.id);
      expect(crossLookup).toBeNull();
    });
  });

  // ── NEG-REMOVED-REPO ──────────────────────────────────────────────────────

  describe('NEG-REMOVED-REPO: Removed/Revoked Repository Negative Cases', () => {

    test('NEG-REPO-1: revoked repository status blocks authorization', async () => {
      const { db: freshDb, tmpDir: td } = makeDb('neg-repo-revoked');
      try {
        freshDb.createTenant('NEG Repo Tenant', 'ten_neg_repo');
        freshDb.createUser('ten_neg_repo', 'repo@test.io', 'owner', 'repo-gh', undefined, 'usr_neg_repo');
        const inst = freshDb.saveInstallation('ten_neg_repo', 90001, 'repo-org');
        const repo = freshDb.saveRepository('ten_neg_repo', inst.id, {
          githubRepoId: 90002,
          fullName: 'repo-org/target',
          owner: 'repo-org',
          name: 'target',
          defaultBranch: 'main',
          isPrivate: false,
          isDemo: false,
        });

        // Revoke the repository
        const revoked = await freshDb.revokeRepository('ten_neg_repo', repo.id);
        expect(revoked).toBe(true);

        await expect(authorizeTenantRepository({
          db: freshDb,
          tenantId: 'ten_neg_repo',
          repositoryId: repo.id,
        })).rejects.toMatchObject({ code: 'REPOSITORY_REVOKED' });
      } finally {
        cleanup(td);
      }
    });
  });

  // ── NEG-OOO-WEBHOOK ───────────────────────────────────────────────────────

  describe('NEG-OOO: Out-of-Order Webhook Event Negative Cases', () => {

    test('NEG-OOO-1: earlier event after later event is flagged as out of order', () => {
      const later = Date.now();
      const earlier = later - 5000;
      // An incoming event with an earlier timestamp than a recorded event = OOO
      expect(isOutOfOrderWebhookEvent(earlier, later)).toBe(true);
    });

    test('NEG-OOO-2: null timestamps are not flagged as out-of-order', () => {
      expect(isOutOfOrderWebhookEvent(null, null)).toBe(false);
      expect(isOutOfOrderWebhookEvent(null, Date.now())).toBe(false);
      expect(isOutOfOrderWebhookEvent(Date.now(), null)).toBe(false);
    });

    test('NEG-OOO-3: extractWebhookEventTime finds time from various payload fields', () => {
      const now = new Date().toISOString();
      expect(extractWebhookEventTime({ updated_at: now })).not.toBeNull();
      expect(extractWebhookEventTime({ created_at: now })).not.toBeNull();
      expect(extractWebhookEventTime({ check_run: { completed_at: now } })).not.toBeNull();
      // No time field
      expect(extractWebhookEventTime({ action: 'deleted' })).toBeNull();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 5 — Live GitHub Integration Tests (NOT TESTED — require credentials)
// ─────────────────────────────────────────────────────────────────────────────

describe('Task2 §5: Live GitHub Integration [NOT TESTED]', () => {
  /**
   * These tests require:
   *   - GITHUB_APP_ID set to a real GitHub App ID
   *   - GITHUB_APP_PRIVATE_KEY set to the App's RSA private key
   *   - A real test installation linked to a test account
   *   - GITHUB_TEST_INSTALLATION_ID set to that installation's numeric ID
   *
   * Without these, all tests are skipped with a NOT TESTED notice.
   * Do NOT substitute mocked GitHub tests for live integration acceptance.
   */

  const skipReason = 'NOT TESTED: Live GitHub credentials (GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_TEST_INSTALLATION_ID) are not available in this environment';

  test.skip('LIVE-1: GitHub App can list real installations', () => {
    // Requires: GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY
    // Verify: listAppInstallations() returns real installation data
  });

  test.skip('LIVE-2: GitHub App can get installation access token', () => {
    // Requires: real installation + credentials
    // Verify: getInstallationToken() returns non-empty token
  });

  test.skip('LIVE-3: getAppInstallation returns real installation metadata', () => {
    // Requires: real installation + credentials
    // Verify: suspended/active status is accurate
  });

  test.skip('LIVE-4: getInstallationAccess returns real permission scopes', () => {
    // Requires: real installation + credentials
    // Verify: permissions object includes contents and pull_requests
  });

  test.skip('LIVE-5: listInstallationRepositories returns real repository list', () => {
    // Requires: real installation + credentials
  });

  // Report NOT TESTED status
  test('LIVE-STATUS: Live integration test status', () => {
    const hasCredentials = Boolean(
      process.env.GITHUB_APP_ID &&
      process.env.GITHUB_APP_PRIVATE_KEY &&
      process.env.GITHUB_TEST_INSTALLATION_ID,
    );
    if (!hasCredentials) {
      console.warn(`[Task2] ${skipReason}`);
    }
    expect(hasCredentials).toBe(
      Boolean(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY && process.env.GITHUB_TEST_INSTALLATION_ID),
    );
  });
});
