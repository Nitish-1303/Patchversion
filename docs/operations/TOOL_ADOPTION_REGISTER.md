# Tool Adoption Register

Classification: **A** install now · **B** library · **C** hosted · **D** later · **E** reject/duplicate

| Tool | Purpose | Class | Rationale (2026-11-23) |
|---|---|---|---|
| Existing Jest + Next | Unit/site tests | **A** (already) | Keep |
| Existing Vercel + Neon | Deploy/DB | **C** (already) | Prefer; no DB access without approval |
| Gitleaks / Semgrep / Trivy | Security CI | **D** | Add after webhook/onboarding; avoid scanner pile-on |
| Playwright | E2E | **D** | After App install path exists |
| Grafana/Prometheus/Loki | Observability | **D** | Prefer structured logs first; solo-founder ops cost |
| n8n | Workflows | **D** | After product gates |
| LangGraph / multi-agent “agency” | Orchestration | **E/D** | Do not install for optics; use Cursor + docs until needed |
| Twenty CRM | Sales CRM | **D** | Prefer internal validation module first |
| Chatwoot / Formbricks | Support/feedback | **D** | After pilots |
| Postiz / Listmonk / Ghost | Marketing | **D/E** until content ready | No auto-publish |
| SiteOne / Unlighthouse | SEO crawl | **D** | After truthful site messaging |
| Firecracker F2 | Isolation R&D | **separate** | Already in progress; not product activation |

**Policy:** Prefer free/self-hostable with clear licenses; record license before A/B; no AGPL without founder review.
