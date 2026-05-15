---
description: Audit the latest EROS Day Final Report for errors and check blog publishing cadence across all sites (Lovable + microsites + ReEnergized). Output prescriptive fixes that get folded back into /eros-day.
---

# /eros-report-check — Report Quality + Cadence Audit

Runs after `/eros-day` to verify the latest daily report is correct AND that the publishing pipeline is actually shipping content. Findings feed back into `/eros-day` improvements.

**When to run:** end of any `/eros-day` session, or anytime Angelo asks for a sanity check on report quality / blog cadence.

**Inputs (all read-only):**
- `~/Workspaces/angelos-workspace/eros/daily-reports/<latest>.md`
- `~/Workspaces/eros-workspace/data/daily/<latest>/` (gsc.json, ga4.json, network-score.json, keyword-priorities.json)
- `~/Workspaces/<main-site>/seo-tasks/<latest>/analysis.json` (per main site)
- `git log` per Lovable repo + microsite

**Output:** structured "report card" written to `~/Workspaces/eros-workspace/data/daily/<today>/report-check.md` AND surfaced inline to Angelo.

---

## Step 1 — Locate latest report

```bash
LATEST_REPORT=$(ls -t ~/Workspaces/angelos-workspace/eros/daily-reports/*.md | head -1)
echo "Auditing: $LATEST_REPORT"
```

Report path is the only authoritative input. If missing, abort with "no report to audit — run /eros-day first".

---

## Step 2 — Error scan (report quality)

Grep for known failure markers. Each hit = a defect to fix in `eros-day-final-report.mjs`.

```bash
grep -niE "undefined|\bnull\b|\bNaN\b|TypeError|Error:|MODULE_NOT_FOUND|^\| 0 \| 0 \| 0 \|" "$LATEST_REPORT"
grep -nE "stale|⚠️|FROZEN|FAIL" "$LATEST_REPORT"
```

**Known historical defects (already fixed — re-flag if they reappear):**
- `undefined` in best-position table → `kwName(k)` helper missing
- `0/0/0/0` rows for main sites → `listSnapshots()` not filtering empty seo-tasks dirs
- microsite section silently dropping rows → `micrositeStanding()` not filtering dirs without `gsc.json`
- "Keyword bank stale" warning persisting → `sync-keyword-bank.mjs` auto-run failed

**Defect classification:**
- **Hard error** (TypeError, MODULE_NOT_FOUND, undefined in tables) → fix `eros-day-final-report.mjs` immediately
- **Soft warning** (stale data, missing snapshot) → diagnose source script, queue fix in `todo-angelo.md`
- **Expected** (FROZEN Lovable rows, planned skips) → no action

---

## Step 3 — Blog cadence audit (per surface)

Three surfaces, three different cadence rules.

### 3a. Lovable main sites (4 repos)

```bash
for repo in cali-bond-swift vital-radar-ai bulllion-dealer boundless-global; do
  echo "=== $repo ==="
  cd ~/Workspaces/$repo 2>/dev/null
  latest=$(git log --since="60 days ago" --pretty=format:"%ai %s" 2>/dev/null | grep -iE "blog|post|article" | head -1)
  echo "  Latest blog commit: ${latest:-NONE in 60d}"
done
```

**Cadence expectation per Path C rotation:** every Lovable site gets a blog every ~3–4 weekdays.

**Verdicts:**
- < 7 days since last blog commit → ✅ HEALTHY
- 7–14 days → ⚠️ SLIPPING
- 14–30 days → 🚨 STALE — flag in next /eros-day Phase 3
- > 30 days → 🚨🚨 STARVED — top of action queue

**Lovable storage gotcha:** VitalRadar articles live in Supabase admin panel, not git. ReEnergized blogs live in WordPress. A 0-commit count is NOT proof of zero publishing — cross-check with the live site or admin panel before declaring starvation. Note this caveat in the report.

### 3b. Microsites (31 with custom domains)

```bash
touch -t $(date -v-14d +%Y%m%d%H%M) /tmp/.14d_marker
cd ~/Workspaces && find . -maxdepth 4 -name "*.html" -path "*/blog/*" -newer /tmp/.14d_marker 2>/dev/null \
  | grep -v node_modules \
  | awk -F/ '{print $2}' | sort | uniq -c | sort -rn
```

**Cadence expectation:** ≥20 sites touched in 14d, ≥30 blog files total.

**Verdicts:**
- ≥20 sites / ≥30 files → ✅ HEALTHY
- 10–19 sites → ⚠️ THIN — Path C rotation may be skipping buckets
- <10 sites → 🚨 BROKEN — investigate rotation calendar

### 3c. ReEnergized (WordPress — Angelo applies manually)

```bash
ls ~/Workspaces/reenergized/blog-drafts/ 2>/dev/null | tail -5
```

Drafts exist but never auto-publish. Cadence verdict is based on draft creation, not live posts. If 0 drafts in 14d → flag for `/eros-day` Phase 4 to draft new content.

---

## Step 4 — Cross-reference rotation expectation vs actual

Path C rotation says today's bucket should have shipped N specific sites. Did they?

```bash
node ~/Workspaces/eros-workspace/scripts/rotation-calendar.mjs --today
# Compare expected list to actual `git log --since=today` per site
```

For each site in today's bucket: ✅ shipped | ⚠️ committed but not deployed | 🚨 untouched.

---

## Step 5 — Data freshness gate

Confirm the inputs feeding the report are fresh:

| Source | Path | Max age |
|---|---|---|
| GSC per-site | `<site>/seo-tasks/<date>/analysis.json` | 24h |
| GSC network | `eros-workspace/data/daily/<date>/gsc.json` | 24h |
| GA4 daily | `eros-workspace/data/daily/<date>/ga4.json` | 24h |
| Network score | `eros-workspace/data/daily/<date>/network-score.json` | 24h |
| Keyword priorities | `eros-workspace/data/daily/<date>/keyword-priorities.json` | 24h |
| Keyword bank sheet | summary.json `lastSync` | 7d |
| Blog links sheet | (sheet last modified) | 7d |

Any source >max-age = ⚠️ in the report card.

---

## Step 6 — Output report card

Write `~/Workspaces/eros-workspace/data/daily/<today>/report-check.md`:

```markdown
# EROS Report Check — <date>

## Errors found
- (list of grep hits with line numbers, classified hard/soft/expected)

## Blog cadence
### Lovable
| repo | last commit | days | verdict |
|---|---|---:|---|

### Microsites
- 14-day total: <N> files / <M> sites — verdict
- (table or top-10)

### ReEnergized
- drafts in 14d: <N> — verdict

## Rotation drift
- Today's expected: [a, b, c]
- Today's actual: [a, c]
- Missed: [b]

## Data freshness
| source | age | status |

## Prescriptive fixes for /eros-day
1. (concrete edit to a phase or script)
2. ...
```

---

## Step 7 — Feed back into /eros-day

Each prescriptive fix in step 6 must result in one of:

- **Edit `~/.claude/commands/eros-day.md`** — add/change a phase step
- **Edit a script** — patch `eros-day-final-report.mjs`, `prioritize-keywords.mjs`, etc.
- **Add a memory** — if the fix is a rule, save to `feedback_*.md` and link in `MEMORY.md`
- **Open ClickUp task** — if the fix needs Angelo's input (e.g., Lovable Vite prerender)

**Never let an audit finding sit in a doc without a destination.** Every issue → fix or task.

---

## Skip conditions

- No latest report exists → abort, tell Angelo to run /eros-day first
- Today is Saturday or Sunday → cadence audit only, skip rotation drift (no rotation runs weekends)

## Length

Keep the inline summary to Angelo under 200 words. Full detail goes to `report-check.md`.
