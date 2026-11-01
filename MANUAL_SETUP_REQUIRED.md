# TryPatchBay — Manual Setup & Production Environment Configuration

> **Product:** TryPatchBay  
> **Production Target:** `https://trypatchbay.vercel.app` (Vercel Project: `trypatchbay`)  
> **Database:** Neon PostgreSQL (`iad1` / AWS US East)  
> **Repository:** `https://github.com/Nitish-1303/Patchversion`  
> **Security Policy:** Never paste secrets or private keys directly into git repositories, chat logs, or PR descriptions.

This document provides exact step-by-step instructions for the founding team to provision and configure the necessary external cloud services for TryPatchBay.

---

## 1. Neon PostgreSQL Database Configuration

TryPatchBay uses PostgreSQL as its durable relational state store with multi-tenant isolation, versioned schema migrations, transactional advisory locks, and atomic sliding-window rate limiting.

### A. Neon Project Creation
1. Log in to [Neon Console](https://console.neon.tech).
2. Create a new project:
   - **Project Name:** `trypatchbay-production`
   - **Region:** `aws-us-east-1` (IAD) — matching Vercel's primary edge and serverless region for single-digit millisecond latency.
   - **Postgres Version:** 16 (or latest stable).

### B. Connection String Retrieval
1. In the Neon dashboard, navigate to **Dashboard** -> **Connection Details**.
2. Select **Pooled connection** (recommended for serverless Vercel deployments via PgBouncer).
3. Copy the connection URI:
   ```env
   DATABASE_URL=postgresql://[user]:[password]@[endpoint]-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

### C. Database Migration Execution
Once `DATABASE_URL` is configured, apply the versioned SQL migrations using the engine CLI:
```bash
# Verify connection and schema status
npm run db:status

# Run pending migrations (protected by PostgreSQL transactional advisory lock)
npm run db:migrate

# Verify all 18 canonical tables and indexes
npm run db:verify
```

*Note:* TryPatchBay's serverless health endpoint (`/api/health`) automatically performs idempotent schema checks on startup.

---

## 2. GitHub App Production Configuration

To interact with customer repositories, discover manifests, map AST call sites, and deliver approved pull requests, TryPatchBay uses a dedicated GitHub App.

### A. Create GitHub App
1. Go to **GitHub Settings** -> **Developer settings** -> **GitHub Apps** -> **New GitHub App**.
2. Configure App Details:
   - **GitHub App name:** `trypatchbay` (or `trypatchbay-bot`)
   - **Homepage URL:** `https://trypatchbay.vercel.app`
   - **Callback URL:** `https://trypatchbay.vercel.app/api/github/callback`
   - **Setup URL (optional):** `https://trypatchbay.vercel.app/onboarding`
   - **Webhook URL:** `https://trypatchbay.vercel.app/api/github/webhook`
   - **Webhook secret:** Generate a secure 32+ character random secret:
     ```bash
     openssl rand -hex 24
     ```

### B. Repository Permissions
Under **Permissions & events** -> **Repository permissions**:
- **Contents:** `Read and write` (to read dependency files and commit deterministic patch branches)
- **Pull requests:** `Read and write` (to open and track verified fix pull requests)
- **Metadata:** `Read-only` (automatically selected)
- **Commit statuses:** `Read and write` (to post proof status checks)

### C. Event Subscriptions
Subscribe to the following webhook events:
- [x] **Installation** (track when organizations install or uninstall TryPatchBay)
- [x] **Installation target** (track workspace changes)
- [x] **Pull request** (track when delivered fix PRs are merged or closed)

### D. Generate Private Key
1. In the GitHub App settings page, scroll down to **Private keys**.
2. Click **Generate a private key**.
3. Save the downloaded `.pem` file securely.
4. Convert the private key into a single-line string or base64 string for Vercel environment variables:
   ```bash
   # Unix/Git Bash:
   awk '{printf "%s\\n", $0}' your-app-private-key.pem
   ```

---

## 3. Environment Variables Roster

Set the following environment variables in the **Vercel Project Settings** (`trypatchbay` -> Settings -> Environment Variables) for `Production` and `Preview`:

| Variable Name | Required | Description | Example / Format |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | Neon PostgreSQL connection URI with SSL | `postgresql://user:pass@ep-xyz-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require` |
| `PATCHVERSION_SESSION_SECRET` | **Yes** | 32+ byte secret for HMAC-SHA256 session tokens | 64-char hex string (`openssl rand -hex 32`) |
| `GITHUB_APP_ID` | **Yes** | Numeric GitHub App ID | `1089242` |
| `GITHUB_APP_PRIVATE_KEY` | **Yes** | RSA Private Key in PEM format with newline escapes | `-----BEGIN RSA PRIVATE KEY-----\nMIIE...` |
| `GITHUB_APP_WEBHOOK_SECRET` | **Yes** | Secret for verifying `X-Hub-Signature-256` | 48-char hex string |
| `NEXT_PUBLIC_GITHUB_APP_NAME` | **Yes** | Public slug of the GitHub App for install redirects | `trypatchbay` |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Canonical production site URL | `https://trypatchbay.vercel.app` |
| `NODE_ENV` | Default | Application environment | `production` |

---

## 4. Execution Sandbox Isolation Boundary (Phase G Milestone)

### Current Security Policy (Fail-Closed)
In accordance with TryPatchBay's security principles:
- **Application hosts NEVER execute untrusted customer code directly.**
- Deterministic AST transformations (`ts-morph`) and static syntax tree mapping run in pure memory without executing the scanned repository.
- Full red-to-green test proof execution is restricted to vetted internal fixtures on serverless application hosts.
- Untrusted third-party repository test runs remain strictly fail-closed until microVM infrastructure is attached.

### Future MicroVM Runner Provisioning
When deploying remote microVM execution runners:
1. Provision isolated container workers (e.g., Fly.io Machines, AWS Firecracker microVMs, or E2B sandbox instances).
2. Configure worker access via:
   ```env
   MICROVM_RUNNER_ENDPOINT=https://runner.internal.trypatchbay.com
   MICROVM_RUNNER_AUTH_TOKEN=...
   ```
3. Workers will pull the minimal diff, spin up an ephemeral container with strict resource limits (no network access, 2GB RAM, 60s timeout), execute `npm test`, emit the tamper-evident proof bundle (`proof.json`), and self-destruct.
