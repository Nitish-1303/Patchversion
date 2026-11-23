# Customer Validation Architecture (stub — 2026-11-23)

**Status:** Designed / not implemented in this session beyond documentation.  
**Rule:** Never seed fake prospects, interviews, revenue, or traction.

## Placement

Internal founder-only workspace under a future route such as `/internal/validation` (not the public `/dashboard`). Separate from customer product UI.

## Reuse first

- Existing auth/session for founder gate.  
- Existing GitHub App + migration engine for **authorized** pilots only.  
- Do not duplicate tenant/user tables; link via IDs.

## Proposed new tables (future migration — **not applied**; requires founder + lineage D6)

Prospect, Company, Contact, Interview, PainPoint, Pilot, MigrationOutcome, PricingExperiment, ValidationEvidence, AuditEvent — with timestamps, ownership, retention, and no private repo source storage in CRM.

## Metrics contract

All dashboard counts = `SELECT COUNT(*)` from real rows. Zero is valid. Test fixtures must not inflate founder views.

## First executable product slice (later worktree)

1. Founder-gated empty pipeline UI showing zeros.  
2. Manual prospect create/edit.  
3. Interview note capture (raw text immutable).  
4. Link to existing migration job IDs when pilots run.

## Blocked without humans

Real interviews, outreach sends, private repo access, payments.
