# Agent Ecosystem Audit — 2026-11-19

## Decisions

| Project | Decision | Rationale |
|---|---|---|
| **gstack** (`garrytan/gstack`) | **ADOPT (already installed)** | Active local install `~/.claude/skills/gstack`; rich review/QA/ship/browse skills |
| **pstack** (`no-session/pstack`) | **ADAPT philosophy; DO NOT full-install** | MIT fork of gstack; clone audited `@ 9a24d14`; last commit stale (~233d per public trackers); overlaps `/ship` `/qa` `/review` with gstack → collision risk. Use Validate→Plan→Build→Review→Ship→Monitor→Reflect framing in our operating manual |
| **GitHub Spec Kit** | **ADOPT selectively** | MIT; install `specify-cli` via `uv` when a feature needs SDD; not for every hotfix |
| **OpenHands** | **DEFER** | Heavy runtime; not required for sprint primary outcomes |
| **SWE-agent** | **OPTIONAL later pilot** | Isolated experiment only |
| **Aider** | **DEFER** | Overlaps Cursor/Claude editing |
| **AutoGen (archived)** | **REJECT** | Archived / not needed |

## pstack inspection (no global install)

| Field | Value |
|---|---|
| Clone path | `C:\Users\NITISH\Downloads\_tooling_audit\pstack` |
| Commit | `9a24d1408a10a5d0df624ffc128230424e405b82` |
| License | MIT |
| Unique angle | Solo-founder `/validate` `/reflect` `/monitor` framing; push-to-main bias |
| Security | Setup scripts present — **not executed** this day; inspect before any future `./setup` |
| Antigravity | Claude-oriented; **no** automatic Antigravity compatibility |

## Other useful tooling (discover, do not bulk-install)

| Area | Candidates to evaluate later |
|---|---|
| Security | `semgrep`, `osv-scanner`, GitHub CodeQL (CI) |
| AST / JS | Prefer in-repo engine + `ts-morph`/existing fixtures before new frameworks |
| Browser QA | gstack `browse` / Cursor browser MCP (already available) |
| CI | Existing `.github/workflows/ci.yml` — extend, don’t replace |

## Rollback

- gstack: leave installed; no project files modified by gstack setup this day  
- pstack: audit clone only; delete `_tooling_audit/pstack` if unused  
- Spec Kit: uninstall with `uv tool uninstall specify-cli` if added later  

## Verification today

- Confirmed gstack skill tree present locally  
- Shallow-cloned pstack for license/skill inventory without `./setup`  
- Worktree `Patchversion-main-p0` created from `origin/main` for clean product work  
