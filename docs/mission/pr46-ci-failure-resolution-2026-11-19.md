# PR #46 CI Failure Resolution

**Branch:** `agent/p0-b13-b14-b8-completion`  
**Base head before fix:** `9cb6621`  
**Dirty tree:** `3c54282` preserved  
**Failing runs:** `44441043594`, `44440459475`

## Root causes

| Failure | Root cause |
|---|---|
| `billing-api.test.ts` TS2540 | Direct `process.env.NODE_ENV = ...` assigns a read-only typed property |
| CipherBill finding count | Auto-discovery emitted React migration solely because `isBreaking` was true, with **0** affected call sites |
| Concurrent delivery lock | Fixture used non-unified `'diff content'`; B13 fail-closed before lock assertion |
| YC checkout-service call sites | Discovered ChangeRecords had empty `affectedExports`, so impact analyzer never marked sites affected |
| `public-claims` emdash | Auth route comments contained U+2014 |

## Fixes

| Area | Change |
|---|---|
| Billing tests | `Object.defineProperty(process.env, 'NODE_ENV', …)` + restore in `finally` |
| Findings gate | Require `affectedCallSites.length > 0` for auto-discovered migrations; explicit `knownChanges` keep prior breaking behavior |
| Rule metadata | `IMigrationRule.affectedExports` populated per rule; discover copies into ChangeRecord |
| Concurrent delivery | Valid `createTwoFilesPatch` + Git Data mocks so lock path is exercised |
| Auth copy | Replace em dashes with ASCII hyphens |

## Verification (local)

```text
node node_modules/typescript/bin/tsc -p packages/site --noEmit   → exit 0
node node_modules/typescript/bin/tsc -p packages/engine --noEmit → exit 0

npm run test -w @patchversion/engine -- --runInBand
→ 516 passed, 22 skipped, exit 0

npm run test -w @patchversion/engine -- --runInBand \
  test/repository-scan-security.test.ts \
  test/yc-demo-workflow.test.ts \
  test/public-claims.test.ts \
  test/p0-b13-b14-b8.test.ts \
  test/orchestrator.test.ts \
  test/pr-reconciliation.test.ts
→ 139 passed, exit 0

npm run test -w @patchversion/site -- --runInBand test/billing-api.test.ts
→ 19 passed, exit 0

npm run prove -w @patchversion/engine → exit 0 (mockpay proof valid)
npm run prove:real -w @patchversion/engine → exit 0 (lodash proof valid)
```

Follow-on site isolation test: live `/api/scan` now discovers mockpay via real call-site evidence, then refuse host execution (fixture updated; not weakened).

B13/B14/B8 focused suites remain green.

## Independent review

_(filled by auditor)_

## Remaining blockers (unchanged)

Live GitHub E2E (B2), isolation fail-closed (B1/B3). Not CUSTOMER_READY from this CI repair.
