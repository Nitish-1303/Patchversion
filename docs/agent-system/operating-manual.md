# Operating Manual — TryPatchBay AI Engineering Agency

## Daily loop (pstack-inspired, gstack-executed)

1. **VALIDATE** — Is this the highest-leverage customer-facing work?  
2. **PLAN** — Acceptance criteria + ownership + worktree.  
3. **BUILD** — Implement in isolation.  
4. **REVIEW** — Self-review + security sanity.  
5. **QA** — Tests with exit codes.  
6. **AUDIT** — Independent `PASS` / `NEEDS_REVISION` / `BLOCKED`.  
7. **SHIP** — Draft PR; founder merges/deploys.  
8. **MONITOR / REFLECT** — Production smoke + daily report + traction.

## Task card template

```text
Objective:
Scope / out of scope:
Acceptance criteria:
Assigned agent:
Files owned:
Worktree/branch:
Dependencies:
Commands + exit codes:
Risks:
Independent review:
```

## Sprint priority (customer first)

1. Preserve & integrate unreleased P0/GitHub hardening onto `main` (migrations renumbered).  
2. Complete GitHub OAuth env + live install→scan path (fixture-safe execution).  
3. Real draft PR on authorized pilot repo (human-gated; fail-closed exec).  
4. Onboarding honesty + docs.  
5. Pilot outreach drafts (founder sends).  
6. F2 track in parallel — no customer-exec enablement.

## Tooling defaults

- Use **gstack** skills for review/QA/browse when helpful.  
- Do **not** run pstack `./setup` unless uniqueness is proven and collisions resolved.  
- Spec Kit only for net-new substantial features.
