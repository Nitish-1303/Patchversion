# [Patchversion] Fix: lodash 3.10.1 -> 4.17.21 (1 call site)

Branch: `patchversion/lodash-4.17.21`

**Not submitted to GitHub. Prepared PR text only.**

## What changed

**lodash** released **4.17.21** (from 3.10.1).

> BREAKING CHANGE: Renamed `_.contains` to `_.includes`. (lodash v4.0.0 changelog; the rename and removal are also verified by executing both real package versions.)

[View release](https://github.com/lodash/lodash/releases/tag/4.0.0)

## What this PR does

Updates 1 call site to work with lodash@4.17.21.

### Changed files

- `src/membership.js` (1 call site updated)

## Proof

This fix was verified in a local process (no isolation) before this PR text was prepared.

| Step | Result |
|------|--------|
| Tests on 3.10.1 (baseline) | 3/3 passed |
| Tests on 4.17.21 (before fix) | 1/3 passed, 2 failed |
| Tests on 4.17.21 (after fix) | 3/3 passed, 0 failed |

The fix updated all 1 affected call sites, and the full test suite is green after the fix.

### Not verified

The following call sites could not be verified by the test suite:

- `src/membership.js:10` - Uses the changed package but does not intersect this change; not individually verified

### Confidence

- Change classification confidence: 90%
- Sandbox type: local-process
- Proof generated: 2026-10-31T09:40:36.253Z

---
*Prepared by Patchversion. Not submitted to GitHub. Proof recorded from local execution.*
