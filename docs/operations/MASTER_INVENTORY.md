# TryPatchBay — Master Inventory (Phase Zero)

**Date:** 2026-11-23  
**Authoring worktree:** `C:\Users\NITISH\Downloads\Patchversion-phase1b2-webhooks`  
**Integration baseline:** `e354cc07f8c9cb1c20b3c2bca685c664a3bf4aec` (`origin/main`, PR #46 merge)  
**Release verdict (product):** **NOT_CUSTOMER_READY** (evidence: prior Phase 0 readiness pack 2026-11-20; isolation gate hard-false)

---

## 1. Repository

| Field | Value |
|---|---|
| GitHub | `https://github.com/Nitish-1303/Patchversion` |
| Product URL | `https://trypatchbay.vercel.app` |
| Vercel project | `trypatchbay` / `prj_d1YZdQ28wbKASKWcHGgGdBmndvgS` |
| Packages | `engine`, `site`, `shared` (npm workspaces) |
| Site stack | Next.js **16.4.3**, React **^18.3** |
| DB | Custom SQL migrations under `packages/engine/src/db/migrations` (not Prisma) — **7 files on b1b3 dirty lineage; 5 on main** |
| Isolation | `isQualifiedIsolationActive()` → **hard `return false`** |

---

## 2. Linked worktrees (preserve all)

| Path | Branch | HEAD | Dirty |
|---|---|---|---|
| `Patchversion` | `fix/p0-production-blocker-resolutions` | `3c54282` | **57** |
| `Patchversion-b1b3` | `agent/b1-b3-isolation-security` | `e354cc0` | **159** |
| `Patchversion-main-p0` | `agent/p0-b13-b14-b8-completion` | `b5765e1` | **9** |
| `Patchversion-phase1a-migration` | `docs/phase1a-migration-lineage-signoff` | `e354cc0` | 0 |
| `Patchversion-phase1b2-webhooks` | `feat/phase1b2-webhook-source-of-truth` | `e354cc0` | (this stream) |
| `Patchversion-authority-main` | `authority/integration-baseline-e354cc07` | `e354cc0` | — |
| `Patchversion-pr45-ci` | `agent/pr45-ci-remediation` | `7505c56` | 0 |
| codex / kilo / copilot pools | various | various | preserve |

---

## 3. Merged PR evidence (verified)

| PR | State | Notes |
|---|---|---|
| #46 | MERGED 2026-11-19 | B13/B14/B8 → tip of main |
| #45 | MERGED 2026-11-19 | Product salvage + migrations 003–005 |
| #37 | MERGED 2026-11-05 | Production blocker resolutions |
| #38–#44 | MERGED | Security fail-closed / worker tenant / lifecycle |

Open PRs at discovery: **none**.

---

## 4. Product surfaces (site)

Marketing/docs pages exist (`/`, `/product`, `/pricing`, `/onboarding`, `/dashboard`, `/docs/*`, privacy/terms).  
Onboarding page honestly states App install / live connect / sandboxed PR **not implemented**.

---

## 5. Prior completed streams (do not redo blindly)

- Phase 0 customer-readiness docs under `docs/release/*2026-11-20*` (b1b3).
- Migration lineage founder sign-off (D1/D2/D5/D7 approved; D3 defer; D6/D8 **not** approved).
- Phase 1B.1 webhook audit: SoT = b1b3 handler + payload-hash + stricter processor.
- Firecracker T2-INV PASS; T2 migration unauthorized; host DMA still blocked.
- H-4C-02 durable nonce on **b1b3 dirty** (not on main).

---

## 6. What this worktree owns

`feat/phase1b2-webhook-source-of-truth` — GitHub **webhook** SoT implementation + Phase Zero ops docs.  
Does **not** own OAuth route reconciliation, migrations apply, Firecracker, marketing/SEO installs, or production deploy.
