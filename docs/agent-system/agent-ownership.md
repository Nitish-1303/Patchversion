# Agent Ownership Map

| Role | Owns (write) | Must not write |
|---|---|---|
| Orchestrator | `docs/agent-system/**`, `docs/business/**` daily reports, backlog | Production secrets; concurrent product src without ownership grant |
| Implementation (engine) | `packages/engine/**`, related tests | `packages/site/**` unless dual-assigned; F2 host trees |
| Implementation (site) | `packages/site/**` | Engine sandbox qualification flags |
| Implementation (shared) | `packages/shared/**` | Unilateral API breaks without consumer update |
| QA | Tests, fixtures, `runs/**` artifacts | Production deploy config |
| Security | Security patches in assigned scope; threat notes | Disabling fail-closed to green tests |
| Infra/release | CI workflows, release docs (draft PRs) | Merging `main` without founder |
| Firecracker specialist | WSL FC tree + `docs/engineering/firecracker-f2-*` | App customer-execution enablement |
| Independent auditor | Review markdown only | Implementation of the change under review |

## File locks (soft)

Before editing, agents record ownership in the task card. If conflict → orchestrator reassigns or serializes.
