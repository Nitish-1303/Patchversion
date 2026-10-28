# Local AI-Coding Repository Discovery, Paxel Upload Audit, and YC Verification

## 1. Environment Verification

- **Operating System:** Windows (win32)
- **User Home Directory:** `C:\Users\NITISH`
- **Execution Environment:** Actual local development machine (`C:\Users\NITISH\Downloads\Patchversion`)
- **Tools Detected:**
  - **Claude Code:** Metadata present at `~/.claude/projects/` (12 project workspaces mapped).
  - **Codex CLI:** Data present at `~/.codex/state_5.sqlite` and `~/.codex/sessions/` (threads and session files mapped).
  - **Cursor:** Storage present at `AppData\Roaming\Cursor\User\workspaceStorage` (64 workspace configurations mapped) and `AppData\Roaming\Cursor\User\globalStorage\state.vscdb` (`composerHeaders` table mapped).
  - **Google Antigravity:** Transcripts present under `~/.gemini/antigravity/brain/`.

---

## 2. Connected GitHub Repository & Vercel Deployment Audit

- **Connected GitHub Repository:** `Nitish-1303/Patchversion`
- **Default Branch:** `main` (Latest commit: `7c471eb5f9778e54383ce53683ac22d227a190fb`)
- **Connected Vercel Project:** `trypatchbay` (Project ID: `prj_d1YZdQ28wbKASKWcHGgGdBmndvgS`)
- **Production Deployment Status:** `Ready`
- **Production Deployment URL:** `https://trypatchbay.vercel.app`
- **Production Build Commit:** `7c471eb` (Exact match with `origin/main` commit: 0 commit mismatch).
- **Deployment Protection:** Enabled for preview deployments; production deployment is accessible publicly via HTTP 200.
- **Paxel References in Repository:** Verified zero occurrences of Paxel, `upload.sh`, or local session scraping scripts in the repository source code.

---

## 3. Paxel Upload Script (`upload.sh`) Security & Data-Flow Analysis

- **Retrieval Date:** 2026-10-28
- **Script URL:** `https://paxel.ycombinator.com/upload.sh`
- **SHA-256 Hash:** `8E0C64A5DA0ADDC8DD339A3A8EFDC41373767846F9A9D2F24484CC90698AFFE5`
- **Version:** `0.3.91.0`
- **Client Container Image:** `ghcr.io/yc-software/paxel-client:latest`
- **Server Endpoints:**
  - Web/Auth Server: `https://paxel.ycombinator.com`
  - LLM Proxy: `https://paxel-llm.ycombinator.com`
  - Results Endpoint: `https://paxel.ycombinator.com/api/v1/results`

### Data Flow & Transmission Findings

1. **What Stays Local:**
   - Full raw source code file contents and git diffs do not leave the local Docker container.
   - Diffs are converted into per-commit line-count statistics (`git_metrics.txt`).
2. **What Leaves Local Machine:**
   - **Transcript Excerpts:** Sent to `https://paxel-llm.ycombinator.com` (Claude Haiku proxy) for summarization, decision exchange extraction, and 5-axis scoring. The script documentation states that the YC proxy logs request and response payloads to YC Postgres.
   - **Uploaded Results:** Session behavioral summaries, scores, touched file paths, bash command snippets, commit SHAs/authors/dates, and pipeline telemetry are posted to `https://paxel.ycombinator.com/api/v1/results`.
3. **Identity & YC Application Relationship:**
   - **Authentication:** Uses browser-based device code authorization (`https://paxel.ycombinator.com/auth/cli`). The generated token is stored in `~/.paxel/token`.
   - **Application Association:** Uploads are bound to the signed-in YC Paxel user account that authorized the browser session.
   - **Prompt Contents:** Mentioning a startup name or YC application detail in AI coding prompts **does NOT** automatically associate the upload with a different YC application in the database. However, any text, startup names, or application details present in prompts or tool calls will be processed by the LLM proxy, logged to the database, and reflected in the narrative summaries.

---

## 4. Local Repository Inventory Summary

Total discovered directories: 32 (15 Git repositories, 17 non-git project directories or scratch folders).
Detailed verified list:
1. `ShadowPay-source` (`C:\Users\NITISH\Downloads\ShadowPay-source`): 15 distinct sessions (5 Claude, 10 Codex, 5 Cursor).
2. `PatchBay` (`C:\Users\NITISH\Downloads\PatchBay`): 7 sessions (Claude).
3. `lbx-rl-tasks-template` (`C:\Users\NITISH\lbx-rl-tasks-template`): 6 sessions (Cursor).
4. `Spotify-Playlist-Bidding` (`C:\Users\NITISH\Downloads\Spotify-Playlist-Bidding`): 5 sessions (2 Claude, 3 Cursor).
5. `YCS26` (`D:\YCS26`): 4 sessions (1 Codex, 3 Cursor).
6. `Flake Hunter` (`C:\Users\NITISH\Downloads\Flake Hunter`): 3 sessions (Claude).
7. `ShadowPay-hackathon-registration` (`C:\Users\NITISH\Downloads\ShadowPay-hackathon-registration`): 2 sessions (Codex).
8. `lumina_-imessage-life-os` (`C:\Users\NITISH\Downloads\lumina_-imessage-life-os`): 2 sessions (Cursor).
9. `yoursre---autonomous-ai-sre-for-startups` (`C:\Users\NITISH\Downloads\yoursre---autonomous-ai-sre-for-startups`): 2 sessions (Cursor).
10. `hydradb-1` (`C:\Users\NITISH\Downloads\hydradb-1`): 2 sessions (Cursor).
11. `Debrief` (`C:\Users\NITISH\Downloads\Debrief`): 1 session (Claude).
12. `Sanity` (`C:\Users\NITISH\Downloads\Sanity`): 1 session (Claude).
13. `Yeluru-Nitish` (`C:\Users\NITISH\Downloads\Yeluru-Nitish`): 1 session (Claude).
14. `Patchversion` (`C:\Users\NITISH\Downloads\Patchversion`): 1 session (Antigravity).
15. `PlaylistBid` (`C:\Users\NITISH\PlaylistBid`): 1 session (Cursor).
