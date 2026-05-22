---
description: Refresh the ReEnergized "Weekly Revenue by Attribution" Google Sheet from latest ClubReady Payment Transactions + Prospect List exports. Rebuilds weekly/monthly/quarterly/YTD pivots × all/member/non-member, restyles tabs, regenerates charts, and reconciles totals against raw CSV before emailing a PASS/FAIL summary.
---

# /update-revenue-attribution — Weekly Revenue by Attribution Refresh

Single entry point for refreshing the "Weekly Revenue by Attribution" workbook. Built 2026-05-21.

**Sheet:** https://docs.google.com/spreadsheets/d/1Dsu4eyLIfIr7YGrDK5DxbRGeX4r5R8y3k3XxTrWwqIY
**Folder:** https://drive.google.com/drive/folders/1nZVPf5CWvL24ZbtXDVeI6uYrP0by1t09 ("Weekly Revenue by Attribution", sibling of "ReEnergized — April 2026 Tasks")
**Auth:** 4434lifeline@gmail.com via `GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN` in `~/Workspaces/reenergized/.env`
**Working dir:** `~/Workspaces/reenergized/weekly-revenue-by-attribution`

---

## Required input files in ~/Downloads/

| Role | Filename pattern | Source | Refresh cadence |
|---|---|---|---|
| Payments (money truth) | `Payment Transactions 14389 - 1-1-2024 - <today>.csv` | ClubReady → Reports → Payment Transactions (FULL RANGE from 1/1/2024) | Weekly |
| Prospects (attribution truth) | `<MM_DD_YY> LeadsExport.xlsm - Prospect List (N).csv` | ClubReady → Reports → Prospects → save .xlsm Prospect List tab as CSV | Weekly |
| Referrals report (optional cross-check) | `Referrals 14389 - <start> - <end>.csv` | ClubReady → Reports → Referrals (any range) | Optional |
| KPI Score Card (layout reference, no refresh needed) | `KPI's - Score Cards - Weekly KPIs.csv` | — | One-time |

**CRITICAL — Payments file:** must be FULL RANGE (1/1/2024 → today). Partial exports lose history.

**Prospect List:** the LeadsExport `.xlsm` has a "Prospect List" tab containing Angelo's manually-edited Referral Type column. Always re-export this when running the refresh — otherwise newly-added leads have no attribution and pile up in the "Unattributed (Pre-Tracking)" bucket.

---

## Usage

### Default (auto-detect newest)
User: `/update-revenue-attribution`

EROS:
1. `ls -t ~/Downloads/` to find newest file matching each pattern.
2. Print the chosen filenames + ask Angelo to confirm.
3. Wait for "go" before running.

### With explicit filenames
User: `/update-revenue-attribution payments=Payment Transactions 14389 - 1-1-2024 - 5-21-2026.csv prospects=02_20_26 LeadsExport.xlsm - Prospect List (2).csv`

---

## Phase 0 — Pre-flight

1. `cd ~/Workspaces/reenergized/weekly-revenue-by-attribution`
2. Verify env keys: `grep -E "^GOOGLE_" ~/Workspaces/reenergized/.env | sed 's/=.*/=SET/'`
3. Verify both input files exist:
   ```bash
   ls ~/Downloads/ | grep -E "Payment Transactions 14389|LeadsExport.*Prospect List"
   ```
4. If filenames differ from the previous run, update the `PAYMENTS_CSV` / `PROSPECTS_CSV` constants at the top of `build-weekly-revenue.py` (lines ~22-24).

---

## Phase 1 — Local ETL (1,264+ rows → JSON snapshots)

```bash
python3 build-weekly-revenue.py
```

What it does:
- Parses payments, classifies each row as `Member` or `Non-Member` from `InvoiceDescription` (rules in script header).
- Parses prospects, normalizes 16 raw referral values into canonical buckets (`Google`, `Google Organic`, `Google Ads`, `GBP`, `Friend or Family`, `Yelp`, `ReEnergized Employee`, `ClassPass`, `Noticed The Club`, `Social — Instagram/Facebook/TikTok/YouTube/LinkedIn`, `Conference`, `Groupon`, `Dr Referral`, `Direct Mail`, `Stress Relief Gift Card`, **`Unknown API`** = the Website/Phone funnel via CTM + PerformanceIQ Book Now).
- Left-joins payments → prospect attribution by full name. Unmatched rows get **`Unattributed (Pre-Tracking)`**.
- Persists `data/raw_payments.json`, `data/raw_prospects.json`, `data/attribution_map.json`, `data/tables.json`.

**Phase 1 gate (HALTS if fails):**
- ✅ Row count = expected (currently 1,264 — will grow each week).
- ✅ Total $ = expected (currently $235,757.54 — will grow).
- ✅ Member + Non-Member = 100% (zero `Unknown` revenue_type — every InvoiceDescription must classify).

If the gate fails with new `Unknown` InvoiceDescription values, add a pattern to `MEMBER_PATTERNS` or `NONMEMBER_PATTERNS` (top of script) and re-run.

**Phase 2 gate (also runs inside the same script):**
- ✅ Every pivot sum ties to raw total (12 pivots: weekly/monthly/quarterly/YTD × all/member/non_member).
- ✅ `weekly_member[w] + weekly_non_member[w] = weekly_all[w]` for every week.

---

## Phase 3 — Drive folder + Sheet population (17 tabs)

```bash
node create-sheet.mjs
```

Idempotent. Reuses the existing folder + sheet (look-up by name), refreshes all 17 base tabs:

| Tab | Purpose |
|---|---|
| README | Methodology, sources, refresh date, attribution coverage caveat |
| Raw_Payments | 1,264+ enriched payment rows (revenue_type, referral_norm) |
| Raw_Prospects | Normalized prospect rows |
| Attribution_Map | name_key → referral_norm (edit here to override attribution) |
| Weekly_All / Weekly_Member / Weekly_NonMember | ISO-week × referral type × $ |
| Monthly_All / Monthly_Member / Monthly_NonMember | YYYY-MM × referral × $ |
| Quarterly_All / Quarterly_Member / Quarterly_NonMember | YYYY Qn × referral × $ |
| YTD_All / YTD_Member / YTD_NonMember | Calendar year × referral × $ |
| Cross_Check | Reconciliation log (Phase 4 appends to top of this tab) |

After this phase the sheet is populated but PLAIN — no styling, no Dashboard/Charts/Summary tabs.

---

## Phase 4 — Apply styling + add Dashboard/Charts/Summary tabs

```bash
node style-and-charts.mjs
```

Idempotent. Wipes existing bandings/CFs/merges/charts first, then re-applies. Adds 3 new tabs and reorders so the final tab order is:

1. **README** (slate)
2. **Dashboard** (purple — hero, scorecards + KPIs)
3. **Charts** (indigo — 5 embedded charts)
4. **Summary** (violet — exec rollup tables)
5. Raw_Payments / Raw_Prospects / Attribution_Map (slate)
6. Weekly_* (blue), Monthly_* (teal), Quarterly_* (green), YTD_* (amber)
7. Cross_Check (red)

Applies universal styling on every data tab:
- Roboto font, navy-900 header row with bold white text
- Frozen header row + frozen first column
- Alternating row banding (white / slate-50)
- Currency format on $ columns, bold amber TOTAL footer
- 3-color heat-map (red → amber → green) on the TOTAL column of every pivot

Embeds 5 charts on the Charts tab:
1. Monthly Revenue — Member vs Non-Member (stacked column)
2. Top 10 Attribution Sources (horizontal bar)
3. Weekly Revenue Trend — last 26 weeks (line)
4. Quarterly Revenue (column)
5. Attribution Mix — Top 8 Sources (donut)

---

## Phase 5 — Read-back verification + email

```bash
node verify-and-email.mjs
```

Reads `Raw_Payments` + all 12 pivot TOTAL columns back from the live Sheet via Sheets API (using `valueRenderOption: 'UNFORMATTED_VALUE'` — currency format would otherwise return display strings), reconciles against raw CSV totals, runs 17 checks:

- ✅ Raw_Payments row count = expected
- ✅ Raw_Payments $ total = expected
- ✅ Member + Non-Member = Total
- ✅ Each of 12 pivot TOTAL-column sums = expected (per slice)

Appends a verification block to the top of **Cross_Check**. Emails Angelo at 4434lifeline@gmail.com with the result. If any check fails, subject is prefixed `[FAIL]`.

---

## All-in-one shortcut

```bash
cd ~/Workspaces/reenergized/weekly-revenue-by-attribution && \
  python3 build-weekly-revenue.py && \
  node create-sheet.mjs && \
  node style-and-charts.mjs && \
  node verify-and-email.mjs
```

---

## After successful run, EROS reports

1. **Totals** — new row count, new $ total (deltas vs prior week from a saved `last-run-totals.json` if present).
2. **Top movers** — which attribution buckets grew week-over-week.
3. **Attribution coverage** — name-match rate (% rows / % $) and the "Unattributed (Pre-Tracking)" pool size. If <50% coverage, flag.
4. **Member share** — Member % of total revenue and per-quarter trend.
5. **Cross-check status** — 17/17 PASS or list failing checks.
6. **Sheet URL** for Angelo to open.

---

## Gotchas / known quirks

- **Filename suffix `(N)`**: ClubReady appends `(1)`, `(2)`, etc. on re-download. `ls -t` returns newest first by mtime, which is reliable. Don't rely on the highest number.
- **Prospect List export date is the cutoff**: any payment whose payer name doesn't match a prospect added before the export date lands in `Unattributed (Pre-Tracking)`. Each weekly refresh REQUIRES a fresh prospect-list export to shrink this bucket.
- **"Unknown API" is the website/phone funnel** — NOT noise. Leads via CallTrackingMetrics phone tracking + PerformanceIQ Book Now web form. Treat as a primary channel.
- **Sheets API quirks** (see [[sheets-api-quirks]] memory):
  - `legendPosition: 'NO_LEGEND'`, not `'NONE'`.
  - BAR chart series target `BOTTOM_AXIS`, COLUMN/LINE target `LEFT_AXIS`.
  - LINE charts must NOT have a `stackedType` field.
  - `values.get` returns formatted display strings; pass `valueRenderOption: 'UNFORMATTED_VALUE'` when summing.
  - `addBanding` errors on re-run — delete existing bandings/CFs/merges first.
- **Quota**: Sheets read quota = 60/min/user. The script batches all reads into ONE `values.batchGet` to stay under. If you ever hit `RESOURCE_EXHAUSTED`, wait 70s and re-run — fully idempotent.
- **Phase 1 unknown InvoiceDescription**: if ClubReady adds a new product type, Phase 1 gate will halt and print the offender. Add a regex to `MEMBER_PATTERNS` or `NONMEMBER_PATTERNS` at the top of `build-weekly-revenue.py` and re-run.
- **Email rule**: Phase 5 only sends to 4434lifeline@gmail.com. Never to third parties (see [[email-send-only-to-angelo]]).

---

## File layout

```
~/Workspaces/reenergized/weekly-revenue-by-attribution/
├── PLAN.md                              ← Original plan (v1)
├── PLAN-V2-website-phone-attribution.md ← Plan for splitting CTM vs Book Now (deferred)
├── build-weekly-revenue.py              ← Phase 1+2 ETL + pivots
├── create-sheet.mjs                     ← Phase 3 Sheet population
├── style-and-charts.mjs                 ← Phase 4 styling + Dashboard/Charts/Summary
├── verify-and-email.mjs                 ← Phase 5 verification + email
├── weekly-revenue-by-attribution-info.json ← Folder + Sheet IDs (do not delete)
└── data/
    ├── raw_payments.json
    ├── raw_prospects.json
    ├── attribution_map.json
    └── tables.json
```

---

## Future enhancements (deferred)

See `PLAN-V2-website-phone-attribution.md` for the full plan to split `Unknown API` into:
- **CTM Phone Calls** (CallTrackingMetrics source — Google Ads / Organic / GBP / Direct / Yelp)
- **Book Now Web** (PerformanceIQ form submissions with UTM)

Currently both are bundled as one `Unknown API` bucket. To split, EROS would need either:
- ClubReady Referrals report at wider date range (15 min from Angelo), OR
- CTM CSV/API export (1 day to build), OR
- PerformanceIQ Book Now submission log (half day to build).
