# Customer Discovery Plan

**Status:** Prepared, not yet executed. No interviews have been conducted.

## Ideal Customer Profile

**Primary:** Small SaaS startups (5-50 engineers) with API-heavy products.

**Observable qualification criteria:**
- Product depends on 3+ third-party APIs (payments, communication, cloud services)
- Engineering team < 50 (no dedicated platform/infrastructure team)
- Has experienced at least one production incident from an upstream API change
- Uses JavaScript/TypeScript as primary backend language (initial ecosystem)
- Deploys to production at least weekly

**Secondary:** Platform/infrastructure engineers at mid-size companies maintaining
multiple internal API integrations.

## Outreach Message Draft

**DO NOT SEND without user approval.**

Subject: How does your team handle API breaking changes?

Hi [name],

I'm researching how small engineering teams handle third-party API changes that break
their integrations. Not selling anything - trying to understand the problem before
building anything.

Would you be open to a 15-minute conversation about the last time an upstream API
change caused an issue for your team?

Thanks,
Nitish

## Interview Script

### Opening (2 min)
- Confirm role, team size, primary tech stack
- How many third-party APIs does your product depend on?

### Problem exploration (8 min)
1. Describe the last upstream API change that broke or threatened your product.
2. How did you discover it?
3. How long did investigation and remediation take?
4. Which code, customers, or workflows were affected?
5. How do you monitor changes today?
6. What tools, manual processes, or scripts do you already use?
7. What makes existing solutions insufficient?
8. How frequently does this problem occur?

### Solution reaction (3 min)
9. What would prevent you from trusting an automated fix?
10. Would you test a solution against a real integration?

### Close (2 min)
- Can I follow up if I build something?
- Is there anyone else you think I should talk to?

## Interview Notes Template

```
Date:
Name:
Role:
Company:
Team size:
Tech stack:
APIs depended on:

Last API break (describe):
Discovery method:
Time to remediate:
Affected code/customers:
Current monitoring:
Existing tools used:
Gaps in existing solutions:
Frequency of problem:
Trust concerns with automated fixes:
Willing to test prototype: Y/N
Follow-up allowed: Y/N
Referral:
Problem severity (1-5):
Notes:
```

## Problem Severity Scoring Rubric

| Score | Description |
|-------|-------------|
| 5 | Production outage, customer-facing, took > 4 hours to fix |
| 4 | Production degradation, internal discovery, took 1-4 hours |
| 3 | Staging/dev break, discovered before production, took < 1 hour |
| 2 | Noticed in changelog, manually updated, minor inconvenience |
| 1 | Aware of the problem but never been affected |

**Validation threshold:** Average severity >= 3.5 across 15 interviews suggests
the problem is frequent and costly enough to justify a product.

## Design Partner Invitation Draft

**DO NOT SEND without user approval.**

Subject: Early access: API change detection for your stack

Hi [name],

Based on our conversation about [specific API break], I'm building a tool that
watches for upstream API changes and maps them to the exact lines in your code
that are affected.

I'm looking for 3-5 design partners to test this against a real integration.
Here's what that means:

- I set up monitoring for one of your API dependencies (free)
- When a change is detected, you get a report showing affected code
- For fixable changes, you get a tested patch to review
- You give me honest feedback on what's useful and what isn't

No cost, no commitment. 10 minutes to set up. Interested?

## Objection Tracking

| Objection | Count | How addressed |
|-----------|-------|---------------|
| (none yet) | | |
