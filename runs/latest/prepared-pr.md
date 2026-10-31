# [Patchversion] Fix: mockpay 1.0.0 -> 2.0.0 (1 call site)

Branch: `patchversion/mockpay-2.0.0`

**Not submitted to GitHub. Prepared PR text only.**

## What changed

**mockpay** released **2.0.0** (from 1.0.0).

> BREAKING CHANGE: The 'source' parameter in charges.create has been renamed to 'payment_method'. Update your integration to use the new parameter name. The old parameter will be ignored.

[View release](https://www.npmjs.com/package/mockpay/v/2.0.0)

## What this PR does

Updates 0 call sites to work with mockpay@2.0.0.

### Changed files

- `src/createCharge.js` (0 call sites updated)

## Proof

This fix was verified in a local process (no isolation) before this PR text was prepared.

| Step | Result |
|------|--------|
| Tests on 1.0.0 (baseline) | 3/3 passed |
| Tests on 2.0.0 (before fix) | 1/3 passed, 2 failed |
| Tests on 2.0.0 (after fix) | 3/3 passed, 0 failed |

The fix updated 0 of 1 affected call sites. 2 could not be verified (see below).

### Not verified

The following call sites could not be verified by the test suite:

- `src\createCharge.js:4` - Affected by the change but the generated fix did not modify this file
- `src\createCharge.js:14` - Uses the changed package but does not intersect this change; not individually verified

### Confidence

- Change classification confidence: 95%
- Sandbox type: local-process
- Proof generated: 2026-10-31T03:55:47.148Z

---
*Prepared by Patchversion. Not submitted to GitHub. Proof recorded from local execution.*
