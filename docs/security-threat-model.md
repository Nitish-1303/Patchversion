# Security Threat Model

**Status:** Current implementation notes, reviewed 2026-10-28. This is not a
formal security assessment.

## Current assets and trust boundaries

- Bundled fixture source and its vendored package files.
- Local JSON state and proof artifacts written by the engine.
- npm registry metadata when the local watcher is invoked; treat it as
  untrusted input.
- A webhook secret can be supplied to the standalone local receiver. No
  GitHub App private key, customer repository, or customer secret is connected
  to the current product.

## Current State (Reviewed 2026-10-28)

- No GitHub App authentication, installation callback, repository connection,
  or deployed webhook endpoint exists.
- The webhook receiver is a local HTTP prototype. With a configured secret it
  verifies the raw-body HMAC and caps request size, then logs a small event
  summary. It does not validate event schemas, deduplicate deliveries, enqueue
  work, or access GitHub.
- The engine has no hosted worker or isolated execution boundary. Its local
  child process has no isolation; an admission gate only permits the bundled
  fixtures. Docker execution remains blocked as unverified. Runtime config
  rejects attempts to disable this gate or replace trusted fixture roots
  outside the test runtime; this is a configuration safeguard, not isolation.
- The `/dashboard` route displays an unavailable state and loads no account,
  repository, fixture, activity, or pull request data. The homepage contains a
  separately labeled bundled-fixture example; neither surface is connected to
  account data or the engine's file-backed state store.
- The language-model fix path is a stub. No model request or repository source
  is sent to an external model service.

## Planned Trust Boundaries (Not Implemented)

The following are design goals, not current controls:

1. **GitHub API <-> Engine**: use least-privilege installation tokens after a
   real GitHub App, authorization flow, and repository ownership checks exist.
2. **Engine <-> Isolated worker**: run repository content only after a host
   isolation boundary is independently verified. Today, non-fixture execution
   is refused.
3. **Engine <-> LLM**: if added, send only necessary code context, exclude
   secrets, and validate model output as an untrusted proposal. No LLM request
   is implemented today.
4. **Site <-> Engine**: expose tenant-authorized product state through a server
   API only after authentication, persistence, and authorization are built.

## Threats and Mitigations

| Threat | Current control and limitation |
|--------|-----------|
| Malicious repository content (path traversal, code injection) | Non-fixture execution is refused. Patch paths are checked for work-directory containment. Fixture code still runs locally without isolation. |
| Prompt injection via changelog/release notes | The model path is not implemented, so no prompt is built or sent today. External text must remain untrusted if that path is added. |
| Credential leak | Child processes use a reduced environment and copied fixture trees exclude common secret files. No customer repositories or GitHub credentials are connected. |
| Sandbox escape | No verified sandbox exists. Docker is blocked and non-fixture execution is refused. |
| Unauthorized repository access | No repository access or authorization flow exists today. |
| Generated code introduces vulnerability | Automatic fixes are limited to deterministic rename patterns and local fixture proof; output is prepared locally and is not submitted. |
| Supply chain via dependency bump | A lockfile and CI workflow exist. Untrusted customer dependency installs are not enabled. |
| Secrets in customer code | Customer code is not accepted. The runner excludes common secret files from fixture copies; this is not a complete secret-scanning control. |

## What is NOT yet addressed

- No formal security audit
- No SOC 2 or compliance certification
- No penetration testing
- No bug bounty program
- Docker isolation BLOCKED as unverified (2026-10-24); no isolated execution exists
- Residual: sandbox workdir create/copy/delete is pathname-based; there is no
  defense against a hostile same-UID process (a prior local security review
  proved automatic recursive deletion unsafe there). Workdirs are excluded
  from the admission-gate bypass and deleted after each run; cleanup failure
  blocks the proof outcome.
