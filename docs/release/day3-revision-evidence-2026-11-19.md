# Day 3 — PR #45 Revision Evidence (2026-11-19)

**Branch:** `agent/p0-product-completion`  
**Dirty tree:** `3c54282` preserved  
**Prior verdict:** NEEDS_REVISION  
**Customer readiness:** NOT_CUSTOMER_READY

## Findings resolution

| ID | Action |
|---|---|
| F1/F2 OAuth consume + demo login | Confirmed still remediated in tree |
| F3 Live migration expects `002` | Fixed dynamic latest (`005`) in lifecycle + postgres-live tests; `oauth_states` in CANONICAL_TABLES |
| F4 Migration remap | Documented in `migration-remap-main-vs-dirty-2026-11-19.md` |
| F5 ESLint global 8 | **Closed — not an active source-code blocker.** Pin `node ./node_modules/eslint/bin/eslint.js` landed; CI lint green. Preserve earlier global-ESLint-8 exit-2 as historical host evidence only. |
| F6 Next `fnOrEmpty` | OG → `public/og-image.png`; WSL Node 22 build exit 0; **CI Ubuntu Node 24 `build` success** (`44431028314`, `44431727701`); Windows Node 24 local still fails during page-data (`/api/billing/checkout`) — host/Node24 residual, not CI gate |
| F7 Live GitHub | Still NOT TESTED without credentials |
| F8 Windows hosted-db suites | Fixed spawn to node entrypoints / npm_execpath; **both suites PASS** (22 passed) |
| F9 Stale plan | Updated `p0-integration-plan.md` |

## Commands / exit codes

| Command | Exit | Notes |
|---|---:|---|
| `npm run lint` (Windows) | 0 | 0 errors / 30 pre-existing warnings |
| `npm run typecheck -w @patchversion/engine` | 0 | |
| `npm run test -w @patchversion/engine` | 0 | **507 passed**, 22 skipped, 2 suites skipped (live PG without local DB) |
| hosted-db-isolation + unguarded-db-paths | 0 | **22 passed** |
| Security focus (task2/webhook/provider/r-exec/migration) | 0 | **83 passed**, 5 skipped |
| `npm run test -w @patchversion/site` | 0 | **129 passed** |
| WSL Node 22 `npm run build -w @patchversion/site` | 0 | full production build |
| Windows Node 24 `npm run build -w @patchversion/site` | 1 | `fnOrEmpty` during page-data (remaining host issue) |
| CI run `44431028314` @ `35e8174` | 0 | typecheck, test, prove, prove-real, postgres-live-integration, **build**, readiness-audit — all success |
| Production migrations | not run | |

## Linked CI job clarification

https://github.com/Nitish-1303/Patchversion/actions/runs/44426944354/job/135234109617 — **historical** `postgres-live-integration` failure on `438abef` (`Expected "002"` / `Received "005"`). Fixed in `35e8174`. Full write-up: `ci-44426944354-postgres-live-pre-fix-2026-11-19.md`.

## Migration compatibility / security (003–005)

| Check | Result |
|---|---|
| Ordering | `001` → `002_lifecycle` → `003_billing_and_rls` → `004_restricted_roles_and_rls` → `005_github_hardening` |
| Fresh apply | CI postgres-live expects dynamic latest=`005`; oauth_states present |
| Upgrade from 001 | Live test applies pending `002`–`005` |
| Idempotency | Second `runMigrations` applies `[]` |
| RLS | `003`/`004` ENABLE+FORCE RLS + tenant isolation policies |
| Prod migrate | **not run** |

## Independent review

**PASS** (Day-3) — `docs/release/day3-independent-review-2026-11-19.md`  
Fresh re-review requested after this clarification commit.

## Restrictions honored

No merge, no deploy, no production migrations, no production secret changes.
