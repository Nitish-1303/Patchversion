import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, getDatabase, getStorageModeInfo } from '@/app/api/backend';

export async function GET(request: NextRequest) {
  const auth = getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDatabase();
  const repos = db.listRepositories(auth.tenant.id);
  return NextResponse.json({ repositories: repos, storage: getStorageModeInfo() });
}

export async function POST(request: NextRequest) {
  const auth = getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDatabase();
  const body = await request.json().catch(() => ({}));

  if (!body.fullName || !body.owner || !body.name) {
    return NextResponse.json({ error: 'Missing required repository fields' }, { status: 400 });
  }

  // Find or create installation
  let inst = db.listInstallations(auth.tenant.id)[0];
  if (!inst) {
    inst = db.saveInstallation(auth.tenant.id, 10001, auth.user.githubLogin ?? 'developer');
  }

  const repo = db.saveRepository(auth.tenant.id, inst.id, {
    githubRepoId: body.githubRepoId ?? Math.floor(10000 + Math.random() * 90000),
    fullName: body.fullName,
    owner: body.owner,
    name: body.name,
    defaultBranch: body.defaultBranch ?? 'main',
    isPrivate: Boolean(body.isPrivate),
    localPath: body.localPath,
  });

  return NextResponse.json({ repository: repo });
}
