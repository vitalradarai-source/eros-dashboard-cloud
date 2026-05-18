---
description: Generate the weekly bail-bond network report. Always comprehensive S→D. New sheet tab per ISO week (additive history). Time-period comparisons (current month / previous month / last 3 / last 6 / YTD). Email matches the original UPDATED-findings template.
---

# /bail-reports

Generate this week's bail-bond network snapshot.

## Always comprehensive — no tier focus

Every run produces:

1. **Email** to `4434lifeline@gmail.com` — same comprehensive template as the original "UPDATED findings" report:
   - Total bail-bond site count from Lee's / Dan's / Lonnie's / Angelo's lists
   - Multi-layer probe status table (Live / Truly dead / Server problems / Redirects / Misconfigured)
   - Performance across the last 90 days
   - **Time-period comparison: current month / previous month / last 3 months / last 6 months / YTD**
   - Score breakdown S→D with delta vs previous weekly tab
   - A-tier site callouts
   - Hosting breakdown
   - Decommission shortlist with estimated savings
   - "What to do this week" — 5 ranked tasks
   - Going-forward cadence
   - Where everything lives

2. **Google Sheet — new tab `Report YYYY-Www`** (ISO week):
   - Full S→D per-tier breakdown with every domain listed
   - Time-period comparison section (network totals across 5 windows)
   - HTTP health table
   - Hosting breakdown
   - Top 10 by score
   - Decommission shortlist with renewal cost
   - **Never overwrites prior weekly tabs** — additive history for week-over-week comparison

## Relationship to /eros-day

`/eros-day` (the daily operational session) **references** /bail-reports output in Phase 0 (stale-data check) and Phase 8 (final-report section #20: "Bail-Bond Network Snapshot"). It does NOT auto-trigger /bail-reports.

- **Daily**: /eros-day reads the latest `master-domain-inventory-scored.json` and surfaces tier counts + decom count + sheet link.
- **Weekly (Mondays)**: /eros-day Phase 1 reminds Angelo to run /bail-reports manually. That's the trigger.
- **Monthly (first Monday)**: full refresh — run all phases (HTTP probe + GSC multi-window + scoring + action plan + report).
- **Other times**: `/bail-reports` reuses the latest cached data (no fresh probe / GSC pull) so it returns in seconds.

This separation keeps daily /eros-day fast (no 30-min full-refresh on every session) while keeping the weekly bail-network snapshot timely.

Memory: `feedback_eros_day_bail_reports_integration.md`.

## What to do

Run the pipeline (refresh data, then build report):

```bash
cd ~/Workspaces/test-1-bail-bond

# 1. Refresh probe (only if data is stale or first-of-month)
node scripts/phase2-http-probe.mjs
node scripts/phase2.6-multi-layer-probe.mjs

# 2. Refresh GSC (90-day per-site + multi-window network totals)
node scripts/phase2-gsc-pull.mjs
node scripts/phase2-gsc-multi-window.mjs

# 3. Re-roll-up master inventory + scoring
node scripts/rebuild-master-clean.mjs
node scripts/phase3-score.mjs
node scripts/phase4-action-plan.mjs

# 4. Build this week's report (always comprehensive)
node scripts/bail-reports-weekly.mjs

# 5. Sync EROS Dashboard (added 2026-05-15 — MANDATORY)
node ~/Workspaces/eros-workspace/scripts/refresh-bail-tabs-cache.mjs
node ~/Workspaces/eros-dashboard-cloud/scripts/publish-dashboard.mjs
cd ~/Workspaces/eros-dashboard-cloud && git add data && \
  (git diff --staged --quiet || git commit -m "publish: /bail-reports W$(date +%V) refresh" && git push)
cd ~/Workspaces/eros-dashboard && git add bail-tabs-cache.json && \
  (git diff --staged --quiet || git commit -m "cache: refresh bail-tabs after /bail-reports" && git push)
```

For routine weekly runs (data already refreshed today/yesterday), just run steps 4 + 5. Once-a-month, run all five steps for the full refresh.

**Why step 5 is mandatory (added 2026-05-15):** before this fix, `/bail-reports` created the new weekly sheet tab but the EROS Dashboard's tab list was sourced from a stale local cache (`bail-tabs-cache.json`) that was never refreshed automatically. Result: the dashboard kept showing last week's tab as "latest" even after the new one shipped. Step 5 refreshes the cache directly from the Sheets API, then republishes the cloud dashboard data, then commits both repos so CF Pages auto-deploys. Without this step, the dashboard silently lags behind by one week. The refresh script is idempotent — safe to re-run.

## No arguments — comprehensive every time

Previous versions accepted a tier-focus argument. **That's been removed** — every report is comprehensive. The featured-tier emphasis was confusing and made some tiers feel deprioritized.

If you need a deep-dive on a specific tier, use the per-tier section in the new weekly tab — every tier always has its own section with all sites listed.

## Source data

| File | Producer | Purpose |
|---|---|---|
| `dns-audit/master-domain-inventory-scored.json` | phase3-score.mjs | scored master with bucket per domain |
| `dns-audit/http-probe-YYYY-MM-DD.json` | phase2-http-probe + phase2.6 | live / dead / broken classification |
| `dns-audit/gsc-90d-YYYY-MM-DD.json` | phase2-gsc-pull.mjs | 90-day per-site GSC totals |
| `dns-audit/gsc-multi-window-YYYY-MM-DD.json` | phase2-gsc-multi-window.mjs | 5-window network totals |

## Hard rules

- **GSC totals must be reported in THREE separate group aggregations**, never blended:

  | # | Group | Sites | Domain list |
  |---|---|---|---|
  | 1 | **Bail-bond network** | 215 | every domain containing "bail" or "plotkin" — see master inventory. Includes `bailbondsdomesticviolence.com` which overlaps with Sean Sites. |
  | 2 | **Sean Sites (Lovable)** | 4 | `bailbondsdomesticviolence.com` (cali-bond-swift), `vitalradar.ai` (vital-radar-ai), `bulliondealer.com` (bulllion-dealer), `boundlessglobal.com` (boundless-global). |
  | 3 | **ReEnergized** | 1 | `reenergized.com` ONLY. WordPress, **NOT Lovable**. Standalone group. |

  Hard-coded constants in `scripts/bail-reports-weekly.mjs`:
    - `SEAN_SITES_DOMAINS` = the 4 Lovable Sean sites above
    - `REENERGIZED_DOMAIN` = `'reenergized.com'`

  **Earlier versions had three regressions, all now codified to never repeat:**
  - Blended reports inflated bail performance by ~98% — reenergized.com alone was 1,694 of 1,736 YTD clicks (Angelo flagged 2026-05-07).
  - reenergized.com was incorrectly grouped under Lovable — it's WordPress, separated 2026-05-07.
  - GSC's https vs http property duplicates double-counted some domains. `dedupeBestPerDomain()` keeps the entry with the higher last-3-month impressions and discards the lower one.

  Email and sheet must show all three groups separately. Adding a fourth Lovable site? Update `SEAN_SITES_DOMAINS` in the script + this table + the memory file in a single commit.
- **Data source label is mandatory in the email**: every report says "Google Search Console" and explicitly notes "(NOT GA4)". No GA4 data is in the pipeline.
- **A `GSC Bank YYYY-Www` tab must accompany every weekly report tab** — per-site contribution breakdown across all 5 windows (current month, previous month, last 3/6, YTD). Bail / non-bail / "no GSC access" sections separated.
- **Email lists EVERY tier (S/A/B/C/D) with its top sites in the body.** Not just A-tier. Each non-empty tier gets its own section with: count, range, explainer, top 5–8 sites, "plus N more" link. Skipping B/C/D in the email body is a regression — Angelo flagged this 2026-05-07. The only tier that may be omitted is one with 0 sites.
- **Email follows the UPDATED-findings template** (the version Angelo approved).
- **Sheet always shows full S→D** — no skipping tiers.
- **Never overwrite prior weekly tabs** — additive only.
- **Time-period comparison section required**: current month, previous month, last 3 months, last 6 months, YTD.
- **bail-bonds.com is WordPress** (memory `feedback_bailbonds_com_is_wordpress.md`). Don't propose Cloudflare-side fixes for it.
- Email goes only to `4434lifeline@gmail.com` (global rule).
- **No tier-focus arguments.** Removed 2026-05-07. Every report is comprehensive.
