# TryPatchBay — YC Winter 2027 Application

**Applicant:** Yeluru Nitish (Solo Technical Founder)  
**Company:** TryPatchBay  
**Batch:** Winter 2027  
**Submission Deadline:** November 2, 2026 at 8:00 PM PT  
**Prepared:** 2026-10-31  

---

## Section 1 — Founders

**Question:** Who writes code, or does other technical work on your product? Was any of it done by a non-founder? Please explain.

> I write all the code and do all technical work on TryPatchBay. No contractor, employee, or third party has contributed code to the repository. I built the monorepo from scratch, including the TypeScript AST migration engine, the child-process proof runner, the PostgreSQL schema, and the Next.js web application.

---

**Question:** Are you looking for a cofounder?

> Yes. I am open to finding one complementary cofounder with operational, go-to-market, technical, or financial strengths.

---

## Section 2 — Founder Video

**Question:** Please record a one minute video introducing the founder(s).

> Video will be submitted separately as a YouTube Unlisted or Vimeo link prior to portal submission.

---

## Section 3 — Company

**Question:** Company name

> TryPatchBay

---

**Question:** Describe what your company does in 50 characters or less.

> Automated breaking dependency migration engine

*(Character count: 46 / 50 max)*

---

**Question:** Company URL, if any

> https://trypatchbay.vercel.app

---

**Question:** If you have a demo, attach it below. Anything that shows us how the product works.

> https://trypatchbay.vercel.app

---

**Question:** Please provide a link to the product, if any.

> https://trypatchbay.vercel.app

---

**Question:** If login credentials are required for the link above, enter them here.

> To view the authenticated demo workspace, visit https://trypatchbay.vercel.app/login and click "Quick Demo Sign-in (developer@trypatchbay.dev)". This signs in as the demo reviewer without a password.

---

**Question:** What is your company going to make? Please describe your product and what it does or will do.

> TryPatchBay is a tool for automating code migrations when dependencies introduce breaking API changes. It uses TypeScript AST analysis and deterministic migration rules to identify affected call sites and generate code fixes. A proof runner checks the changes against the repository's existing test suite before proposing a code modification.
>
> The current prototype demonstrates this workflow on internal test fixtures, including a real Lodash 3 to 4 upgrade. Execution on arbitrary customer repositories is disabled because child-process execution does not provide security isolation; container or microVM isolation must be implemented before customer code can be run safely.

---

**Question:** Where do you live now, and where would the company be based after YC? Use the format City A, Country A / City B, Country B

> Chennai, India / San Francisco, United States

---

**Question:** Explain your decision regarding location.

> I currently live in Chennai, India, and have built the prototype here. If accepted to YC, I intend to relocate to San Francisco for the batch and build the company there, subject to obtaining the appropriate visa.

---

## Section 4 — Progress

**Question:** How far along are you?

> I have built a working monorepo prototype with static TypeScript AST analysis, deterministic patch generation, and an automated red-to-green proof runner.
>
> The proof runner has verified a real Lodash 3.10.1 to 4.17.21 migration on an internal test fixture in 56.8 seconds, finding call sites of `_.contains`, rewriting them to `_.includes`, and confirming all 3 fixture tests pass. The monorepo test suite has 418 passing tests, 6 skipped tests, and 0 failures across 44 active suites, with zero TypeScript compiler errors.
>
> A web prototype and API are deployed at trypatchbay.vercel.app backed by PostgreSQL, atomic rate limiting, and role-based access control. The prototype connects to public repository Nitish-1303/CipherBill, mapping 523 dependencies across 543 graph nodes and reporting 0 matches against the current supported migration rules. Execution on arbitrary customer repositories is disabled until container isolation is implemented.

---

**Question:** How long have each of you been working on this? How much of that has been full-time? Please explain.

> I have been working full-time on TryPatchBay since September 20, 2026.

---

**Question:** What tech stack are you using, or planning to use, to build this product? Include AI models and AI coding tools you use.

> The core engine is TypeScript on Node.js, using ts-morph and the TypeScript compiler API for static AST parsing and deterministic code transforms. The proof runner executes test suites in child processes with minimal environment isolation. The web dashboard and API are built with Next.js 16 and React on Vercel, backed by PostgreSQL using the pg driver with connection pooling.
>
> For local development, I use Claude and Cursor for code navigation and test authoring. The migration engine itself uses deterministic compiler logic rather than LLM inference.

---

**Question:** Are people using your product?

> No

---

**Question:** When will you have a version people can use?

> Reviewers can explore the demo dashboard and dependency graph today at trypatchbay.vercel.app using the seeded demo account. I plan to enable self-serve pull request generation for a curated set of popular npm packages as a future milestone once container isolation is implemented.

---

**Question:** Do you have revenue?

> No

---

**Question:** If you are applying with the same idea as a previous batch, did anything change? If you applied with a different idea, why did you pivot and what did you learn from the last idea?

> This is my third YC application. I cannot recall the specifics of my first two applications.

---

**Question:** If you have already participated or committed to participate in an incubator, "accelerator" or "pre-accelerator" program, please tell us about it.

> None. I have not participated in or committed to any incubator, accelerator, or pre-accelerator program.

---

## Section 5 — Idea

**Question:** Why did you pick this idea to work on? Do you have domain expertise in this area? How do you know people need what you're making?

> I chose this problem because dependency upgrades often require more than changing a version number. When an API changes, developers need to locate affected call sites, understand the migration path, update the code, and confirm that existing tests still pass. I am interested in automating that process using static analysis and deterministic code transformations.
>
> My interest in this area was influenced by YC's 2026 Request for Startups on Self-Maintaining APIs by Harsha Gaddipati. My current prototype demonstrates the approach on a controlled Lodash migration. I have not yet validated demand with paying customers or established how frequently teams encounter this problem.

---

**Question:** Who are your competitors? What do you understand about your business that they don't?

> Renovate and Dependabot automate dependency updates and can use CI checks to validate pull requests, but they do not automatically rewrite application code to resolve breaking API changes. OpenRewrite provides recipe-based automated refactoring, primarily centered on Java ecosystems. General-purpose coding assistants like Cursor and GitHub Copilot can suggest migration edits, but they generate probabilistic output and do not provide an empirical test proof loop.
>
> TryPatchBay explores the hypothesis that combining deterministic AST-based migration rules with a test-driven proof step can help developers safely automate breaking upgrades. The workflow establishes a passing baseline, observes failures after a version bump, applies a deterministic transformation, and verifies that tests return to green. This is an experimental technical approach, not an established competitive advantage.

---

**Question:** How do or will you make money? How much could you make? (We realize you can't know precisely, but give your best estimate.)

> I currently have 0 paying customers and $0 revenue.
>
> If the product is validated, I plan to sell TryPatchBay as a monthly subscription per repository. Initial pricing hypotheses are $49 per month for small teams and $299 per month for organizations needing team access controls and custom migration rules. These prices are unvalidated hypotheses; I have not yet collected payment or established willingness to pay.

---

**Question:** If you had any other ideas you considered applying with, please list them. One may be something we've been waiting for. Often when we fund people it's to do something they list here and not in the main application.

> Backup-AI: an automated service for verifying that backup snapshots can be restored and booted successfully.
>
> YourSRE: a lightweight site-reliability-engineering assistant for small engineering teams.

---

## Section 6 — Equity

**Question:** Have you formed ANY legal entity yet? This may be in the United States, in your home country or in another country.

> No

---

**Question:** If you have not formed the company yet, describe the planned equity ownership breakdown among the founders, employees and any other proposed stockholders. If there are multiple founders, be sure to give the proposed equity ownership of each founder and founder title.

> Yeluru Nitish (Founder & CEO): 100% planned founder ownership. No other founders, employees, advisors, or stockholders currently exist. No legal entity has been formed and no shares have been issued.

---

**Question:** Have you taken any investment yet?

> No

---

**Question:** Are you currently fundraising?

> No

---

**Question:** Please provide any relevant details about your current fundraise.

> N/A. I am not currently fundraising from outside investors. The project has been bootstrapped using modest personal funding.

---

## Section 7 — Curious

**Question:** What convinced you to apply to Y Combinator? Did someone encourage you to apply? Have you been to any YC events?

> I am applying to YC because I need candid product feedback from engineering teams, help validating customer demand, and guidance on turning an early technical prototype into a viable developer-tooling business. The 2026 Request for Startups topic "Self-Maintaining APIs" by Harsha Gaddipati also influenced my interest in exploring this problem from the consumer repository side.

---

**Question:** How did you hear about Y Combinator?

> Through YC's published essays, Hacker News, and following developer-tool companies that went through YC including Stripe, Supabase, and Retool.

---

## Section 8 — Batch Preference

**Question:** What batch do you want to apply for?

> Winter 2027

---

**Question:** Are you willing to relocate to San Francisco for the batch?

> Yes. If accepted, I plan to relocate to San Francisco for the duration of the Winter 2027 batch, subject to obtaining the appropriate visa.
