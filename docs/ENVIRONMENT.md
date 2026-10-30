# PatchBay — Environment Variables & Configuration Guide

This document describes all environment variables used by PatchBay across the engine, backend API routes, and web application.

---

## 1. Authentication & Security

| Variable | Description | Required | Default / Example |
|---|---|---|---|
| `PATCHVERSION_SESSION_SECRET` | 32+ character signing secret for session tokens and HMAC verification | Yes (in prod) | Fallback dev secret in non-production |
| `NODE_ENV` | Environment identifier | Yes | `development` / `production` / `test` |

---

## 2. Storage & Persistence

| Variable | Description | Required | Default / Example |
|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection URL | Optional | `postgresql://user:password@localhost:5432/patchversion` |
| `PATCHVERSION_STATE_DIR` | Directory path for local file database and state files | Optional | `./.patchversion-state` |

---

## 3. GitHub App Integration

| Variable | Description | Required | Default / Example |
|---|---|---|---|
| `GITHUB_APP_ID` | Numeric App ID assigned by GitHub | For live PRs | `123456` |
| `GITHUB_APP_PRIVATE_KEY` | PEM-encoded RSA private key for RS256 JWT generation | For live PRs | `-----BEGIN RSA PRIVATE KEY-----...` |
| `GITHUB_APP_WEBHOOK_SECRET` | Shared secret for verifying GitHub webhook payload signatures | For webhooks | `my-secure-webhook-secret` |
| `GITHUB_APP_SLUG` | GitHub App public slug used to generate installation links | Optional | `trypatchbay` |

---

## 4. Execution Sandbox

| Variable | Description | Required | Default / Example |
|---|---|---|---|
| `PATCHVERSION_SANDBOX_MODE` | Execution backend selector (`local-process` or future `microvm`) | Optional | `local-process` |
| `PATCHVERSION_TEST_TIMEOUT_MS` | Process execution timeout in milliseconds | Optional | `60000` |
| `PATCHVERSION_MAX_OUTPUT_BYTES` | Maximum stdout/stderr bytes captured before truncation | Optional | `1048576` (1MB) |
