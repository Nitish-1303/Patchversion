# Current Status

**Last updated:** 2026-10-23

## What exists

### Code (on main at github.com/Nitish-1303/Patchversion, private)
- `packages/shared`: Domain types + design tokens (blue/indigo)
- `packages/engine`: Core engine modules
  - npm registry watcher (M1)
  - Live API contract probes (M2)
  - AST-based usage mapper with CommonJS and ES module support (M3)
  - Change classifier + impact analyzer (M4)
  - Sandbox proof loop - red-to-green (M5)
  - Fix generator - deterministic rename patterns, standard unified diffs (M5)
  - PR bot with honest proof artifacts (M6)
  - State store (durable record)
  - Webhook receiver skeleton
  - Engine orchestrator
  - `npm run prove`: one-command end-to-end proof against the bundled fixture
- `packages/site`: Next.js marketing site, deployed at https://patchbay-one.vercel.app
  - Shared header/footer incl. mobile menu, honest docs and integrations pages
- `fixtures`: Sample repo with vendored mockpay 1.0.0 and 2.0.0 (real, installable;
  tests exercise the real client) + breaking change record
- CI workflow, README, LICENSE
- 25/25 tests passing, build clean, typecheck clean

### Proven 2026-10-23 (local run, `npm run prove`, transcript in runs/latest/)
- Baseline on mockpay 1.0.0: 3/3 tests pass
- After bump to 2.0.0: 2 tests fail (real break against the real client)
- After the generated fix: 3/3 tests pass
- Coverage: 1 of 1 affected call sites verified; 1 potential site honestly
  listed as not individually verified
- Sandbox: local process (no isolation)

## What does NOT exist

- No working GitHub App (webhook receiver is a skeleton)
- No real PR opened by the system (PRs are prepared as text only)
- No real API monitoring running (watcher/probes not deployed)
- No database (state store is file-based)
- No authentication (site auth pages are config-required stubs)
- No billing or payments
- No customer interviews or paying customers
- Docker-isolated sandbox untested (local process mode only so far)

## What is simulated/fixture vs real

- Engine loop: REAL against the vendored mockpay fixture (see proof above)
- mockpay itself: a vendored test double standing in for a real third-party
  package; the next step is a real package and a real repository
- Site pages: real Next.js pages, deployed
- Homepage demo preview: clearly labeled simulated data
- Pricing: proposed, not billing-enabled

## Next actions (prioritized)

1. First run against a real package and a repository the owner controls
   (e.g. patchbay-demo-payments), producing the first real-world proof
2. GitHub App registration + PAT-based real PR submission
3. Engine deployment with the webhook receiver live
4. Remaining evaluation fixtures (non-breaking, unfixable, no-op)
5. Customer discovery interviews
