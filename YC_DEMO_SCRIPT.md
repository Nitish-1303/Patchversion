# Y Combinator Winter 2027 (W27) — Product Demo Script

**Product:** TryPatchBay  
**Format:** 2–3 Minute Screen Recording with Voiceover  
**Target Viewport:** 1920×1080 (Desktop-first), Browser Zoom: 125%  
**Primary URL:** `http://localhost:3000/dashboard` (Local Demo Mode)  
**Evidence Source:** Genuine Lodash 3.10.1 &rarr; 4.17.21 Migration Proof (`runs/lodash-4-migration/`)

---

## Truthful Product Boundary & Architecture

Before recording, understand the exact technical boundaries demonstrated:
1. **Local Fixture Proof Engine:** Demonstrates static AST call-site analysis and deterministic code patching on vetted local fixtures.
2. **Empirical Red-to-Green Verification:** Baseline passes (Exit 0) &rarr; Package bump fails (Exit 1) &rarr; AST patch passes (Exit 0).
3. **Prepared PR Text Only:** PR markdown and SHA-256 evidence bundles are stored locally on disk; they are **not** submitted to external GitHub repositories during this demonstration.
4. **Execution Boundary:** The engine runs in a local child process; arbitrary customer code execution is intentionally gated until microVM container isolation passes review.

---

## 2–3 Minute Demo Script

### Act 1: The Problem & Local Demo Mode Overview (0:00 – 0:40)

**Visual:** Browser open at `http://localhost:3000/dashboard` showing the **Lodash 3 &rarr; 4 (Real Package)** demonstration. Mouse hovers over the **FIXTURE DEMONSTRATION** disclosure badge.

**Narration:**
> "Hi YC. I'm Nitish, founder of TryPatchBay.
>
> When upstream library maintainers ship breaking changes, engineering teams spend days manually tracking down every broken call site, reading migration guides, and testing fixes. Tools like Dependabot merely bump the version string in `package.json`—opening a pull request that immediately breaks in CI.
>
> TryPatchBay takes an evidence-first approach: we map affected API call sites using static AST analysis, synthesize a deterministic code patch, and prove that tests fail on the upgrade and pass after our patch.
>
> What you are seeing here is TryPatchBay's dedicated Local Demo Mode, running directly against real execution artifacts generated on this machine."

---

### Act 2: The 7-Stage Migration Pipeline & AST Call-Site Mapping (0:40 – 1:25)

**Visual:** Scroll smoothly to the **Empirical 7-Stage Migration Pipeline** and the **Affected Call Site & Deterministic Patch** cards. Highlight the unified diff.

**Narration:**
> "Here is our 7-stage proof pipeline running on a real package fixture: Lodash 3.10.1 upgrading to Lodash 4.17.21.
>
> In Lodash version 4, the core utility `_.contains` was permanently removed in favor of `_.includes`. Any codebase calling `_.contains` crashes with a fatal runtime `TypeError`.
>
> Our AST scanner analyzed `src/membership.js` at Line 6 and pinpointed the exact expression: `return _.contains(ids, id);`.
>
> Instead of guessing with an LLM that might hallucinate non-existent APIs, TryPatchBay applied a deterministic AST rewrite rule: rewriting `_.contains` directly to `_.includes`. Here is the exact unified diff produced by the engine."

---

### Act 3: Empirical Test Evidence — The Red-to-Green Trace (1:25 – 2:05)

**Visual:** Scroll to the **Empirical Test Evidence (Red-to-Green Execution Trace)** section. Point out Step 1 (Exit 0), Step 2 (Exit 1 with red Jest stack trace), and Step 3 (Exit 0 green recovery).

**Narration:**
> "A code patch is useless without proof. TryPatchBay enforces an empirical red-to-green proof loop:
>
> First, **Baseline Run**: Our engine ran the fixture test suite against Lodash 3.10.1. Exit code 0, 3 out of 3 tests passing.
>
> Second, **Bumped Run**: The package was bumped to 4.17.21 without the patch. The test suite failed with Exit code 1—explicitly catching `TypeError: _.contains is not a function`.
>
> Third, **Patched Run**: The engine applied the AST diff and re-ran the tests. Exit code 0, 3 out of 3 passing.
>
> Every exit code, execution duration, and terminal line shown here is parsed live from `runs/lodash-4-migration/proof.json`."

---

### Act 4: Evidence Inspector, Prepared PR & Local Reproduction (2:05 – 2:45)

**Visual:** Switch between the tabs: **Prepared PR Text (`prepared-pr.md`)**, **Proof Artifact (`proof.json`)**, and the **Reproduction Runbook**.

**Narration:**
> "Finally, TryPatchBay packages this evidence into a structured pull request document.
>
> Notice the honest disclosure: *'Prepared PR content — not submitted to GitHub.'* We disclose exactly what was verified—1 of 1 affected call sites—and explicitly list any unverified call sites so reviewers have full transparency.
>
> Anyone can independently reproduce this entire proof in under 60 seconds from the terminal with two commands:
> `npm install` and `npm run prove:real`.
>
> That is TryPatchBay: verifiable, deterministic dependency migrations backed by empirical proof. Thank you."

---

## Post-Demo Q&A Notes for YC Partners

| Question | Honest Answer |
| :--- | :--- |
| **Is this running in production on customer repos?** | No. This is a local fixture engine running on vetted real packages (Lodash) and synthetic benchmarks (Mockpay). Customer repository execution is fail-closed until microVM isolation is complete. |
| **Does it use an LLM?** | The current verified migrations use deterministic AST codemods (`ts-morph`), guaranteeing zero hallucination. LLM-assisted patches are planned for ambiguous edge cases. |
| **Can I run this myself?** | Yes. Clone the repository, run `npm install`, and execute `npm run prove:real`. The full proof loop runs locally in ~50 seconds. |
