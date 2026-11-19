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
| F5 ESLint global 8 | Lint script pins `node ./node_modules/eslint/bin/eslint.js` — Windows `npm run lint` exit 0 |
| F6 Next `fnOrEmpty` | OG image moved to `public/og-image.png` + metadata; **WSL Node 22 `next build` exit 0**; Windows Node 24 still fails during page-data (host-specific); CI Ubuntu Node 24 is the acceptance gate |
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
| Production migrations | not run | |

## Restrictions honored

No merge, no deploy, no production migrations, no production secret changes.
