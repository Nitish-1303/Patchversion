# Complete Y Combinator Winter 2027 (W27) Application — TryPatchBay

**Application Portal:** `apply.ycombinator.com`
**Target Batch:** Winter 2027 (W27)
**Company Name:** TryPatchBay
**Website:** https://trypatchbay.vercel.app
**Public Code Repository:** https://github.com/Nitish-1303/Patchversion
**Demonstration Target:** https://github.com/Nitish-1303/CipherBill (Branch: `main`)
**Founder:** Yeluru Nitish (Solo Technical Founder)

---

## SECTION 1: FOUNDERS

### 1.1 Full Name
`Yeluru Nitish`

### 1.2 Email Address
`[FOUNDER CONFIRMATION REQUIRED: Enter primary contact email, e.g. yelurunitish@gmail.com]`

### 1.3 Phone Number
`[FOUNDER CONFIRMATION REQUIRED: Enter mobile phone number with international country code (+91)]`

### 1.4 Date of Birth
`[FOUNDER CONFIRMATION REQUIRED: Enter date of birth]`

### 1.5 Country of Citizenship
`India` `[FOUNDER CONFIRMATION REQUIRED]`

### 1.6 Current Location
`Bengaluru, India` `[FOUNDER CONFIRMATION REQUIRED]`

### 1.7 LinkedIn Profile
`[FOUNDER CONFIRMATION REQUIRED: Enter LinkedIn profile URL]`

### 1.8 GitHub Profile
`https://github.com/Nitish-1303`

### 1.9 Founder Bio / Technical Background
I am a software engineer and infrastructure architect specializing in developer tooling, static code analysis, and automated test environments. I have built 100% of the TryPatchBay monorepo, including its TypeScript AST migration engine, child-process test sandbox, PostgreSQL persistence layer, and Next.js console.

### 1.10 Which founder are you?
Solo technical founder.

### 1.11 Have you worked together before?
N/A (Solo founder).

---

## SECTION 2: FOUNDER VIDEO

### 2.1 Video URL
`[FOUNDER CONFIRMATION REQUIRED: Insert YouTube Unlisted or Vimeo public link]`

### 2.2 Video Specifications Checklist
- **Duration:** 55–60 seconds (strictly $\le 60$ seconds).
- **Format:** Unedited single take of Nitish speaking directly to camera.
- **Audio:** Clear voice recording, quiet room, zero background music.
- **Visuals:** Zero PowerPoint slides, zero screen shares, zero transitions.
- **Permissions:** Unlisted YouTube video or public Vimeo link accessible without login.

### 2.3 Spoken Video Script (60 Seconds)
> *"Hi, I'm Nitish, solo founder of TryPatchBay. I'm building an automated dependency migration engine that doesn't just bump version numbers—it rewrites breaking API changes and proves the fix passes tests.*
>
> *Every team spends hours fixing broken builds when updating libraries like Lodash, React, or Stripe. Dependabot bumps the version and walks away when CI breaks. LLMs guess at code, but hallucinate APIs and break runtime behavior.*
>
> *TryPatchBay parses the AST to find every broken call site, generates exact AST transforms, and runs an automated 3-stage proof: confirm tests pass on the old version, confirm they fail on the new version, and prove they return to green once patched. I've already verified this on Lodash 3 to 4 in 56 seconds and Mockpay in 46 seconds.*
>
> *The prototype is live at trypatchbay.vercel.app with 418 passing tests and green CI. I'm applying to YC W27 to turn this proof engine into the standard self-maintaining dependency pipeline for every engineering team."*

---

## SECTION 3: COMPANY

### 3.1 Company Name
`TryPatchBay`

### 3.2 Company URL
`https://trypatchbay.vercel.app`

### 3.3 Public Code Repository URL
`https://github.com/Nitish-1303/Patchversion`

### 3.4 Demo URL
`https://trypatchbay.vercel.app/demo`

### 3.5 One-Liner (50 characters max)
`Automated breaking dependency migration engine`
*(Character count: 46 characters — PASS)*

### 3.6 What does your company do? (50 words or less)
TryPatchBay detects breaking API changes in updated packages, generates AST code fixes, and runs the repository's test suite to verify the upgrade works before opening a pull request.
*(Word count: 28 words — PASS)*

### 3.7 Where do you live now, and where would the company be based after YC?
I live in Bengaluru, India. If accepted, I will move to San Francisco for the full Winter 2027 batch and intend to keep the company based in San Francisco. `[FOUNDER CONFIRMATION REQUIRED: Confirm in-person presence in SF for W27]`.

---

## SECTION 4: PROGRESS & TRACTION

### 4.1 How far along are you?
I have built a working monorepo prototype with AST analysis, deterministic patch generation, and an automated red-to-green proof engine:
1. **Engine & Rules Registry:** Built `@patchversion/engine`, `@patchversion/shared`, and `@patchversion/site` (Next.js with Turbopack).
2. **Verified Proofs:**
   - **Lodash 3 $\rightarrow$ 4:** Verified an actual Lodash `3.10.1` to `4.17.21` upgrade on an internal test fixture in 56.8 seconds (`npm run prove:real`). The engine found all call sites of the removed `_.contains` function, rewrote them to `_.includes`, and verified all 3 test cases passed.
   - **Mockpay Benchmark:** Verified a synthetic parameter rename benchmark (`source` to `payment_method`) in 46.0 seconds (`npm run prove`).
3. **Automated Test Suite:** Reconciled test suite has **418 passing tests** across 44 Jest suites and 2 Node runner tests with 0 failures.
4. **CI & Deployment:** GitHub Actions CI passes all 7 jobs on `main` (commit `3d72cb1`). Production deployment is live at `https://trypatchbay.vercel.app` backed by PostgreSQL persistence, atomic rate limiting, and role-based access control.
5. **Truthful Public Demo:** The product connects to public repository `Nitish-1303/CipherBill`, mapping 523 dependencies across 543 graph nodes and reporting 0 breaking changes against the current rule catalog.

### 4.2 How many active users or customers do you have?
I currently have **0 active users, 0 paying customers, and $0 revenue**. The product is an early-stage prototype deployed for technical demonstration and user feedback.

### 4.3 What is your monthly growth rate?
N/A (0 paying customers).

### 4.4 How long have you been working on this?
I have been working on TryPatchBay full-time for `[FOUNDER CONFIRMATION REQUIRED: Exact number of months, e.g. 4 months]`.

### 4.5 Has anyone else written code on the project?
No. I am the sole author of every line of code, test, migration rule, and deployment configuration in the repository.

---

## SECTION 5: IDEA & MARKET

### 5.1 Why did you pick this idea?
At every company I've worked at, updating dependencies was miserable. A library like Lodash, React, or Stripe releases a major version, Dependabot opens a PR that bumps `package.json`, and CI immediately turns red. The developer has to spend hours reading changelogs, searching for broken call sites across the codebase, and rewriting them by hand. Teams put off upgrades because they're afraid of breaking production, so repositories sit on old, vulnerable dependencies for years.

Most breaking changes between library versions follow discrete structural patterns. By pairing TypeScript AST transformations with an empirical red-to-green test proof loop, I could automate the entire upgrade: detect the breaking change, rewrite the AST, prove the test suite passes, and deliver a clean, tested pull request.

### 5.2 What do you understand about your business that others don't?
Developers reject automated code changes unless they can prove the changes don't break tests. Dependabot only bumps version strings because writing code is hard. LLM assistants guess at code, but hallucinate APIs and break subtle runtime behavior.

My approach combines static AST analysis with test verification. The engine parses the AST to pinpoint every call site affected by a breaking change, applies a deterministic transformation rule, and runs the test suite through three phases: verify tests pass on the old version, verify they fail on the bumped version, and verify they pass again with the patch applied. If tests fail at any point, no PR is opened.

### 5.3 Connection to YC RFS: "Self-Maintaining APIs"
In Fall 2026, YC partner Harsha Gaddipati published a Request for Startups titled *"Self-Maintaining APIs"*, pointing out that software cannot scale if upstream API changes continuously break downstream applications.

TryPatchBay tackles the consumer side of this problem today. When a package maintainer publishes a breaking change, TryPatchBay maps the affected code, rewrites the syntax tree, and runs the test suite to prove the upgrade doesn't break production.

### 5.4 Who are your competitors, and who do you fear most?
1. **Renovate and Dependabot:** The incumbents. They bump strings in manifests, but they don't touch code or run tests to fix broken APIs.
2. **OpenRewrite (Moderne):** Enterprise refactoring platform, mostly for Java in large organizations. It requires writing complex Java recipes and isn't built for fast web development workflows.
3. **AI Coding Agents (Cursor, GitHub Copilot, Codex):** Generalist tools that can generate code changes. I watch them closely because of their distribution. But they guess probabilistic text and don't give developers a repeatable red-to-green test proof that the upgrade passed.

### 5.5 How will you make money?
I have 0 paying customers and $0 revenue right now.

I plan to sell TryPatchBay as a monthly subscription per repository:
- **Individual / Small Team Tier:** $49/month per repository for automated breaking change detection, AST call-site mapping, and up to 50 verified migration runs.
- **Organization Tier:** $299/month for unlimited repositories, custom internal API migration rules, team access controls, and priority execution.
- **Enterprise Tier (Future):** Annual contracts starting around $15,000 for dedicated microVM sandboxing runners, private npm registry integration, and SOC 2 compliance.

These price points are hypotheses to be validated through customer interviews and pilots during the batch.

---

## SECTION 6: LEGAL ENTITY & EQUITY

### 6.1 Have you formed any legal entity yet?
`Patchversion Inc. (Delaware C-Corp)` `[FOUNDER CONFIRMATION REQUIRED: Delaware registration details or confirm pending formation]`.

### 6.2 Equity Breakdown
- **Yeluru Nitish:** 100%
- **Outside Investors / Options Allocated:** 0%
`[FOUNDER CONFIRMATION REQUIRED: Confirm 100% equity ownership]`.

### 6.3 Have you taken any outside investment?
`No. 100% bootstrapped by founder.` `[FOUNDER CONFIRMATION REQUIRED]`.

---

## SECTION 7: CATEGORY & BATCH PREFERENCE

### 7.1 Primary Category
`Developer Tools`

### 7.2 Secondary Category
`Artificial Intelligence / Infrastructure / Software Engineering`

### 7.3 Target Batch
`Winter 2027 (W27)`

### 7.4 In-Person San Francisco Commitment
`Yes. Committed to attending in person in San Francisco for the full duration of the Winter 2027 batch.` `[FOUNDER CONFIRMATION REQUIRED]`.

---

## SECTION 8: PRIOR YC APPLICATIONS

### 8.1 Have you applied to Y Combinator before?
`[FOUNDER CONFIRMATION REQUIRED: Yes / No. If Yes, state batch and summarize progress since last application]`.

