# Blocker Register — 2026-11-23

Status vocabulary: `OPEN` | `IN_PROGRESS` | `MITIGATED` | `RESOLVED` | `DEFERRED` | `EXTERNAL`

| ID | Severity | Component | Evidence | Root cause | Resolution | Verification | Status | External? |
|---|---|---|---|---|---|---|---|---|
| B-ISO-001 | P0 | Customer isolation | `isQualifiedIsolationActive()=false` | Untrusted execution not product-qualified | Keep fail-closed until independent host qual + founder flip | Gate source review; adversarial suite | **MITIGATED** (correctly off) | Host / founder |
| B-MIG-001 | P0 | Migration lineage | Sign-off D1; PV `005` vs main `007` | Parallel numbering | Main 001–007 canonical; do not apply PV dir | Sign-off doc | **OPEN** (policy set; apply blocked) | Founder D6 |
| B-MIG-002 | P1 | Staging/prod migrations | Neon apply UNVERIFIED | No authorized DB inspect/apply | Inspection-first (D5); no agent Neon | Ops status when approved | **OPEN** | Neon/ops |
| B-GH-001 | P1 | Webhook divergence | 1B.1 audit | Two dirty trees | SoT + tests + founder-audit merge report (uncommitted) | `PHASE1B2_MERGE_READINESS_REPORT.md` | **MITIGATED** (`CONDITIONAL_READY_FOR_FOUNDER_COMMIT`) | — |
| B-GH-002 | P1 | Live App→PR E2E | Mission 8 BLOCKED live | Missing live credentials/evidence | Disposable org under founder gate | Evidence pack | **OPEN** | GitHub App secrets |
| B-ONB-001 | P1 | Onboarding UX | `onboarding/page.tsx` honesty | Product incomplete | Real install flow or invite-only ops | Live install | **OPEN** | — |
| B-F2-001 | P0 (F2 track) | Firecracker T2+ | T2-INV PASS only | T2 migration unauthorized | Separate F2 track | Cargo + auditor | **DEFERRED** | Host DMA/IOMMU |
| B-OBS-001 | P2 | Observability | No Grafana stack verified in-repo | Not built for prod | Prefer lean OTEL later | — | **DEFERRED** | — |
| B-CUST-001 | P1 | Customer validation | No CRM/validation module | Never built | Separate internal workspace | Tests + zero-fake metrics | **OPEN** | Real interviews |
| B-MKT-001 | P2 | Marketing/SEO stack | Not installed | Not required for security | Evaluate later; no spam tools | — | **DEFERRED** | Founder publish approval |

Critical launch blockers for Dec 12 controlled launch: **B-ISO-001** (remain fail-closed or qualify), **B-GH-002**, **B-ONB-001**, **B-MIG-002**, honest product claims.
