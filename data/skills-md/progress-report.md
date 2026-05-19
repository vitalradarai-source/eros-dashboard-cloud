# /progress-report — Plain-English 24-Hour Recap to Google Drive

Generates an easy-to-understand progress report covering everything Claude/EROS did in the **last 24 hours**, and saves it to Google Drive as a new doc in the same parent folder as the daily Claude Progress docs.

**Doc title:** `Claude Progress Report — MM-DD-YY` (e.g. `Claude Progress Report — 05-14-26`)
**Drive folder:** `March - April Claude Code Task` (ID `1RmGJ0ND1eTfGk2b9yzInwpIpNdpGUtfO`)
**Audience:** Angelo — written so a non-technical reader (a friend, a stakeholder, future-Angelo skimming on the phone) can understand what happened without needing to read code.

---

## When to run

- After a `/eros-day` session ends and Angelo wants a quick recap
- Anytime Angelo asks "what did we do today" / "send me a progress report"
- Standalone — does NOT require /eros-day to have run first

Re-running the same day **updates in place** (doc ID + revision history preserved). Safe to run multiple times.

---

## Three required sections — every report

The doc body MUST have exactly these three top-level sections in this order:

1. **✅ Completed** — work that finished in the last 24h. One bullet per item. Plain English, no jargon. Mention the project name. End with a one-line "Why this matters" if non-obvious.
2. **🔄 In Progress** — work started but not finished. Include the next step and roughly when it should ship.
3. **🚧 Blockage** — anything waiting on Angelo, a third party, or an external dependency. Include WHAT is blocked + WHO/WHAT unblocks it. Sorted by urgency.

If a section has nothing to report, write "Nothing today." rather than omitting the section.

---

## Step 1 — Gather inputs (last 24h)

Pull from these sources:

```bash
# Git activity across all Sean-scope workspaces
cd ~/Workspaces && for d in $(ls -d */ | grep -vE "^(ava-workspace|ftmg|cpc|oasis)"); do
  log=$(cd "$d" 2>/dev/null && git log --since="24 hours ago" --pretty=format:"%h|%s" 2>/dev/null)
  [ -n "$log" ] && echo "=== $d ===" && echo "$log"
done

# Learning log (last few entries)
tail -200 ~/Workspaces/angelos-workspace/eros/learning-log.md

# Today's daily report (if /eros-day ran)
LATEST=$(ls -t ~/Workspaces/angelos-workspace/eros/daily-reports/*.md 2>/dev/null | head -1)
[ -n "$LATEST" ] && cat "$LATEST"

# Open blockers
cat ~/Workspaces/angelos-workspace/todo-angelo.md
cat ~/Workspaces/angelos-workspace/eros/todo-eros.md

# ClickUp blocked + pending review
node ~/Workspaces/eros-workspace/scripts/clickup-status-snapshot.mjs 2>/dev/null || true
```

Also draw from this conversation's session memory — Claude knows what was done in this session even if it didn't commit/log.

---

## Step 2 — Translate to plain English

This is the entire point of the skill. Apply these rewriting rules:

| Engineer-speak | Plain English |
|---|---|
| "Refactored authentication middleware" | "Made logging into the dashboard work" |
| "Synced SHARED_KEYS across 11 workspaces" | "Made all sites share one master settings file — easier to update passwords" |
| "Deployed to Cloudflare Pages" | "Made the dashboard live on the public web" |
| "PBKDF2-SHA256 password hashing" | "Set up a secure login system" |
| "Patched fact-check whitelist" | "Stopped the system from falsely flagging real phone numbers as suspicious" |
| "Apply ratio 50% → 100% HEALTHY" | "Now applying twice as much of our SEO research as before" |
| "Cron migration to /eros-day" | "All scheduled jobs now run when Angelo starts a session, not in the background" |

Rules:
- Drop file paths, commit hashes, env var names. Mention them only if Angelo specifically asked.
- Replace acronyms (CF, GSC, GA4, SPA, JWT, PBKDF2) with what they actually do.
- Every bullet starts with a verb (Built, Fixed, Deployed, Set up, Added, Removed).
- Mention the **outcome**, not the implementation. "Made X easier" beats "refactored the X module".
- Keep total length under one screen if possible (~300 words). Bullet density beats prose.

---

## Step 3 — Format the body

Use this template. Save to a temp file then pass to the writer script.

```
Claude Progress Report — <Month DD, YYYY>

Summary
<2–3 sentence overview in plain English of what today was about.>


COMPLETED


<Group by project. Each group: project name on its own line, then bullets.>

ReEnergized
* Built X — why it matters: <one line>
* Fixed Y — why it matters: <one line>

EROS Infrastructure
* ...

Bail-Bond Microsites
* ...


IN PROGRESS


* <Item> — currently <what stage>, expected <when>
* ...


BLOCKAGE


* <Blocked item> — waiting on <Angelo / Lovable / WordPress / etc.>
  To unblock: <one action>
* ...


NEXT SESSION


* <Top 1–3 items queued for next /eros-day or next manual session>
```

**No separator lines.** Section headers stand alone on their own line. Use two blank lines above and below each section header for visual breathing room — the Google Docs renderer treats them as paragraph breaks. Never use `---`, `===`, or other horizontal rule characters in the body — they render literally in Docs and add noise without structure.

---

## Step 4 — Write the doc

```bash
# Write the body to a temp file (Claude assembles the content above)
cat > /tmp/progress-report-body.txt <<'EOF'
<formatted body from Step 3>
EOF

# Create/update the Drive doc
node ~/Workspaces/eros-workspace/scripts/write-progress-report.mjs /tmp/progress-report-body.txt
```

The script:
- Auto-titles `Claude Progress Report — MM-DD-YY` using today's date
- Uses Drive folder `1RmGJ0ND1eTfGk2b9yzInwpIpNdpGUtfO` (same as daily docs)
- Idempotent: same-day re-run updates in place
- Authenticates via `~/Workspaces/eros-workspace/.env` (GOOGLE_CLIENT_ID / SECRET / REFRESH_TOKEN — master shared keys)

Optional: `--date=YYYY-MM-DD` to backfill a prior day.

---

## Step 5 — Report back to Angelo

After the script runs, surface:
- ✅ Created / Updated `Claude Progress Report — MM-DD-YY`
- URL: `https://docs.google.com/document/d/<id>`
- One-sentence summary of the three section counts: e.g. "8 completed, 2 in progress, 3 blocked."

Do NOT email it. Angelo opens the doc directly.

---

## Hard rules

- **No code blocks, no commit hashes, no file paths in the doc body** (unless Angelo asked specifically). The doc is for humans, not for me.
- **Three sections always:** Completed / In Progress / Blockage. If empty, say "Nothing today."
- **No separator lines.** Never use `---`, `===`, or any other horizontal rule characters. Section headers stand alone with blank lines above and below. Set 2026-05-18 after Angelo flagged separators as visual noise.
- **24-hour window** — older work belongs in the daily Claude Progress doc, not here.
- **Never send via email** — global rule says emails go only to 4434lifeline@gmail.com via /eros-day Phase 6. /progress-report is a Drive doc only.
- **One report per day** — re-running updates the existing doc, never creates duplicates.

---

## Relationship to other skills

| Skill | What it does | Audience |
|---|---|---|
| `/eros-day` Phase 8 → daily Claude Progress doc | Technical full-detail recap, project-organized | Future EROS (machine) |
| `/progress-report` (this skill) | Plain-English layman summary, 24h scope | Angelo + non-technical readers |
| `/eros-report-check` | Audits the /eros-day report quality | EROS self-improvement |

Both progress docs live in the same Drive folder so Angelo can scan history in one place.
