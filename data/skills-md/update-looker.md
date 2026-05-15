---
description: Refresh ReEnergized Looker Studio data by running jt-full-refresh.mjs against the latest ClubReady + QuickBooks files in ~/Downloads. Auto-detects newest files, patches FILE_CONFIG, runs dry-run, then full refresh with backup.
---

# /update-looker — One-Click ReEnergized BQ Refresh

Single entry point for the weekly ReEnergized BigQuery refresh that powers the Looker Studio Command Center. Replaces the manual "edit FILE_CONFIG → dry-run → run" loop. Built 2026-04-30.

**Looker report:** https://lookerstudio.google.com/reporting/3bc9cc6f-fca2-44f1-a45f-520f236a2d0f
**BQ project:** rich-tome-488802-a2 (datasets: `stg`, `prod`)
**Refresh script:** `~/Workspaces/birdseye-view/scripts/jt-full-refresh.mjs`
**Token:** `~/.birdseye-full-token.json` (auto-refreshes; if revoked → see "Token re-auth" below)

---

## Required files in ~/Downloads/

| Role | Filename pattern | Source |
|---|---|---|
| QuickBooks | `CSV Output (N).xlsx` | QuickBooks GL email export |
| Active members | `MemberList 14389 (N).csv` or `MemberList 1218 (N).csv` (smaller file) | ClubReady → Members → Active |
| Lost members | `MemberList 14389 (N).csv` or `MemberList 1218 (N).csv` (larger file) | ClubReady → Members → Inactive |
| Leads | `Leads Added 14389 - 1-1-2024 - <today>.csv` | ClubReady → Leads Added (full range) |
| Payments | `Payment Transactions 14389 - 1-1-2024 - <today>.csv` | ClubReady → Payment Transactions (full range) |
| Bookings | `Bookings Attendance 14389 - 1-1-2024 - <today>.csv` | ClubReady → Bookings Attendance (full range) |

**CRITICAL:** Leads, Payments, Bookings must be FULL RANGE exports (1-1-2024 → today). Partial exports lose history.

**MemberList active vs lost:** active file is ~15 KB (~20 rows), lost file is ~60 KB (~80+ rows). When in doubt, ask Angelo.

---

## Usage

### Default (auto-detect newest)
User: `/update-looker`

EROS:
1. `ls -lt ~/Downloads/` to find newest file matching each pattern.
2. Show the 6 files chosen + a confirmation prompt.
3. Wait for "go" before patching FILE_CONFIG.

### With explicit filenames
User: `/update-looker active=MemberList 14389 (2).csv lost=MemberList 1218 (6).csv qb=CSV Output (8).xlsx leads=Leads Added 14389 - 1-1-2024 - 4-29-2026.csv payments=Payment Transactions 14389 - 1-1-2024 - 4-29-2026.csv bookings=Bookings Attendance 14389 - 1-1-2024 - 4-29-2026.csv`

EROS uses the names verbatim, no auto-detect.

### Pasted list (current convention)
User pastes a list of filenames. EROS infers role from filename pattern and confirms before running.

---

## Phases EROS runs

### Phase 1 — Verify files exist
`ls -la ~/Downloads/<each>` — fail loudly if any missing.

### Phase 2 — Patch FILE_CONFIG
Edit `~/Workspaces/birdseye-view/scripts/jt-full-refresh.mjs` lines 30–37:
```js
const FILE_CONFIG = {
  qb:           join(DL, "CSV Output (N).xlsx"),
  activeMembers: join(DL, "MemberList ... .csv"),
  lostMembers:  join(DL, "MemberList ... .csv"),
  leadsAdded:   join(DL, "Leads Added ... .csv"),
  payments:     join(DL, "Payment Transactions ... .csv"),
  bookings:     join(DL, "Bookings Attendance ... .csv"),
  leadsExport:  join(DL, "02_20_26 LeadsExport (1).xlsm"),  // optional, leave as-is
};
```

### Phase 3 — Dry run
```bash
cd ~/Workspaces/birdseye-view && node scripts/jt-full-refresh.mjs --dry-run
```
- Verifies all files parse.
- Reports row counts. Flag any drop > 20% from prior week.
- "60 data rows" for active members is normal — that's CSV line count (20 members × 3 lines per multi-line header). Real `members_prod` count is checked in Phase 5.

### Phase 4 — Full refresh
```bash
cd ~/Workspaces/birdseye-view && node scripts/jt-full-refresh.mjs
```
- Backs up 17 prod tables → `_backup_YYYYMMDD`.
- Loads 7 stg tables (WRITE_TRUNCATE).
- Rebuilds 18 prod tables in dependency order.
- Verifies + prints summary.

### Phase 5 — Verify
- Compare key counts vs prior refresh (memory: `project_reenergized_pipeline.md`).
- Members active should match ClubReady UI (likely off by 1 if a member lacks ContractDesc — known quirk, not a bug).
- Revenue sum for current year should be reasonable.

### Phase 6 — Tell Angelo to refresh Looker
Looker auto-picks up BQ changes within minutes, but cached tiles may need:
- Per-tile: ⋮ on tile → Refresh data
- Report-wide: Resource → Manage data sources → Reconnect on `daily_transactions`

---

## Token re-auth (only if `invalid_grant` error)

The OAuth refresh token can be revoked by Google after long inactivity (~6 months) or password change.

If `node scripts/jt-full-refresh.mjs` fails with `Token has been expired or revoked`:

1. Build the consent URL (EROS does this):
   ```bash
   node -e '
   const fs = require("fs");
   const env = {};
   for (const line of fs.readFileSync("/Users/emmanuelpableo/Workspaces/birdseye-view/.env", "utf8").split("\n")) {
     const m = line.match(/^([A-Z_]+)="?([^"#\n]+)"?/);
     if (m) env[m[1]] = m[2].trim();
   }
   const scopes = [
     "https://www.googleapis.com/auth/analytics.readonly",
     "https://www.googleapis.com/auth/webmasters.readonly",
     "https://www.googleapis.com/auth/analytics",
     "https://www.googleapis.com/auth/gmail.readonly",
     "https://www.googleapis.com/auth/bigquery",
     "https://www.googleapis.com/auth/bigquery.insertdata",
     "https://www.googleapis.com/auth/drive",
     "https://www.googleapis.com/auth/spreadsheets",
     "https://www.googleapis.com/auth/datastudio",
   ].join(" ");
   const params = new URLSearchParams({
     client_id: env.VITE_GOOGLE_CLIENT_ID,
     redirect_uri: "http://localhost:9999/oauth/callback",
     response_type: "code",
     scope: scopes,
     access_type: "offline",
     prompt: "consent",
   });
   console.log("https://accounts.google.com/o/oauth2/v2/auth?" + params.toString());
   '
   ```

2. Angelo opens that URL, signs in as `4434lifeline@gmail.com`, clicks Allow.
3. Browser shows `localhost:9999` connection error — that's expected (no listener). Angelo copies the `code=...` value out of the URL bar and pastes back to EROS.
4. EROS exchanges the code for a token:
   ```bash
   node -e '
   const fs = require("fs");
   const env = {};
   for (const line of fs.readFileSync("/Users/emmanuelpableo/Workspaces/birdseye-view/.env", "utf8").split("\n")) {
     const m = line.match(/^([A-Z_]+)="?([^"#\n]+)"?/);
     if (m) env[m[1]] = m[2].trim();
   }
   const code = "<PASTED_CODE>";
   (async () => {
     const res = await fetch("https://oauth2.googleapis.com/token", {
       method: "POST",
       headers: { "Content-Type": "application/x-www-form-urlencoded" },
       body: new URLSearchParams({
         code, client_id: env.VITE_GOOGLE_CLIENT_ID,
         client_secret: env.VITE_GOOGLE_CLIENT_SECRET,
         redirect_uri: "http://localhost:9999/oauth/callback",
         grant_type: "authorization_code",
       }),
     });
     const data = await res.json();
     if (!data.access_token) { console.error(JSON.stringify(data,null,2)); process.exit(1); }
     const tokenObj = {
       access_token: data.access_token,
       refresh_token: data.refresh_token,
       scope: data.scope,
       token_type: data.token_type,
       expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
     };
     fs.writeFileSync(require("os").homedir() + "/.birdseye-full-token.json", JSON.stringify(tokenObj, null, 2));
     console.log("Token saved.");
   })();
   '
   ```

5. Re-run Phase 4.

---

## Rollback

If a refresh produces bad data:
```sql
-- Restore any prod table from backup
CREATE OR REPLACE TABLE `rich-tome-488802-a2.prod.<table>` AS
SELECT * FROM `rich-tome-488802-a2.prod.<table>_backup_YYYYMMDD`;
```

Backups live for at least one week; expire per BQ default.

---

## Notes / gotchas

- **Active member count off by 1**: SQL filter requires `ContractDesc IS NOT NULL`. ClubReady UI shows total active including non-contract members. Expected, not a bug.
- **JT's stale Looker tile**: JT's original pipeline broke and their dashboard tile still serves cached numbers. Our refreshed numbers will diverge from JT's — that's correct, ours is the source of truth.
- **`daily_transactions` only has `date` column**: not `PaymentDate` like JT's. If a chart references `PaymentDate`, it's bound to JT's old data source, not ours.
- **MemberList file numbering**: ClubReady appends `(1)`, `(2)`, etc. on re-download. Always check timestamp, not number — newest may be the lowest number if Angelo cleared older files.

---

## After successful run, EROS reports

1. Row counts vs prior refresh (Δ for each table)
2. Total revenue YTD
3. Active vs inactive member counts
4. Any anomalies (drops > 20%, date range gaps, etc.)
5. "Refresh Looker now" prompt to Angelo
