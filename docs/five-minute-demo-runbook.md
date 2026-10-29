# TryPatchBay — Five-Minute Live Demo Runbook

**Audience:** YC Partners, Technical Reviewers, Founding Engineers  
**Target Time:** 5 minutes (300 seconds)  
**Prerequisites:** Node.js 20.9+ (or Node.js 24) installed.

---

## 0:00 – 0:30: The Problem Statement (Hook)

> "Modern web and cloud applications depend on hundreds of third-party SDKs—Stripe, Twilio, OpenAI, AWS. Every breaking upgrade burns developer hours reading changelogs, locating affected call sites, and rewriting boilerplate. Existing tools (like Dependabot) only bump numbers and alert you when tests fail.
> 
> **TryPatchBay doesn't just alert—it proves the fix.** It statically maps your code, generates a deterministic AST patch, runs a 3-step red-to-green proof in an isolated sandbox, requires your cryptographic diff approval, and delivers an evidence-backed GitHub Pull Request."

---

## 0:30 – 1:30: Live CLI Reproduction (`npm run prove`)

Demonstrate the core engine proving the full migration loop on a controlled repository fixture:

```bash
# 1. Run the reproducible end-to-end proof loop
npm run prove
```

### What to point out in the terminal output:
1. **Target:** `fixtures/sample-repo` touching dependency `mockpay 1.0.0` $\to$ `2.0.0`.
2. **AST Usage Map:** Traversed via `ts-morph`, finding exact call site `src/createCharge.js:4` (`mockpay.charges.create`).
3. **Impact Analysis:** Detects breaking parameter rename: `source` $\to$ `payment_method`.
4. **Isolated Red-to-Green Proof Execution:**
   - **Baseline (1.0.0):** Exit `0` (3 passed, 0 failed).
   - **Bumped (2.0.0):** Exit `1` (1 passed, 2 failed with `TypeError: parameter 'source' is no longer supported`).
   - **Patched (2.0.0):** Exit `0` (3 passed, 0 failed, 100% call-site coverage).
5. **Outcome:** `PROOF VALID. Outputs written to runs/latest/`.

---

## 1:30 – 2:30: Proving Real Public Package Migration (`npm run prove:real`)

Demonstrate that the engine works with real packages installed from the public npm registry:

```bash
# 2. Run the real lodash 3 -> 4 migration proof
npm run prove:real
```

### What to point out:
- Target: `lodash 3.10.1` $\to$ `4.17.21` downloaded from npm.
- AST identifies `_.contains(ids, id)` at `src/membership.js:6`.
- Deterministic patch transforms `_.contains` $\to$ `_.includes`.
- Verification proves red-to-green (exit `1` on v4 $\to$ exit `0` after patch).

---

## 2:30 – 4:00: Interactive Dashboard Walkthrough

Open the web dashboard:

1. Open `http://localhost:3000/dashboard` (or deployed preview URL).
2. **Initial State:** Click **Sign in with Developer Session**.
   - Authenticates server-side session with secure cookie (`developer@trypatchbay.dev`).
3. **Overview Tab:**
   - **Connected Repository:** `patchbay-demo/checkout-service`.
   - **Regression Card:** Shows `mockpay 1.0.0` $\to$ `2.0.0` with green `PASSED` badge.
   - **Execution Logs:** Expand to review the exact Baseline $\to$ Red $\to$ Green proof transcript.
4. **Diff Review:**
   - Inspect the candidate diff: `- source: token` $\to$ `+ payment_method: token`.
   - Note the SHA-256 diff fingerprint.
5. **Cryptographic Approval:**
   - Click **Approve Diff (`e8f19a0b...`)**.
   - Note the status transition from `validated` $\to$ `approved`.
6. **PR Delivery:**
   - Click **Create GitHub Pull Request**.
   - Displays the created Pull Request with evidence markdown and branch reference.
7. **APIs / Monitoring Tab:**
   - Switch to **APIs** tab.
   - Show monitored dependencies (`mockpay`, `lodash`, `stripe`).
   - Click **Check Registry** on `stripe` or `lodash` $\to$ demonstrates live authoritative npm registry query and timestamp update.

---

## 4:00 – 4:45: Security & Architectural Guarantees

Highlight the core architectural boundaries:
- **Sandbox Isolation:** Ephemeral directory copies, stripped `.env*`, `.pem`, `.git`, sanitized environment without host tokens, and a 120s timeout.
- **Untrusted Code Gate:** Public untrusted customer repos are blocked until microVM (gVisor/Firecracker) execution runners are enabled.
- **Approval Invalidation:** If an approved diff is modified by even one character, the cryptographic diff hash mismatch immediately revokes the approval.
- **Zero Hallucinated Fixes:** No unverified patch is ever proposed or delivered.

---

## 4:45 – 5:00: Q&A & Wrap-Up

> "TryPatchBay solves the \$50B/year enterprise API drift problem by turning breaking dependency migrations into mathematically verified, human-approved pull requests."
