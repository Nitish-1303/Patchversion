# Implementation Plan — Dependency Order (2026-11-23)

**Target:** Controlled launch readiness by **2026-12-12** (not automatic CUSTOMER_READY).  
**Principle:** Product security and verified migrations first; company tools last and lean.

## Stream order

| Priority | Stream | Worktree / branch | Next concrete work | Approval needed |
|---|---|---|---|---|
| 1 | GitHub webhook SoT | `phase1b2-webhooks` / `feat/phase1b2-webhook-source-of-truth` | Finish tests/typecheck; no commit/push | None for local impl |
| 2 | Migration lineage | phase1a (clean) + founder | D4 search_path proofs; D3 promote 006/007 | D3/D4/D6 |
| 3 | Isolation | separate; keep gate false | Host qual evidence only | Founder flip |
| 4 | Onboarding / App UX | new branch from `e354cc0` | Replace stub with real install path | Live App secrets |
| 5 | Customer validation CRM | new isolated module | Schema + founder-only UI; **zero fake traction** | Schema migrate |
| 6 | Observability | evaluate existing logs first | Add OTEL only if gap | Hosting |
| 7 | Marketing/SEO/Sales tools | evaluate-only register | Drafts only; no send/publish | Every external action |

## Explicitly deferred (not blocking local engineering)

- Installing Twenty, Chatwoot, Ghost, Listmonk, Postiz, full Grafana stack, LangGraph agency, etc. until TOOL_ADOPTION_REGISTER classifies **A**.
- Production Neon migrate (D6/D8 NOT APPROVED).
- Firecracker T2 migration.
- Auto-outreach / auto-publish.

## This session focus

1. Phase Zero docs (this folder).  
2. Phase 1B.2 webhook implementation + tests in `phase1b2-webhooks`.  
3. Customer validation: architecture stub only (no fake data, no production schema apply).
