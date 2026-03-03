# Jarvis OpenClaw — Restore Guide

**Snapshot taken:** 2026-02-24  
**OpenClaw version:** 2026.2.22-2  
**Host:** Debian 12 (Google Cloud) — 35.238.190.2  
**User:** sam_sandifer1  
**Workspace:** /home/sam_sandifer1/.openclaw/workspace

---

## What's in this folder

| File | Purpose |
|------|---------|
| `openclaw-config.json` | Full OpenClaw config (secrets redacted — must re-enter) |
| `cron-jobs.json` | All scheduled cron jobs with full payloads |
| `codex-config.toml` | Codex CLI config (model + reasoning settings) |
| `workspace-files/` | Core identity and memory files |

---

## Restore Steps

### 1. Install OpenClaw
```bash
npm install -g openclaw@2026.2.22-2
# Or latest:
npm install -g openclaw
```

### 2. Run initial setup
```bash
openclaw configure
```
This creates `/home/sam_sandifer1/.openclaw/` and prompts for API keys.

### 3. Restore config
Copy `openclaw-config.json` to `/home/sam_sandifer1/.openclaw/openclaw.json`.  
Re-insert redacted secrets (marked `__OPENCLAW_REDACTED__`):
- `channels.telegram.botToken` — Telegram bot token
- `tools.web.search.apiKey` — Brave search API key
- `gateway.auth.token` — Gateway auth token
- `auth.profiles.anthropic:default` — Anthropic API key (set via `openclaw configure`)

### 4. Restore workspace files
```bash
cp workspace-files/MEMORY.md /home/sam_sandifer1/.openclaw/workspace/MEMORY.md
cp workspace-files/SOUL.md /home/sam_sandifer1/.openclaw/workspace/SOUL.md
cp workspace-files/USER.md /home/sam_sandifer1/.openclaw/workspace/USER.md
cp workspace-files/IDENTITY.md /home/sam_sandifer1/.openclaw/workspace/IDENTITY.md
cp workspace-files/TOOLS.md /home/sam_sandifer1/.openclaw/workspace/TOOLS.md
cp workspace-files/AGENTS.md /home/sam_sandifer1/.openclaw/workspace/AGENTS.md
cp workspace-files/HEARTBEAT.md /home/sam_sandifer1/.openclaw/workspace/HEARTBEAT.md
```

### 5. Restore Codex CLI
```bash
npm install -g @openai/codex
cp codex-config.toml ~/.codex/config.toml
# Re-authenticate Codex:
codex
# Sign in with ChatGPT account when prompted
```

### 6. Restore cron jobs
Cron jobs are stored in `cron-jobs.json`. Re-create them via OpenClaw after restart.  
The full payloads are preserved — each job can be re-added with:
```bash
openclaw cron add <job-json>
```
Or re-add manually via Jarvis: "Restore cron jobs from backup"

### 7. Re-add GitHub SSH key
```bash
# Key is at ~/.ssh/id_github_jarvis (id_ed25519)
# If lost, generate new key:
ssh-keygen -t ed25519 -C "jarvis-server-github" -f ~/.ssh/id_github_jarvis
# Add public key to GitHub account: https://github.com/settings/keys
# Ensure ~/.ssh/config has:
# Host github.com
#   HostName github.com
#   User git
#   IdentityFile ~/.ssh/id_github_jarvis
```

### 8. Start OpenClaw
```bash
openclaw gateway start
```

---

## Key Context After Restore

- **Telegram:** Sam's ID = 849519235 | Jarvis CRM group = -1003638630016
- **Primary model:** anthropic/claude-sonnet-4-6
- **Codex model:** gpt-5.3-codex (high reasoning)
- **CRM app:** https://www.mro-ai.com (PROD deployment)
- **PROD Convex:** determined-shepherd-510
- **Sam's PROD user ID:** user_38zpVhwEhcm5FMuIKwSXwa2JHlP
- **Sam's PROD org ID:** org_391lvpeLN3mKDYMZ4T1mcKX5i8d
- **Athelon repo:** git@github.com:Samdifer/Athalon-Open-Claw.git
