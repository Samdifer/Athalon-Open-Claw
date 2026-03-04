# OpenClaw Telegram Troubleshooting Guide

**Issue:** Bot is silent — does not respond to Telegram messages  
**Environment:** Debian 12, Google Cloud VM, OpenClaw with Telegram integration enabled  
**Date:** February 24, 2026

---

## Phase 1: Confirm OpenClaw Is Running and Healthy

Run these commands via SSH on your VM as your `sam_sandifer1` user.

### 1.1 Check the OpenClaw service

```bash
systemctl status openclaw.service
```

You want to see **active (running)**. If it's stopped or failed, restart it:

```bash
sudo systemctl restart openclaw.service
```

### 1.2 Check OpenClaw status

```bash
openclaw status
```

Then for deeper diagnostics:

```bash
openclaw status --deep
```

**What to look for:**
- Telegram should show `ON | OK | polling` — this means the bot is connected and listening.
- If it shows `SETUP | no token`, the bot token isn't loaded (see Phase 2).
- If it shows `OFF | not configured`, the channel config is missing or broken.

### 1.3 Check channel status specifically

```bash
openclaw channels status
openclaw channels status --probe
```

The `--probe` flag runs live checks against Telegram's API to verify credentials and connectivity.

---

## Phase 2: Verify the Bot Token

A wrong, expired, or revoked token is the #1 cause of a silent bot.

### 2.1 Check what token OpenClaw has

```bash
openclaw config get channels.telegram
```

Confirm `botToken` is present and masked.

### 2.2 Validate the token directly against Telegram's API

Replace `<YOUR_BOT_TOKEN>` with your actual token:

```bash
curl -s "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe"
```

**Expected good response:**
```json
{"ok":true,"result":{"id":123456,"is_bot":true,"first_name":"YourBot",...}}
```

**If you get `{"ok":false,"error_code":401}`:**
- The token is invalid or revoked.
- Go to Telegram → @BotFather → `/mybots` → select your bot → **API Token** → generate a new one.
- Update it:

```bash
openclaw config set channels.telegram.botToken "NEW_TOKEN_HERE"
openclaw gateway restart
```

Or set via environment variable in `~/.openclaw/.env`:

```
TELEGRAM_BOT_TOKEN=NEW_TOKEN_HERE
```

---

## Phase 3: Check Logs for Errors

This is the most informative step. Run this and then send a message to your bot on Telegram:

```bash
openclaw logs --follow
```

**Common log patterns and what they mean:**

| Log message | Meaning | Fix |
|---|---|---|
| `HttpError: Network request for 'sendMessage' failed` | Can't reach Telegram API (likely IPv6 issue) | See Phase 5 |
| `sendChatAction` failures | Same network issue | See Phase 5 |
| `401 Unauthorized` | Bad/expired token | See Phase 2 |
| `setMyCommands failed` | Outbound DNS/HTTPS blocked | Check DNS and firewall |
| `Pairing request from...` | Bot received your message but needs pairing approval | See Phase 4 |
| No Telegram-related logs at all | Channel isn't starting | Check config structure (Phase 2) |

---

## Phase 4: Check DM Policy and Pairing

OpenClaw's default Telegram DM policy is **pairing** — the bot won't respond until you approve yourself.

### 4.1 Check pending pairing codes

```bash
openclaw pairing list telegram
```

If you see a pending code, approve it:

```bash
openclaw pairing approve telegram <CODE>
```

Pairing codes expire after 1 hour. If expired, send a new message to the bot and a fresh code will appear.

### 4.2 Alternative: Switch to allowlist mode

If pairing is frustrating, you can switch to allowlist and add your Telegram user ID directly.

**Find your numeric Telegram user ID** (not your @username):

```bash
# After sending a DM to the bot:
openclaw logs --follow
# Look for "from.id" in the log output
```

Or use Telegram's `@userinfobot` — DM it and it replies with your numeric ID.

**Then configure:**

```bash
openclaw config set channels.telegram.dmPolicy "allowlist"
openclaw config set channels.telegram.allowFrom '["YOUR_NUMERIC_ID"]'
openclaw gateway restart
```

> **Important:** `allowFrom` requires **numeric Telegram user IDs**, not `@usernames`. If your config has `@username` entries, run `openclaw doctor --fix` to resolve them.

---

## Phase 5: Check Network / IPv6 Issues

This is a common gotcha on Google Cloud VMs. If `api.telegram.org` resolves to IPv6 first and your VM doesn't have working IPv6 egress, the bot silently fails.

### 5.1 Test DNS resolution

```bash
dig +short api.telegram.org A
dig +short api.telegram.org AAAA
```

If you get AAAA (IPv6) records and your VM can't route IPv6:

### 5.2 Test actual connectivity

```bash
curl -v https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe
```

Watch if it hangs on connection — that indicates IPv6 routing failure.

### 5.3 Force IPv4 for Telegram API

Add an entry to `/etc/hosts` using the IPv4 address:

```bash
# Get the IPv4 address
dig +short api.telegram.org A
# Example output: 149.154.167.220

# Add to /etc/hosts
sudo sh -c 'echo "149.154.167.220 api.telegram.org" >> /etc/hosts'
```

Then restart OpenClaw:

```bash
sudo systemctl restart openclaw.service
```

---

## Phase 6: Check Google Cloud Firewall Rules

Your audit noted no host firewall (`ufw`/`nft`), so your VM relies entirely on Google Cloud VPC firewall rules. OpenClaw needs **outbound HTTPS (port 443)** to reach `api.telegram.org`.

### 6.1 Verify outbound connectivity

```bash
curl -I https://api.telegram.org
```

If this times out, your VPC firewall may be blocking outbound traffic. Check in Google Cloud Console:
- Go to **VPC Network → Firewall rules**
- Ensure there's an **egress allow** rule for TCP port 443 (most default VPCs allow all egress)

### 6.2 Verify DNS resolution works

```bash
nslookup api.telegram.org
```

If DNS fails, check `/etc/resolv.conf` and ensure you have working nameservers (Google Cloud default is `169.254.169.254`).

---

## Phase 7: Check for Stale Processes or Old Installations

If you migrated from Clawdbot or Moltbot, old gateway processes could conflict.

```bash
# Check for any old processes
ps aux | grep -E '(moltbot|clawdbot|openclaw).*gateway'

# Stop old instances if found
clawdbot gateway stop 2>/dev/null
moltbot gateway stop 2>/dev/null

# Restart OpenClaw cleanly
sudo systemctl restart openclaw.service
```

---

## Phase 8: Run the Built-In Doctor

OpenClaw has a diagnostic tool that catches many common misconfigurations:

```bash
openclaw doctor
```

To auto-fix what it can:

```bash
openclaw doctor --fix
```

This will resolve issues like `@username` entries in `allowFrom`, legacy config keys, and plugin state problems.

---

## Quick Reference: Recommended Diagnostic Order

Run these in sequence and note the output of each:

```bash
# 1. Is OpenClaw running?
systemctl status openclaw.service

# 2. What does OpenClaw think its status is?
openclaw status --deep

# 3. Is Telegram specifically healthy?
openclaw channels status --probe

# 4. Are there pending pairing requests?
openclaw pairing list telegram

# 5. Can we reach Telegram?
curl -s "https://api.telegram.org/bot<TOKEN>/getMe"

# 6. Watch live logs while sending a test message
openclaw logs --follow
```

---

## Useful Links

- **OpenClaw GitHub repo:** https://github.com/openclaw/openclaw
- **Official Telegram channel docs:** https://docs.openclaw.ai/channels/telegram
- **Channel troubleshooting:** https://docs.openclaw.ai/channels/troubleshooting
- **OpenClaw releases:** https://github.com/openclaw/openclaw/releases
- **Known Telegram bugs (recent):**
  - Plugin not available on fresh install: https://github.com/openclaw/openclaw/issues/24551
  - Token not detected despite valid config: https://github.com/openclaw/openclaw/issues/23646

---

*If after running through all phases the bot is still silent, share the output of `openclaw status --deep` and `openclaw logs --follow` (with any tokens redacted) for further diagnosis.*
