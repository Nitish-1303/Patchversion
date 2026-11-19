# AI Engineering Agency — Architecture

## Goals

1. Complete TryPatchBay for external developers.  
2. Keep Firecracker F2 stage-gated and non-blocking for app P0.  
3. Coordinate Claude Code + Cursor (+ future Antigravity) via **shared Markdown contracts**, not duplicated skill installs.

## Layout

```text
Patchversion/
├── AGENTS.md                 # canonical contract
├── CLAUDE.md                 # Claude adapter
├── .agents/skills/           # shared/project skills
├── .claude/skills/           # Claude-only project skills
├── .claude/agents/           # role prompts (thin)
├── docs/agent-system/        # policies + manuals
├── docs/engineering/         # product + F2 evidence
├── docs/release/             # readiness audits
├── docs/business/            # pilots + traction
├── packages/engine|site|shared/
└── scripts/agent-system/     # helper scripts
```

## Runtime model

```text
Orchestrator → assigns task + ownership + worktree
     ↓
Implementation engineer → code + unit/integration evidence
     ↓
QA engineer → regression / e2e / fixture proofs
     ↓
Independent auditor → PASS | NEEDS_REVISION | BLOCKED
     ↓
Founder → merge / deploy / secrets / prod migrations
```

## Parallelism rules

- One writer per file set; prefer separate git worktrees.  
- Dirty `fix/p0-production-blocker-resolutions` tree is **preserve-first**.  
- Clean product work: `C:\Users\NITISH\Downloads\Patchversion-main-p0` (`agent/p0-product-completion`).  
- F2 Linux worktree remains `/home/nitish-1303/src/firecracker-911f019` (WSL) — separate track.

## Skill strategy

| Layer | Source |
|---|---|
| Heavy workflows (review/qa/ship/browse) | Existing **gstack** |
| Solo-founder loop language | Adapted from **pstack** (docs only) |
| Spec-driven features | **Spec Kit** when needed |
| Product-specific | Project skills under `.agents` / `.claude` |
