# TryPatchBay — YC Technical Demonstration Script (2–3 Minutes)

**Presenter:** Yeluru Nitish (Solo Technical Founder)
**Target Audience:** Y Combinator Technical Partner / Due-Diligence Reviewer
**Live Production URL:** https://trypatchbay.vercel.app
**Public Code Repository:** https://github.com/Nitish-1303/Patchversion
**Demonstration Target:** https://github.com/Nitish-1303/CipherBill (Branch: `main`)
**Estimated Run Time:** 2 minutes 30 seconds

---

## 1. Demo Structure & Timing Overview

| Timecode | Segment | Target Screen / Tool | Key Message |
|---|---|---|---|
| **0:00 – 0:40** | **Truthful Repository Scan** | Production UI (`/dashboard`) scanning `Nitish-1303/CipherBill` | Deep AST dependency mapping; zero hallucinated findings. |
| **0:40 – 1:35** | **The 3-Stage Proof Engine** | Terminal CLI / Proof Runner (`npm run prove:real`) | Deterministic AST rewrite; automated red-to-green test proof loop. |
| **1:35 – 2:15** | **Architecture & Security Boundary** | Production UI (`/api/findings`, Gate status) | Fail-closed remote execution; tamper-evident delivery. |
| **2:15 – 2:30** | **Closing & Vision** | Camera / Landing Page | Moving from version-bump bots to self-maintaining code proofs. |

---

## 2. Verbal Script & Action Steps

### Segment 1: Truthful Repository Scanning (0:00 – 0:40)

**[Action]:** Open browser to `https://trypatchbay.vercel.app/dashboard`. Show the authenticated console. Enter `Nitish-1303/CipherBill` and trigger a scan.

**[Spoken]:**
> *"Hi, I'm Nitish, solo founder of TryPatchBay. Software teams spend days updating dependencies because tools like Dependabot merely bump version strings in `package.json` and walk away when CI breaks.*
>
> *Here is TryPatchBay connected to a real open-source repository: `Nitish-1303/CipherBill`. When I trigger a scan, TryPatchBay doesn't just read the top-level manifest—it parses the entire lockfile and source code, constructing a complete dependency graph with 543 nodes: 1 workspace node, 523 package dependencies, and 19 source files that directly import them.*
>
> *Notice that TryPatchBay reports **zero breaking changes detected**. We don't hallucinate warnings or invent fake findings. CipherBill does not use the deprecated APIs in our current rule catalog, and the engine is strictly truthful."*

---

### Segment 2: The 3-Stage Red-to-Green Proof Engine (0:40 – 1:35)

**[Action]:** Switch to terminal in `packages/engine`. Run `npm run prove:real`. The terminal begins executing the 3-stage proof on the Lodash migration fixture (`acme/membership`).

**[Spoken]:**
> *"Now let me show you what happens when an upstream library does publish a breaking change. Here we are executing a genuine major version migration: upgrading Lodash from `3.10.1` to `4.17.21`.*
>
> *Instead of asking an LLM to guess migration code, TryPatchBay runs an automated 3-stage validation loop:*
> 1. *First, **Baseline**: It runs the existing test suite on Lodash 3 to verify all 3 tests are passing.*
> 2. *Second, **Bump**: It upgrades to Lodash 4 without code changes. As expected, tests fail because `_.contains` was removed in v4.*
> 3. *Third, **Fix**: TryPatchBay’s AST rule uses TypeScript compiler APIs to find every call site of `_.contains` and rewrite it to `_.includes`. It then re-executes the test suite.*
>
> *In 51.8 seconds, the proof finishes with exit code 0. Tests return to 100% green with 100% call-site coverage. We have mathematically proved the upgrade works before touching git."*

---

### Segment 3: Security Defenses & Execution Boundaries (1:35 – 2:15)

**[Action]:** Switch back to browser. Show the repository findings view and the machine-readable gate output (`npm run readiness`).

**[Spoken]:**
> *"Application security was built in from day one. When dealing with code execution, you cannot run untrusted customer code on standard serverless infrastructure. In TryPatchBay, arbitrary customer execution is strictly **fail-closed**.*
>
> *Our production environment on Vercel runs scanning and AST parsing with ancestor symlink traversal defenses and distributed rate limiting. Execution of proof loops is restricted to vetted internal fixtures until our microVM container isolation runner is deployed.*
>
> *Furthermore, every generated pull request is cryptographically bound to a SHA-256 diff hash with single-use human review tokens, preventing race conditions and unauthorized code mutations."*

---

### Segment 4: Vision & Closing (2:15 – 2:30)

**[Action]:** Switch to landing page `https://trypatchbay.vercel.app`.

**[Spoken]:**
> *"Harsha Gaddipati's YC RFS for Self-Maintaining APIs highlights that software cannot scale if upstream API changes continuously break downstream applications.*
>
> *TryPatchBay solves this today from the repository side. With 418 passing tests, green CI, and verified migration proofs, I am ready to bring deterministic, self-maintaining upgrades to every engineering team. Thank you."*

---

## 3. Preparation & Contingency Checklist

- [ ] **Production Health:** Confirm `https://trypatchbay.vercel.app/api/health` returns `200 OK` prior to demo.
- [ ] **CipherBill Access:** Confirm `Nitish-1303/CipherBill` repository is public and accessible via GitHub API.
- [ ] **Local Proof Warm-up:** Ensure `node_modules` are installed in `fixtures/lodash-repo` so `npm run prove:real` executes cleanly in ~52s without network download delays.
- [ ] **Resolution:** Set screen display resolution to 1920x1080 at 125% zoom for clear legibility on video.

