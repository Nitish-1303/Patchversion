# Site TypeScript baseline (Phase 1B.2)

**Date:** 2026-11-20 / verified 2026-11-23  
**Worktree:** `Patchversion-phase1b2-webhooks` @ `feat/phase1b2-webhook-source-of-truth`  
**Status:** Fixed via pinned local `tsc` binary (no `tsconfig` / `moduleResolution` change).

## Observation

| Invocation | Result |
|---|---|
| `npx tsc --noEmit` (workspace) | Exit **0** — TypeScript **5.9.3** |
| `npm run typecheck` with bare `tsc` under `hosted-db-guard` | Exit **2** — TS6046 (`moduleResolution: "bundler"` rejected) |
| Root cause | Node `spawn('tsc')` **without shell** on Windows prefers `C:\Users\NITISH\node_modules\.bin\tsc.exe` (**4.9.5**) over workspace `tsc.cmd` (5.9.3). npm prepends user-level `node_modules/.bin` via walk-up. |
| `packages/site/tsconfig.json` vs `HEAD` | Unchanged; `moduleResolution: "bundler"` is baseline, not webhook drift |

## Fix applied (safely attributable)

Pin the workspace compiler in `packages/site/package.json`:

```text
node ../../scripts/hosted-db-guard.js strip -- node ../../node_modules/typescript/bin/tsc --noEmit
```

No change to `moduleResolution`, Next/TS semantics, or webhook SoT. Engine/shared still use bare `tsc` (same PATH hazard on this machine — optional follow-up).

## Gate impact

Site typecheck pin is DX/Windows hygiene. Retain **`NOT_CUSTOMER_READY`** until full customer-ready gates pass.
