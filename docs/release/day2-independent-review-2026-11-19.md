# Day 2 Independent Review — 2026-11-19

**Auditor:** read-only security review subagent  
**Worktree:** `Patchversion-main-p0` / `agent/p0-product-completion`  
**Base:** `3668ba3`

## Verdict

**NEEDS_REVISION**

## Summary

Companion APIs and site wiring are materially ported; fail-closed isolation remains hard-false; unit/integration evidence is strong (483 engine / 129 site). Not merge/ship ready while site production build and root lint fail on host, live GitHub E2E is unverified, and migration history must not be mixed with dirty `fix/p0-…` without remap.

## Findings (post-salvage remediation status)

| Finding | Status |
|---|---|
| Companion API ports largely complete | Open note only (docs stale elsewhere) |
| Postgres `consumeOAuthState` fail-open pre-005 | **Remediated** → returns `false`; durable cookie gates callback consume |
| Production OAuth demo session without client id | **Remediated** → requires `ALLOW_DEMO_GITHUB_LOGIN` and non-production |
| Webhook/Stripe/PayPal/isolation positives | Observed OK |
| Migration 003–005 vs dirty numbering collision | Remaining process blocker |
| Site `next build` `fnOrEmpty` / root ESLint | Remaining host/tooling blockers |
| Live GitHub + hosted-db suites | Remaining verification gaps |

Customer readiness: **NOT_CUSTOMER_READY**.
