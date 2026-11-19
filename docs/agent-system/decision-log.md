# Decision Log

| Date | Decision | Rationale | Status |
|---|---|---|---|
| 2026-11-18 | Customer readiness Phase 0 → `NOT_CUSTOMER_READY` | Evidence in `docs/release/customer-readiness-audit-2026-11-18.md` | Accepted |
| 2026-11-18 | T2-INV independent re-review → `PASS` | Inventory + gates + unmap instrumentation; T2 still unauthorized | Accepted |
| 2026-11-18 | P0-1 fail-closed isolation → `PASS` | Hard `isQualifiedIsolationActive()→false` matching `origin/main` | Accepted |
| 2026-11-19 | Prefer existing gstack; adapt pstack philosophy without dual install | Overlap + stale pstack maintenance risk | Accepted |
| 2026-11-19 | Spec Kit selective only | Avoid process overhead for hotfix sprint | Accepted |
| 2026-11-19 | OpenHands/Aider defer; AutoGen reject | Focus on product outcomes | Accepted |
| 2026-11-19 | Clean worktree `Patchversion-main-p0` for product P0 | Preserve dirty WIP on fix/p0 branch | Accepted |
| 2026-11-19 | Customer outreach = drafts only until founder authorizes send | Permission policy | Accepted |
