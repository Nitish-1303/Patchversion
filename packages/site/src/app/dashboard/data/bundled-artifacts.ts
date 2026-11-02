// Bundled verified proof artifacts for zero-dependency serverless/Vercel deployment
export const BUNDLED_LODASH_PROOF = {
  "id": "fd70e04d-da84-4bc9-a674-caa4be122d73",
  "changeId": "npm-lodash-3.10.1-4.17.21",
  "repoId": "acme/membership",
  "baselineResult": {
    "passed": 3,
    "failed": 0,
    "total": 3,
    "output": "\n> acme-membership@1.0.0 test\n> jest --forceExit\n\nPASS src/membership.test.js\n  isMember\n    √ finds a present member (8 ms)\n    √ rejects an absent member (1 ms)\n  uniqueMembers\n    √ dedupes (9 ms)\n\nTest Suites: 1 passed, 1 total\nTests:       3 passed, 3 total\nSnapshots:   0 total\nTime:        3.676 s\nRan all test suites.\nForce exiting Jest: Have you considered using `--detectOpenHandles` to detect async operations that kept running after all tests finished?\n",
    "exitCode": 0
  },
  "redResult": {
    "passed": 1,
    "failed": 2,
    "total": 3,
    "output": "\n> acme-membership@1.0.0 test\n> jest --forceExit\n\nFAIL src/membership.test.js\n  isMember\n    × finds a present member (4 ms)\n    × rejects an absent member\n  uniqueMembers\n    √ dedupes (3 ms)\n\n  ● isMember › finds a present member\n\n    TypeError: _.contains is not a function\n\n    \u001b[0m \u001b[90m 4 |\u001b[39m \u001b[90m// (renamed to `_.includes`), so this module genuinely breaks on v4.\u001b[39m\n     \u001b[90m 5 |\u001b[39m \u001b[36mfunction\u001b[39m isMember(ids\u001b[33m,\u001b[39m id) {\n    \u001b[31m\u001b[1m>\u001b[22m\u001b[39m\u001b[90m 6 |\u001b[39m   \u001b[36mreturn\u001b[39m _\u001b[33m.\u001b[39mcontains(ids\u001b[33m,\u001b[39m id)\u001b[33m;\u001b[39m\n     \u001b[90m   |\u001b[39m            \u001b[31m\u001b[1m^\u001b[22m\u001b[39m\n     \u001b[90m 7 |\u001b[39m }\n     \u001b[90m 8 |\u001b[39m\n     \u001b[90m 9 |\u001b[39m \u001b[36mfunction\u001b[39m uniqueMembers(ids) {\u001b[0m\n\n      at contains (src/membership.js:6:12)\n      at Object.isMember (src/membership.test.js:7:12)\n\n  ● isMember › rejects an absent member\n\n    TypeError: _.contains is not a function\n\n    \u001b[0m \u001b[90m 4 |\u001b[39m \u001b[90m// (renamed to `_.includes`), so this module genuinely breaks on v4.\u001b[39m\n     \u001b[90m 5 |\u001b[39m \u001b[36mfunction\u001b[39m isMember(ids\u001b[33m,\u001b[39m id) {\n    \u001b[31m\u001b[1m>\u001b[22m\u001b[39m\u001b[90m 6 |\u001b[39m   \u001b[36mreturn\u001b[39m _\u001b[33m.\u001b[39mcontains(ids\u001b[33m,\u001b[39m id)\u001b[33m;\u001b[39m\n     \u001b[90m   |\u001b[39m            \u001b[31m\u001b[1m^\u001b[22m\u001b[39m\n     \u001b[90m 7 |\u001b[39m }\n     \u001b[90m 8 |\u001b[39m\n     \u001b[90m 9 |\u001b[39m \u001b[36mfunction\u001b[39m uniqueMembers(ids) {\u001b[0m\n\n      at contains (src/membership.js:6:12)\n      at Object.isMember (src/membership.test.js:11:12)\n\nTest Suites: 1 failed, 1 total\nTests:       2 failed, 1 passed, 3 total\nSnapshots:   0 total\nTime:        1.876 s, estimated 4 s\nRan all test suites.\nForce exiting Jest: Have you considered using `--detectOpenHandles` to detect async operations that kept running after all tests finished?\n",
    "exitCode": 1
  },
  "greenResult": {
    "passed": 3,
    "failed": 0,
    "total": 3,
    "output": "\n> acme-membership@1.0.0 test\n> jest --forceExit\n\nPASS src/membership.test.js\n  isMember\n    √ finds a present member (6 ms)\n    √ rejects an absent member (10 ms)\n  uniqueMembers\n    √ dedupes (3 ms)\n\nTest Suites: 1 passed, 1 total\nTests:       3 passed, 3 total\nSnapshots:   0 total\nTime:        1.943 s, estimated 2 s\nRan all test suites.\nForce exiting Jest: Have you considered using `--detectOpenHandles` to detect async operations that kept running after all tests finished?\n",
    "exitCode": 0
  },
  "fixDiff": "===================================================================\n--- a/src/membership.js\n+++ b/src/membership.js\n@@ -3,7 +3,7 @@\n // Real lodash usage. In lodash 4.0.0 `_.contains` was removed\r\n // (renamed to `_.includes`), so this module genuinely breaks on v4.\r\n function isMember(ids, id) {\r\n-  return _.contains(ids, id);\r\n+  return _.includes(ids, id);\r\n }\r\n \r\n function uniqueMembers(ids) {\r\n",
  "fixedFiles": [
    "src/membership.js"
  ],
  "coverageVerified": 1,
  "coverageTotal": 1,
  "unverifiable": [
    {
      "callSite": {
        "filePath": "src\\membership.js",
        "line": 10,
        "column": 10,
        "importStatement": "const _ = require('lodash');",
        "callExpression": "_.uniq(ids)",
        "packageName": "lodash",
        "exportedSymbol": "*"
      },
      "reason": "Uses the changed package but does not intersect this change; not individually verified"
    }
  ],
  "producedAt": "2026-11-02T12:14:28.263Z",
  "sandboxType": "local-process",
  "durationMs": 54346
};

export const BUNDLED_LODASH_PR = "# [Patchversion] Fix: lodash 3.10.1 -> 4.17.21 (1 call site)\n\nBranch: `patchversion/lodash-4.17.21`\n\n**Not submitted to GitHub. Prepared PR text only.**\n\n## What changed\n\n**lodash** released **4.17.21** (from 3.10.1).\n\n> BREAKING CHANGE: Renamed `_.contains` to `_.includes`. (lodash v4.0.0 changelog; the rename and removal are also verified by executing both real package versions.)\n\n[View release](https://github.com/lodash/lodash/releases/tag/4.0.0)\n\n## What this PR does\n\nUpdates 1 call site to work with lodash@4.17.21.\n\n### Changed files\n\n- `src/membership.js` (1 call site updated)\n\n## Proof\n\nThis fix was verified in a local process (no isolation) before this PR text was prepared.\n\n| Step | Result |\n|------|--------|\n| Tests on 3.10.1 (baseline) | 3/3 passed |\n| Tests on 4.17.21 (before fix) | 1/3 passed, 2 failed |\n| Tests on 4.17.21 (after fix) | 3/3 passed, 0 failed |\n\nThe fix updated all 1 affected call sites, and the full test suite is green after the fix.\n\n### Not verified\n\nThe following call sites could not be verified by the test suite:\n\n- `src\\membership.js:10` - Uses the changed package but does not intersect this change; not individually verified\n\n### Confidence\n\n- Change classification confidence: 90%\n- Sandbox type: local-process\n- Proof generated: 2026-11-02T12:14:28.263Z\n\n---\n*Prepared by Patchversion. Not submitted to GitHub. Proof recorded from local execution.*\n";

export const BUNDLED_LODASH_TRANSCRIPT = "Patchversion proof run - 2026-11-02T12:13:36.353Z\nFixture repo: fixtures\\lodash-repo\nChange record: fixtures\\real-migration\\lodash-change-record.json\n\nChange: lodash 3.10.1 -> 4.17.21\nSource: changelog - https://github.com/lodash/lodash/releases/tag/4.0.0\nNotes: BREAKING CHANGE: Renamed `_.contains` to `_.includes`. (lodash v4.0.0 changelog; the rename and removal are also verified by executing both real package versions.)\n\n--- USAGE MAP ---\nFiles scanned: 3, files using lodash: 1\n  src\\membership.js:6  _.contains(ids, id)\n  src\\membership.js:10  _.uniq(ids)\n\n--- IMPACT ---\nAffected call sites: src\\membership.js:6\nPotential (broad match, not individually verified): src\\membership.js:10\n\n--- RED-TO-GREEN PROOF ---\nBaseline (3.10.1):  exit 0 - 3 passed, 0 failed, 3 total\nBumped (4.17.21):      exit 1 - 1 passed, 2 failed, 3 total\nAfter fix (4.17.21):   exit 0 - 3 passed, 0 failed, 3 total\nSandbox: local-process (local process, NO isolation)\nCoverage: fix updated 1 of 1 affected call sites\nFiles changed by fix: src/membership.js\nDuration: 54.3s\n\n--- PREPARED PR ---\nTitle: [Patchversion] Fix: lodash 3.10.1 -> 4.17.21 (1 call site)\nBranch: patchversion/lodash-4.17.21\n\nPROOF VALID. Outputs written to ..\\..\\runs\\lodash-4-migration/\n";

export const BUNDLED_LODASH_MANIFEST = {
  "version": "1.0.0",
  "runId": "run_lodash_4_final",
  "sourceRevision": "38b129ce8524face42de9c2fb49e56f63a9d24ea",
  "targetRepo": {
    "id": "acme/membership",
    "fullName": "acme/membership"
  },
  "dependency": {
    "packageName": "lodash",
    "fromVersion": "3.10.1",
    "toVersion": "4.17.21",
    "registryUrl": "https://registry.npmjs.org/lodash/-/lodash-3.10.1.tgz",
    "integritySha512": "sha512-9mDDwqVIma6OZX79ZlDACZl8sBm0TEnkf99zV3iMA4GzkIT/9hiqP5mY0HoT1iNLCrKc/R1HByV+yJfRWVJryQ=="
  },
  "execution": {
    "providerName": "local-process",
    "isolationType": "local-process",
    "command": "npm test",
    "exitCodes": {
      "baseline": 0,
      "red": 1,
      "green": 0
    },
    "startedAt": "2026-10-29T14:33:16.662Z",
    "completedAt": "2026-10-29T14:33:50.094Z",
    "durationMs": 35628
  },
  "patch": {
    "generatedFiles": [
      "src\\membership.js"
    ],
    "sha256": "102de9c1e992fd5b2ce4794ab01d22be0ab20d1be7b96c89beec5340811b2b67",
    "patchType": "deterministic-ast"
  },
  "artifacts": [
    {
      "relativePath": "transcript.txt",
      "sha256": "6c114a8004a7135f5b114faa004a0e9c1c20e6846f36cd3c2e3ded1613aa8cee",
      "bytes": 1245
    },
    {
      "relativePath": "proof.json",
      "sha256": "6eccced640571d1748f1a6e6a4da869983eb9870119ec0067f8814f46764f367",
      "bytes": 4690
    },
    {
      "relativePath": "prepared-pr.md",
      "sha256": "b1af46168240b8b87b5024d00777544ee61d21dea99cd322862c2ba08fc6054f",
      "bytes": 1403
    }
  ],
  "tamperEvidentHash": "b5f6870ccf8577d6917440443e4af8614f377aaf8447372a0f5e6ce7a6a1b3f6"
};

export const BUNDLED_LODASH_SOURCE = "const _ = require('lodash');\r\n\r\n// Real lodash usage. In lodash 4.0.0 `_.contains` was removed\r\n// (renamed to `_.includes`), so this module genuinely breaks on v4.\r\nfunction isMember(ids, id) {\r\n  return _.contains(ids, id);\r\n}\r\n\r\nfunction uniqueMembers(ids) {\r\n  return _.uniq(ids);\r\n}\r\n\r\nmodule.exports = { isMember, uniqueMembers };\r\n";

export const BUNDLED_MOCKPAY_PROOF = {
  "id": "f71127c4-8d71-4e66-9d78-a9d083bd7198",
  "changeId": "npm-mockpay-2.0.0-fixture",
  "repoId": "acme/payments",
  "baselineResult": {
    "passed": 3,
    "failed": 0,
    "total": 3,
    "output": "\n> acme-payments@1.0.0 test\n> jest --forceExit\n\nPASS src/createCharge.test.js\n  createCharge\n    √ creates a charge (6 ms)\n    √ passes the payment source through (1 ms)\n  refundCharge\n    √ creates a refund (1 ms)\n\nTest Suites: 1 passed, 1 total\nTests:       3 passed, 3 total\nSnapshots:   0 total\nTime:        3.384 s\nRan all test suites.\nForce exiting Jest: Have you considered using `--detectOpenHandles` to detect async operations that kept running after all tests finished?\n",
    "exitCode": 0
  },
  "redResult": {
    "passed": 1,
    "failed": 2,
    "total": 3,
    "output": "\n> acme-payments@1.0.0 test\n> jest --forceExit\n\nFAIL src/createCharge.test.js\n  createCharge\n    × creates a charge (3 ms)\n    × passes the payment source through\n  refundCharge\n    √ creates a refund (1 ms)\n\n  ● createCharge › creates a charge\n\n    Missing required parameter: payment_method\n\n    \u001b[0m \u001b[90m 2 |\u001b[39m\n     \u001b[90m 3 |\u001b[39m \u001b[36masync\u001b[39m \u001b[36mfunction\u001b[39m createCharge(amount\u001b[33m,\u001b[39m currency\u001b[33m,\u001b[39m source) {\n    \u001b[31m\u001b[1m>\u001b[22m\u001b[39m\u001b[90m 4 |\u001b[39m   \u001b[36mconst\u001b[39m charge \u001b[33m=\u001b[39m \u001b[36mawait\u001b[39m mockpay\u001b[33m.\u001b[39mcharges\u001b[33m.\u001b[39mcreate({\n     \u001b[90m   |\u001b[39m                                        \u001b[31m\u001b[1m^\u001b[22m\u001b[39m\n     \u001b[90m 5 |\u001b[39m     amount\u001b[33m:\u001b[39m amount\u001b[33m,\u001b[39m\n     \u001b[90m 6 |\u001b[39m     currency\u001b[33m:\u001b[39m currency\u001b[33m,\u001b[39m\n     \u001b[90m 7 |\u001b[39m     source\u001b[33m:\u001b[39m source\u001b[33m,\u001b[39m  \u001b[90m// This field gets renamed to 'payment_method' in v2\u001b[39m\u001b[0m\n\n      at Object.create (node_modules/mockpay/index.js:6:13)\n      at create (src/createCharge.js:4:40)\n      at Object.createCharge (src/createCharge.test.js:8:26)\n\n  ● createCharge › passes the payment source through\n\n    Missing required parameter: payment_method\n\n    \u001b[0m \u001b[90m 2 |\u001b[39m\n     \u001b[90m 3 |\u001b[39m \u001b[36masync\u001b[39m \u001b[36mfunction\u001b[39m createCharge(amount\u001b[33m,\u001b[39m currency\u001b[33m,\u001b[39m source) {\n    \u001b[31m\u001b[1m>\u001b[22m\u001b[39m\u001b[90m 4 |\u001b[39m   \u001b[36mconst\u001b[39m charge \u001b[33m=\u001b[39m \u001b[36mawait\u001b[39m mockpay\u001b[33m.\u001b[39mcharges\u001b[33m.\u001b[39mcreate({\n     \u001b[90m   |\u001b[39m                                        \u001b[31m\u001b[1m^\u001b[22m\u001b[39m\n     \u001b[90m 5 |\u001b[39m     amount\u001b[33m:\u001b[39m amount\u001b[33m,\u001b[39m\n     \u001b[90m 6 |\u001b[39m     currency\u001b[33m:\u001b[39m currency\u001b[33m,\u001b[39m\n     \u001b[90m 7 |\u001b[39m     source\u001b[33m:\u001b[39m source\u001b[33m,\u001b[39m  \u001b[90m// This field gets renamed to 'payment_method' in v2\u001b[39m\u001b[0m\n\n      at Object.create (node_modules/mockpay/index.js:6:13)\n      at create (src/createCharge.js:4:40)\n      at Object.createCharge (src/createCharge.test.js:14:26)\n\nTest Suites: 1 failed, 1 total\nTests:       2 failed, 1 passed, 3 total\nSnapshots:   0 total\nTime:        1.581 s, estimated 3 s\nRan all test suites.\nForce exiting Jest: Have you considered using `--detectOpenHandles` to detect async operations that kept running after all tests finished?\n",
    "exitCode": 1
  },
  "greenResult": {
    "passed": 3,
    "failed": 0,
    "total": 3,
    "output": "\n> acme-payments@1.0.0 test\n> jest --forceExit\n\nPASS src/createCharge.test.js\n  createCharge\n    √ creates a charge (4 ms)\n    √ passes the payment source through (1 ms)\n  refundCharge\n    √ creates a refund\n\nTest Suites: 1 passed, 1 total\nTests:       3 passed, 3 total\nSnapshots:   0 total\nTime:        1.688 s, estimated 2 s\nRan all test suites.\nForce exiting Jest: Have you considered using `--detectOpenHandles` to detect async operations that kept running after all tests finished?\n",
    "exitCode": 0
  },
  "fixDiff": "===================================================================\n--- a/src/createCharge.js\n+++ b/src/createCharge.js\n@@ -4,7 +4,7 @@\n   const charge = await mockpay.charges.create({\r\n     amount: amount,\r\n     currency: currency,\r\n-    source: source,  // This field gets renamed to 'payment_method' in v2\r\n+    payment_method: source,  // This field gets renamed to 'payment_method' in v2\r\n     description: 'Payment for order'\r\n   });\r\n   return charge;\r\n",
  "fixedFiles": [
    "src/createCharge.js"
  ],
  "coverageVerified": 1,
  "coverageTotal": 1,
  "unverifiable": [
    {
      "callSite": {
        "filePath": "src\\createCharge.js",
        "line": 14,
        "column": 24,
        "importStatement": "const mockpay = require('mockpay');",
        "callExpression": "mockpay.refunds.create({\r\n    charge: chargeId,\r\n    amount: amount\r\n  })",
        "packageName": "mockpay",
        "exportedSymbol": "*"
      },
      "reason": "Uses the changed package but does not intersect this change; not individually verified"
    }
  ],
  "producedAt": "2026-11-02T12:12:44.006Z",
  "sandboxType": "local-process",
  "durationMs": 48211
};

export const BUNDLED_MOCKPAY_PR = "# [Patchversion] Fix: mockpay 1.0.0 -> 2.0.0 (1 call site)\n\nBranch: `patchversion/mockpay-2.0.0`\n\n**Not submitted to GitHub. Prepared PR text only.**\n\n## What changed\n\n**mockpay** released **2.0.0** (from 1.0.0).\n\n> BREAKING CHANGE: The 'source' parameter in charges.create has been renamed to 'payment_method'. Update your integration to use the new parameter name. The old parameter will be ignored.\n\n[View release](https://www.npmjs.com/package/mockpay/v/2.0.0)\n\n## What this PR does\n\nUpdates 1 call site to work with mockpay@2.0.0.\n\n### Changed files\n\n- `src/createCharge.js` (1 call site updated)\n\n## Proof\n\nThis fix was verified in a local process (no isolation) before this PR text was prepared.\n\n| Step | Result |\n|------|--------|\n| Tests on 1.0.0 (baseline) | 3/3 passed |\n| Tests on 2.0.0 (before fix) | 1/3 passed, 2 failed |\n| Tests on 2.0.0 (after fix) | 3/3 passed, 0 failed |\n\nThe fix updated all 1 affected call sites, and the full test suite is green after the fix.\n\n### Not verified\n\nThe following call sites could not be verified by the test suite:\n\n- `src\\createCharge.js:14` - Uses the changed package but does not intersect this change; not individually verified\n\n### Confidence\n\n- Change classification confidence: 95%\n- Sandbox type: local-process\n- Proof generated: 2026-11-02T12:12:44.006Z\n\n---\n*Prepared by Patchversion. Not submitted to GitHub. Proof recorded from local execution.*\n";

export const BUNDLED_MOCKPAY_TRANSCRIPT = "Patchversion proof run - 2026-11-02T12:11:59.494Z\nFixture repo: fixtures\\sample-repo\nChange record: fixtures\\breaking-change\\change-record.json\n\nChange: mockpay 1.0.0 -> 2.0.0\nSource: registry - https://www.npmjs.com/package/mockpay/v/2.0.0\nNotes: BREAKING CHANGE: The 'source' parameter in charges.create has been renamed to 'payment_method'. Update your integration to use the new parameter name. The old parameter will be ignored.\n\n--- USAGE MAP ---\nFiles scanned: 6, files using mockpay: 1\n  src\\createCharge.js:4  mockpay.charges.create({\r\n  src\\createCharge.js:14  mockpay.refunds.create({\r\n\n--- IMPACT ---\nAffected call sites: src\\createCharge.js:4\nPotential (broad match, not individually verified): src\\createCharge.js:14\n\n--- RED-TO-GREEN PROOF ---\nBaseline (1.0.0):  exit 0 - 3 passed, 0 failed, 3 total\nBumped (2.0.0):      exit 1 - 1 passed, 2 failed, 3 total\nAfter fix (2.0.0):   exit 0 - 3 passed, 0 failed, 3 total\nSandbox: local-process (local process, NO isolation)\nCoverage: fix updated 1 of 1 affected call sites\nFiles changed by fix: src/createCharge.js\nDuration: 48.2s\n\n--- PREPARED PR ---\nTitle: [Patchversion] Fix: mockpay 1.0.0 -> 2.0.0 (1 call site)\nBranch: patchversion/mockpay-2.0.0\n\nPROOF VALID. Outputs written to ..\\..\\runs\\latest/\n";

export const BUNDLED_MOCKPAY_SOURCE = "const mockpay = require('mockpay');\r\n\r\nasync function createCharge(amount, currency, source) {\r\n  const charge = await mockpay.charges.create({\r\n    amount: amount,\r\n    currency: currency,\r\n    source: source,  // This field gets renamed to 'payment_method' in v2\r\n    description: 'Payment for order'\r\n  });\r\n  return charge;\r\n}\r\n\r\nasync function refundCharge(chargeId, amount) {\r\n  const refund = await mockpay.refunds.create({\r\n    charge: chargeId,\r\n    amount: amount\r\n  });\r\n  return refund;\r\n}\r\n\r\nmodule.exports = { createCharge, refundCharge };\r\n";
