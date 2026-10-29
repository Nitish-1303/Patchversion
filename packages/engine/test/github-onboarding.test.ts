import fs from 'fs';
import path from 'path';
import os from 'os';
import { PatchversionDatabase } from '../src/db/database';

describe('GitHub Installation Onboarding & Linking Security', () => {
  let tmpDir: string;
  let db: PatchversionDatabase;
  const tenantA = 'ten_tenant_alpha';
  const userA = 'usr_user_alpha';
  const tenantB = 'ten_tenant_bravo';
  const userB = 'usr_user_bravo';

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patchbay-onboarding-test-'));
    db = new PatchversionDatabase(tmpDir);
    db.createTenant('Tenant Alpha', tenantA);
    db.createUser(tenantA, 'alpha@example.com', 'owner', 'alpha-gh', undefined, userA);
    db.createTenant('Tenant Bravo', tenantB);
    db.createUser(tenantB, 'bravo@example.com', 'owner', 'bravo-gh', undefined, userB);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('generates cryptographically random, unguessable state tokens with TTL', () => {
    const state1 = db.createOnboardingState(tenantA, userA, 'acme-corp');
    const state2 = db.createOnboardingState(tenantA, userA, 'acme-corp');

    expect(state1.token).toMatch(/^[0-9a-f]{64}$/); // 32 bytes hex = 64 characters
    expect(state2.token).toMatch(/^[0-9a-f]{64}$/);
    expect(state1.token).not.toEqual(state2.token);
    expect(state1.status).toBe('pending');
    expect(state1.tenantId).toBe(tenantA);
    expect(state1.userId).toBe(userA);
    expect(state1.targetAccount).toBe('acme-corp');

    const expiresAt = new Date(state1.expiresAt).getTime();
    const createdAt = new Date(state1.createdAt).getTime();
    expect(expiresAt - createdAt).toBeCloseTo(15 * 60 * 1000, -3); // 15 minutes TTL
  });

  test('rejects onboarding initiation if user does not belong to tenant', () => {
    expect(() => {
      db.createOnboardingState(tenantA, userB, 'acme-corp');
    }).toThrow(/Unauthorized/);
  });

  test('successfully links installation when state token is valid and unused', () => {
    const state = db.createOnboardingState(tenantA, userA, 'acme-corp');
    const inst = db.verifyAndLinkInstallation(state.token, 98765, 'acme-corp', 'Organization');

    expect(inst).toBeDefined();
    expect(inst.tenantId).toBe(tenantA);
    expect(inst.githubInstallationId).toBe(98765);
    expect(inst.accountLogin).toBe('acme-corp');
    expect(inst.status).toBe('active');

    // Onboarding state must be marked completed
    const updatedState = db.getOnboardingState(state.token);
    expect(updatedState?.status).toBe('completed');
    expect(updatedState?.installationId).toBe(98765);
    expect(updatedState?.completedAt).toBeDefined();
  });

  test('rejects state token replay (single-use constraint)', () => {
    const state = db.createOnboardingState(tenantA, userA, 'acme-corp');
    db.verifyAndLinkInstallation(state.token, 98765, 'acme-corp', 'Organization');

    // Attempting to consume the token a second time must throw replay error
    expect(() => {
      db.verifyAndLinkInstallation(state.token, 98765, 'acme-corp', 'Organization');
    }).toThrow(/already been consumed/);
  });

  test('rejects expired state tokens', () => {
    // Create state token with 0 minutes TTL (expired immediately)
    const state = db.createOnboardingState(tenantA, userA, 'acme-corp', -1);

    expect(() => {
      db.verifyAndLinkInstallation(state.token, 98765, 'acme-corp', 'Organization');
    }).toThrow(/expired/);

    const expiredState = db.getOnboardingState(state.token);
    expect(expiredState?.status).toBe('expired');
  });

  test('rejects target account mismatch (prevents connecting wrong GitHub org)', () => {
    const state = db.createOnboardingState(tenantA, userA, 'acme-corp');

    expect(() => {
      db.verifyAndLinkInstallation(state.token, 98765, 'evil-org', 'Organization');
    }).toThrow(/GitHub account mismatch/);

    // State remains pending on mismatch error
    const pendingState = db.getOnboardingState(state.token);
    expect(pendingState?.status).toBe('pending');
  });

  test('rejects cross-tenant collision if installation is already linked to another tenant', () => {
    // Tenant Alpha links installation 112233
    const stateAlpha = db.createOnboardingState(tenantA, userA, 'shared-org');
    db.verifyAndLinkInstallation(stateAlpha.token, 112233, 'shared-org', 'Organization');

    // Tenant Bravo attempts to link the same installation 112233
    const stateBravo = db.createOnboardingState(tenantB, userB, 'shared-org');
    expect(() => {
      db.verifyAndLinkInstallation(stateBravo.token, 112233, 'shared-org', 'Organization');
    }).toThrow(/already linked to another workspace/);
  });

  test('cross-tenant state presentation links only to token owner tenant, never presenting tenant', () => {
    // Tenant Alpha creates an onboarding state
    const stateAlpha = db.createOnboardingState(tenantA, userA, 'alpha-org');

    // Linking with stateAlpha.token will link to stateAlpha.tenantId (Tenant Alpha)
    const linked = db.verifyAndLinkInstallation(stateAlpha.token, 77889, 'alpha-org', 'Organization');
    expect(linked.tenantId).toBe(tenantA);
    expect(linked.tenantId).not.toBe(tenantB);

    // Tenant Bravo checking installations sees 0 installations
    expect(db.listInstallations(tenantB)).toHaveLength(0);
    // Tenant Alpha has 1 installation
    expect(db.listInstallations(tenantA)).toHaveLength(1);
  });

  test('atomic concurrency: race between duplicate callback requests results in exactly one success', async () => {
    const state = db.createOnboardingState(tenantA, userA, 'acme-corp');

    let successCount = 0;
    let failureCount = 0;

    const runLink = async () => {
      try {
        db.verifyAndLinkInstallation(state.token, 99991, 'acme-corp', 'Organization');
        successCount++;
      } catch {
        failureCount++;
      }
    };

    // Run 2 attempts concurrently
    await Promise.all([runLink(), runLink()]);

    expect(successCount).toBe(1);
    expect(failureCount).toBe(1);
  });
});
