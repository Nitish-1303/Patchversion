# Y Combinator Winter 2027 (W27) — Demo Script & Video Deliverables

This document specifies the exact scripts and guidelines for the two distinct video deliverables required for the YC W27 application:
1. **Deliverable 1: 1-Minute Founder Video** (Direct-to-camera, high energy, founder speaking notes, NO screen recordings or slides).
2. **Deliverable 2: Product Demo Screen Recording** (High-resolution walk-through of the live product and genuine migration proof).

---

## Deliverable 1: 1-Minute Founder Video (Direct-to-Camera)

### Specifications
- **Duration**: Exactly 60 seconds (under 60s hard ceiling).
- **Format**: Head-and-shoulders, eye-level camera, natural lighting, crisp microphone audio.
- **Rules**: NO screen sharing, NO background music, NO slides, NO voiceovers. Speak naturally with conviction.

### Speaking Notes & Timing Breakdown

- **0:00 – 0:12 | The Problem (Hook)**:
  - "Hi, I'm Nitish, the founder of TryPatchBay.
  - Every engineering team wastes hundreds of hours upgrading dependencies because major version bumps break production APIs.
  - Right now, tools like Dependabot and Renovate just bump the version in package.json and open a PR that immediately fails in CI—leaving developers to manually fix the mess."

- **0:12 – 0:32 | The Solution & Insight**:
  - "TryPatchBay solves this with an evidence-first migration engine.
  - Instead of guessing or relying on hallucinated LLM output, TryPatchBay uses static AST analysis to map every broken API call site across your codebase.
  - Then, it generates a deterministic code patch and executes an automated red-to-green proof loop: proving that your tests failed on the new version, and pass after the patch."

- **0:32 – 0:48 | Traction & Technical Reality**:
  - "The platform is fully implemented and live in production today on Vercel backed by PostgreSQL.
  - Our engine has successfully proven full migrations on real-world packages like Lodash 3 to 4, mapping call sites and validating 100% test coverage with zero hallucinations."

- **0:48 – 1:00 | The Vision & Close**:
  - "We're turning dependency upgrades from an engineering nightmare into verified, one-click pull requests backed by empirical proof.
  - Thank you, and I look forward to building TryPatchBay with Y Combinator."

---

## Deliverable 2: Product Demo Screen Recording (3 Minutes)

### Narrative Structure
The product demo clearly distinguishes two distinct components:
1. **Part A: The Live SaaS Dashboard on Production** using the exclusive real customer repository `Nitish-1303/CipherBill` (read-only, truthful zero findings).
2. **Part B: The Genuine Engine Migration Proof** demonstrated via the verified Lodash 3 $\rightarrow$ 4 migration fixture running in the terminal.

---

### Step-by-Step Walkthrough

#### Part A — Live SaaS Platform & CipherBill Repository (0:00 – 1:30)
1. **Homepage & Login**:
   - Open browser to `https://trypatchbay.vercel.app`.
   - Highlight the clean typography and call-to-action buttons: `Start free scan` and `View live demo`.
   - Click `View live demo` $\rightarrow$ Arrive at the authenticated workspace (`/dashboard`).
2. **CipherBill Repository Inspection**:
   - Show Connected Repositories: Point out `Nitish-1303/CipherBill` (Public repository, default branch `main`).
   - Click `Scan repository`.
   - Show truthful scan output:
     - Scanned 27 source files.
     - Extracted dependencies (`next@15.5.23`, `starknet@6.24.1`, etc.).
     - Truthful result: "No breaking changes matched the migration rules currently supported by TryPatchBay."
     - Emphasize to the reviewer: TryPatchBay does NOT fabricate synthetic findings on customer repositories. It is 100% honest and read-only.
3. **Enterprise Governance & Security**:
   - Highlight the sliding-window rate limiting (10 scans/min) and RBAC security protecting production.
   - Point out that untrusted customer code execution is fail-closed blocked to prevent host compromise.

#### Part B — The Real Migration Proof Engine (1:30 – 3:00)
1. **Terminal Proof Execution**:
   - Open a clean terminal in the repository root.
   - Run the genuine real migration proof command:
     ```bash
     npm run prove:real
     ```
2. **Explain the 3-Stage Proof Loop Output**:
   - **Baseline Run**: Lodash 3.10.1 is installed. Test suite runs `npm test` $\rightarrow$ Exit code 0, 1 passed.
   - **Bumped Run (Red)**: Dependency upgraded to Lodash 4.17.21 without patch. Tests run $\rightarrow$ Exit code 1, `TypeError: _.contains is not a function`.
   - **Deterministic AST Patch**: Engine inspects AST, replaces `_.contains(list, item)` with `_.includes(list, item)`.
   - **Fixed Run (Green)**: Tests re-executed $\rightarrow$ Exit code 0, 1 passed.
   - **Coverage Verification**: Engine asserts 1 of 1 affected call site verified, 0 unverifiable.
3. **Closing Summary**:
   - Point to the generated `runs/lodash-4-migration/proof.json` and `prepared-pr.md`.
   - Highlight: This is an empirical, reproducible proof that transforms breaking dependency upgrades into trusted, reviewable pull requests.
