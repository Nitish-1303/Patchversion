# TryPatchBay — Agent Operating Contract

**Product:** TryPatchBay (repo: `Nitish-1303/Patchversion`)  
**Founder / final authority:** Yeluru Nitish  
**Primary outcome:** Secure, usable product with real developer usage by **2026-12-03**  
**Agent tooling is secondary** to product completion and customer traction.

## Read first

| Document | Purpose |
|---|---|
| `docs/agent-system/operating-manual.md` | How agents work day-to-day |
| `docs/agent-system/permission-policy.md` | Protected vs autonomous ops |
| `docs/agent-system/verification-policy.md` | Evidence + `PASS` / `NEEDS_REVISION` / `BLOCKED` |
| `docs/agent-system/agent-ownership.md` | Who owns which trees |
| `docs/release/customer-readiness-audit-2026-11-18.md` | Baseline: `NOT_CUSTOMER_READY` |
| `docs/release/p0-fail-closed-isolation-correction.md` | Local fail-closed isolation PASS |

## Active agents (start lean)

1. **Orchestrator** — backlog, parallelization, daily report, approval gates  
2. **Implementation engineer** — scoped code in assigned worktree/branch  
3. **QA engineer** — tests, fixtures, regression evidence  
4. **Independent auditor** — adversarial review; never implements the same change  

Specialists (Rust/migration, backend/DB, frontend, security, infra, Firecracker) activate only when needed.

## Non-negotiables

- Preserve dirty trees; use **isolated worktrees/branches** for parallel edits.  
- Never run untrusted customer code in the app/web process.  
- `isQualifiedIsolationActive()` must remain fail-closed unless founder-approved host qualification exists.  
- Firecracker F2 is **stage-gated**; T2-INV PASS ≠ T2 migration authorized.  
- Do not invent customers, PRs, revenue, or benchmarks. Re-run proofs before citing numbers.  
- Do not merge to `main`, deploy, or change production secrets without founder approval.

## Current preferred worktrees

| Path | Branch | Use |
|---|---|---|
| `C:\Users\NITISH\Downloads\Patchversion` | `fix/p0-production-blocker-resolutions` (dirty) | Preserve WIP; docs/agent-system ok |
| `C:\Users\NITISH\Downloads\Patchversion-main-p0` | `agent/p0-product-completion` @ `origin/main` | Clean product P0 implementation |

## Definition of customer-ready (summary)

External developer can: auth → authorize repo → migrate supported dep → isolated test evidence → real draft GitHub PR → accurate quota — without founder manual intervention. See mission Part 11.
