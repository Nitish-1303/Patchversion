# TryPatchBay — YC Winter 2027 Application (Submission-Ready Draft)

**Applicant:** Yeluru Nitish (Solo Technical Founder)  
**Company:** TryPatchBay  
**Batch:** Winter 2027  
**Submission Deadline:** November 2, 2026 at 8:00 PM PT  
**Last Updated:** 2026-11-02 (Refined per AI YC Application Reviewer Feedback)  

---

## Section 1 — Founders

### 1.1 Founder Details & Background
**Question:** Founders' Details (Bio, technical background, previous roles, and significant accomplishments)

> **Yeluru Nitish — Solo Founder & Systems/Full-Stack Engineer**  
> **Email:** nitish@trypatchbay.dev  
> **GitHub:** https://github.com/Nitish-1303  
> **Role:** 100% solo technical founder (Architecture, TypeScript AST Engine, Proof Runner, Web Dashboard, and API).  
>
> **Background & Technical Domain Expertise:**  
> I am a full-stack and systems engineer with deep experience building developer infrastructure, AST-driven transformations, and production Node.js/TypeScript services. Over the past several years, I have architected and maintained multi-service web architectures and complex frontend monorepos. 
>
> In these engineering environments, I repeatedly experienced the severe operational tax of major dependency upgrades: teams routinely deferred breaking library upgrades (such as Axios v0 to v1 or Lodash v3 to v4) for 6 to 12 months because a single bump touched 200+ call sites across multiple services. Upgrades were repeatedly postponed until a critical security vulnerability (CVE) forced an emergency multi-day refactoring sprint that broke staging builds.
>
> Over the last six weeks of dedicated full-time building (starting September 20, 2026), I designed and shipped TryPatchBay's monorepo from scratch: 244+ commits, 337 source files, and 491 passing automated unit and integration tests across 44 test suites. I built a deterministic TypeScript AST compiler pipeline using `ts-morph` and the TypeScript Compiler API, a red-to-green proof runner that executes real test suites, and a live web dashboard at `https://trypatchbay.vercel.app/dashboard`.

---

**Question:** Who writes code, or does other technical work on your product? Was any of it done by a non-founder? Please explain.

> I write 100% of the code and do all technical work on TryPatchBay. No contractor, employee, or third party has contributed code to the repository. I built the monorepo from scratch, including the TypeScript AST migration engine, the child-process proof runner, the PostgreSQL schema, and the Next.js web application.

---

**Question:** Are you looking for a cofounder?

> Yes. I am open to finding one complementary cofounder with operational, enterprise go-to-market, or developer-advocacy strengths. In the meantime, I have the full-stack engineering capability to build, test, and ship the complete technical product independently.

---

## Section 2 — Founder Video

**Question:** Please record a one minute video introducing the founder(s).

> **Video URL:** [YouTube Unlisted / Vimeo link to be inserted prior to portal submission]  
> *(Founder speaking directly to camera, 60 seconds, no background music, no slides).*

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

### 3.3 Demo URL
**Question:** If you have a demo, attach it below. Anything that shows us how the product works.

> **Live Zero-Login Interactive Demo Workspace:**  
> https://trypatchbay.vercel.app/dashboard  
>
> **Loom / Screen Demo Video:**  
> [Insert 2-minute Loom/YouTube screen recording URL showing the AST call-site locator, deterministic patch generation, and red-to-green test proof loop in action]  
>
> *(Note for YC Reviewers: The live URL above opens directly in any incognito browser without requiring a login, signup, or GitHub OAuth. Reviewers can inspect the full empirical Lodash 3.10.1 -> 4.17.21 proof loop, AST diff viewer, red-to-green test logs, and prepared pull request Markdown directly).*

---

**Question:** Please provide a link to the product, if any.

> https://trypatchbay.vercel.app/dashboard

---

**Question:** If login credentials are required for the link above, enter them here.

> No credentials are required to inspect the full proof engine. The primary product URL (https://trypatchbay.vercel.app/dashboard) loads publicly in read-only demo mode for any visitor or incognito window.  
> If you wish to test the authenticated tenant workspace features, you can sign in with one click at https://trypatchbay.vercel.app/login using the pre-seeded "Quick Demo Sign-in" button (developer@trypatchbay.dev).

---

### 3.6 Product Description
**Question:** What is your company going to make? Please describe your product and what it does or will do.

> TryPatchBay automatically fixes the code breakage caused by dependency upgrades and proves the fix works before a human ever reviews it.
>
> When a major dependency upgrade breaks an application's code, TryPatchBay uses static TypeScript AST analysis and deterministic transformation rules to pinpoint affected call sites, rewrite the broken code, and run an automated red-to-green proof loop against the repository's test suite:
> 1. Verifies that the existing test suite passes on the baseline version (Exit 0).
> 2. Bumps the package version and records the specific test failure (Exit 1).
> 3. Maps call sites and executes a deterministic AST refactoring rule (e.g. `_.contains` -> `_.includes`).
> 4. Verifies that the test suite returns to passing on the upgraded package (Exit 0).
> 5. Assembles a verifiable evidence bundle with diffs, test logs, and prepared PR text.
>
> The current working prototype demonstrates this end-to-end workflow on internal test fixtures, including a real-world Lodash 3.10.1 to 4.17.21 migration in 46.3 seconds. Execution on arbitrary untrusted customer repositories is currently gated until containerized microVM isolation is qualified for safe cloud execution.

---

**Question:** Where do you live now, and where would the company be based after YC? Use the format City A, Country A / City B, Country B

> Chennai, India / San Francisco, United States

---

**Question:** Explain your decision regarding location.

> I currently live in Chennai, India, where I built the initial prototype. If accepted to YC, I intend to relocate to San Francisco for the duration of the batch and build the company there, subject to obtaining the appropriate visa, to be in immediate proximity to the world's dense concentration of developer-tool founders, engineering leaders, and early-adopter technical teams.

---

## Section 4 — Progress

**Question:** How far along are you?

> In six weeks of full-time development, I built a working monorepo prototype with static TypeScript AST analysis, deterministic patch generation, and an automated red-to-green proof runner.
>
> Technical milestones achieved:
> - **Verified Real-World Proof:** Verified a real Lodash 3.10.1 to 4.17.21 migration on an internal test fixture in 46.3 seconds, rewriting `_.contains` call sites to `_.includes` and verifying all tests pass.
> - **Test Coverage & Code Health:** 491 passing automated tests across 44 test suites with 0 failures, 0 regressions, and zero TypeScript compiler errors.
> - **Live Public Demo Cockpit:** Deployed at https://trypatchbay.vercel.app/dashboard with zero-login access for anonymous reviewers, complete with AST diff inspection, raw `proof.json`, test execution traces, and prepared PR previews.
> - **Backend & Infrastructure:** Next.js 16 (Turbopack), PostgreSQL with pooled connections, atomic rate limiting, and strict security isolation between public proof evidence and private tenant operations.

---

**Question:** How long have each of you been working on this? How much of that has been full-time? Please explain.

> I have been working full-time on TryPatchBay since September 20, 2026 (roughly six weeks of full-time execution).

---

**Question:** What tech stack are you using, or planning to use, to build this product? Include AI models and AI coding tools you use.

> The core migration engine is written in TypeScript on Node.js, using `ts-morph` and the official TypeScript Compiler API for deterministic AST parsing, symbol resolution, and syntax tree transformations. The proof runner executes test suites in child processes with execution timeouts and environment scrubbing.
>
> The web application and APIs are built on Next.js 16 (App Router) and React 19 hosted on Vercel, backed by Neon PostgreSQL.
>
> For developer velocity, I use Cursor and Claude for rapid code navigation, refactoring, and test fixture authoring. Crucially, the migration engine itself relies on deterministic AST compiler rules rather than probabilistic LLM hallucinations, ensuring that generated patches are mathematically predictable and reproducible.

---

### 4.4 Traction & Timeline
**Question:** Are people using your product?

> No

---

**Question:** When will you have a version people can use?

> We are six weeks into full-time building (started September 20, 2026). 
>
> Today, any engineering team can immediately explore the live, zero-login public proof cockpit at https://trypatchbay.vercel.app/dashboard to inspect how the AST rewrite and test-driven verification pipeline work on real breaking upgrades.
>
> Automated pull-request generation for customer repositories will open for self-serve testing in Q1 2027 once container-isolated execution (Firecracker / Docker runner) completes qualification, allowing safe execution of customer test suites in isolated sandboxes.

---

**Question:** Do you have revenue?

> No

---

### 4.6 Reframe of Previous Applications
**Question:** If you are applying with the same idea as a previous batch, did anything change? If you applied with a different idea, why did you pivot and what did you learn from the last idea?

> I previously applied to YC with earlier software concepts before I had built a working technical product. Those previous attempts taught me that applying without an inspectable, running prototype is premature, and that defensibility comes from technical execution rather than conceptual pitch decks.
>
> For TryPatchBay, I deliberately took the opposite approach: I did not apply until I had a fully working deterministic AST engine, 491 passing automated unit and integration tests, an end-to-end verified Lodash migration proof running in under 50 seconds, and a publicly accessible web workspace deployed at trypatchbay.vercel.app/dashboard.

---

**Question:** If you have already participated or committed to participate in an incubator, "accelerator" or "pre-accelerator" program, please tell us about it.

> None. I have not participated in or committed to any incubator, accelerator, or pre-accelerator program.

---

## Section 5 — Idea

### 5.1 Solo Founder Narrative & Pain Point
**Question:** Why did you pick this idea to work on? Do you have domain expertise in this area? How do you know people need what you're making?

> I picked this problem because as a software engineer, I have lived through the painful, deferred maintenance crisis that breaking dependency upgrades create across engineering organizations.
>
> At every team I've worked on, major dependency upgrades were consistently treated as high-risk, low-reward chores. On one multi-service codebase I managed, our engineering team deferred a major library upgrade for over 10 months because bumping the package introduced breaking API signature changes touching more than 200 call sites across 8 services. Nobody wanted to own the manual refactor for fear of introducing subtle runtime regressions, until a high-severity CVE forced an emergency 3-day refactoring sprint that broke staging environments and halted our product sprint.
>
> Existing tools like Dependabot and Renovate alert teams to new versions, but they only bump the version string in `package.json`. When the build turns red on a breaking change, they leave 100% of the manual refactoring, call-site auditing, and verification work to the developer. 
>
> My conviction was further reinforced by YC's 2026 Request for Startups on "Self-Maintaining APIs" by Harsha Gaddipati. I realized that rather than waiting for library maintainers to write universal migration scripts, the correct place to solve this is on the consumer repository side: inspect the AST, identify the exact broken call sites, apply a deterministic rewrite, and empirically prove that tests pass.

---

### 5.2 Unique Insight on Competitors
**Question:** Who are your competitors? What do you understand about your business that they don't?

> **Developers will never merge automated code changes without empirical proof that their test suite passes, yet every existing tool asks them to do exactly that.**
>
> Here is why existing alternatives fail to solve this problem:
> - **Dependabot & Renovate:** Excellent at alerting and bumping version numbers, but completely unable to modify application code. When a major version introduces a breaking API change, Dependabot opens a pull request that immediately fails CI, leaving the entire investigation and rewrite to human engineers.
> - **Cursor, GitHub Copilot & LLM Agents:** Probabilistic code assistants can suggest migration snippets, but they hallucinate APIs, lack repository-wide AST awareness, and crucially do not execute a closed-loop red-to-green test proof to guarantee correctness before proposing a change.
> - **OpenRewrite:** A powerful recipe-based refactoring tool, but heavily focused on the JVM/Java ecosystem, requiring complex declarative recipe authoring and lacking an automated test verification harness that runs directly in customer CI workflows.
>
> **Our Unique Insight:** By pairing deterministic TypeScript compiler AST transformations with an automated red-to-green proof runner (testing baseline $\rightarrow$ bumping version $\rightarrow$ confirming failure $\rightarrow$ applying patch $\rightarrow$ verifying tests turn green), TryPatchBay transforms breaking upgrades from an untrusted manual chore into a provable, reviewable pull request that engineers can confidently merge.

---

### 5.3 Bottom-Up TAM Calculation
**Question:** How do or will you make money? How much could you make? (We realize you can't know precisely, but give your best estimate.)

> I currently have 0 paying customers and $0 revenue.
>
> We will monetize TryPatchBay as a B2B SaaS subscription billed per repository or per engineering organization.
>
> **Bottom-Up Beachhead Market Sizing:**
> 1. **Addressable Beachhead:** According to GitHub's published ecosystem data, there are over **400,000 active GitHub organizations** that have 10+ active repositories, dedicated engineering teams, and continuous integration workflows.
> 2. **Pre-Educated Buyer Wedge:** Over **70% of these organizations (~280,000 organizations)** already run automated dependency management tools like Dependabot or Renovate. They have already established budgets and engineering policies for dependency maintenance, but their developers still waste an estimated 15–20 hours per developer each month manually fixing broken upgrades.
> 3. **Initial Beachhead Revenue ($28.8M ARR):**
>    - At our Organization tier of **$299/month ($3,588/year)** for unlimited automated migration proofs and team triage:
>    - Capturing just **2.8% of this primed beachhead (8,000 engineering organizations)** represents **$28.8M in Annual Recurring Revenue (ARR)**.
> 4. **Long-Term Enterprise Expansion ($100M+ ARR):**
>    - Mid-market and enterprise engineering organizations (100+ engineers) spend millions annually on compliance, security patch backports, and framework migrations (e.g., Next.js, React, Node runtime upgrades).
>    - At Enterprise ACVs of **$15,000 to $50,000/year** (custom AST migration rules, on-premise runner agents, and SLA guarantees), capturing 3,000 enterprise accounts unlocks **$60M–$150M+ ARR** across the global software maintenance market.

---

**Question:** If you had any other ideas you considered applying with, please list them. One may be something we've been waiting for. Often when we fund people it's to do something they list here and not in the main application.

> Backup-AI: an automated service for verifying that database backup snapshots can be restored and booted successfully into an ephemeral staging environment.
>
> YourSRE: a lightweight site-reliability-engineering assistant for small engineering teams to diagnose production incidents from distributed traces and logs.

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

> I am applying to YC because I want to build TryPatchBay into the standard developer infrastructure company for automated code migrations. I need the rigorous feedback of YC partners, access to YC's unparalleled network of engineering leaders and early-adopter technical founders, and mentorship on scaling an enterprise developer-tools business. The 2026 Request for Startups on "Self-Maintaining APIs" by Harsha Gaddipati directly crystallized my conviction to solve this problem systematically.

---

**Question:** How did you hear about Y Combinator?

> Through YC's published essays, Hacker News, Paul Graham's writings, and following developer-tool companies that went through YC including Stripe, Supabase, Retool, and PostHog.

---

## Section 8 — Batch Preference

**Question:** What batch do you want to apply for?

> Winter 2027

---

**Question:** Are you willing to relocate to San Francisco for the batch?

> Yes. If accepted, I plan to relocate to San Francisco for the duration of the Winter 2027 batch, subject to obtaining the appropriate visa.
