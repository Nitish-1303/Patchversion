# Verification Policy

## Evidence classes

| Class | Counts as |
|---|---|
| Local unit/integration | Necessary, not sufficient for production claims |
| GitHub CI on SHA | Stronger for merge readiness |
| Live integration (GitHub App, PayPal, Neon) | Required for those features |
| Host qualification (F2/microVM) | Required before customer code execution |

## Independent auditor verdicts

Exactly one per review:

- **`PASS`** — acceptance criteria met with reproducible evidence; scope limitations stated.  
- **`NEEDS_REVISION`** — defects must be fixed before acceptance.  
- **`BLOCKED`** — cannot complete without external dependency or founder action.

Auditor must open source and re-run key commands; reports alone are insufficient.

## Product claim rules

- Fixture prove ≠ customer repo prove.  
- Draft PR API code ≠ live PR created.  
- Historical lodash timings must be **re-run** before citing.  
- Fail-closed isolation is a feature until qualified backends exist — do not call it “broken isolation.”
