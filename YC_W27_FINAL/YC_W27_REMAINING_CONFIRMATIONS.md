# TryPatchBay — Remaining Founder Confirmations

**Application:** Y Combinator Winter 2027 (W27)  
**Founder:** Yeluru Nitish  
**Audit Date:** 2026-10-31  

This document lists only the items that genuinely require personal founder action prior to final submission on the YC application portal (`https://apply.ycombinator.com/`). All written application answers in `YC_W27_FINAL_APPLICATION.md` are complete and verified.

---

## Part 1 — Priority Founder Deliverables (P0 / P1)

### 1. Founder Video Recording and URL [P1 — Required before submission]
* **Question (Section 2):** "Please record a one minute video introducing the founder(s)."
* **Current Status:** Not yet recorded.
* **Requirements:**
  * Exactly 1 minute (~60 seconds).
  * Yeluru Nitish speaking directly to camera (solo, no cuts, no background music, no slides, no pitch-deck narration).
  * Natural language explaining: who you are, what TryPatchBay does, what works today (Lodash migration prototype on trusted fixtures), and what you are trying to validate next.
  * Upload as **Unlisted** on YouTube or Public on Vimeo (file limit under 100 MB).
* **Suggested Talking Points (~120 words):**
  > "Hi, I'm Nitish, solo founder of TryPatchBay. I'm building an automated migration tool that rewrites breaking dependency changes and proves the fix passes tests.
  > 
  > When packages release major versions, existing tools like Dependabot bump version strings and CI turns red. Developers spend hours locating affected call sites, reading changelogs, and rewriting code.
  > 
  > TryPatchBay uses static TypeScript AST analysis and deterministic transformation rules to find affected call sites and rewrite them. A proof runner verifies that existing tests pass on the old version, fail on the bumped version, and pass again once patched.
  > 
  > I've verified this on an internal Lodash 3 to 4 fixture and deployed a live prototype at trypatchbay.vercel.app. I'm applying to YC W27 to turn this into a dependable dependency upgrade tool."
* **Action Required:** Record video, upload, test link in an incognito window, and paste the URL into Section 2 of the portal.

---

### 2. Full Browser Reviewer Access Verification [P1 — Pre-submission check]
* **Current Status:** **Partially Verified** (API endpoints verified via CLI; full interactive browser journey needs quick founder confirmation).
* **Technical State:**
  * `POST /api/auth` with `{ email: "developer@trypatchbay.dev" }` returns HTTP 200 and a valid session token.
  * Login page at `https://trypatchbay.vercel.app/login` contains the button: `Quick Demo Sign-in (developer@trypatchbay.dev)`.
  * Authenticated endpoints (`/api/repos`, `/api/findings`, `/api/scan`) return 200 OK with the pre-seeded demo repositories.
* **Action Required:** Open an incognito browser window, visit `https://trypatchbay.vercel.app/login`, click the "Quick Demo Sign-in" button, and verify that the dashboard and dependency graph render smoothly on your screen.

---

### 3. Prior YC Application Details [P1 — Check during portal entry]
* **Question (Section 4):** "If you are applying with the same idea as a previous batch, did anything change? If you applied with a different idea, why did you pivot and what did you learn from the last idea?"
* **Current Answer:** "This is my third YC application. I cannot recall the specifics of my first two applications."
* **Action Required:** When entering data in the portal, check if YC requires separate structured fields (such as prior company names, batches, or application years). If so, check your email history to see if batch names exist; if none can be found, the provided answer is completely accurate.

---

## Part 2 — Confirmed Facts (No Further Action Required)

The following items are verified and consistently applied across all application documents:
* **Location:** Chennai, India (current residence); San Francisco, USA (post-YC, subject to visa).
* **Full-time start:** September 20, 2026.
* **Entity status:** Not incorporated; no jurisdiction chosen; 100% planned founder ownership.
* **Commercial status:** 0 paying customers, $0 revenue, bootstrapped with modest personal funds, no outside investment, no fundraising.
* **Cofounder:** Open to one complementary cofounder with operational, GTM, technical, or financial strengths.
* **Accelerators:** First accelerator participation.
* **Other ideas:** Backup-AI and YourSRE.
* **Inspiration:** YC 2026 Request for Startups on "Self-Maintaining APIs" by Harsha Gaddipati (intellectual influence; no endorsement or partnership claimed).
