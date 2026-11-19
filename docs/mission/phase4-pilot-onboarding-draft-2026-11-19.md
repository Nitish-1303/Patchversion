# External Pilot Onboarding — Draft (honest)

**Status:** Draft for founder review. Product is **NOT_CUSTOMER_READY**.  
**Do not promise** isolated test execution on arbitrary private repos or guaranteed PR delivery without validation evidence.

## What TryPatchBay does today (accurate)

TryPatchBay aims to detect dependency upgrade breakages, propose deterministic AST patches, and (when evidence exists) open a **draft** GitHub PR.

**Verified today:**

- Fixture / local prove loops (CI `prove`, `prove:real`).
- Fail-closed refusal to run untrusted customer suites without qualified isolation.
- Salvage code path for GitHub App/OAuth/billing modules on PR #45 (not necessarily production-deployed).

**Not verified for external customers:**

- Live install → private repo → scan → isolated tests → draft PR end-to-end.
- Paid billing activation on production.
- Firecracker / qualified microVM isolation.

## What a pilot participant should expect

1. Connect GitHub (App + OAuth) when founder enables credentials in a pilot environment.  
2. Select an authorized repository.  
3. Inspect scan findings (file-level remote scan may work with App token).  
4. Understand that **test validation on your private repo may be blocked** until isolation is qualified.  
5. If a patch is approved with valid evidence, a **draft** PR may be created.  
6. Tell us whether findings/patches were useful — even if the loop stops early.

## How to report feedback

- Repo + package examined  
- Did install/auth work?  
- Did scan findings match reality?  
- Was the loop blocked at validation/PR? Error message?  
- Would you use this weekly? Why/why not?

## Founder ops checklist before inviting anyone

- [ ] Non-prod or explicitly labeled pilot deploy with correct GitHub App/OAuth env  
- [ ] Honest UI copy (no “production isolation” claims)  
- [ ] Billing demo fallback disabled or clearly labeled in production  
- [ ] Written consent that pilot repos may be scanned via GitHub App permissions  
- [ ] No fabricated success metrics  

## Recruitment

Founder sends outreach. Agents may draft messages; agents must **not** invent customers, usage, or payment commitments.
