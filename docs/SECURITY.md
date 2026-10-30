# PatchBay — Security & Isolation Boundary Specification

## 1. Safety Principles

PatchBay executes code during test verification. To prevent untrusted repositories from executing arbitrary code on the host, PatchBay enforces a strict **fail-closed security boundary**.

---

## 2. Execution Admission Gate

- **Allowlisted Fixture Gate:** The function `resolvePermittedFixturePath` evaluates every repository path. Local execution is rejected unless the path resolves strictly inside an approved fixture directory (`fixtures/sample-repo`, `fixtures/lodash-repo`).
- **Fail-Closed Default:** If an unverified provider or untrusted customer repository attempts execution, the system throws an explicit security error and blocks execution.
- **MicroVM Provider Contract:** The `IExecutionProvider` interface defines the requirements for future cloud-isolated execution:
  - Disposable, ephemeral workspaces destroyed after execution
  - Network egress policies (blocking outbound traffic or restricting to approved registries)
  - Memory, CPU, and wall-clock execution limits
  - Secret stripping from child environments

---

## 3. Webhook Integrity & Replay Defense

- All incoming GitHub webhooks are verified against `x-hub-signature-256` using constant-time HMAC-SHA256 comparison.
- Webhook payloads exceeding 10MB are rejected with HTTP 413.
- Onboarding state tokens are signed, time-bounded (15 minutes), and atomically consumed to prevent replay attacks.
- Delivery claims prevent concurrent workers from dispatching duplicate pull requests.

---

## 4. Secret & Credential Handling

- Passwords are encrypted with `crypto.scryptSync` using cryptographic random salts.
- User password hashes are stripped before returning user objects to the client.
- Sensitive environment variables are excluded from sandbox child process environments.
