# Local AI-Coding Repository Discovery, Paxel Upload Audit, and YC Verification

## 1. Environment Verification

- **Operating System:** Windows (win32, Windows 10/11 Architecture)
- **User Home Directory:** `C:\Users\NITISH`
- **Execution Target:** Physical local machine (`C:\Users\NITISH\Downloads\Patchversion`), not an ephemeral remote sandbox.
- **Tools Detected:**
  - **Claude Code:** Configured at `~/.claude/projects/` (12 project workspaces mapped).
  - **Codex CLI:** Data present at `~/.codex/state_5.sqlite` and `~/.codex/sessions/` (threads and session files mapped).
  - **Cursor:** Storage present at `AppData\Roaming\Cursor\User\workspaceStorage` (64 workspace configurations mapped) and `AppData\Roaming\Cursor\User\globalStorage\state.vscdb` (`composerHeaders` table mapped).
  - **Google Antigravity:** Transcripts present under `~/.gemini/antigravity/brain/`.

---

## 2. Connected GitHub Repository & Vercel Deployment Audit

- **Connected GitHub Repository:** `Nitish-1303/Patchversion`
- **Default Branch:** `main` (Latest commit: `7c471eb5f9778e54383ce53683ac22d227a190fb`)
- **Current Feature Branch:** `audit/paxel-and-repo-discovery`
- **Draft Pull Request:** [#22](https://github.com/Nitish-1303/Patchversion/pull/22) (Draft maintained, merge authority strictly preserved)
- **Connected Vercel Project:** `trypatchbay` (Project ID: `prj_d1YZdQ28wbKASKWcHGgGdBmndvgS`)
- **Production Deployment Status:** `Ready`
- **Production Deployment URL:** `https://trypatchbay.vercel.app`
- **Production Build Commit:** `7c471eb` (Exact match with `origin/main` commit: 0-commit mismatch).
- **Deployment Protection:** Enabled for preview deployments; production deployment is accessible publicly via HTTP 200.
- **Paxel References in Repository:** Verified zero occurrences of Paxel, `upload.sh`, or local session scraping scripts in the repository source code.

---

## 3. Paxel Upload Script (`upload.sh`) Security & Data-Flow Analysis

- **Retrieval Date:** 2026-10-28 18:11 IST
- **File Size:** 633,371 bytes (17,465 lines)
- **Script URL:** `https://paxel.ycombinator.com/upload.sh`
- **SHA-256 Hash:** `8E0C64A5DA0ADDC8DD339A3A8EFDC41373767846F9A9D2F24484CC90698AFFE5`
- **Version:** `0.3.91.0`
- **Client Container Image:** `ghcr.io/yc-software/paxel-client:latest`
- **Server Endpoints:**
  - Web/Auth Server: `https://paxel.ycombinator.com`
  - LLM Proxy: `https://paxel-llm.ycombinator.com`
  - Results Endpoint: `https://paxel.ycombinator.com/api/v1/results`

### Deep Code-Path Analysis

1. **Session Discovery:** Scans Claude Code (`~/.claude/projects`), Codex CLI (`~/.codex/sessions`), Cursor (`workspaceStorage` and `~/.cursor/projects`), Gemini CLI, Antigravity (`~/.gemini`), OpenCode, and VS Code Copilot.
2. **Reading Transcripts & Git:** Mounts transcripts and repository root read-only into Docker (`/transcripts:ro`, `/repo:ro`). Runs git log and diff line-count calculations (`git_metrics.txt`).
3. **Information Extracted:** Extracts decision exchanges, steering traces, tool calls, touched file paths, and bash commands. Raw source code bodies and diffs stay local; aggregate statistics are computed.
4. **Secret Detection & Redaction:** Includes a regex-based `SecretScrubber` / `ToolInputSummarizer` targeting API keys and common credentials. However, confidential business logic, project strategies, and application text are not redacted.
5. **Authentication:** Uses interactive browser-based device code authorization (`https://paxel.ycombinator.com/auth/cli?code=<code>`). Polls for completion and stores a bearer token in `~/.paxel/token` (chmod 600).
6. **External Recipients:**
   - `https://paxel-llm.ycombinator.com`: Receives transcript excerpts and prompts for narrative analysis by Claude Haiku. The script header explicitly notes that YC logs raw request/response payloads to YC Postgres.
   - `https://paxel.ycombinator.com/api/v1/results`: Receives final narrative summaries, 5-axis capability scores, touched file paths, bash commands executed, and commit metadata.
7. **Docker Privileges & Supply Chain:** Runs `docker run --rm` with `ghcr.io/yc-software/paxel-client:latest`. Using a moving tag (`latest`) means the container payload can change upstream independently of the bash wrapper.
8. **Local Persistence:** Writes `~/.paxel/token`, `~/.paxel/cache/`, and Docker volume `paxel-cache-<uid>`.
9. **Automatic Skill Modification:** Automatically installs or updates a skill named `paxel-remote-setup` in agent skill directories unless `--no-skill` or `export PAXEL_NO_SKILL=1` is provided.
10. **CRITICAL FINDING ON DRY-RUN:** The script defines `DRY_RUN="${DRY_RUN:-0}"` on line 286, but static inspection confirms that `--dry-run` is not parsed as a CLI flag and `DRY_RUN` is never used to gate container execution or external network calls. Running the script with `--dry-run` **WILL STILL TRANSMIT DATA**.

---

## 4. Privacy & YC Identity Relationship

1. **Prompt Content:** If you discuss startup names, proprietary architecture, or YC application answers in AI coding sessions, those excerpts will be processed by YC's LLM proxy and stored in YC's audit database.
2. **Authenticated Identity:** The upload is bound to whichever YC user account authorizes the browser login during `try_device_auth()`.
3. **Application Association:** Uploads are attached to the authenticated user's admissions profile. Mentioning a company name in a prompt does not automatically link the upload to a different application, but human reviewers assessing the applicant's upload will see any startup names or project descriptions contained in the summaries.

---

## 5. Master Verified Repository & Project Inventory

The inventory below reflects verified local paths, Git status, sanitized remotes, and session counts across Claude Code, Codex CLI, Cursor, and Antigravity:

| # | Project Name | Absolute Local Path | Tools Detected | Claude | Codex | Cursor | Other | Total | Status | Git Remote | Confidence | Privacy Notes |
|---|---|---|---|---:|---:|---:|---:|---:|---|---|---|---|
| 1 | `ShadowPay-source` | `C:\Users\NITISH\Downloads\ShadowPay-source` | Claude, Codex, Cursor | 5 | 10 | 5 | 0 | **20** | Git Repo | `https://github.com/Nitish-1303/CipherBill.git` | Verified | High session activity; unreleased fintech code |
| 2 | `PatchBay` | `C:\Users\NITISH\Downloads\PatchBay` | Claude Code | 7 | 0 | 0 | 0 | **7** | Git Repo | `https://github.com/PatchBay-HQ/patchbay.git` | Verified | Product strategy & prototype discussions |
| 3 | `lbx-rl-tasks-template` | `C:\Users\NITISH\lbx-rl-tasks-template` | Cursor | 0 | 0 | 6 | 0 | **6** | Git Repo | `https://github.com/Alignerr-Code-Labeling/lbx-rl-tasks-template.git` | Verified | Client/eval task template |
| 4 | `Spotify-Playlist-Bidding` | `C:\Users\NITISH\Downloads\Spotify-Playlist-Bidding` | Claude, Cursor | 2 | 0 | 3 | 0 | **5** | Git Repo | `https://github.com/Nitish-1303/Spotify-Playlist-Bidding.git` | Verified | Music bidding platform code |
| 5 | `YCS26` | `D:\YCS26` | Codex, Cursor | 0 | 1 | 3 | 0 | **4** | Git Repo | `https://github.com/Nitish-1303/Backup-AI.git` | Verified | Contains YC application notes and prompts |
| 6 | `Flake Hunter` | `C:\Users\NITISH\Downloads\Flake Hunter` | Claude Code | 3 | 0 | 0 | 0 | **3** | Git Repo | `https://github.com/Nitish-1303/flake-hunter.git` | Verified | Test flakiness tool development |
| 7 | `ShadowPay-hackathon-registration` | `C:\Users\NITISH\Downloads\ShadowPay-hackathon-registration` | Codex CLI | 0 | 2 | 0 | 0 | **2** | Git Repo | `https://github.com/Nitish-1303/strk20-hackathon.git` | Verified | Hackathon entry code |
| 8 | `lumina_-imessage-life-os` | `C:\Users\NITISH\Downloads\lumina_-imessage-life-os` | Cursor | 0 | 0 | 2 | 0 | **2** | Git Repo | `https://github.com/Nitish-1303/lumina-OS.git` | Verified | Personal life-os project |
| 9 | `yoursre---autonomous-ai-sre-for-startups` | `C:\Users\NITISH\Downloads\yoursre---autonomous-ai-sre-for-startups` | Cursor | 0 | 0 | 2 | 0 | **2** | Git Repo | `https://github.com/YourSRE-ai/YourSRE.ai.git` | Verified | SRE startup code |
| 10 | `hydradb-1` | `C:\Users\NITISH\Downloads\hydradb-1` | Cursor | 0 | 0 | 2 | 0 | **2** | Git Repo | `https://github.com/hydra-db/hydradb` | Verified | Database contribution code |
| 11 | `Debrief` | `C:\Users\NITISH\Downloads\Debrief` | Claude Code | 1 | 0 | 0 | 0 | **1** | Git Repo | `https://github.com/Nitish-1303/Debrief.git` | Verified | Debriefing tool code |
| 12 | `Sanity` | `C:\Users\NITISH\Downloads\Sanity` | Claude Code | 1 | 0 | 0 | 0 | **1** | Git Repo | *(None configured)* | Verified | Internal validation repo |
| 13 | `Yeluru-Nitish` | `C:\Users\NITISH\Downloads\Yeluru-Nitish` | Claude Code | 1 | 0 | 0 | 0 | **1** | Git Repo | `https://github.com/Nitish-1303/Yeluru-Nitish.git` | Verified | Personal portfolio site |
| 14 | `Patchversion` | `C:\Users\NITISH\Downloads\Patchversion` | Antigravity | 0 | 0 | 0 | 1 | **1** | Git Repo | `https://github.com/Nitish-1303/Patchversion.git` | Verified | Current development repository |
| 15 | `PlaylistBid` | `C:\Users\NITISH\PlaylistBid` | Cursor | 0 | 0 | 1 | 0 | **1** | Git Repo | `https://github.com/Nitish-1303/Spotify-Playlist-Bidding.git` | Verified | Sibling working directory |
| 16 | `gpu-amphibious-wheg-surf-egress` | `C:\Users\NITISH\lbx-rl-tasks-template\...\gpu-amphibious-wheg-surf-egress` | Cursor | 0 | 0 | 8 | 0 | **8** | Subfolder | *(Nested in #3)* | Verified | Subtask directory |
| 17 | `ATS` | `D:\ATS` | Cursor | 0 | 0 | 6 | 0 | **6** | Folder | *(None)* | Verified | Non-git workspace |
| 18 | `WEBSITE` | `C:\Users\NITISH\Downloads\WEBSITE` | Claude Code | 5 | 0 | 0 | 0 | **5** | Folder | *(None)* | Verified | Non-git frontend folder |
| 19 | `password` | `D:\password` | Cursor | 0 | 0 | 5 | 0 | **5** | Folder | *(None)* | Verified | Sensitive name; verify contents before any share |
| 20 | `NITISH` (Home) | `C:\Users\NITISH` | Claude Code | 4 | 0 | 0 | 0 | **4** | Folder | *(None)* | Verified | User home directory; contains personal files |
| 21 | `HACKATHON` | `C:\Users\NITISH\Downloads\HACKATHON` | Claude Code | 3 | 0 | 0 | 0 | **3** | Folder | *(None)* | Verified | Non-git hackathon workspace |
| 22 | `linkedin` | `C:\Users\NITISH\Downloads\linkedin` | Claude Code | 3 | 0 | 0 | 0 | **3** | Folder | *(None)* | Verified | Non-git scraping/automation folder |
| 23 | `Gatekeeper AI` | `D:\Gatekeeper AI` | Codex, Cursor | 0 | 1 | 2 | 0 | **3** | Folder | *(None)* | Verified | Non-git AI prototype folder |
| 24 | `Remitcore` | `D:\Remitcore` | Cursor | 0 | 0 | 2 | 0 | **2** | Folder | *(None)* | Verified | Non-git payout engine workspace |
| 25 | `Bargain` | `C:\Users\NITISH\Downloads\Bargain` | Claude Code | 1 | 0 | 0 | 0 | **1** | Folder | *(None)* | Verified | Non-git negotiation tool folder |
| 26 | `Patchversion` (Codex worktree) | `C:\Users\NITISH\.codex\worktrees\production-completion\Patchversion` | Codex CLI | 0 | 1 | 0 | 0 | **1** | Worktree | *(Worktree for #14)* | Verified | Ephemeral worktree created by Codex |
| 27 | Codex Prompt Scratch Folders (6) | `C:\Users\NITISH\Documents\Codex\2026-*` | Codex CLI | 0 | 9 | 0 | 0 | **9** | Scratch | *(None)* | Verified | Generated temporary task folders |

---

## 6. Selection & Upload Authorization Status

- **Repositories Selected:** None yet.
- **Upload Authorization:** Strictly **NOT GRANTED**. No script execution or external upload has occurred.
- **Recommended Exclusions:**
  - `D:\YCS26` (Contains confidential YC application brainstorming).
  - `D:\password` (Potentially sensitive credentials or security experiments).
  - `C:\Users\NITISH` (User home directory; contains private system files).
  - `C:\Users\NITISH\Downloads\ShadowPay-source` (Proprietary fintech codebase; upload only if intentional).
