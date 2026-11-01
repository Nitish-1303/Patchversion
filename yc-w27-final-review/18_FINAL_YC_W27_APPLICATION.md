# TryPatchBay — Final YC Winter 2027 Application

**Applicant:** Yeluru Nitish (Solo Technical Founder)
**Company:** TryPatchBay
**Portal:** https://apply.ycombinator.com/
**Batch:** Winter 2027
**Prepared:** 2026-10-31
**Evidence standard:** Every verified claim cross-referenced against repository code, freshly-run test suites, and live Vercel production. Unresolved personal/legal facts marked FOUNDER INPUT REQUIRED and not guessed.

> [!IMPORTANT]
> Paste each answer directly from the blockquote (`> ...`) into the corresponding YC portal field.
> Do not paste the status labels, word counts, or editorial notes — those are for your reference only.
> Replace any `[PLACEHOLDER]` before submission.

---

## Section 1 — Founders

---

**Question:** Who writes code, or does other technical work on your product? Was any of it done by a non-founder? Please explain.

**Answer to paste:**
> I write 100% of the code and do all technical work on TryPatchBay. None of it was done by a non-founder, contractor, employee, or third party. I built the entire monorepo from scratch, including the TypeScript AST migration engine, the child-process proof runner, the PostgreSQL schema, and the Next.js web application.

**Word count:** 55 words
**Status:** READY TO PASTE

---

**Question:** Are you looking for a cofounder?

**Answer to paste:**
> No. I am focused on building and validating TryPatchBay as a solo technical founder, though I am open to meeting strong technical or go-to-market cofounders if the right person emerges during YC.

**Word count:** 35 words
**Status:** PROVISIONAL — FOUNDER REVIEW
_(Confirm this reflects your actual preference before pasting.)_

---

## Section 2 — Founder Video

---

**Question:** Please record a one minute video introducing the founder(s). Make sure the file does not exceed 100 MB.

**Answer to paste:**
> [PLACEHOLDER — Paste your YouTube Unlisted URL or public Vimeo link here once recorded. Example: https://youtu.be/YOUR_VIDEO_ID]

**Status:** FOUNDER INPUT REQUIRED

**Suggested script (60 seconds, read directly to camera, no slides, single take):**

> "Hi, I'm Nitish, solo founder of TryPatchBay. I'm building an automated dependency migration engine that doesn't just bump version numbers — it rewrites breaking API changes and proves the fix passes tests.
>
> Every engineering team spends hours fixing broken builds when updating libraries. Dependabot bumps the version and walks away when CI breaks. LLMs generate migration code, but they hallucinate APIs and can't prove the fix works.
>
> TryPatchBay parses the AST to find every broken call site, rewrites it with a deterministic transform, then runs a three-stage proof: confirm tests pass on the old version, confirm they fail on the new version, and prove they return to green after the patch. I've verified this on a real Lodash 3 to 4 migration in 56 seconds and a synthetic API rename in 46 seconds.
>
> The prototype is live at trypatchbay.vercel.app with 418 passing tests. I'm applying to YC W27 to turn this proof engine into the standard dependency upgrade workflow for engineering teams."

_(Script is 130 words. Trim to fit 60 seconds at your natural speaking pace.)_

---

## Section 3 — Company

---

**Question:** Company name

**Answer to paste:**
> TryPatchBay

**Character count:** 11
**Status:** READY TO PASTE

---

**Question:** Describe what your company does in 50 characters or less.

**Answer to paste:**
> Automated breaking dependency migration engine

**Character count:** 46 / 50
**Status:** READY TO PASTE

---

**Question:** Company URL, if any

**Answer to paste:**
> https://trypatchbay.vercel.app

**Status:** READY TO PASTE

---

**Question:** If you have a demo, attach it below. Anything that shows us how the product works. Please limit to 3 minutes / 100 MB.

**Answer to paste:**
> https://trypatchbay.vercel.app

**Status:** PROVISIONAL — FOUNDER REVIEW
_(If you have a separate screen recording or demo video, link that here instead. The production URL is the fallback.)_

---

**Question:** Please provide a link to the product, if any.

**Answer to paste:**
> https://trypatchbay.vercel.app

**Status:** READY TO PASTE

---

**Question:** If login credentials are required for the link above, enter them here.

**Answer to paste:**
> [PLACEHOLDER — Confirm the exact reviewer login flow. If the /login page has an open "Continue as Reviewer" option, paste: "Navigate to https://trypatchbay.vercel.app/login and use the reviewer access option." If a specific email/password is required, paste those credentials here.]

**Status:** FOUNDER INPUT REQUIRED

---

**Question:** What is your company going to make? Please describe your product and what it does or will do.

**Answer to paste:**
> TryPatchBay detects breaking API changes in updated packages, generates deterministic AST code fixes, and runs the repository's test suite to verify the upgrade works before opening a pull request.
>
> Existing tools like Dependabot and Renovate only bump version strings in manifest files. When a major version introduces breaking API changes, their pull requests fail in CI without solutions. TryPatchBay ingests structured migration rules, parses the consumer repository's syntax tree using TypeScript compiler APIs to pinpoint affected call sites, rewrites the code with deterministic transforms, and validates the fix in an automated child-process proof runner before touching Git. The execution is currently restricted to trusted demo fixtures; customer-repository execution is gated on container isolation qualification.

**Word count:** 114 words
**Status:** READY TO PASTE

---

**Question:** Where do you live now, and where would the company be based after YC? Use the format City A, Country A / City B, Country B

**Answer to paste:**
> [PLACEHOLDER — Confirm your current city. Previous documents used "Bengaluru, India". If you are in Chennai, update accordingly.]
> Bengaluru, India / San Francisco, United States

**Status:** PROVISIONAL — FOUNDER REVIEW
_(Verify your current city of residence and confirm you are willing and able to relocate to San Francisco for the full W27 batch duration.)_

---

**Question:** Explain your decision regarding location.

**Answer to paste:**
> I currently live in India, where I built the core prototype. I plan to relocate to San Francisco for the Winter 2027 batch and keep the company headquartered there. Developer tooling companies benefit from close proximity to early-adopter engineering teams and the open-source ecosystem concentrated in the Bay Area.

**Word count:** 51 words
**Status:** PROVISIONAL — FOUNDER REVIEW

---

## Section 4 — Progress

---

**Question:** How far along are you?

**Answer to paste:**
> I have a working monorepo prototype with static AST analysis, deterministic patch generation, and an automated red-to-green proof engine.
>
> The proof runner has verified a real Lodash 3.10.1 to 4.17.21 migration on a trusted internal test fixture in 56.8 seconds, finding all call sites of the removed `_.contains` function, rewriting them to `_.includes`, and confirming all 3 tests pass. It has also verified a synthetic API rename benchmark (Mockpay 1 to 2) in 46.0 seconds. The monorepo has 418 passing tests across 44 suites with 6 skipped and zero failures.
>
> The web console and API are deployed at trypatchbay.vercel.app, backed by PostgreSQL, atomic rate limiting, and role-based access control. The scanner connects to public repositories read-only; against Nitish-1303/CipherBill it maps 523 dependencies across 543 dependency graph nodes and reports no breaking changes matching the current rule catalog.

**Word count:** 148 words
**Status:** READY TO PASTE

---

**Question:** How long have each of you been working on this? How much of that has been full-time? Please explain.

**Answer to paste:**
> [PLACEHOLDER — Fill in your actual start date and time commitment. Example: "I have been working on TryPatchBay full-time for X months, since [Month Year]. I am solely dedicated to this company and spend 100% of my working hours on it."]

**Status:** FOUNDER INPUT REQUIRED

---

**Question:** What tech stack are you using, or planning to use, to build this product? Include AI models and AI coding tools you use.

**Answer to paste:**
> The core engine is TypeScript on Node.js, using ts-morph and the TypeScript compiler API for static AST parsing and deterministic code transforms. The proof runner executes test suites in child processes with minimal environments and path containment. The web dashboard and API are built with Next.js 16 and React on Vercel, backed by a PostgreSQL database using the pg driver with connection pooling. For development, I use Claude and Cursor to navigate the codebase and author tests. The production migration engine itself is deterministic compiler logic — no LLM inference at runtime.

**Word count:** 95 words
**Status:** READY TO PASTE

---

**Question:** Are people using your product?

**Answer to paste:**
> No

**Status:** READY TO PASTE

---

**Question:** When will you have a version people can use?

**Answer to paste:**
> The read-only dependency scanner is live today at trypatchbay.vercel.app for public GitHub repositories. Self-serve pull request generation for a curated set of packages is the first feature I plan to ship during the batch, once container isolation is qualified.

**Word count:** 43 words
**Status:** PROVISIONAL — FOUNDER REVIEW
_(Removed the "10 pilot teams in 6 weeks" commitment. Container isolation qualification is a stated blocker in the codebase. Confirm the timeline language before pasting.)_

---

**Question:** Do you have revenue?

**Answer to paste:**
> No

**Status:** READY TO PASTE

---

**Question:** If you are applying with the same idea as a previous batch, did anything change? If you applied with a different idea, why did you pivot and what did you learn from the last idea?

**Answer to paste:**
> [PLACEHOLDER — Select one of the following and paste the correct answer:
> - First time applying to YC: "This is the first time I am applying to YC. I am applying with TryPatchBay."
> - Previously applied to YC with TryPatchBay: "I applied to [Batch, e.g. S26] with the same idea. Since then, I have [summarize technical progress: proof engine built, 418 tests passing, production deployed, Lodash and Mockpay migrations verified]."
> - Previously applied to YC with a different idea: "I previously applied to [Batch] with [idea]. I pivoted to TryPatchBay because [reason]."]

**Status:** FOUNDER INPUT REQUIRED

---

**Question:** If you have already participated or committed to participate in an incubator, "accelerator" or "pre-accelerator" program, please tell us about it.

**Answer to paste:**
> None. I have not participated in or committed to any incubator, accelerator, or pre-accelerator program.

**Word count:** 15 words
**Status:** PROVISIONAL — FOUNDER REVIEW
_(Confirm this is accurate before pasting.)_

---

## Section 5 — Idea

---

**Question:** Why did you pick this idea to work on? Do you have domain expertise in this area? How do you know people need what you're making?

**Answer to paste:**
> At every company I've worked at, updating dependencies was painful. A library like Lodash, React, or Stripe releases a major version, Dependabot opens a PR that bumps package.json, and CI turns red. Fixing broken call sites takes hours — reading changelogs, searching the codebase by hand, rewriting each affected usage. Teams defer upgrades because they're afraid of breaking production, so repositories stay on old, vulnerable versions for years.
>
> I have deep experience with static code analysis, AST transformations, and test harness engineering. Every engineering team I've seen with more than a few repositories either dedicates full sprints to dependency upgrades or ignores them until a security advisory forces action.

**Word count:** 119 words
**Status:** READY TO PASTE

---

**Question:** Who are your competitors? What do you understand about your business that they don't?

**Answer to paste:**
> Renovate and Dependabot dominate, but they only bump version strings in manifest files; they do not write code or run tests to fix broken APIs. OpenRewrite (Moderne) performs AST refactoring but focuses on Java in large enterprises, requires authoring complex Java recipes, and is not designed for fast modern web workflows. Generalist AI coding tools like Cursor, GitHub Copilot, and Codex can generate migration code, but they produce probabilistic output — they can hallucinate APIs and cannot provide an empirical proof that the resulting tests pass.
>
> What I understand is that developers will not merge automated code changes without a proof that tests still pass. TryPatchBay pairs deterministic AST transforms with a structured proof loop: verify tests pass on the old version, verify they fail on the bumped version, then confirm they return to green after the patch. If any stage fails, nothing is committed.

**Word count:** 154 words
**Status:** READY TO PASTE

---

**Question:** How do or will you make money? How much could you make? (We realize you can't know precisely, but give your best estimate.)

**Answer to paste:**
> I have 0 paying customers and $0 revenue today.
>
> I plan to sell TryPatchBay as a monthly subscription per repository: a hypothesis of $49 per month for individual developers and small teams, and $299 per month for organizations needing team access controls and custom internal migration rules. For enterprises with private package registries and compliance requirements, I plan to offer annual contracts.
>
> These prices are unvalidated hypotheses. I have not yet collected any customer payment or validated willingness to pay at these price points.

**Word count:** 83 words
**Status:** READY TO PASTE
_(Removed the unsourced $30–50M TAM figure from prior drafts. Revenue potential will become clearer once paying customers are acquired.)_

---

**Question:** If you had any other ideas you considered applying with, please list them. One may be something we've been waiting for. Often when we fund people it's to do something they list here and not in the main application.

**Answer to paste:**
> [PLACEHOLDER — If you considered no other ideas: "None. I am exclusively focused on automated dependency migration proofs." If you considered other developer tooling or infrastructure ideas, list each with a one-sentence description.]

**Status:** FOUNDER INPUT REQUIRED

---

## Section 6 — Equity

---

**Question:** Have you formed ANY legal entity yet? This may be in the United States, in your home country or in another country.

**Answer to paste:**
> [PLACEHOLDER — Select "Yes" or "No" in the portal toggle.
> - If Patchversion Inc. is incorporated in Delaware: select Yes, and fill in the entity name and date of incorporation.
> - If not yet incorporated: select No.]

**Status:** FOUNDER INPUT REQUIRED

---

**Question:** If you have not formed the company yet, describe the planned equity ownership breakdown among the founders, employees and any other proposed stockholders. If there are multiple founders, be sure to give the proposed equity ownership of each founder and founder title.

_(This question may only appear when "Have you formed any legal entity?" is answered "No".)_

**Answer to paste:**
> Yeluru Nitish (Founder and CEO): 100% equity ownership. There are no other founders, employees, advisors, or outside stockholders with equity claims.

**Word count:** 23 words
**Status:** PROVISIONAL — FOUNDER REVIEW
_(Only paste this if the entity has not yet been formed. Skip this field if you selected "Yes" above.)_

---

**Question:** Have you taken any investment yet?

**Answer to paste:**
> No

**Status:** READY TO PASTE

---

**Question:** Are you currently fundraising?

**Answer to paste:**
> No

**Status:** READY TO PASTE

---

**Question:** Please provide any relevant details about your current fundraise.

**Answer to paste:**
> N/A. I am not currently fundraising from outside investors. The company is 100% bootstrapped by the founder.

**Word count:** 17 words
**Status:** READY TO PASTE

---

## Section 7 — Curious

---

**Question:** What convinced you to apply to Y Combinator? Did someone encourage you to apply? Have you been to any YC events?

**Answer to paste:**
> The Fall 2026 Request for Startups on "Self-Maintaining APIs" by Harsha Gaddipati directly described the consumer-repository side of the problem I am solving. YC is the best environment I know of to build and validate an early-stage developer tooling company quickly, with direct access to engineering teams and the feedback loops that come from being inside the batch.

**Word count:** 58 words
**Status:** PROVISIONAL — FOUNDER REVIEW
_(Confirm that the RFS reference is accurate and that you have not been to any YC events you'd want to mention.)_

---

**Question:** How did you hear about Y Combinator?

**Answer to paste:**
> Through YC's published essays, Hacker News, and following developer tooling companies that went through YC including Stripe, Supabase, and Retool.

**Word count:** 22 words
**Status:** PROVISIONAL — FOUNDER REVIEW

---

## Section 8 — Batch Preference

---

**Question:** What batch do you want to apply for?

**Answer to paste:**
> Winter 2027

**Status:** READY TO PASTE

---

**Question:** Are you willing to relocate to San Francisco for the batch?

**Answer to paste:**
> Yes. I am fully committed to being in person in San Francisco for the entire Winter 2027 batch.

**Word count:** 18 words
**Status:** PROVISIONAL — FOUNDER REVIEW
_(Confirm relocation is logistically feasible for you before pasting.)_

---

## Summary of Answer Statuses

| Status | Count | Fields |
|---|---|---|
| READY TO PASTE | 15 | Company name, 50-char description, Company URL, Product URL, "Who writes code", "Are people using your product?", "Do you have revenue?", "Have you taken investment?", "Are you currently fundraising?", Fundraise details, "What is your company going to make?", "How far along?", Tech stack, Competitors, Revenue/money |
| PROVISIONAL — FOUNDER REVIEW | 10 | Cofounder search, Demo link, Location, Location explanation, Incubator, "When will you have a version people can use?", "Why did you pick this idea?", "What convinced you to apply?", "How did you hear about YC?", Batch preference / relocate |
| FOUNDER INPUT REQUIRED | 7 | Founder video URL, Login credentials, Duration / full-time start date, Prior YC application history, Other ideas considered, Legal entity status, Current city |
