# Current Status

**Last updated:** 2026-10-26 (public-claims review; historical proof dates retained)

## What exists

### Code (on main at github.com/Nitish-1303/Patchversion, public)
- `packages/shared`: Domain types + design tokens (blue/indigo)
- `packages/engine`: Core engine modules
  - npm registry watcher module (M1; not deployed)
  - API contract-probe prototype module (M2; not deployed or production-proven)
  - AST-based usage mapper with CommonJS and ES module support (M3)
  - Change classifier + impact analyzer (M4)
  - Local child-process proof loop - red-to-green (M5; no verified isolation, bundled fixtures only)
  - Fix generator - deterministic rename patterns, standard unified diffs (M5)
  - PR text/artifact preparation with proof evidence (M6; no GitHub submission)
  - State store (durable record)
  - Webhook receiver skeleton
  - Engine orchestrator
  - `npm run prove`: one-command end-to-end proof against the bundled fixture
- `packages/site`: Next.js marketing site, deployed at https://trypatchbay.vercel.app
  - Shared header/footer incl. mobile menu, honest docs and integrations pages
- `fixtures`: Sample repo with vendored mockpay 1.0.0 and 2.0.0 (real, installable;
  tests exercise the real client) + breaking change record
- CI workflow, README, LICENSE
- Historical Phase 1 snapshot (2026-10-24): 66/66 tests in 10 suites
  (25 pre-existing + 21 Phase 1 + 8 sweep-hardening + 5 webhook body-limit
  + 7 webhook raw-signature), build clean, typecheck clean
- Rechecked 2026-10-26 on the public-claims cleanup branch: 117/117 tests
  in 12 suites; build and typecheck pass (local run)

### Proven 2026-10-24: REAL npm package migration (local run, `npm run prove:real`)
- Package: lodash 3.10.1 -> 4.17.21, installed from the public npm registry
- Change source: lodash v4.0.0 changelog (documented `_.contains` -> `_.includes`
  rename; removal also verified by executing both real versions)
- Repo: fixtures/lodash-repo (acme/membership), revision = this commit
- Call sites: src/membership.js:6 affected (_.contains); src/membership.js:10
  (_.uniq) honestly listed as potential/not individually verified
- Baseline on 3.10.1: 3/3 pass. Bumped to 4.17.21: 2 fail (TypeError,
  _.contains is not a function - real break against the real package).
  After generated fix (one-line rename): 3/3 pass
- Fix diff: one line in src/membership.js, scoped to the affected call span
- Artifacts: runs/lodash-4-migration/{transcript.txt,proof.json,prepared-pr.md}
- Reproduce: npm install && npm run prove:real (needs npm registry access)
- Sandbox: local process, NO isolation; only bundled fixture trees may run

### Phase 1 hardening (2026-10-24)
- Sandbox outcomes are now explicit: fixed / no-break / unfixable /
  inconclusive. Baseline failing, zero parsed tests, failed version-bump
  install, malformed or path-escaping patches all refuse instead of
  producing false success. No-break runs record evidence but prepare no PR text.
- Child processes run on a minimal environment (no secret inheritance),
  in their own process group with TERM-then-KILL timeout, output capped.
- Workdir copy is shell-free; patch application enforces realpath
  containment; cleanup failure blocks a success outcome.
- Engine admission gate: unisolated local execution is refused for any
  repo outside the bundled fixtures (customer repos remain BLOCKED).
- Docker sandbox mode is BLOCKED in code (unverified, never validated).
- Classifier: negated "no breaking changes"/"non-breaking" no longer
  false-positive; deprecation alone is not breaking; affected-export
  extraction no longer captures prose words ("to", "the"); passive
  rename phrasing supported.
- Fix generator: renames are scoped to the affected call-site line spans
  (no broad file-wide text replacement); identifiers are regex-escaped;
  dotted names ("_.contains") normalized.
- Watcher change IDs are deterministic (no duplicate records on re-detect).
- Failure-rate metric counts refusals and inconclusive runs from the event
  log; no-break proofs are no longer counted as proven fixes.
- runs/latest artifacts are archived to runs/archive/ before overwrite.

### Proven 2026-10-23 (local run, `npm run prove`, transcript in runs/latest/)
- Baseline on mockpay 1.0.0: 3/3 tests pass
- After bump to 2.0.0: 2 tests fail (real break against the real client)
- After the generated fix: 3/3 tests pass
- Coverage: 1 of 1 affected call sites verified; 1 potential site honestly
  listed as not individually verified
- Sandbox: local process (no isolation)

## What does NOT exist

- No working GitHub App (webhook receiver is a skeleton)
- No GitHub PR opened or submitted by the system (PRs are prepared as text/local artifacts only)
- No live monitoring service deployed (watcher/probes not deployed)
- No database (state store is file-based)
- No authentication (site auth pages are config-required stubs)
- No billing or payments
- No customer interviews or paying customers
- Docker-isolated sandbox: BLOCKED in code as unverified (2026-10-24)
- Customer/non-fixture repository execution: BLOCKED until a verified
  isolated sandbox exists
- Known residual weakness: workdir creation/cleanup is pathname-based;
  no defense against a hostile same-UID peer (prior local security line
  proved automatic deletion NO-GO there; that line's code is lost, only
  its continuity handoff survives)
- Watcher classifies from registry metadata only (deprecation messages);
  real changelog/release-note fetching not implemented

## What is simulated/fixture vs real

- Engine loop: REAL against the vendored mockpay fixture (see proof above)
- mockpay itself: a vendored test double standing in for a real third-party
  package. A real lodash package migration is also proven locally in the
  bundled lodash-repo fixture; non-fixture repositories remain blocked.
- Site pages: real Next.js pages, deployed
- Homepage demo preview: clearly labeled simulated data
- Pricing: proposed, not billing-enabled

## Next actions (prioritized)

1. ~~First run against a real package~~ DONE 2026-10-24: lodash 3.10.1 ->
   4.17.21 proven red-to-green (npm run prove:real). Next: a second real
   package with a different change shape (not a rename)
2. GitHub App registration + PAT-based real PR submission
3. Verified isolated sandbox (Docker or otherwise) with host qualification
   evidence BEFORE any non-fixture repo executes
4. Engine deployment with the webhook receiver live
5. Customer discovery interviews
