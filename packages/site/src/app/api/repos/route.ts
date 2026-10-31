import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthContext,
  getDatabase,
  getGitHubClient,
  getStorageModeInfo,
  ensureDemoTenantAndUser,
  DEMO_TENANT_ID,
  DEMO_REPO_ID,
} from '@/app/api/backend';

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure baseline demo repository and user exist ONLY if session belongs to demo tenant
  if (auth.tenant.id === DEMO_TENANT_ID) {
    await ensureDemoTenantAndUser();
  }

  const db = getDatabase();
  const github = getGitHubClient();

  // If live GitHub App is configured, refresh repositories ONLY for installations explicitly authorized for THIS tenant
  if (github.isConfigured()) {
    const tenantInstallations = await db.listInstallations(auth.tenant.id);
    for (const inst of tenantInstallations) {
      if (inst.status !== 'active') continue;
      try {
        const accessibleRepos = await github.listInstallationRepositories(inst.githubInstallationId);
        for (const r of accessibleRepos) {
          await db.saveRepository(auth.tenant.id, inst.id, {
            githubRepoId: r.id,
            fullName: r.fullName,
            owner: r.owner,
            name: r.name,
            defaultBranch: r.defaultBranch,
            isPrivate: r.isPrivate,
            isDemo: false,
          });
        }
      } catch (err) {
        console.warn(`Failed to refresh repositories for tenant installation ${inst.githubInstallationId}:`, err);
      }
    }
  }

  const repos = await db.listRepositories(auth.tenant.id);
  return NextResponse.json({
    repositories: repos,
    storage: getStorageModeInfo(),
    githubAppConfigured: github.isConfigured(),
  });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDatabase();
  const github = getGitHubClient();
  const body = await request.json().catch(() => ({}));

  if (!body.fullName || !body.owner || !body.name) {
    return NextResponse.json(
      { error: 'Missing required repository fields: fullName, owner, name' },
      { status: 400 },
    );
  }

  const normalizedFullName = String(body.fullName).trim().toLowerCase();

  // Demo fixture repository: permitted only for demo workspace under strict fixture identity
  if (normalizedFullName === 'patchbay-demo/checkout-service') {
    if (auth.tenant.id !== DEMO_TENANT_ID) {
      return NextResponse.json(
        { error: 'Demo fixture repositories cannot be attached to custom workspaces', code: 'DEMO_REPO_RESTRICTED' },
        { status: 403 },
      );
    }
    const installations = await db.listInstallations(auth.tenant.id);
    const inst = installations[0] ?? (await db.saveInstallation(auth.tenant.id, 10001, 'patchbay-demo'));
    const repo = await db.saveRepository(auth.tenant.id, inst.id, {
      id: DEMO_REPO_ID,
      githubRepoId: 20001,
      fullName: 'patchbay-demo/checkout-service',
      owner: 'patchbay-demo',
      name: 'checkout-service',
      defaultBranch: 'main',
      isPrivate: false,
      isDemo: true,
      // Client-supplied localPath is completely ignored
    });
    return NextResponse.json({ repository: repo });
  }

  // Real public demonstration repository: Nitish-1303/CipherBill
  if (normalizedFullName === 'nitish-1303/cipherbill') {
    const installations = await db.listInstallations(auth.tenant.id);
    const inst = installations[0] ?? (await db.saveInstallation(auth.tenant.id, 10001, 'Nitish-1303'));
    const repo = await db.saveRepository(auth.tenant.id, inst.id, {
      id: 'repo_cipherbill',
      githubRepoId: 99482711,
      fullName: 'Nitish-1303/CipherBill',
      owner: 'Nitish-1303',
      name: 'CipherBill',
      defaultBranch: 'main',
      isPrivate: false,
      isDemo: false,
    });
    return NextResponse.json({ repository: repo });
  }

  // Live repository connection requires verified GitHub App installation
  if (!github.isConfigured()) {
    return NextResponse.json(
      {
        error: 'GitHub App is not configured on this server. Live repository connection unavailable.',
        code: 'GITHUB_APP_NOT_CONFIGURED',
      },
      { status: 503 },
    );
  }

  try {
    const appInsts = await github.listAppInstallations();
    const match = appInsts.find(i => i.account.toLowerCase() === String(body.owner).toLowerCase());
    if (!match) {
      return NextResponse.json(
        {
          error: `GitHub App installation required for account "${body.owner}". Please install the GitHub App first.`,
          code: 'APP_INSTALLATION_REQUIRED',
        },
        { status: 403 },
      );
    }

    const accessibleRepos = await github.listInstallationRepositories(match.id);
    const verifiedRepo = accessibleRepos.find(r => r.fullName.toLowerCase() === normalizedFullName);
    if (!verifiedRepo) {
      return NextResponse.json(
        {
          error: `Repository "${body.fullName}" is inaccessible or unauthorized under installation ${match.id}.`,
          code: 'REPOSITORY_INACCESSIBLE',
        },
        { status: 403 },
      );
    }

    // Verify installation ownership: must already be linked to THIS tenant.
    // Installations can only be linked via the validated GitHub callback flow (GET /api/github/callback).
    const inst = await db.getInstallationByGithubId(match.id);
    if (!inst || inst.tenantId !== auth.tenant.id || inst.status !== 'active') {
      return NextResponse.json(
        {
          error: `GitHub App installation for account "${body.owner}" is not active or not linked to your workspace. Please complete the verified GitHub App onboarding flow first.`,
          code: 'INSTALLATION_NOT_LINKED',
        },
        { status: 403 },
      );
    }

    const repo = await db.saveRepository(auth.tenant.id, inst.id, {
      githubRepoId: verifiedRepo.id,
      fullName: verifiedRepo.fullName,
      owner: verifiedRepo.owner,
      name: verifiedRepo.name,
      defaultBranch: verifiedRepo.defaultBranch,
      isPrivate: verifiedRepo.isPrivate,
      isDemo: false,
      // Client-supplied localPath, isDemo, or synthetic IDs are completely ignored
    });

    return NextResponse.json({ repository: repo });
  } catch (err) {
    return NextResponse.json(
      {
        error: `GitHub authorization failed: ${err instanceof Error ? err.message : String(err)}`,
        code: 'PROVIDER_UNAVAILABLE',
      },
      { status: 502 },
    );
  }
}
