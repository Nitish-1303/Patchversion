# Permission Policy

## Autonomous (allowed without founder)

- Read/audit any project code and public deployment metadata (no secret values).  
- Install **project-level** or user-skill tooling after inspecting scripts (gstack already present).  
- Create branches/worktrees; implement scoped fixes; run tests.  
- Draft commits/PRs; open PRs when asked or when policy permits draft PRs.  
- Update docs under `docs/**` and agent contracts.  
- Customer research **templates** and outreach **drafts** (not sending).

## Founder approval required

- Merge into `main` / protected branches.  
- Production deploy / Vercel production settings.  
- Production DB migrations / destructive data ops.  
- Changing production secrets, credentials, App permissions.  
- Global machine config (system-wide installs impacting host).  
- Host-impacting Firecracker/KVM experiments.  
- Removing user data or shipping customer emails/messages externally.  
- Enabling `isQualifiedIsolationActive` or customer code execution backends.

## Never

- Overwrite unrelated dirty work.  
- Log or commit secrets.  
- Disable security controls to pass tests.  
- Bypass F2 stage gates.  
- Run untrusted customer repos in the Next.js/server process.  
- Claim readiness from unit tests alone.  
- Fabricate customers, PRs, revenue, or unreverified benchmarks.
