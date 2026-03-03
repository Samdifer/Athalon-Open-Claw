# Beginner's Guide: How to Access Your Google Cloud VM

**Your setup:** Debian 12 VM on Google Cloud, username `sam_sandifer1`, SSH key authentication  
**Goal:** Get a terminal on your server so you can run commands

---

## What Is a VM and Why Do I Need to "Access" It?

Your OpenClaw bot lives on a **Virtual Machine (VM)** — basically a computer running in Google's data center. It doesn't have a screen or keyboard attached. To interact with it, you open a **terminal connection** over the internet using something called **SSH** (Secure Shell). Think of it as a remote command line.

Once connected, you'll see something like:

```
sam_sandifer1@your-vm-name:~$
```

That blinking cursor is where you type commands. That's it — you're "in."

---

## Option 1: Google Cloud Console (Easiest — No Setup Required)

This is the fastest way if you've never done this before. It runs right in your web browser.

### Steps:

1. Go to **https://console.cloud.google.com**
2. Sign in with the Google account that owns the VM
3. Click the **hamburger menu** (☰) in the top-left
4. Navigate to **Compute Engine → VM instances**
5. Find your VM in the list
6. Click the **SSH** button on that row

A browser window pops up with a terminal. You're connected. Done.

> **Tip:** This method handles all the authentication for you automatically. No keys, no passwords, no setup. It's the best starting point for beginners.

---

## Option 2: Google Cloud CLI (`gcloud` Command)

If you want to connect from your own computer's terminal (Mac Terminal, Windows PowerShell, or Linux terminal), this is the next easiest method.

### One-time setup:

1. **Install the Google Cloud CLI**
   - Go to: https://cloud.google.com/sdk/docs/install
   - Follow the instructions for your operating system (Mac, Windows, or Linux)

2. **Log in and set your project**

   ```bash
   gcloud auth login
   ```

   This opens a browser window — sign in with your Google account.

   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

   (Find your project ID in the Google Cloud Console at the top of the page)

### Connect every time:

```bash
gcloud compute ssh sam_sandifer1@YOUR_VM_NAME --zone=YOUR_ZONE
```

**Example:**

```bash
gcloud compute ssh sam_sandifer1@my-openclaw-vm --zone=us-central1-a
```

> **To find your VM name and zone:** Go to Compute Engine → VM instances in the Google Cloud Console. They're listed right there.

---

## Option 3: Traditional SSH Client (For the More Comfortable)

This is what experienced users do, but it requires you to have an SSH key pair set up (your audit shows one key is already configured).

### From Mac or Linux:

```bash
ssh sam_sandifer1@YOUR_VM_EXTERNAL_IP
```

### From Windows:

- **Windows 10/11:** Open PowerShell or Command Prompt and use the same `ssh` command above
- **Older Windows:** Download and use [PuTTY](https://www.putty.org/)

### Finding your VM's external IP:

1. Google Cloud Console → Compute Engine → VM instances
2. Look for the **External IP** column (something like `34.123.45.67`)

### If it says "Permission denied":

Your VM requires SSH **key** authentication (passwords are disabled). This means:

- You need the private key that matches the public key on the server
- If you set this up via Google Cloud Console SSH before, Google may have placed keys in `~/.ssh/google_compute_engine` on your local machine

```bash
ssh -i ~/.ssh/google_compute_engine sam_sandifer1@YOUR_VM_EXTERNAL_IP
```

If you don't have the key, use **Option 1 or Option 2** instead — they handle keys automatically.

---

## Once You're Connected: Now What?

You'll be at a command prompt. Here are the first commands to run from the troubleshooting guide:

```bash
# Check if OpenClaw is running
systemctl status openclaw.service

# Get OpenClaw's full status
openclaw status --deep

# Check Telegram channel health
openclaw channels status --probe

# Check for pending pairing requests
openclaw pairing list telegram

# Watch live logs (press Ctrl+C to stop)
openclaw logs --follow
```

---

## Essential Terminal Survival Commands

| What you want to do | Command |
|---|---|
| See where you are | `pwd` |
| List files here | `ls` |
| Go to home folder | `cd ~` |
| Clear the screen | `clear` |
| Stop a running command | `Ctrl + C` |
| Scroll up in output | `Shift + Page Up` (or scroll with mouse) |
| Disconnect from the VM | `exit` or `Ctrl + D` |
| Run something as admin | `sudo your-command` |
| See previous commands | `history` |
| Search previous commands | `Ctrl + R` then start typing |

---

## Tips and Gotchas

- **Copy/paste in the browser SSH terminal:** `Ctrl+C` / `Ctrl+V` works normally in the Google Cloud Console SSH window. In some terminals, you may need `Ctrl+Shift+C` / `Ctrl+Shift+V` or right-click to paste.

- **If your connection drops:** Just reconnect. Nothing breaks. Your VM keeps running independently of your SSH session.

- **If you want commands to keep running after you disconnect:** Use `screen` or `tmux`:

  ```bash
  # Start a persistent session
  screen -S openclaw-logs

  # Run your command
  openclaw logs --follow

  # Detach without stopping it: press Ctrl+A, then D

  # Reconnect later
  screen -r openclaw-logs
  ```

- **Don't panic about breaking things:** Reading status, checking logs, and listing configurations are all safe read-only operations. You'd have to explicitly run destructive commands to cause problems.

---

## Recommended Path

**If this is your first time:** Use **Option 1** (Google Cloud Console browser SSH). Click the button, get a terminal, start running the diagnostic commands. No installs, no keys, no config. You can graduate to the other methods later.
