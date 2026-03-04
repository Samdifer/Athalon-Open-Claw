# MEMORY.md — Jarvis Long-Term Memory

Last updated: 2026-02-19

## Who is Sam
- CEO and aviation SME — private charter + Part 145 maintenance
- Based in Denver, works in UTC timezone
- Email: samdifer1@gmail.com
- Telegram ID: 849519235
- GitHub: Samdifer
- Noob with SSH/terminal — always explain step by step, copy-paste ready
- Wants concise executive-ready responses, no filler

## Infrastructure
- Jarvis VM: Debian 12, Google Cloud, IP: 35.238.190.2, user: sam_sandifer1
- OpenClaw: 2026.2.17
- Workspace: /home/sam_sandifer1/.openclaw/workspace
- CRM Repo: Freelance-Management-Active (GitHub)
- CRM App: https://www.mro-ai.com (Convex backend, deployment: freelance-os)
- Sam's laptop SSH key fingerprint: SHA256:ANvh/N0... (sam-laptop), laptop IP: 73.3.225.222

## Hard Rules
1. NEVER commit/merge to main without Sam's explicit approval
2. Sonnet 4.6 default; Opus for heavy thinking
3. No external sends (email, public posts) without approval
4. Research projects use `Research:` prefix trigger
5. CR/Bug/Feature prefix triggers product-ops curation

## Active Systems Built
- Security: SSH hardening + fail2ban + UFW firewall + hourly SSH alerts
- Research system: structured project folders, REQUEST_LOG, RQIA agent, auto-scaffolding
- Product ops: change request board, roadmap, curator agent
- Token visibility: capacity reports, daily digest, hourly alerts
- CRM integration: Convex connected, import runbook, ops/convex-noob-guide.md
- Sam's real Clerk user ID: user_38rzl2PApxF94PpBiilEcGCJyPt (ALWAYS use for CRM imports)
- "AVLY Aviation" in app header = account profile name only, NOT a Clerk org. Sam uses personal Clerk context (no org_id)
- Live app uses DEV deployment (sincere-sheep-607) — `npx convex run` (no flags) = correct
- `npx convex deploy` targets PROD (determined-shepherd-510) — NOT live; use `npx convex dev --once` to push to live
- Org ID org_38uMfXtRrMecbGI8bAvPZf0dEvl exists but is only for E2E test data (different user), not Sam's real data
- Sam has a "Avly Aviation" Clerk org visible in account settings — org_id is org_38uMfXtRrMecbGI8bAvPZf0dEvl. This org has 59 companies and 60 contacts but they appear to be E2E/test data. Sam's real contacts use personal ownerId (user_38rzl2...). If Sam switches to org context in Clerk, he sees a different dataset. Always import to personal context (user_38rzl2PApxF94PpBiilEcGCJyPt)
- CONFIRMED 2026-02-19: Sam's WORKING context at mro-ai.com is the Avly Aviation ORG (org_38uMfXtRrMecbGI8bAvPZf0dEvl). Personal account shows 0 contacts. ALL imports must use org identity: {"subject":"user_38rzl2PApxF94PpBiilEcGCJyPt","org_id":"org_38uMfXtRrMecbGI8bAvPZf0dEvl"}
- FINAL CORRECTION 2026-02-19: mro-ai.com uses PROD deployment (determined-shepherd-510), NOT DEV. Sam's PROD user ID: user_38zpVhwEhcm5FMuIKwSXwa2JHlP. Sam's PROD org ID: org_391lvpeLN3mKDYMZ4T1mcKX5i8d. ALL imports for live app must use: --prod --identity '{"subject":"user_38zpVhwEhcm5FMuIKwSXwa2JHlP","org_id":"org_391lvpeLN3mKDYMZ4T1mcKX5i8d"}'

## Telegram Group
- "Jarvis CRM" group: -1003638630016 (CRM-dedicated channel)
- Status: outbound working, inbound routing fix applied 2026-02-19, pending final verification

## Flock Safety Competitive Intel (2026-02-21)
- 10 research teams + 2 Opus syntheses completed
- MASTER-FLOCK-SAFETY-ANALYSIS.md (~43KB) + MASTER-SECURITY-RISK-GUIDE.md (~72.5KB)
- Location: competitive-intel/research/flock-safety/ and flock-safety-security/
- Key: $7.5B valuation, 22 CVEs, hardcoded pw `flockhibiki17` (CVSS 9.8), Patent US11,416,545 (race/ethnicity tracking)
- **Pending**: Sam must choose GitHub repo for competitive-intel/ push (same AVLY-VENTURE-RESEARCH or new AVLY-competitive-intel?)

## ALPR + Meshtastic Project (2026-02-21) — COMPLETED
- Full system designed, verified, documented
- Recommended build: RPi 5 8GB + RPi AI HAT+ 13T (Hailo-8L) + EmpireTech Z12E-S2 camera + Heltec V4 LoRa
- LoRa preset: SHORT_FAST (SF7/250kHz, ~10.9kbps) legal everywhere; SHORT_TURBO (500kHz) US-only
- Key correction: Hailo-8L (13T) does NOT run TAPPAS ALPR — use fast-alpr (ONNX). TAPPAS needs 26T
- Alert packet: 16-byte HMAC-SHA-256 hash + GPS + timestamp + camera ID = ~36 bytes packed
- Files: competitive-intel/research/alpr-meshtastic/ (SYSTEM-GUIDE.md v2.0, SYSTEM-BOM.md, HARDWARE-REFERENCE.md)
- GitHub push pending — Sam wants new private repo `AVLY-competitive-intel`; needs PAT to create it

## Athelon Simulation (2026-02-23)
- Simulation workspace: /home/sam_sandifer1/.openclaw/workspace/simulation/athelon/
- Current phase: PHASE 33 (ACTIVE) — gate review pending, lock UNLOCKED
- GitHub repo: git@github.com:Samdifer/Athalon-Open-Claw.git (SSH via ~/.ssh/id_github_jarvis)
- 8 shops live: Skyline (OH), High Desert MRO (AZ), High Desert Air Charter (Part 135), Desert Sky Turbine (AZ), Lone Star Rotorcraft (TX), Rocky Mountain Turbine Service (CO), Ridgeline Air Maintenance (NV), High Plains Aero & Charter (Pueblo CO — Lorena Vásquez, 8th shop, King Air B200, Part 145+135)
- Athelon build plan: athelon-build-plan/ — 152 FEATs, 20 sprints, 40 weeks; Corridor + EBIS 5 gap analysis complete
- Watchdog cron ID: 4649f08c — enabled, 8-min interval, 120s timeout, reads first 80 lines only
- Phase 34 candidate: Paul Kaminski (Dale Renfrow referral)
- Commits needed: Phases 32-33 not yet pushed to GitHub

## OpenClaw
- Updated to 2026.2.22-2 on 2026-02-23
- commands.restart=true enabled in config
- SSH alert + token cron jobs switched to Sonnet (was Opus)

## GitHub SSH
- Account-level key: jarvis-server-github (id_ed25519 fingerprint SHA256:fwpZ/...)
- SSH config: Host github.com → ~/.ssh/id_github_jarvis (new key, added 2026-02-23)
- Old deploy key on Freelance-Management-Active still exists (different key)

## Key Pending Items
- Create GitHub repo `avlydevelopment/AVLY-competitive-intel` (private) — needs GitHub PAT from Sam
- Commit all competitive-intel/ files once repo created
- Verify Jarvis CRM Telegram group inbound routing
- Brave API key for web_search
- Gmail API for email integration
- Install OpenClaw on Sam's Mac for Browser Relay + LinkedIn access
- Push Athelon simulation Phases 32-33 to GitHub (git@github.com:Samdifer/Athalon-Open-Claw.git)
