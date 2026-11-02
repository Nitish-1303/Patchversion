# Y Combinator Winter 2027 (W27) — Product Demo Recording Shot List

**Target Duration:** 2:30 – 2:45  
**Resolution:** 1920×1080 (16:9 Desktop Viewport)  
**Browser Zoom:** 125% for high-DPI crisp code rendering  
**Primary URL:** `http://localhost:3000/dashboard`  
**Narration Style:** Calm, precise, engineering-focused. No marketing hype.

---

## Shot-by-Shot Walkthrough

| Shot | Timestamp | Viewport / Focus | Action | Narration & Focus Points |
| :--- | :--- | :--- | :--- | :--- |
| **S-01** | 0:00 – 0:25 | Homepage (`http://localhost:3000/`) &rarr; Click `Try live demo` | Start on hero section. Click `Try live demo` button in hero or top navigation bar. Arrive at `/dashboard`. | **The Problem:** Introduce TryPatchBay. Explain how major SDK bumps break production builds and how tools like Dependabot merely bump versions without fixing broken code. Point to the Local Demo Mode header. |
| **S-02** | 0:25 – 0:45 | `/dashboard` Top Overview Card & Boundary Disclosure | Hover on **FIXTURE DEMONSTRATION** badge and boundary disclosure banner. | **Honest Boundary:** Disclose that this demo runs against authentic npm packages (`lodash@3.10.1` &rarr; `4.17.21`) on a vetted local fixture, without mutating customer repositories. |
| **S-03** | 0:45 – 1:15 | 7-Stage Pipeline & Affected Call Site | Scroll down to Section B and Section C. Highlight `src/membership.js:6`. | **AST Mapping:** Walk through the 7-stage pipeline. Explain why `_.contains` fails in Lodash v4 (`TypeError: _.contains is not a function`). Show the AST locator pinpointing line 6. |
| **S-04** | 1:15 – 1:45 | Unified Patch Diff View | Click **Copy Diff** button. Scroll down the diff editor. | **Deterministic Repair:** Explain that instead of guessing with an LLM, TryPatchBay synthesizes a deterministic AST codemod rewriting `_.contains` directly to `_.includes`. |
| **S-05** | 1:45 – 2:15 | Empirical Test Evidence (Red-to-Green) | Focus on the 3-column test results: Step 1 (Exit 0), Step 2 (Exit 1), Step 3 (Exit 0). | **Empirical Proof:** Show that baseline tests passed, bumped tests broke with the exact Jest failure stack trace, and patched tests recovered 100% with exit code 0. |
| **S-06** | 2:15 – 2:35 | Evidence Inspector & Prepared PR | Click through tabs: `Prepared PR Text`, `Proof Artifact (proof.json)`, and `Execution Log`. | **Verifiable Evidence:** Point out the honest label: *"Prepared PR content — not submitted to GitHub."* Highlight coverage honesty: 1 of 1 affected call sites updated, 1 unverified call site documented. |
| **S-07** | 2:35 – 2:45 | Reproduction Runbook & Conclusion | Highlight the terminal commands: `npm run prove:real`. Return to top. | **Reproducibility:** Emphasize that every exit code and artifact can be reproduced from the local terminal in under 60 seconds. Conclude demo. |

---

## Equipment & Recording Checklist

- [ ] Browser window resized to 1920×1080.
- [ ] Browser zoom set to 125% (ensures diff font size is crisp and readable on video).
- [ ] Dev server running (`npm run dev -w @patchversion/site` on `http://localhost:3000`).
- [ ] Incognito or clean profile (no browser extension icons or bookmarks cluttering toolbar).
- [ ] Audio input configured to dedicated microphone (zero background echo).
- [ ] Local proof run verified prior to recording (`npm run prove:real` exits 0).
