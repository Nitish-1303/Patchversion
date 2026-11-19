# Claude Code — TryPatchBay Adapter

Read `AGENTS.md` first. This file only adds Claude Code specifics.

## Skill routing

- **Primary suite:** existing **gstack** install at `~/.claude/skills/gstack` (already present; do not reinstall blindly).  
- **pstack:** gstack fork for solo-founder framing. **Do not dual-install** full pstack alongside gstack (command collisions). Use pstack philosophy via project docs; selective skill copy only if uniquely needed.  
- **Spec Kit:** optional `specify` CLI for spec-driven features — install project-local when a feature needs a constitution/spec, not as default for every edit.  
- Project skills: `.claude/skills/` (e.g. neon), `.agents/skills/`.

## Protected ops (stop and ask founder)

Merge to protected branches, production deploy, prod DB migrations, secret changes, global machine config, destructive infra, host Firecracker/KVM experiments.

## Verification

Every implementation task needs commands + exit codes. Independent auditor returns exactly one of: `PASS` | `NEEDS_REVISION` | `BLOCKED`.

## Google Antigravity

pstack/gstack Claude install ≠ Antigravity-ready. Prefer shared Markdown in `docs/agent-system/` + `AGENTS.md` as the canonical contract; add Antigravity adapters under `.agents/` when that environment is used.
