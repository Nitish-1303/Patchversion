# Security Threat Model

**Status:** Initial draft. Covers the planned architecture, not a completed audit.

## Assets

- Customer source code (read access)
- API specifications and changelogs (public but untrusted input)
- Generated code patches (untrusted until validated)
- GitHub App credentials (high-value target)
- Customer secrets (must never be accessed)

## Trust Boundaries

1. **GitHub API <-> Engine**: Authenticated via GitHub App installation tokens.
   Least-privilege: read code, write branches/PRs only.
2. **Engine <-> Sandbox**: Sandbox runs customer code in isolation.
   Docker --network none when available; local child process with resource limits as fallback.
3. **Engine <-> LLM**: Only affected code context is sent. No secrets, no full files.
4. **Site <-> Engine**: Dashboard reads state store; no direct code access.

## Threats and Mitigations

| Threat | Mitigation |
|--------|-----------|
| Malicious repo content (path traversal, code injection) | AST parsing only; never eval customer code outside sandbox |
| Prompt injection via changelog/release notes | Treat all external text as untrusted; no external instructions in prompts |
| Credential leak | GitHub App tokens are short-lived; stored encrypted; never in code |
| Sandbox escape | Docker --network none; resource limits (memory, CPU, timeout) |
| Unauthorized repo access | GitHub App installation flow; explicit per-repo authorization |
| Generated code introduces vulnerability | Test suite must pass; human review required before merge |
| Supply chain via dependency bump | Version pinned; lockfile; CI checks |
| Secrets in customer code | Never read .env, secrets files; explicit exclusion patterns |

## What is NOT yet addressed

- No formal security audit
- No SOC 2 or compliance certification
- No penetration testing
- No bug bounty program
- Docker isolation not yet exercised (local process fallback used in tests)
