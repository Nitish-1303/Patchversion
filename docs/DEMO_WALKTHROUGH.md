# PatchBay — Step-by-Step Demo Walkthrough

This runbook guides evaluators and developers through reproducing the complete PatchBay verification loop in under 5 minutes.

---

## Prerequisites

- Node.js 18+ (tested on Node.js 20, 22, and 24)
- npm 9+

---

## 1. Quick Verification (One Command)

To run the full suite of 296 unit, integration, and security tests across all three packages:

```bash
npm test
```

Expected output:
- `@patchversion/engine`: 27 test suites passed, 246 tests passed
- `@patchversion/site`: 6 test suites passed, 48 tests passed
- `@patchversion/shared`: 2 tests passed
- Total: 296 passed tests, 0 failures

---

## 2. Reproduce the Real Lodash Migration Proof

To verify the authentic real-world migration of `lodash` from v3.10.1 to v4.17.21:

```bash
npm run prove:real
```

What this does:
1. Runs tests on `fixtures/lodash-repo` at baseline (`lodash` 3.10.1) -> **PASS**
2. Upgrades `lodash` to 4.17.21 -> **FAIL** (captures real runtime error `TypeError: _.contains is not a function`)
3. Invokes `FixGenerator` to compute deterministic AST rename (`_.contains` -> `_.includes`)
4. Applies patch diff and re-runs test suite -> **PASS**
5. Validates the tamper-evident cryptographic evidence bundle in `runs/lodash-4-migration/`

---

## 3. Interactive Web Dashboard

To launch the web interface:

```bash
npm run dev -w @patchversion/site
```

Open `http://localhost:3000` in your browser:
1. Navigate to `/login`
2. Click **"Quick Demo Sign-in"** (or create a new workspace via `/signup`)
3. In the Dashboard:
   - View monitored packages (npm, Stripe API)
   - Click **"Scan Repository"** to detect affected call sites
   - Review proposed AST patch diffs
   - Click **"Approve Patch"**
   - Click **"Create Pull Request"** to verify the PR delivery pipeline
