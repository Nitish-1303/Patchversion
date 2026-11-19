# Phase 1 — Prioritized Plan & Blocker Ledger

**Mission:** Customer-usable + production-ready dependency migration product  
**Worktree for implementation:** `Patchversion-main-p0` / `agent/p0-product-completion` (or successor isolated branches)  
**Preserve:** dirty `Patchversion` @ `3c54282`  
**Forbidden without founder approval:** merge PR #45, production deploy, production migrations, secret changes, destructive ops  

---

## Blocker ledger (P0 = customer-path hard stops)

| ID | Severity | Blocker | Evidence | Exit criteria |
|---|---|---|---|---|
| B1 | **P0** | No independently qualified isolation for customer repos | `isQualifiedIsolationActive()` → false; `generateAndValidateFix` throws for non-fixtures | Founder-approved qualified provider + host evidence; fail-closed preserved until then |
| B2 | **P0** | Live GitHub App/OAuth/install→PR path NOT TESTED | Task2 LIVE-* skipped; no external E2E evidence | Live credentials E2E: install → private repo → scan → (fixture or approved exec) → draft PR |
| B3 | **P0** | Customer validation evidence cannot be produced | Blocked by B1 | Passing ValidationRecord from isolated run on authorized private repo |
| B13 | **P0** | Draft PR opens **without committing the patch** | Was: branch+PR without commit | **CLOSED** on `agent/p0-b13-b14-b8-completion` (`9f39d3e`+): `commitPatchToBranch` + empty-diff refusal; orchestrator E2E mocks Git Data path. Live GitHub E2E still outstanding (B2) |
| B14 | **P0** | Findings driven by fixture known-changes (mockpay/lodash) | Was: unconditional fixture inject | **CLOSED**: `discoverSupportedMigrations` from actual deps + registry; `file:` declaredVersion preserves offline vendor proof paths |
| B4 | **P1** | Scan remote revalidation off on `/api/scan` | `revalidateRemote: false` | Decide product policy: remote revalidate on scan vs delivery-only; implement + test |
| B5 | **P1** | Demo/billing silent fallbacks can confuse pilots | checkout demo gated; packages mockpay seed; dashboard fixtures; client PR simulation UI | Honest UX; refuse silent success paths |
| B15 | **P1** | Ungated `/api/auth` demo session (was) | Fallthrough + passwordless users | **Remediated:** requires `ALLOW_DEMO_AUTH` + non-production |
| B6 | **P1** | Production env completeness unverified | Prior audit: OAuth/billing env gaps on Vercel | Founder-confirmed env matrix (names only in docs) |
| B7 | **P1** | Migrations 003–005 not applied to production | PR only; remap vs dirty | Founder-approved non-prod then prod migrate plan |
| B8 | **P0** | Quota not enforced on PR delivery | Was: counter unused | **CLOSED**: developer monthly limit 1 enforced in `deliverPullRequest` (`QUOTA_EXCEEDED`); paid unlimited. Stronger Postgres reservation lock still optional hardening |
| B9 | **P2** | Observability / backups / incident recovery incomplete | readiness partial | Minimal runbook + alert + backup restore drill evidence |
| B10 | **P2** | Marketing honesty vs capabilities | homepage/docs vs fixture reality | Copy audit; remove overclaims before pilot |
| B11 | **Process** | Dirty tree migration collision | remap doc | Never dual-apply; founder remap if merging dirty history |
| B12 | **Process** | F2 Firecracker stage-gated | host evidence blocked | Separate track; T2-INV ≠ customer enablement |
| B16 | **P2** | LLM fix path is null stub | `FixGenerator.generateWithLLM` → `null` | Deterministic rules only until real LLM path or remove claims |

---

## Prioritized implementation plan

### Track A — Make the customer loop honest and completable (highest leverage)

1. **Pilot-honest product framing** (B10, B5)  
   - Label fixture/demo surfaces.  
   - Production: no silent billing demo success; clear “processor not configured”.  
   - Acceptance: copy + API responses reviewed; site tests for honesty gates.

2. **Live GitHub path verification** (B2)  
   - Configure App + OAuth in a **non-prod** environment (founder secrets).  
   - Execute LIVE Task2 + manual: install → list private repo → scan file tree.  
   - Record evidence (commands, SHAs, redacted logs).  
   - Acceptance: LIVE tests unskipped under secret-gated CI or signed founder run log.

3. **Isolation decision for pilot** (B1, B3) — **founder choice required**  
   - Option A (recommended short-term): Pilot **only trusted fixtures + read-only remote scan**, draft PR only when validation is fixture-backed or founder-approved exception — stay NOT_CUSTOMER_READY for arbitrary private-repo test execution.  
   - Option B: Qualify an isolation backend with host evidence (F2 or other approved) — **do not** flip env-only qualification.  
   - Acceptance: written decision in `docs/mission/decision-log`; code matches decision.

4. **Complete validate → approve → draft PR on a controlled pilot repo** (B2, B3)  
   - Prefer a founder-owned private repo with known fixture-like layout **or** qualified isolation.  
   - Acceptance: real draft PR URL + validation evidence artifact.

### Track B — Production security & reliability

5. Apply migrations 003–005 to staging Postgres; verify RLS + oauth_states (B7).  
6. Billing webhook live signature tests in staging (B8).  
7. Quota enforcement tests + staging proof (B8).  
8. Minimal observability: structured error codes, alert on webhook/auth failures (B9).  
9. Backup/restore drill documented (B9).

### Track C — Pilot recruitment (parallel, non-fabricated)

10. Pilot onboarding doc (what works / what does not).  
11. Interview script + outreach drafts for founder to send.  
12. Feedback capture template.  
**Do not invent customers, usage, or paid commitments.**

### Track D — Independent production-readiness review (Phase 5)

13. After Tracks A–B evidence exists: separate auditor exercises full workflow, security, gates → `CUSTOMER_READY` / `PRODUCTION_READY` / `BOTH` / `NOT_READY`.

---

## Phase sequencing vs mission phases

| Mission phase | This plan |
|---|---|
| Phase 1 baseline | **This document + matrix + architecture** |
| Phase 2 critical gaps | Track A items 1–4 |
| Phase 3 security/reliability | Track B |
| Phase 4 pilot | Track C (after honest path exists) |
| Phase 5 independent review | Track D |

---

## Immediate next engineering actions (no founder merge yet)

1. Keep PR #45 as salvage base; do **not** merge without approval.  
2. Open a **new** isolated branch/worktree for customer-readiness gaps (prefer not polluting dirty `3c54282`).  
3. Implement honesty gates for billing/demo (safe, no secrets).  
4. Prepare live GitHub E2E checklist for founder credentials.  
5. Draft pilot onboarding instructions reflecting **NOT_READY** realities.

---

## Explicit current verdict

**NOT_READY** — neither CUSTOMER_READY nor PRODUCTION_READY.
