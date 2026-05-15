---
description: Refresh the ReEnergized leads/conversion/ROI workbook from latest ClubReady, Gmail, GA4, CTM, Tidio, and QuickBooks exports. Verifies each phase and rebuilds the Google Sheet.
---

# /run-reenergized-analytics — Full Pipeline Refresh

End-to-end refresh of the ReEnergized leads-to-revenue workbook. Built 2026-04-29.

**Workbook:** https://docs.google.com/spreadsheets/d/1VkPOTSSPLL-fXtasyQg8_kTz50EYn5Fe8zOA9bYOZ9U
**Folder:** https://drive.google.com/drive/folders/1_RGwxX2XHGMRhQsS7Uihhe38bJyEJGkF
**Auth:**
- Gmail read (form scrapes) → contact@reenergized.com (`SCRAPER_GOOGLE_CLIENT_ID/SECRET` + `CONTACT_GMAIL_REFRESH_TOKEN`) — ⚠️ Testing-mode token expires every 7 days
- GA4 + Sheets + Drive → 4434lifeline@gmail.com (`GOOGLE_CLIENT_ID/SECRET` + `GOOGLE_REFRESH_TOKEN`)
- All three vars live in `~/Workspaces/reenergized/.env`

**Working dir:** `~/Workspaces/reenergized`
**Scripts dir:** `scripts/leads-analysis/`
**Plan + history:** `scripts/leads-analysis/PLAN.md`

---

## Required input files (must be in `~/Downloads`)

| File | Source | Refresh cadence |
|---|---|---|
| `Leads Added 14389 - 1-1-2024 - <today>.csv` | ClubReady → Reports → Leads Added (full date range) | Weekly |
| `Payment Transactions 14389 - 1-1-2024 - <today>.csv` | ClubReady → Reports → Payment Transactions (full date range) | Weekly |
| `Bookings Attendance 14389 - 1-1-2024 - <today>.csv` | ClubReady → Reports → Bookings (full date range) | Weekly |
| `MemberList 14389 (X).csv` (×2 — active + inactive) | ClubReady → Members | Weekly |
| `ReEnergized - calls export (N).csv` | CTM → Calls export | Weekly |
| `Exported data from Tidio for httpsreenergized.com project (N).csv` | Tidio → Export contacts | Weekly |
| `CSV Output (N).xlsx` | QuickBooks → CSV Output (GL) | Weekly |
| `02_20_26 LeadsExport (N).xlsm` | OPTIONAL — referral-type taxonomy reference | Quarterly |

If a filename has changed (different `(N)` suffix), update the `SRC` constants at the top of the relevant phase script before running.

---

## Phase 0 — Pre-flight checks

1. Confirm we're in `/Users/emmanuelpableo/Workspaces/reenergized` (`pwd`)
2. Verify all input files present (`ls ~/Downloads/ | grep -E "Leads Added|Payment Transactions|Bookings Attendance|MemberList|calls export|Tidio|CSV Output"`)
3. Verify env keys: `grep -E "^(SCRAPER_)?GOOGLE_|CONTACT_GMAIL" ~/Workspaces/reenergized/.env | sed 's/=.*/=***SET***/'`
4. **Test Gmail token** (it expires every 7 days):
   ```
   node scripts/test-gmail-access.mjs
   ```
   If it fails with `invalid_grant` → re-auth: `node scripts/oauth-reauth-contact.mjs` (sign in as contact@reenergized.com).
5. Skip the rest if any input file is missing — print exactly which one and stop.

---

## Phase 1-6 — Refresh raw data (run in order, foreground)

Each script is idempotent. Each writes its output CSV to `scripts/leads-analysis/data/`.

```bash
node scripts/leads-analysis/scrape-gmail-forms.mjs           # Gmail → claim + hbot CSVs
node scripts/leads-analysis/parse-ctm-calls.mjs              # CTM → ctm-calls-cleaned.csv
node scripts/leads-analysis/extract-referral-reference.mjs   # xlsm → referral-type-mapping.csv
node scripts/leads-analysis/build-main.mjs                   # base enriched main (Phase 5)
node scripts/leads-analysis/pull-ga4-funnel.mjs              # GA4 → funnel + traffic sources CSVs
node scripts/leads-analysis/pull-ga4-extras.mjs              # GA4 → device/cities/landing/source-quality/campaigns/new-vs-returning
```

After each, eyeball the printed summary — if a count drops dramatically (>30%) vs the prior run, **stop and investigate** before continuing. Reasons it might drop: a CSV failed to parse, a date range was clipped, or the data file is corrupt.

---

## Phase 7-13 — Conversion + ROI layer (run in order)

```bash
node scripts/leads-analysis/parse-tidio.mjs              # Tidio → tidio-leads + not-in-CR
node scripts/leads-analysis/parse-payments.mjs           # Payments → user-revenue-summary
node scripts/leads-analysis/parse-bookings.mjs           # Bookings → user-bookings-summary
node scripts/leads-analysis/parse-members.mjs            # MemberList → members.csv
node scripts/leads-analysis/parse-quickbooks.mjs         # QB → expenses-monthly + accounts
node scripts/leads-analysis/build-main-enriched-v2.mjs       # big join → main-leads-enriched-v2
node scripts/leads-analysis/apply-chronological-channels.mjs # chronological first-touch attribution + flow columns
node scripts/leads-analysis/apply-registration-type.mjs      # Direct/Indirect/Manual taxonomy (per Zach Apr 27 ask)
node scripts/leads-analysis/build-channel-roi.mjs            # ROI rollups (referrals + first-touch)
node scripts/leads-analysis/build-channel-monthly-breakdowns.mjs  # per-channel × month + referral × month
node scripts/leads-analysis/build-benchmarks.mjs                  # industry-standard benchmarks (PASS/WATCH/FAIL scorecard + 4 target tabs + sources)
node scripts/leads-analysis/build-column-glossary.mjs             # column glossary tab + JSON for header hover notes
node scripts/leads-analysis/build-summary-tab.mjs                 # exec snapshot for tab 1 (includes benchmark scorecard now)
node scripts/leads-analysis/upload-raw-sources.mjs                # upload raw + cleaned files to Drive Raw Sources subfolder + write reference-sources.csv
```

---

## Phase 14 — Verification

```bash
node scripts/leads-analysis/verify-scraped-data.mjs   # phase 2 (Gmail forms)
node scripts/leads-analysis/verify-ctm.mjs            # phase 3 (CTM)
node scripts/leads-analysis/verify-main.mjs           # phase 5 (channel attribution)
node scripts/leads-analysis/verify-ga4.mjs            # phase 6 (GA4)
node scripts/leads-analysis/verify-main-v2.mjs        # phase 12 (conversions)
node scripts/leads-analysis/double-check.mjs          # cross-check vs raw files (30 checks)
```

All six **must** print `✅ PASS` / `✅ ALL CROSS-CHECKS PASS` (current count: 30 cross-checks in `double-check.mjs`). If any fails:
- Read the failing report CSV under `scripts/leads-analysis/data/verification-*.csv`
- Fix the upstream issue
- Re-run the failing script + verifier
- Do NOT push to the workbook with a failing verification

---

## Phase 15 — Push to Google Sheet workbook (with polish)

```bash
node scripts/leads-analysis/build-workbook.mjs
```

This rewrites **all 38 tabs** (📘 Read Me + 📖 Column Glossary + 36 numbered) in the same workbook, then applies polish:
- Reorders tabs to numeric sequence (📘 Read Me → 📖 Column Glossary → 1. Summary → … → 36. Verification)
- Populates 📘 Read Me with HYPERLINK navigation to every tab + FAQ + glossary
- Injects clickable HYPERLINK formulas into the TAB GUIDE section of 1. Summary
- Applies hover-tooltip notes (~451 of them) to every column header across all 36 numbered tabs (sourced from `data/column-glossary.json`)
- Applies header formatting (slate `#37474F` bg, white bold, frozen first row)
- Applies banded rows (white / `#FAFAFA` alternating)
- Auto-resizes columns
- Applies conditional formatting on `roi_pct` column (green = positive, red = negative ROI)
- Applies conditional formatting on benchmark `Status` column in Summary (green PASS / amber WATCH / red FAIL)
- Amber background on `18. Tidio Not in ClubReady` (warning visual)

The script reuses the existing folder + sheet by name — never creates duplicates.

After it completes, read `scripts/leads-analysis/data/workbook-link.txt` and report the URL back to the user.

---

## Phase 16 — (Optional, manual) Email helpers

**Not automatic.** Per Angelo's Option A choice, no auto-email or remote agent. Three one-shot email scripts available:

```bash
node scripts/leads-analysis/email-introduction.mjs   # Quick-tour intro: where to start, what is in the workbook, raw-source folder link
node scripts/leads-analysis/email-limitations.mjs    # 9 known data limitations + suggested fixes
```

All send to `4434lifeline@gmail.com` only (per workspace email rule). Not part of the weekly cycle.

ClickUp updates also remain manual.

---

## Known caveats

- **Members file** uses two separate CSV exports (active + inactive segments) — both required. If only one is in Downloads, member-status data will be incomplete.
- **MemberList drops members from "Leads Added"** once they sign a contract. Member match must use phone/email fallback, not UserId only. (Already handled in `build-main-enriched-v2.mjs`.)
- **Bookings file is in vertically-stacked format** (~14 lines per booking) — uses the parser from `parse-bookings.mjs`, not naive CSV parsing.
- **GA4 form-submit events capture only ~22% of actual submissions** (Elementor/GTM trigger broken). Gmail count is ground truth in the workbook. Don't "fix" the discrepancy by trusting GA4.
- **Same Gmail submission appears in both original + Fwd messages.** Dedup uses `(form_type, email, phone)`, keeps earliest.
- **CTM Tracking # Label** maps to a `ctm_verified_source` (e.g., GBP / Yelp / Groupon). The mapping lives in `parse-ctm-calls.mjs` — extend it if a new tracking number is added.
- **`Grey Poupon` in CTM data is a typo for `Groupon`** — already mapped.
- **Older Free Session form (`NEW: Free Session Submission`) was retired Nov 2025** and replaced by the Elementor `CLAIM FREE SESSION` form. Both are scraped together as the Claim funnel.

---

## Failure recovery

If the script chain dies mid-run, the data dir keeps the last successful CSV from each phase — just re-run from the failing phase forward, not from scratch. The workbook update at Phase 15 is also idempotent (reuses sheet ID, not append).

---

## How long it takes

- Phase 0 (pre-flight): ~10 sec
- Phase 1-6 (raw data + GA4 pulls): ~4-6 min (Gmail scrape ~286 message fetches + GA4 funnel + GA4 extras)
- Phase 7-13 (joins + ROI + summary + Drive upload): ~1 min
- Phase 14 (verification — 6 scripts + 30 cross-checks): ~2 min (re-fetches 25 Gmail messages for live recheck)
- Phase 15 (workbook upload + polish — 38 tabs + 451 header notes + formatting + conditional rules): ~4-5 min (rate-limited at ~54 calls/min)
- **Total: ~10-15 min** end-to-end.
