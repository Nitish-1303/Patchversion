# Historical CI Failure — Run 44426944354 (pre-fix)

**Run:** https://github.com/Nitish-1303/Patchversion/actions/runs/44426944354  
**Job:** `postgres-live-integration` (`135234109617`)  
**HEAD:** `438abef` (Day-2 salvage commit, before Day-3 revision)  
**PR:** #45  
**Status:** **historical pre-fix evidence** — not an active source-code blocker on current HEAD

## Failure (verbatim expectation mismatch)

Live migration tests hard-coded current version `002` after migrations `003`–`005` were added:

| Suite | Assertion | Expected | Received |
|---|---|---|---|
| `lifecycle-replay-store.test.ts` | `first.currentVersion` | `"002"` | `"005"` |
| `lifecycle-replay-store.test.ts` | `report.applied` | `["002"]` | `["002","003","004","005"]` |
| `postgres-live.integration.test.ts` | `status.currentVersion` | `"002"` | `"005"` |

Result: 2 suites failed, 3 tests failed, exit 1. Build job was skipped because this job failed first.

## Correction (already landed)

Day-3 commit `35e8174` updated both suites to assert `files[files.length - 1].version` (dynamic latest, currently `005`) and to expect upgrade-from-001 to apply `002`–`005`.

## Verification (post-fix)

| Evidence | Result |
|---|---|
| CI run `44431028314` @ `35e8174` | `postgres-live-integration` **success** |
| CI run `44431727701` @ `20ef0dc` | `postgres-live-integration` **success** (docs evidence commit) |

## Out of scope for this failure

- Root ESLint global-8 PATH conflict is a separate historical host issue; project pin `node ./node_modules/eslint/bin/eslint.js` already landed; **do not reopen ESLint as an active source-code blocker**.
- Windows Node 24 `fnOrEmpty` is a separate host/tooling residual; CI Ubuntu Node 24 `build` is the acceptance gate.
