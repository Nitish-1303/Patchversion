# Security Baseline — TryPatchBay (2026-11-23)

## Hard rules (current)

1. `isQualifiedIsolationActive()` remains **hard false** until independent qualification + founder-approved code change (not env flags).
2. No customer-controlled code execution in app/web process.
3. No production Neon migrate / secret dump / deploy without founder approval.
4. Webhook HMAC over **raw body**; delivery-id idempotency; altered-body → **409** (Phase 1B.2 SoT).
5. Installation id required for check_run / check_suite / pull_request mutations (Phase 1B.2 SoT).
6. OAuth modules (`oauth-security`, `repository-authorization`) preserved; route reconciliation deferred.
7. Fixture/Mission evidence ≠ customer or production proof.
8. Never weaken tests to pass CI.

## Verified controls (code / prior audits)

| Control | Status |
|---|---|
| Fail-closed isolation gate | Present on main + dirty trees |
| Worker tenant ownership / lifecycle signing | Merged PRs #39–#43 |
| RLS / Mission 7 local PASS | Local disposable; prod UNVERIFIED |
| Job nonce H-4C-02 | b1b3 dirty; `007` unpromoted (D3) |
| Webhook allowlist + replay window | Present |
| Billing webhook unit tests | Present; live payment not authorized |

## Open security gaps for launch

- Live GitHub App E2E unverified  
- Staging/prod migration apply unverified  
- Isolation not product-qualified for untrusted repos  
- Concurrent webhook race tests newly added in phase1b2 (must pass)  
- No full SAST/secret-scan CI gate recorded as mandatory yet  

## Incident / release

Critical findings block launch. Workarounds that hide errors do not clear blockers.
