# TryPatchBay — External Setup & Live YC Verification Guide

This guide walks you through taking **TryPatchBay** from code-complete to a live, production-verified system with a real GitHub Pull Request in under 15 minutes.

---

## Architecture of the Live Loop

```
┌─────────────────────────┐          Webhook           ┌─────────────────────────┐
│     GitHub.com          │ ─────────────────────────> │ TryPatchBay Production  │
│  • App ID: 5513579      │                            │  (Vercel + Neon DB)     │
│  • Target: Test Repo    │ <───────────────────────── │                         │
└─────────────────────────┘      REST API (JWT)        └─────────────────────────┘
            │                                                       │
            │  1. Developer connects via OAuth                      │
            │  2. App installed on repository                       │
            │  3. Scanner parses package.json & AST call sites      │
            │  4. Deterministic Codemod synthesizes patch           │
            │  5. Draft PR opened on GitHub                         │
            │  6. GitHub Actions runs CI                            │
            │  7. Webhook sends check_run.completed (success)       │
            ▼                                                       ▼
[ GitHub Draft PR Created ] ─────────────────────────> [ Dashboard Shows VERIFIED ]
```

---

## Step 1: Copy Credentials from GitHub

Go to your GitHub App settings at:  
👉 `https://github.com/settings/apps/trypatchbay`

Collect the following 5 values:

1. **App ID:**  
   `5513579` (displayed on the General tab).
2. **App Slug / Name:**  
   `trypatchbay`
3. **Client ID:**  
   `Iv23li3LhAeZmM1MnI3i`
4. **Client Secret:**  
   Under **Client secrets**, click **Generate a new client secret**. Copy the secret string immediately.
5. **Private Key (.pem):**  
   Under **Private keys**, click **Generate a private key**. A `.pem` file will download to your computer. Open it in a text editor—you will need its full contents (including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`).
6. **Webhook Secret:**  
   Under **Webhook**, create a strong random secret (e.g. `openssl rand -hex 32`) and save it.

---

## Step 2: Configure Vercel Production Environment

1. Open your Vercel Project Dashboard:  
   👉 `https://vercel.com/dashboard` $\rightarrow$ Select your `Patchversion` / `trypatchbay` project.
2. Go to **Settings** $\rightarrow$ **Environment Variables**.
3. Add the following variables (select **Production**, **Preview**, and **Development**):

| Variable Name | Value | Purpose |
| :--- | :--- | :--- |
| `GITHUB_APP_ID` | `5513579` | Identifies your GitHub App for JWT creation |
| `GITHUB_APP_SLUG` | `trypatchbay` | Used to generate direct 1-click install links |
| `GITHUB_APP_PRIVATE_KEY` | *(Paste entire PEM file content)* | Signs GitHub App installation tokens |
| `GITHUB_APP_WEBHOOK_SECRET` | *(The secret you entered in GitHub)* | Verifies raw HMAC-SHA256 webhook signatures |
| `GITHUB_CLIENT_ID` | `Iv23li3LhAeZmM1MnI3i` | Enables 1-Click "Continue with GitHub" OAuth |
| `GITHUB_CLIENT_SECRET` | *(Generated in Step 1)* | Exchanges OAuth codes for developer sessions |

4. After saving, go to **Deployments** $\rightarrow$ Click the `...` menu on the latest deployment $\rightarrow$ Select **Redeploy**.

---

## Step 3: Configure GitHub App Webhook & Permissions

Return to your GitHub App settings at `https://github.com/settings/apps/trypatchbay`:

1. **Webhook URL:**  
   Set to: `https://trypatchbay.vercel.app/api/github/webhook`
2. **Webhook Secret:**  
   Ensure it matches `GITHUB_APP_WEBHOOK_SECRET`.
3. **Repository Permissions:**
   - **Contents:** `Read and write` (to create branches, files, and git commits)
   - **Pull requests:** `Read and write` (to open draft PRs with diffs)
   - **Metadata:** `Read-only` (default)
4. **Subscribe to Events (Check the boxes):**
   - [x] **Check run** (notifies TryPatchBay when customer CI completes)
   - [x] **Check suite** (notifies TryPatchBay of overall CI results)
   - [x] **Pull request** (detects when your PR is merged)
   - [x] **Installation** (handles user install/uninstall/suspend)

---

## Step 4: Create a Dedicated Disposable Pilot Repository

Create a fresh GitHub repository (e.g. `Nitish-1303/patchbay-pilot-demo`):

1. **Add `package.json`:**
```json
{
  "name": "patchbay-pilot-demo",
  "version": "1.0.0",
  "dependencies": {
    "openai": "^3.3.0"
  },
  "scripts": {
    "test": "node test.js"
  }
}
```

2. **Add `src/ai.js` (legacy OpenAI v3 code):**
```javascript
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY || 'mock_key' });
const openai = new OpenAIApi(configuration);

async function generateChat(userMessage) {
  const completion = await openai.createChatCompletion({
    model: 'gpt-4',
    messages: [{ role: 'user', content: userMessage }],
  });
  return completion.data;
}

module.exports = { generateChat };
```

3. **Add `test.js`:**
```javascript
const assert = require('assert');
const { generateChat } = require('./src/ai');
assert.strictEqual(typeof generateChat, 'function');
console.log('✅ Baseline test passed.');
```

4. **Add GitHub Actions workflow (`.github/workflows/ci.yml`):**
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm test
```

Push to GitHub (`git push -u origin main`).

---

## Step 5: Execute the Live End-to-End Loop

1. Open `https://trypatchbay.vercel.app/dashboard`.
2. Click **"Continue with GitHub"** $\rightarrow$ Authorize TryPatchBay.
3. You will be redirected to the dashboard with your GitHub profile connected.
4. Click **"Install GitHub App"** $\rightarrow$ Select `Nitish-1303/patchbay-pilot-demo`.
5. On the dashboard:
   - Select your repository from the dropdown.
   - Click **"Scan Repository"**.
   - TryPatchBay will detect `openai` upgrade from `3.3.0` $\rightarrow$ `4.x.x` as a breaking change.
   - Click **"Synthesize AST Patch"** $\rightarrow$ Inspect the deterministic AST diff rewriting legacy `Configuration`/`OpenAIApi` to `new OpenAI()`.
   - Click **"Approve & Create Draft PR"**.
6. **Watch the Magic on GitHub:**
   - Go to your repository's Pull Requests page on GitHub.
   - You will see the new Draft PR: `patchbay/upgrade-openai-4.x.x`.
   - GitHub Actions will run `npm test`.
   - When CI turns green, GitHub sends the `check_run.completed` webhook back to TryPatchBay.
   - Refresh your TryPatchBay dashboard $\rightarrow$ Finding status automatically transitions to **VERIFIED (CI PASS)** with cryptographic proof.
7. Merge the PR on GitHub $\rightarrow$ Webhook notifies TryPatchBay $\rightarrow$ Status changes to **MERGED**.

---

## Step 6: 90-Second Loom Demo Script for YC

* **[0:00 - 0:15] The Hook:**  
  *"Dependabot creates broken PRs that fail your tests, and LLMs hallucinate non-existent API parameters. TryPatchBay pairs deterministic AST codemods with cryptographic proof chains."*
* **[0:15 - 0:45] The Action:**  
  *"Here is our dashboard. We connect a real repository with one click. TryPatchBay scans the dependency graph, identifies an OpenAI v3 to v4 breaking change, and generates a mathematical AST transformation—rewriting both the imports and the call sites."*
* **[0:45 - 1:15] The Delivery:**  
  *"With one click, TryPatchBay opens a Draft PR on GitHub. Notice the branch was committed directly. Now GitHub Actions CI runs on the PR... and turns Green."*
* **[1:15 - 1:30] The Closer:**  
  *"The webhook reports the green CI back to our dashboard, marking the patch verified with zero human intervention. We are live today at trypatchbay.vercel.app."*
