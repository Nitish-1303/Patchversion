# TryPatchBay — YC W27 Submission Checklist

**Application:** Y Combinator Winter 2027 (W27)  
**Founder:** Yeluru Nitish  
**Submission Deadline:** November 2, 2026 at 8:00 PM PT  
**Audit Date:** 2026-10-31  

Complete every item on this checklist before clicking **Submit** on the YC application portal (`https://apply.ycombinator.com/`).

---

## 1. Founder Video Deliverable [P1 — Outstanding]
- [ ] **Founder Video Recorded:** Record a 60-second video of yourself speaking directly to the camera (solo take, no slides, no screen shares, no background music, no cuts).
- [ ] **Founder Video Uploaded:** Upload to YouTube as **Unlisted** (or Vimeo as Public), file under 100 MB.
- [ ] **Video Link Tested:** Open the link in a private/incognito browser window to ensure it plays without requiring a login.
- [ ] **Video URL Pasted:** Paste the URL into Section 2 ("Founder Video") of the YC application form.

---

## 2. Public Demo & Reviewer Access [P1 — Final Sanity Check]
- [ ] **Live URL Loads:** `https://trypatchbay.vercel.app` loads in an incognito window.
- [ ] **Health Endpoint Returns 200:** `https://trypatchbay.vercel.app/api/health` returns status "healthy".
- [ ] **Reviewer Sign-In Works:** Visit `https://trypatchbay.vercel.app/login`, click "Quick Demo Sign-in (developer@trypatchbay.dev)", and confirm that it signs into the demo dashboard without prompting for a password.

---

## 3. Portal Field-by-Field Verification [P0]
Copy each answer directly from the blockquote in `YC_W27_FINAL_APPLICATION.md`:

- [ ] **Section 1 — Code Ownership:** Confirmed statement that 100% of code was written by founder; no third-party code.
- [ ] **Section 1 — Cofounder Search:** Confirmed open to one complementary cofounder (operational, GTM, technical, or financial).
- [ ] **Section 3 — Company Name:** Exactly `TryPatchBay`.
- [ ] **Section 3 — 50-Character Description:** `Automated breaking dependency migration engine` (46 characters, within the 50 limit).
- [ ] **Section 3 — Company URL:** `https://trypatchbay.vercel.app`.
- [ ] **Section 3 — Demo URL:** `https://trypatchbay.vercel.app`.
- [ ] **Section 3 — Login Credentials:** Clear instructions pointing to the "Quick Demo Sign-in" button on `/login`.
- [ ] **Section 3 — Product Description:** Explains AST analysis, deterministic rules, proof runner, and clearly states customer repository execution is disabled pending container isolation.
- [ ] **Section 3 — Location:** Exactly `Chennai, India / San Francisco, United States`.
- [ ] **Section 3 — Location Explanation:** Plain factual statement of current Chennai residence and intention to relocate to SF subject to visa.
- [ ] **Section 4 — Progress:** Verified metrics: 418 passing tests, 6 skipped, 0 failing across 44 active suites; Lodash migration 56.8s; CipherBill 523 dependencies across 543 graph nodes.
- [ ] **Section 4 — Work History / Duration:** Full-time since September 20, 2026.
- [ ] **Section 4 — Tech Stack:** TypeScript, ts-morph, TypeScript compiler API, Next.js 16, PostgreSQL. Claude/Cursor noted as dev tools only; deterministic compiler logic at runtime.
- [ ] **Section 4 — Users / Revenue:** "No" selected for users and "No" selected for revenue.
- [ ] **Section 4 — Prior Applications:** Factual statement: "This is my third YC application. I cannot recall the specifics of my first two applications."
- [ ] **Section 4 — Accelerators:** "None."
- [ ] **Section 5 — Why This Idea:** Factual explanation of dependency upgrade problems and Harsha Gaddipati's RFS on Self-Maintaining APIs as an influence. No YC endorsement claimed.
- [ ] **Section 5 — Competitors:** Balanced comparison with Dependabot, Renovate, OpenRewrite, and general AI coding assistants. Framed as a technical hypothesis.
- [ ] **Section 5 — Pricing / Business Model:** Explicitly labeled $49 and $299 as unvalidated pricing hypotheses. $0 revenue, 0 paying customers.
- [ ] **Section 5 — Alternate Ideas:** Backup-AI and YourSRE listed.
- [ ] **Section 6 — Legal Entity:** "No" selected.
- [ ] **Section 6 — Planned Ownership:** 100% planned founder ownership (Yeluru Nitish); no legal entity or stock issuance exists yet.
- [ ] **Section 6 — Investment / Fundraising:** "No" selected for investment and "No" selected for fundraising. Bootstrapped with modest personal funds.
- [ ] **Section 7 — Curious:** RFS reference and early developer-tool building needs (feedback, demand validation).
- [ ] **Section 8 — Batch Preference:** "Winter 2027" selected; relocation to SF confirmed subject to visa.

---

## 4. Final Quality & Writing Standards [P0]
- [ ] **No AI Slop:** Verified free of banned buzzwords ("revolutionary", "seamless", "empower", "cutting-edge", "game-changing", "next-generation").
- [ ] **No Unsupported Claims:** No claims of customer-ready sandboxed execution, arbitrary repository scanning, or paying customers.
- [ ] **Pyramid Principle Applied:** Every answer begins with the direct answer in the first sentence.
- [ ] **First-Person Singular:** "I" used consistently for the solo founder.
- [ ] **Zero Hidden Placeholders:** No `[PLACEHOLDER]` or `TODO` tags in the answers to be pasted.
