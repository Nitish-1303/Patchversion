# YC W27 — Copy-and-Paste Application

**Application:** Y Combinator Winter 2027 (W27)
**Portal:** `https://apply.ycombinator.com/`
**Company:** TryPatchBay
**Founder:** Yeluru Nitish (Solo Technical Founder)
**Verification Standard:** Verified against repository code, test suites, live Vercel production deployment, and the live YC application form fields.

---

## Section 1 — Founders

**Question:** Who writes code, or does other technical work on your product? Was any of it done by a non-founder? Please explain.

**Answer to paste:**

> I write 100% of the code and do all technical work on TryPatchBay. None of it was done by a non-founder, contractor, employee, or third party. I built the entire monorepo from scratch, including the TypeScript AST migration engine, the child-process proof runner, the PostgreSQL schema, and the Next.js web application.

**Word count:** 55 words
**Status:** READY TO PASTE

---

**Question:** Are you looking for a cofounder?

**Answer to paste:**

> No. I am focused on building and validating TryPatchBay as a solo technical founder, though I am open to meeting strong potential technical or go-to-market cofounders if the right person emerges during YC.

**Word count:** 36 words
**Status:** PROVISIONAL

---

## Section 2 — Founder Video

**Question:** Please record a one minute video introducing the founder(s).* Read more about the video here. Make sure the file does not exceed 100 MB.

**Answer to paste:**

> [FOUNDER CONFIRMATION REQUIRED: Insert YouTube Unlisted link or public Vimeo link here once recorded: https://youtu.be/YOUR_VIDEO_ID]

**Status:** NEEDS MY CONFIRMATION

*Note for Founder:* Read the following 60-second script aloud directly to camera (single take, no slides, no cuts):
*"Hi, I'm Nitish, solo founder of TryPatchBay. I'm building an automated dependency migration engine that doesn't just bump version numbers—it rewrites breaking API changes and proves the fix passes tests. Every team spends hours fixing broken builds when updating libraries like Lodash, React, or Stripe. Dependabot bumps the version and walks away when CI breaks. LLMs guess at code, but hallucinate APIs and break runtime behavior. TryPatchBay parses the AST to find every broken call site, generates exact AST transforms, and runs an automated 3-stage proof: confirm tests pass on the old version, confirm they fail on the new version, and prove they return to green once patched. I've already verified this on Lodash 3 to 4 in 56 seconds and Mockpay in 46 seconds. The prototype is live at trypatchbay.vercel.app with 418 passing tests and green CI. I'm applying to YC W27 to turn this proof engine into the standard self-maintaining dependency pipeline for every engineering team."*

---

## Section 3 — Company

**Question:** Company name*

**Answer to paste:**

> TryPatchBay

**Character count:** 11
**Status:** READY TO PASTE

---

**Question:** Describe what your company does in 50 characters or less.*

**Answer to paste:**

> Automated breaking dependency migration engine

**Character count:** 46 (Limit: 50)
**Status:** READY TO PASTE

---

**Question:** Company URL, if any

**Answer to paste:**

> https://trypatchbay.vercel.app

**Status:** READY TO PASTE

---

**Question:** If you have a demo, attach it below. Anything that shows us how the product works. Please limit to 3 minutes / 100 MB.

**Answer to paste:**

> https://trypatchbay.vercel.app/demo

**Status:** PROVISIONAL

---

**Question:** Please provide a link to the product, if any.

**Answer to paste:**

> https://trypatchbay.vercel.app

**Status:** READY TO PASTE

---

**Question:** If login credentials are required for the link above, enter them here.

**Answer to paste:**

> [FOUNDER CONFIRMATION REQUIRED: Enter password for developer@trypatchbay.dev, or paste: 'Reviewer demo access is open: navigate to https://trypatchbay.vercel.app/login and click Continue as Reviewer.']

**Status:** NEEDS MY CONFIRMATION

---

**Question:** What is your company going to make? Please describe your product and what it does or will do.

**Answer to paste:**

> TryPatchBay detects breaking API changes in updated packages, generates AST code fixes, and runs the repository's test suite to verify the upgrade works before opening a pull request.
>
> Existing tools like Dependabot and Renovate only bump version strings in package manifests. When a major version introduces breaking API changes, their pull requests fail in CI without solutions. TryPatchBay ingests structured migration rules, parses the consumer repository's syntax tree using TypeScript compiler APIs to pinpoint affected call sites, rewrites the code deterministically, and validates the fix in an isolated test runner before touching Git.

**Word count:** 96 words
**Status:** READY TO PASTE

---

**Question:** Where do you live now, and where would the company be based after YC? Use the format City A, Country A / City B, Country B

**Answer to paste:**

> Bengaluru, India / San Francisco, United States

**Status:** PROVISIONAL

---

**Question:** Explain your decision regarding location.

**Answer to paste:**

> I currently live in Bengaluru, where I built the core prototype. I plan to relocate to San Francisco for the Winter 2027 batch and keep the company headquartered there. Developer tooling and infrastructure companies benefit significantly from close physical proximity to early-adopter engineering teams, open-source maintainers, and developer ecosystem partners concentrated in the Bay Area.

**Word count:** 56 words
**Status:** PROVISIONAL

---

## Section 4 — Progress

**Question:** How far along are you?

**Answer to paste:**

> I have built a working monorepo prototype with AST analysis, deterministic patch generation, and an automated red-to-green proof engine.
>
> The proof runner has verified a real-world Lodash 3.10.1 to 4.17.21 migration on an internal test fixture in 56.8 seconds, finding all call sites of the removed `_.contains` function, rewriting them to `_.includes`, and confirming all 3 tests pass. It also verified a synthetic parameter rename benchmark (Mockpay 1 to 2) in 46.0 seconds. The monorepo has 418 passing tests across 44 Jest suites and 2 Node runner tests with zero failures.
>
> The web console and API are deployed live at trypatchbay.vercel.app backed by PostgreSQL persistence, atomic rate limiting, and role-based access control. The product connects to public repository Nitish-1303/CipherBill, mapping 523 dependencies across 543 graph nodes and reporting 0 breaking changes against the current rule catalog.

**Word count:** 147 words
**Status:** READY TO PASTE

---

**Question:** How long have each of you been working on this? How much of that has been full-time? Please explain.

**Answer to paste:**

> [FOUNDER CONFIRMATION REQUIRED: e.g. 'I have been working on TryPatchBay full-time for 4 months, since July 2026. I am completely dedicated to this company and spend 100% of my working hours on it.']

**Status:** NEEDS MY CONFIRMATION

---

**Question:** What tech stack are you using, or planning to use, to build this product? Include AI models and AI coding tools you use.

**Answer to paste:**

> The core engine is built in TypeScript on Node.js using ts-morph and the TypeScript compiler API for static AST parsing and code transformations. The proof runner executes test suites in isolated child processes with minimal environments and path containment verification. The web dashboard and API backend are built with Next.js 16 and React on Vercel, backed by a PostgreSQL database with pg connection pooling. For AI, I use Claude and Cursor during local development to assist with code navigation and test authoring, but the production migration engine itself is deterministic compiler logic, not LLM inference.

**Word count:** 100 words
**Status:** READY TO PASTE

---

**Question:** Are people using your product?

**Answer to paste:**

> No

**Status:** READY TO PASTE

---

**Question:** When will you have a version people can use?

**Answer to paste:**

> The read-only dependency scanner is live today at trypatchbay.vercel.app for public GitHub repositories. I plan to ship self-serve pull request generation for a curated set of top npm packages (Lodash, React 19, Stripe) to an initial group of 10 pilot engineering teams within 6 weeks of starting YC.

**Word count:** 52 words
**Status:** PROVISIONAL

---

**Question:** Do you have revenue?

**Answer to paste:**

> No

**Status:** READY TO PASTE

---

**Question:** If you are applying with the same idea as a previous batch, did anything change? If you applied with a different idea, why did you pivot and what did you learn from the last idea?

**Answer to paste:**

> [FOUNDER CONFIRMATION REQUIRED: If first time applying, paste: 'First time applying with TryPatchBay.' If you applied to a previous batch, briefly summarize the progress since that application.]

**Status:** NEEDS MY CONFIRMATION

---

**Question:** If you have already participated or committed to participate in an incubator, "accelerator" or "pre-accelerator" program, please tell us about it.

**Answer to paste:**

> None. I have not participated in or committed to any incubator, accelerator, or pre-accelerator program.

**Word count:** 15 words
**Status:** PROVISIONAL

---

## Section 5 — Idea

**Question:** Why did you pick this idea to work on? Do you have domain expertise in this area? How do you know people need what you’re making?

**Answer to paste:**

> At every company I've worked at, updating dependencies was miserable. A library like Lodash, React, or Stripe releases a major version, Dependabot opens a PR that bumps package.json, and CI immediately turns red. The developer has to spend hours reading changelogs, searching for broken call sites across the codebase, and rewriting them by hand. Teams put off upgrades because they're afraid of breaking production, so repositories sit on old, vulnerable dependencies for years.
>
> I have deep domain experience with static code analysis, AST transformations, and test harness engineering. I know teams need this because every engineering team with more than a few repositories either dedicates engineering sprints to dependency upgrades or defers them indefinitely.

**Word count:** 122 words
**Status:** READY TO PASTE

---

**Question:** Who are your competitors? What do you understand about your business that they don’t?

**Answer to paste:**

> Renovate and Dependabot are the dominant players, but they only bump version strings in manifest files; they do not write code or run tests to fix broken APIs. OpenRewrite (Moderne) performs AST refactoring, but it is focused on Java in large organizations, requires writing complex Java recipes, and is not built for fast modern web workflows. Generalist AI coding tools like Cursor, GitHub Copilot, and Codex can write migration code, but they generate probabilistic text, hallucinate APIs, and do not provide an empirical test proof that the upgrade passed.
>
> What I understand is that developers reject automated code changes unless they can prove the changes don't break tests. TryPatchBay pairs deterministic AST transforms with an automated red-to-green proof loop: verify tests pass on the old version, verify they fail on the bumped version, and prove they return to green once patched. If tests fail at any point, no PR is opened.

**Word count:** 161 words
**Status:** READY TO PASTE

---

**Question:** How do or will you make money? How much could you make? (We realize you can’t know precisely, but give your best estimate)

**Answer to paste:**

> I have 0 paying customers and $0 revenue right now.
>
> I plan to sell TryPatchBay as a monthly subscription per repository. My current pricing hypothesis is $49 a month per repository for individual developers and small teams, and $299 a month for organizations wanting team access controls and custom internal API migration rules. For large enterprises with private package registries and compliance requirements, I plan to offer annual contracts starting around $15,000.
>
> With over 100 million active repositories on GitHub and millions of engineering teams spending roughly 10% to 15% of engineering time managing dependencies and technical debt, an automated proof engine capturing 50,000 repositories represents an annual revenue opportunity of $30 million to $50 million.

**Word count:** 121 words
**Status:** READY TO PASTE

---

**Question:** If you had any other ideas you considered applying with, please list them. One may be something we’ve been waiting for. Often when we fund people it’s to do something they list here and not in the main application.

**Answer to paste:**

> [FOUNDER CONFIRMATION REQUIRED: List 1-2 alternate startup ideas if any, or paste: 'None. I am exclusively focused on solving automated dependency migration proofs with TryPatchBay.']

**Status:** NEEDS MY CONFIRMATION

---

## Section 6 — Equity

**Question:** Have you formed ANY legal entity yet? This may be in the United States, in your home country or in another country.

**Answer to paste:**

> [FOUNDER CONFIRMATION REQUIRED: Select 'Yes' if Patchversion Inc. is formed in Delaware, or 'No' if not yet incorporated.]

**Status:** NEEDS MY CONFIRMATION

---

**Question:** If you have not formed the company yet, describe the planned equity ownership breakdown among the founders, employees and any other proposed stockholders. If there are multiple founders, be sure to give the proposed equity ownership of each founder and founder title (e.g. CEO). (This question is as much for you as us.)

**Answer to paste:**

> Yeluru Nitish (Founder & CEO): 100% equity ownership. There are no other founders, employees, advisors, or outside stockholders holding equity claims.

**Word count:** 22 words
**Status:** PROVISIONAL

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

**Question:** Please provide any relevant details about your current fundraise. (If you need to send a SAFE, YC has a free tool for that!)

**Answer to paste:**

> N/A. I am not currently fundraising from outside investors. The company is 100% bootstrapped by the founder.

**Word count:** 17 words
**Status:** READY TO PASTE

---

## Section 7 — Curious

**Question:** What convinced you to apply to Y Combinator? Did someone encourage you to apply? Have you been to any YC events?

**Answer to paste:**

> YC is the best place in the world to build an early-stage developer tooling startup. The Fall 2026 Request for Startups on "Self-Maintaining APIs" by Harsha Gaddipati directly articulated the problem I am solving from the consumer repository side. YC's community of technical founders and alumni network provides the ideal environment to pilot TryPatchBay with dozens of fast-moving engineering teams.

**Word count:** 68 words
**Status:** PROVISIONAL

---

**Question:** How did you hear about Y Combinator?

**Answer to paste:**

> Through YC's essays, Hacker News, and following alumni developer tools startups including Stripe, Supabase, Gitlab, and Retool.

**Word count:** 18 words
**Status:** PROVISIONAL

---

## Section 8 — Batch Preference

**Question:** What batch do you want to apply for?

**Answer to paste:**

> Winter 2027

**Status:** READY TO PASTE

---

**Question:** Are you willing to relocate to San Francisco for the batch?

**Answer to paste:**

> Yes. I am fully committed to being in person in San Francisco for the entire duration of the Winter 2027 batch.

**Word count:** 21 words
**Status:** PROVISIONAL

