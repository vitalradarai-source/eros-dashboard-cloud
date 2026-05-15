---
description: Cross-source data reconciliation. Compares two or more sources (QB Profit & Loss, QB Transaction Detail, BigQuery, Looker Studio, ClubReady) and produces a Google Sheet + email summarizing where the numbers don't agree and why. Read-only — never modifies the active pipeline.
---

# /analyze-data — Cross-Source Reconciliation Skill

EROS uses this when Sean / Sophie / Angelo say "the numbers don't add up" or ask EROS to verify that two systems agree. The skill is **read-only** — it never touches `jt-full-refresh.mjs`, never edits BQ tables, never modifies the Looker dashboard. It only reads, compares, and reports.

Built 2026-05-07 from the QB ↔ BQ ↔ Looker reconciliation pattern.

---

## When to use it

- Sophie / Sean / Angelo says: "QuickBooks doesn't match Looker", "the dashboard is wrong", "this expense looks too high/low"
- Cross-checking ClubReady revenue against QuickBooks Income
- Verifying BigQuery `prod.*` tables against the source files that feed them
- Any time you need to prove WHY two views of the same business diverge

---

## What it produces

1. **Drive folder** under the existing ReEnergized folder (`1_zcqMjqt1fabeGRTt0Ju-F0YAwtx_UXx`) — keeps all reconciliation work in one place
2. **Google Sheet** with these tabs:
   - `README` — methodology + how to read
   - `Headline Summary` — exec view: monthly variance per source
   - `Expense Reconciliation` — month-by-month gap, with COGS vs Expense handled separately
   - `Expense by Account` — per-account drill-down, all months side-by-side
   - `Revenue Reconciliation` — Income side
   - `Raw P&L Data` / `Raw BQ Expenses` / `Raw BQ stg QB` / `Raw CR Payments` / `Raw CR Daily TX` — flat data behind every comparison
   - `Root Cause Hypotheses` — 8 specific theories per discrepancy with evidence + verification steps
   - `Source Files Manifest` — provenance: which file feeds which row
3. **Email to `4434lifeline@gmail.com` only** — never to third parties (Sean / Sophie / Zach)

---

## Sources EROS knows how to compare

| Source | Where it lives | What it represents |
|---|---|---|
| QuickBooks **Profit and Loss** (`.xlsx`) | `~/Downloads/Profit and Loss*.xlsx` (one per month) | What Sean & Sophie review — calendar-snapshot, summary view |
| QuickBooks **Transaction Detail by Account** (`CSV Output (N).xlsx`) | `~/Downloads/CSV Output*.xlsx` | Raw ledger that feeds BQ — current state, not a snapshot |
| BigQuery **stg.quickbooks_stg** | `rich-tome-488802-a2.stg.quickbooks_stg` | Loaded by `jt-full-refresh.mjs` from the Transaction Detail xlsx |
| BigQuery **prod.expenses** | `rich-tome-488802-a2.prod.expenses` | Filtered + classified subset of stg — feeds Looker |
| BigQuery **prod.payment_transactions_prod** | `rich-tome-488802-a2.prod.payment_transactions_prod` | ClubReady raw payments (PaymentStatus: Paid / Fully Refunded / etc.) |
| BigQuery **prod.daily_transactions** | `rich-tome-488802-a2.prod.daily_transactions` | ClubReady revenue rolled to daily + InvoiceDescriptionGrouped — feeds Looker Revenue Analysis |
| Looker Studio | https://lookerstudio.google.com/reporting/3bc9cc6f-fca2-44f1-a45f-520f236a2d0f | What Sean sees — bound to BQ `prod.*` tables |

---

## Critical rules — never violate

1. **Read-only.** Never call `jt-full-refresh.mjs` or any script that writes to BQ. Never edit Looker.
2. **Never alter source files in `~/Downloads/`.** Treat them as immutable.
3. **All work in `~/Workspaces/birdseye-view/scripts/analysis/`.** That folder is sandboxed from the live pipeline.
4. **Email goes only to `4434lifeline@gmail.com`.** No Sean, no Sophie, no Zach. Angelo forwards.
5. **Never claim two sources "match" without showing the join key + the variance column.** "Looks close" is not a reconciliation.
6. **Always disclose missing months / dropped duplicates / parse errors** in the Source Files Manifest tab.

---

## How EROS runs it

### Phase 1 — Confirm scope (always ask the user)

Use `AskUserQuestion` with three questions:
- **Scope:** expenses-only / expenses+revenue / full P&L (Income/COGS/Expense/Other)
- **Drive folder:** under existing ReEnergized folder (default) / new top-level / pasted ID
- **Sources to include:** which subset of the 7 sources above

Skip Phase 1 only if the user gave explicit instructions (e.g. "expenses only, dump in the existing Sheet").

### Phase 2 — Parse source files

```bash
cd ~/Workspaces/birdseye-view
node scripts/analysis/parse-pnl.mjs   # all "Profit and Loss*.xlsx" → output/pnl_*.csv
```

The parser auto-detects month-year from row 2 of each xlsx, deduplicates by mtime, and emits:
- `output/pnl_normalized.csv` — one row per (month, account)
- `output/pnl_monthly_totals.csv` — one row per (month, section)
- `output/pnl_manifest.json` — provenance + missing months
- `output/pnl_missing_months.txt`

If the user provides additional source xlsx files (e.g. ClubReady manual exports), extend the parser — don't write a one-off script.

### Phase 3 — Pull BigQuery aggregates

```bash
node scripts/analysis/extract-bq.mjs
```

Reads from `~/.birdseye-full-token.json` (auto-refresh). Pulls 6 aggregates by default:
1. `bq_qb_raw_by_month_account.csv`
2. `bq_qb_raw_monthly_section.csv`
3. `bq_expenses_by_month_account.csv`
4. `bq_expenses_monthly.csv`
5. `bq_payments_monthly.csv`
6. `bq_daily_tx_monthly.csv`

Add new queries by extending the `QUERIES` map in `extract-bq.mjs` — don't fork the script.

### Phase 4 — Quick gap preview (optional)

```bash
node scripts/analysis/quick-gap-analysis.mjs
```

Prints monthly variance to stdout. Useful for spotting outliers before building the Sheet, and for catching extraction bugs (e.g. wrong PaymentStatus filter — happened on 2026-05-07).

### Phase 5 — Build Google Sheet

```bash
node scripts/analysis/build-reconciliation-sheet.mjs
```

Creates the Drive folder + Sheet (13 tabs), writes `output/sheet_result.json` with the URLs.

### Phase 6 — Send email

```bash
node scripts/analysis/send-reconciliation-email.mjs
```

Uses `eros-workspace/scripts/email-utils.mjs` (`safeSubject`, `emailShell`, `sendEmail`). Reads `output/sheet_result.json` for the link.

---

## Common reconciliation patterns (lessons learned)

### Pattern 1 — Section vs combined
QuickBooks P&L treats COGS (5xxx) and Expense (6xxx) as separate sections. BQ `prod.expenses` combines them. Always show both: `P&L Expense alone`, `P&L Expense + COGS`, `BQ prod.expenses`. Without that breakdown the gap looks bigger than it is.

### Pattern 2 — Snapshot vs live
A QuickBooks P&L PDF/xlsx is a snapshot at the moment of export. The underlying ledger (Transaction Detail → stg.quickbooks_stg) is current. If anyone edits a transaction after the P&L export, BQ will show the new value. Always note the export date in the manifest tab.

### Pattern 3 — Calendar vs GAAP
ClubReady books revenue on `PaymentDate` (calendar). QuickBooks recognizes income on invoice / service date (GAAP). End-of-year membership prepayments cause large gaps in Jan and Feb that are NOT bugs.

### Pattern 4 — Status filter mismatch
Don't assume PaymentStatus values without checking. ClubReady uses "Paid" not "Approved". Always run a `SELECT DISTINCT` on enum-like columns first.

### Pattern 5 — Filename ≠ content
P&L files are named e.g. `Profit and Loss - March 2026 (1).xlsx` but the actual month is in row 2 of the sheet ("March 1-31, 2026"). Auto-detect from content, not filename.

---

## What NOT to do

- Don't propose changes to `jt-full-refresh.mjs` or `refresh-prod-expenses.mjs` based on the analysis — that requires explicit Angelo + Sean approval (memory: `feedback_dont_touch_working_charts.md`).
- Don't rename Looker chart bindings to make labels match QB. "Aligned to QB" means data values match, not pixel-perfect labels.
- Don't include code-fix recommendations in the email — the email is for Sophie / Sean's eyes (Angelo forwards). Code-fix recommendations live in ClickUp.
- Don't extract `.eml` files in this skill — that's a separate task. List missing months in the manifest and stop.
- Don't email Sophie / Sean / Zach directly. Always 4434lifeline@gmail.com.

---

## Files this skill owns

```
~/Workspaces/birdseye-view/scripts/analysis/
├── parse-pnl.mjs              # P&L .xlsx → flat CSV
├── extract-bq.mjs             # BQ aggregates → CSVs
├── bq-helper.mjs              # shared OAuth + query helper
├── quick-gap-analysis.mjs     # stdout preview
├── build-reconciliation-sheet.mjs   # Drive folder + Sheet builder
├── send-reconciliation-email.mjs    # Gmail email sender
└── output/
    ├── pnl_*.csv              # parsed P&L
    ├── pnl_manifest.json
    ├── pnl_missing_months.txt
    ├── bq_*.csv               # BQ aggregates
    ├── bq_extract_manifest.json
    └── sheet_result.json      # last-run Drive folder + Sheet URLs
```

Existing pipeline files (`jt-full-refresh.mjs`, `refresh-prod-expenses.mjs`, etc.) are off-limits to this skill.

---

## Reporting back

After a successful run, EROS reports to Angelo:
1. Drive folder URL + Sheet URL
2. Months loaded vs months missing
3. Top 3 monthly variances (biggest absolute gaps)
4. Whether the gap pattern is consistent (systemic issue) or scattered (data-entry issue)
5. One sentence on root cause hypothesis
6. Email sent confirmation
