---
description: Run the full EROS daily session — absorbs all former cron responsibilities. Single entry point for all Sean Plotkin workspace work.
---

# /eros-day — Single Source of Scheduling

> ## 🚨 CRITICAL — Sean is a BONDSMAN, not a Lender
> **Sean Plotkin (CDI License #1K06080) does NOT offer loans, financing, or credit.** The 10% premium is a STATUTORY FEE under California Insurance Code §1800.4 — not money lent to the customer.
>
> **Two surface types — different rules** (refined 2026-05-06):
>
> **🚫 Service surfaces — zero tolerance:** homepage hero/badges, service pages, meta titles describing the service, JSON-LD `Service`/`Offer`/`LocalBusiness.description`, GBP descriptions, email subjects, ClickUp task titles. Pre-publish gate on every service file: `grep -iE "\b(loan|lend|lender|lending|borrow|financ|credit)\b" <file> | grep -viE "Accredited|hasCredential|Insurance Code|Department of Insurance"` MUST return 0 hits.
>
> **✅ Comparison content — allowed and SEO-required:** blog posts comparing bail bonds vs bail loans, FAQ Q&A answering loan-related queries, educational sections inside service pages titled "Bail Bonds vs. Bail Loans". The pattern: rank for the loan query, then pivot the searcher to the bond product. Always cite §1800.4. Always close with the licensed bondsman CTA. Never imply Sean offers loans, even by indirection.
>
> Memory: `feedback_no_bail_loans.md`. Model post: `bailbondsrowlandheights/blog/2026-04-14-bail-bonds-vs-loans-rowland-heights.html`.

This is the ONLY scheduler for EROS work. No crons run in the background anymore — everything happens inside this session, triggered by Angelo.

**Cadence:** Daily Mon-Fri. Skip Sat/Sun. Goal is one /eros-day session per weekday.

**Path C content rotation (decided 2026-04-29):** 35 sites total (4 Lovable + 31 microsites with custom domains) cycle across 4 weekday buckets. Each weekday fires ~8-9 sites. Each site gets a blog every ~3-4 weekdays. Realistic pace: 8-10 quality blogs/day with full E-E-A-T + fact-check + uniqueness gate. Memory: `feedback_path_c_rotation.md`. Today's targets: `node ~/Workspaces/eros-workspace/scripts/rotation-calendar.mjs`.

**🎯 HARD FLOOR — 10 blogs/day minimum (added 2026-05-14):** every weekday /eros-day session MUST ship at least **10 production blog posts** before Phase 8 closes. This is a quota gate, not a target. If apply-loop work (Phase 4 fact-check / uniqueness / research-apply) takes longer than expected, reduce other work but do NOT drop below the 10-blog floor. If a hard blocker prevents 10 blogs (e.g., all 4 Lovable sites blocked + no microsite bucket sites available), surface it in Phase 0 AND in the Phase 8 email — never silently ship fewer than 10. Phase 8 final report Section #27 ("Per-Site Change Log") explicitly counts today's blog total; if blogs < 10, the report flags `🚨 BELOW 10-BLOG FLOOR` at the top of the email. Memory: `feedback_eros_day_10_blog_floor.md`.

Work through the phases **in order**. Each phase is idempotent — safe to re-run the same day. Skip a phase only if its explicit skip condition is met.

---

## Phase 0 — Session Start Verify

1. Read `~/Workspaces/angelos-workspace/todo-angelo.md` — note active URGENT items
2. Read `~/Workspaces/angelos-workspace/eros/todo-eros.md` — carry-over from last session
3. Read last ~3 entries of `~/Workspaces/angelos-workspace/eros/learning-log.md`
4. Check uncommitted state of key workspaces (git status across reenergized, cali-bond-swift, vital-radar-ai, bulllion-dealer, boundless-global, eros-workspace, angelos-workspace)
5. **Rendering gate — TWO signals required for OK** (word count alone is unreliable due to inflated metadata/JSON-LD on SPAs). Curl Googlebot UA. Site is OK only if: (a) NO `<div id="root"></div>` empty React root present AND (b) at least 1 `<h1>` tag in HTML. Otherwise FROZEN.
   ```bash
   for domain in bailbondsdomesticviolence.com vitalradar.ai boundlessglobal.com bulliondealer.com; do
     html=$(curl -sA "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" "https://$domain/" 2>/dev/null)
     empty_root=$(echo "$html" | grep -c '<div id="root"></div>')
     h1_count=$(echo "$html" | grep -c "<h1")
     [ "$empty_root" -eq 0 ] && [ "$h1_count" -gt 0 ] && flag="OK" || flag="FROZEN"
     echo "$domain: empty-root=$empty_root h1=$h1_count [$flag]"
   done
   ```
   **Why two signals:** word count was failing — Lovable sites ship 300-700 words of metadata/schema/inline-scripts in the HEAD, which inflates raw word count without putting any actual content where Googlebot indexes it. A real working page has `<h1>` headings rendered server-side (or pre-rendered) AND no empty React root waiting for JS to fill it.
6. **Lovable publish drift check** — `node ~/Workspaces/eros-workspace/scripts/lovable-canary-check.mjs`. If any site returns DRIFT → surface immediately: "GitHub pushed but Lovable snapshot stale. Open Lovable editor → Pull → Publish."
7. **Standing reminders** — read the "STANDING REMINDER" section at the top of `~/Workspaces/angelos-workspace/todo-angelo.md`. Surface each one to Angelo at session start, even when deferred. Do not let deferred decisions silently age out.
   - Currently active standing reminder: **Lovable SPA decision (Path A/B/C) — deferred 2026-04-27, awaiting Angelo's call**
8. **Bail-bond network snapshot freshness check** (added 2026-05-07) — `/bail-reports` produces the weekly bail-network tier snapshot used for strategic decisions on the broader 215-domain bail portfolio. Daily /eros-day session should know if it's stale.
   ```bash
   if [ -f ~/Workspaces/test-1-bail-bond/dns-audit/master-domain-inventory-scored.json ]; then
     age=$(( ($(date +%s) - $(stat -f %m ~/Workspaces/test-1-bail-bond/dns-audit/master-domain-inventory-scored.json)) / 86400 ))
     [ "$age" -gt 14 ] && echo "⚠️ /bail-reports data is $age days old — consider running /bail-reports today." || echo "✅ /bail-reports data is $age days old."
   else
     echo "ℹ️ /bail-reports has never run — skip if no bail-network strategic work this session."
   fi
   ```
   The snapshot covers 3 distinct groups (Bail / Sean Sites / ReEnergized) with weekly history. /eros-day **references** the latest weekly tab in Phase 8 — it does NOT auto-trigger /bail-reports. Memory: `feedback_bail_reports_skill.md`, `feedback_eros_day_bail_reports_integration.md`.

9. **🚨 No-loans SERVICE-SURFACE audit** (refined 2026-05-08) — only flag violations on service surfaces (homepage, services, about, contact). Comparison/educational content under `/blog/`, `/faq/`, `/articles/` is allowed AND ENCOURAGED to use loan vocabulary as long as it pivots back to the bond product. Memory: `feedback_no_bail_loans.md`.
   ```bash
   cd ~/Workspaces && for d in $(ls -d */ | grep -E "bailbond|bail-bond|reenergized|cali-bond|angels-bail"); do
     hits=0
     for f in "$d"index.html "$d"about.html "$d"contact.html "$d"services.html "$d"service.html; do
       [ -f "$f" ] && hits=$(( hits + $(grep -iE "\b(loan|lend|lender|lending|borrow|financ|credit)\b" "$f" 2>/dev/null | grep -viE 'Accredited|hasCredential|California Insurance|Department of Insurance|"bail loan"|bail bond and a .bail loan|difference between a bail bond and a|Credit Union' | wc -l | tr -d ' ') ))
     done
     [ "$hits" -gt 0 ] && echo "$d service surfaces: $hits hits"
   done
   ```
   The pre-2026-05-07 version scanned every `.html` file and inflated the violation count by counting comparison blog posts as service-surface hits. The 2026-05-08 refinement adds a `"bail loan"` exception — the explicit "What's the difference between a bail bond and a 'bail loan'?" comparison FAQ pattern is **allowed** on service surfaces (it's the model pattern from `bailbondsrowlandheights/blog/2026-04-14-bail-bonds-vs-loans-rowland-heights.html`).

   **Strategy reminder — broadened 2026-05-07:** pursue high-volume low-difficulty queries (loan-related OR other adjacent searches like "free bail money", "no money down bail", "credit card bail", "no collateral bail") with comparison/educational content. The pattern: rank for the query, correct the misconception, route to the bond product. Model post: `bailbondsrowlandheights/blog/2026-04-14-bail-bonds-vs-loans-rowland-heights.html`. Niche priority remains bonds — keep ≥70% pure bond content, ≤30% comparison.
10. **Operator notes from dashboard** *(added 2026-05-12)* — read any pending notes filed via the EROS Dashboard at `http://127.0.0.1:3737`. Notes are stored at `~/Workspaces/eros-dashboard/operator-notes/<date>.md`. Each note is tagged with the skill + phase Angelo flagged from the dashboard. Surface every unprocessed note in the Phase 0 report so Angelo + EROS see the friction Angelo noticed BETWEEN sessions. Suggested handling: act on each note this session if simple (edit a skill, add a memory, fix a script), or open a ClickUp task if it needs a longer rollout. After handling, append a `<!-- processed YYYY-MM-DD -->` line under the note (or delete the file) so it doesn't keep firing.
    ```bash
    NOTES=~/Workspaces/eros-dashboard/operator-notes
    ls -t $NOTES/*.md 2>/dev/null | head -3 | while read f; do
      if ! grep -q "<!-- processed" "$f" 2>/dev/null; then
        echo "📝 Unprocessed operator note: $f"
        head -40 "$f"
      fi
    done
    ```
11. Report: today's date (PST), day-of-week, daily Mon-Fri or off-day, blockers count, overdue count, frozen-site count, drift-site count, standing-reminder count, no-loans-violation count, **/bail-reports data age**, operator-notes-pending count

**Skip condition:** never skip. **Verify-before-flagging rule:** if something looks broken (e.g., "cron stale"), verify the actual cause before alarming Angelo — memory `feedback_watchdog_false_positives.md`. **Research-before-recommend rule:** before suggesting any third-party tool/plugin/service, WebSearch it + verify the claim. Memory assertions about code can be stale.

---

## Phase 1 — Data Refresh *(replaces GSC + keyword-bank crons)*

Only run if data is >24h stale.

1. **GSC pull per site** — the real source of truth for every blog topic. For each active main site (bailbondsdomesticviolence, vital-radar-ai-seo, bulllion-dealer, boundless-global, reenergized):
   - `node ~/Workspaces/<site>/scripts/gsc-weekly-report.mjs`
   - Writes `~/Workspaces/<site>/seo-tasks/YYYY-MM-DD/analysis.json`
   - **Blog topics come from this file.** Queries GSC shows real-user search terms, positions, impressions, CTR — no need for a middle sheet.
2. **GA4 daily pull** *(added 2026-05-06)*: `node ~/Workspaces/eros-workspace/scripts/pull-ga4-daily.mjs`
   - Pulls 28-day hostname + landing-page data for every GA4 property (microsites + main sites)
   - Writes `~/Workspaces/eros-workspace/data/daily/YYYY-MM-DD/ga4.json`
   - Powers the **GA4 Standing** section in Phase 8 final report (sessions/users WoW Δ per property)
   - Skip if today's snapshot already exists.
3. **Aggregated keyword bank sheet — MANDATORY every session** *(refined 2026-05-06)*: `node ~/Workspaces/eros-workspace/scripts/sync-keyword-bank.mjs`
   - Sheet ID: `1i1hTIw50Vzudp_0BrclAVgBcHbwQVP0PhqGHwMrl5tw`
   - Always run — no skip condition. Refreshes the full keyword bank with the day's GSC pull.
   - Phase 8 final report depends on `keyword-bank-summary.json` being current.
   - **Surfaced in the Phase 8 email** as the "Keyword Bank Status" section: sheet link + last sync date + per-site totals + ✅/🚨/⚠️ refresh state. Verify the email actually shows that section every session — if missing, the sync silently failed and Phase 8 will mark it 🚨.
4. **Network keyword priorities (GSC-based)**: `node ~/Workspaces/eros-workspace/scripts/prioritize-keywords.mjs --top=25`
   - Scans every site's analysis.json + network gsc.json
   - Ranks every keyword (pos 1-25, imp >= 3) by *impressions × CTR-gap* (= monthly clicks upside)
   - Writes `~/Workspaces/eros-workspace/data/daily/YYYY-MM-DD/keyword-priorities.json`
   - Answers: **"what we already rank for — what's the CTR upside?"**
5. **Semrush Low-Hanging Fruit (XLSX reference)** *(added 2026-05-12)*: `python3 ~/Workspaces/eros-workspace/scripts/compute-semrush-lhf.py --top=25`
   - Reads local `~/Workspaces/bailbondsdomesticviolence/seo/keywords/Angel's Bailbonds Keyword.xlsx` (62k keywords across 17 relevant tabs — the cloud sheet was trashed 2026-05-12; XLSX is the canonical reference now)
   - Filters: KD ≤ 35, Volume ≥ 100, intent ∈ {Commercial, Transactional}, bail-relevance regex, market ≠ OOM
   - Cross-references against today's network GSC pull → tags each candidate as ALREADY-RANKING / STRIKING-DISTANCE / NET-NEW / DEEP-RESULTS
   - Writes `~/Workspaces/eros-workspace/data/daily/YYYY-MM-DD/semrush-lhf.json`
   - Answers: **"what should we WRITE next?"** — finds low-difficulty + high-volume keywords we don't yet have GSC presence on, with correct buying-audience intent
   - Per Angelo 2026-05-12: Semrush is REFERENCE (not refreshed since credits=0); GSC + GA4 remain the live BASIS. The two sources combined answer different questions; both feed Phase 3 triage.
6. **Use both lists to drive Phase 3 triage.** Top GSC priority → CTR-fix or content-push on existing ranking. Top Semrush NET-NEW → blog topic. SOCAL keywords map directly to microsites; NATIONAL keywords localize per city.
7. Report freshness per site + flag any >7 days stale
8. **Monday-only reminder** (added 2026-05-07): if today is Monday, surface the suggestion: "Today is Monday — run `/bail-reports` for the weekly bail-bond network snapshot. First Monday of the month → run the full data refresh first (HTTP probe + GSC multi-window + scoring + action plan). Other Mondays: just `/bail-reports` reuses the latest cached data." This is a reminder, NOT an auto-trigger. /bail-reports stays user-controlled.

**Skip condition:** daily Mon-Fri already ran today (check `seo-tasks/YYYY-MM-DD/` exists).

---

## Phase 2 — Kaizen + Health *(replaces SEO-improve + kaizen + watchdog crons)*

1. For each main site: `node ~/Workspaces/<site>/scripts/seo-improve.mjs` — writes task-list.md
2. `node ~/Workspaces/eros-workspace/scripts/score-network.mjs` — network Kaizen score
3. `node ~/Workspaces/eros-workspace/scripts/check-duplicate-content.mjs` — doorway-page gate
   - **Target:** 0 FAIL pairs (Jaccard >= 0.50), 31/31 sites clean
   - **If FAIL pairs > 0:** run `node ~/Workspaces/eros-workspace/scripts/rewrite-microsite-uniqueness.mjs` to regenerate unique per-city content (variant-rotation generator). Re-run check after each batch. Memory: `feedback_variant_rotation_rewriter.md`, `feedback_microsite_unique_content.md`
4. **Impressions reality dashboard** — aggregate `~/Workspaces/eros-workspace/data/daily/<latest>/gsc.json` into a per-site table. Format:
   ```
   SITE                    | CLICKS | IMP   | KEYWORDS | TOP-20 | VERDICT
   ReEnergized             |   165  | 14082 |    442   |  352   | WINNER
   bailbondsrowlandheights |    0   |  6071 |      2   |    2   | CTR-FIX
   BailbondsDV             |    0   |    35 |     20   |    4   | FROZEN (SPA)
   ```
   Verdicts: WINNER (clicks > 50), CTR-FIX (impressions > 1000, clicks < 5), INDEXING (impressions < 100, < 30 days), FROZEN (SPA shell per Phase 0), INVISIBLE (zero imp + zero keywords).
5. Report: per-site score (1-100), network average, CONTINUE/IMPROVE/STOP per site
6. **Score active sites (S/A/B/C/D tier)** *(added 2026-05-11)*: `node ~/Workspaces/eros-workspace/scripts/score-active-sites.mjs`
   - Scores all 35 active sites (4 Lovable + 31 microsites) into S/A/B/C/D tiers
   - For 32 bail-related active sites: reads tier from `/bail-reports` master inventory (`~/Workspaces/test-1-bail-bond/dns-audit/master-domain-inventory-scored.json`)
   - For 3 non-bail Lovable sites (vitalradar.ai, bulliondealer.com, boundlessglobal.com): scores with a parallel model (SPA-penalty + content + age + schema)
   - Writes `~/Workspaces/eros-workspace/data/daily/<date>/active-tiers.json`
   - Surfaced in Phase 8 final-report Section #23 with full per-site table + Phase 3 triage rule
   - **Phase 3 reads this file** to choose which rotation bucket site gets blog vs meta rewrite vs infra fix
7. **External duplicate-content audit (70% uniqueness floor)** *(added 2026-05-12)*: `node ~/Workspaces/eros-workspace/scripts/check-external-duplicates.mjs`
   - Scans EVERY blog post across the 31 microsites (currently 245+ posts)
   - Tokenizes body text, computes pairwise Jaccard similarity using 3-grams
   - Flags any pair >30% similar (i.e., any page <70% unique)
   - Writes `~/Workspaces/eros-workspace/data/daily/<date>/uniqueness-audit.json`
   - Difference from step 3 (`check-duplicate-content.mjs`): step 3 compares microsite HOMEPAGES only; step 7 compares BLOG POSTS across the entire network. Backlog of below-floor pages goes to the variant-rotation rewriter (see Phase 4 if rotation slot allows).
   - Surfaces in Phase 8 final-report Section #25 (added 2026-05-12)

**Red-flag rules:**
- Score <40 = Critical
- Site at 0-click/0-imp → skip blog, fix GBP/sitemap/backlinks instead (data-driven triage — memory `feedback_data_driven_seo_triage.md`)

**Skip condition:** never skip — health gate runs every session.

---

## Phase 3 — Triage + Decide

Based on Phase 1-2 output, decide for this session:

- **Content source rule:** every blog/post topic must come from GSC data (`seo-tasks/<date>/analysis.json` per site). Pick winners (high impressions + low CTR), striking-distance (positions 8-15), or decaying keywords first. No GSC-backed topic = no blog.
- **Which sites get content today** (data-driven: winners + striking-distance first, 0-click sites skipped)
- **Which sites are frozen** (4 Lovable sites — SPA collapse until prerender ships, memory `feedback_spa_prerender_budget.md`)
- **Which sites are Angelo-blocked** (ReEnergized WP queue, etc.)
- **Microsite topic:** **must follow Apr 21-30 stagger** (per-city rotation in calendars, never same topic across 28 sites — memory `feedback_microsite_keyword_stagger.md`)
- **Tier-driven triage** *(added 2026-05-11)* — read today's Active Site Tier Rankings from `~/Workspaces/eros-workspace/data/daily/<date>/active-tiers.json` (auto-generated in Phase 2). Triage rule per tier:
  - **S-tier** (60+): daily content + GBP cadence — already winning
  - **A-tier** (45-59): meta-title rewrite FIRST (CTR upside on existing rankings) — beats writing a new blog
  - **B-tier** (25-44): default blog rotation — most of today's bucket goes here
  - **C-tier** (10-24): skip blog, open ClickUp infra task (GBP recovery / schema / redirect fix)
  - **D-tier** (<10): defer rotation slot; surface in next /bail-reports for re-activate vs decom decision
  Memory: `feedback_eros_day_active_tiers.md`

### Phase 3 must surface today's Apply Loop picks BY NAME *(added 2026-05-13, expanded 2026-05-14)*

Before output, read these files to identify the SPECIFIC items to fix this session:

1. **Next 2 uniqueness rewrites**: `data/daily/<date>/uniqueness-audit.json` → `pageStats[]` filtered to `passesFloor:false`, sorted ASC by `uniqueness`. Pick top 2.
2. **Hard fact-check fixes**: `data/daily/<date>/factcheck-audit.json` → `results[]` filtered to `hardCount > 0`.
3. **Next 3 WARN fixes** *(added 2026-05-14)*: `data/daily/<date>/factcheck-audit.json` → `results[]` filtered to `warnCount > 0`. Pick the 3 with the most fixable rules (`unknown phone number`, `code without canonical context`). Add to plan as "fact-check WARN: fix X / Y / Z".
4. **Next research-apply**: `data/research/<latest>/findings.md` → scan for `🔴 ADD` lines. Pick the topmost unprocessed one (cross-reference against `data/daily/<dates>/site-changelog.json` to check if already applied). Also cross-reference `~/Workspaces/eros-dashboard/strategies.json` — if the research item is the source of a `status: 'planned'` strategy, flip that strategy to `active` in the same commit (auto-activation rule, see below).
5. **Active strategy check-ins**: `data/daily/<date>/strategy-results.json` → `results[]` filtered to `hitCheckIn != null`. If any strategy hit a check-in day today, surface verdict + decision required.

### Strategy auto-activation rule *(added 2026-05-14)*

Every 🔴 ADD research item in `findings.md` should map to a strategy in `~/Workspaces/eros-dashboard/strategies.json`. The mapping:

- **Apply the research → set the strategy to `active`** in the same session, with:
  - `startDate: <today>`
  - `endDate: <today + windowDays>`
  - `treatmentPages: [list of pages that received the research apply]`
  - `controlPages: [list of comparable pages without the apply]`
- **Existing strategies** (e.g., `answer-blocks-aeo`, `local-landmarks-section`): when Phase 4 ships an instance of that pattern, ADD the page to `treatmentPages[]` for that strategy. Never create a duplicate strategy for the same pattern.
- **Track research → strategy linkage** in `strategies.json` via the `source` field (already in place, e.g., `"source": "data/research/2026-05-12/findings.md (AEO 2026 section)"`).

This rule eliminates the "researched but never tested" failure mode. Every research finding that gets applied automatically becomes a measurable test.

These picks go INTO the plan output. No more "we should apply research" abstractions — Phase 3 names the exact pages and exact tactic before Phase 4 starts writing.

### Approval checkpoint — AUTO-EXECUTE (revised 2026-05-08)

Output a max 12-line plan in this format:
```
PLAN — <date>
APPLY LOOP (do FIRST):
• Uniqueness: rewrite <site1>/<slug1> (X% unique) + <site2>/<slug2> (Y% unique)
• Fact-check HARD: fix <site>/<slug> (rule: <name>)
• Research-apply: add <research-finding-title> to <target-page>
• Strategy check-in: <strategy-id> hit day N — verdict <X>, decision <Y>

NEW CONTENT (do AFTER apply loop, count reduced proportionally):
• Site A: action (why)
• Site B: action (why)
• Skip: Site C (reason)
```

**Auto-execute is ON by default.** Angelo standing instruction 2026-05-08: *"moving forward you run the whole thing."* /eros-day proceeds Phase 0 → 8 autonomously. The Phase 3 plan output exists for transparency (Angelo can read it in real time), not as a wait gate.

**Override:** if Angelo says *"don't auto-execute"*, *"wait at Phase 3"*, or *"plan only"* — pause and wait for explicit go.

Pre-write gates (Phase 4a) remain mandatory: no-loans audit, fact-check, E-E-A-T. Those are preconditions to writing, not approval gates.

Memory: `feedback_eros_day_autonomous_execute.md`, `feedback_eros_day_phase4_mandatory.md`.

---

## Phase 4 — Apply Content

**Phase 4 is the primary daily deliverable.** Every /eros-day Mon-Fri session ends with the day's rotation bucket published (target: 8-9 blogs across the bucket sites — see Phase 3 + `rotation-calendar.mjs`). Skipping Phase 4 means the day produced no SEO output.

**The no-loans audit (Phase 0 + Phase 4a) is a gate, NEVER a substitute.** Violations must be cleaned BEFORE Phase 4b writes, but cleanup is a precondition, not the day's work. EROS must NOT propose "fix violations OR write blogs" as a binary choice — both happen, in order. Lesson 2026-05-08: presenting an A/B option where A skipped blog output produced a session with zero deliverable content. That's a regression of the rotation system.

### 🚨 Apply Loop — MANDATORY before writing new content *(added 2026-05-13)*

**Audits without fixes = noise.** Every weekday session must draw down the backlog before adding new content. This rule exists because Angelo flagged 2026-05-13: *"i don't want we keep running this but we are not actually doing anything to improve our traffics."* Memory: `feedback_apply_loop_mandatory.md`.

The order is FIX → ADD, every session. Phase 3 plan output MUST list these counts explicitly. Phase 8 final report Section #28 reports the ratio "Applied vs Found" — if <50% for 3 consecutive sessions, /eros-day Phase 0 surfaces it as a standing reminder.

| Audit | Quota per session | Source file |
|---|---|---|
| **Fact-check HARD errors** | ALL must be fixed (already enforced via exit code 1 from `verify-blog-facts.mjs`) | `data/daily/<date>/factcheck-audit.json` |
| **Uniqueness floor** | ≥2 below-70%-unique pages rewritten | `data/daily/<date>/uniqueness-audit.json` |
| **Research-finding apply** | ≥1 🔴 ADD item from latest `findings.md` applied to a real page | `data/research/<latest>/findings.md` |
| **No-loans service-surface violations** | ALL must be cleaned (Phase 0 step 9 already enforces 0) | scan output in Phase 0 |
| **Hard fact-check WARNs** | Cumulative — pace ≥3 per session toward zero (currently 55 in network) | `factcheck-audit.json` warnings array |

**Then and only then** does Phase 4b proceed to write new blogs per Path C rotation. The realistic-pace cap (4-8 microsites / 2-4 main sites) is reduced proportionally to make room for apply work — i.e., if 2 uniqueness rewrites + 1 research-apply + 3 fact-check warns = 1.5 hr, write 3-5 NEW blogs that session instead of 4-8.

**Override:** if Angelo says *"skip apply loop today"* or *"new content only"*, document the override in Phase 8 Section #28 + carry the unfixed items forward to tomorrow's required quota (doubles).

Only run what was approved in Phase 3.

### 4a. PRE-WRITE gates (YMYL — mandatory before any blog)

Memory: `feedback_blog_fact_check.md` — the no-skip rules:

1. **🚨 NO LOANS — ZERO TOLERANCE.** Sean does **bonds**, not loans. NEVER write "bail loan", "bail money loan", "loan", "lend", "lender", "lending", "borrow", "financing", "bail financing", "credit", or any synonym implying a debt instrument. The 10% premium is a STATUTORY FEE under California Insurance Code §1800.4 — not money lent to the customer. Before writing any blog/page/meta/FAQ/GBP post: `grep -i -E "loan|lend|borrow|financ|credit" <file>` and confirm 0 hits. Memory: `feedback_no_bail_loans.md`. This rule covers all content types and all sites — Sean Plotkin operates a bail bond business; he is not a lender of any kind.
2. **WebSearch the primary keyword** — what are real people asking?
3. **Verify all laws/stats/prices** — CA Penal Codes (PC 273.5, 243(e)(1), 136.2, 422, 646.9, 1800.4) quoted correctly?
4. **Check bail schedule claims** against county source
5. **No "72-hour mandatory hold"** — that claim is false; PC 136.2 = Criminal Protective Orders, not bail hold (memory `project_bailbondsdv_traffic_collapse.md`)

### 4b. Write (in Claude Code — API credits = 0)

- **ONE focused primary keyword per page/post** (Edward Sturm compact keyword rule — memory `feedback_compact_keywords.md`). Never keyword-stuff. Apply to meta title, H1, first paragraph, meta description.
- **E-E-A-T signals on every piece** (memory `feedback_eeat_all_content.md`):
  - Licensed bondsman perspective (Sean Plotkin voice)
  - Specific CA Penal Code citations
  - County bail schedules, local jail procedures referenced
  - Author bio / byline with credentials
  - "Not legal advice" disclaimer
  - Empathetic tone for families in crisis
  - JSON-LD: Article + FAQPage + LocalBusiness where appropriate
  - Semantic HTML (proper h1/h2/h3, schema.org markup)
- **CTR meta description pattern — urgency-first** (memory `feedback_ctr_meta_descriptions.md`):
  - Lead with "Arrested in [City]?" NOT company name
  - Include primary keyword early
  - Target 140-155 chars, under Google's display cutoff
  - Trim page title to under 65 chars
- **🚨 NO LOAN LANGUAGE — ZERO TOLERANCE.** No "bail loan", "money loan", "loan", "lend", "lender", "lending", "borrow", "financing", "credit", or any debt-instrument synonym. Sean is a bail BONDSMAN, not a lender — and he does not run any loan or financing business. Memory `feedback_no_bail_loans.md`. The bond premium is a STATUTORY FEE (10% per CA Ins Code §1800.4), not a loan. This applies to every word on every site (blog, page, meta, FAQ, GBP, email, schema, alt text). Pre-publish gate: `grep -i -E "loan|lend|borrow|financ|credit"` must return 0 hits.

### 4c. Deploy

- **Microsites (static HTML):** `CLOUDFLARE_API_TOKEN=$TOKEN CLOUDFLARE_ACCOUNT_ID=c0a563aca1a6032f711bdc29ebeccb95 npx wrangler pages deploy ~/Workspaces/<site> --project-name <project-name> --branch main`
  - **MUST set `CLOUDFLARE_ACCOUNT_ID` inline** — discovered 2026-05-05: token lacks `User > Memberships > Read` permission, so wrangler can't auto-resolve the account from `/memberships`. Without account ID env, every deploy fails with `Authentication failed (status: 400) [code: 9106]`. Account ID is committed in all `~/Workspaces/*/. env` files.
  - Token rotation: when CF returns `code: 10000`, generate a new token at dash.cloudflare.com → My Profile → API Tokens (Cloudflare Pages:Edit + User Read), then sync to `~/Workspaces/test-1-bail-bond/.env`, `eros-workspace/.env`, `angelos-workspace/.env`, `bailbondsdomesticviolence/.env`.
  - **Workspace folder name ≠ production domain.** Always verify via `npx wrangler pages project list` before deploying. Example: `tustinbailbonds/` → bailbondstustin.com (NOT tustinbailbonds.com which is a separate WP site). Memory: `feedback_microsite_domain_map.md`
  - CF Pages deploys via direct wrangler upload, not GitHub auto-deploy. Memory: `feedback_cf_pages_deploy.md`
- **Lovable sites (4 main) — continue authoring + push to GitHub (deferred-value rule, updated 2026-05-14):** hosted by Lovable, NOT Cloudflare Pages. Even though Googlebot currently sees an empty React shell, EROS continues writing content + pushing to each site's GitHub remote. The moment Angelo picks a prerender path (A/B/C standing reminder), pre-existing content gets indexed at the speed of Googlebot's next crawl — stockpiling now front-loads the post-prerender SEO recovery.
  - **Workflow per Lovable repo:**
    1. Edit blog post + supporting files in the local workspace (e.g., `~/Workspaces/cali-bond-swift/src/data/blogPosts.ts`, `~/Workspaces/vital-radar-ai/src/content/articles/`, etc.)
    2. `npm run build` must pass (test-before-done rule)
    3. `git add -A && git commit -m "blog(YYYY-MM-DD): <title>"`
    4. `git push` — uses `~/.netrc` PAT for vitalradarai-source remote
    5. Open Lovable editor → Pull from GitHub → Publish (manual step Angelo handles via Lovable canary check)
  - **The 4 Lovable repos + GitHub remotes:**
    | Site domain | Local repo | GitHub remote |
    |---|---|---|
    | bailbondsdomesticviolence.com | `~/Workspaces/cali-bond-swift` | vitalradarai-source/cali-bond-swift |
    | vitalradar.ai | `~/Workspaces/vital-radar-ai` | vitalradarai-source/vital-radar-ai |
    | bulliondealer.com | `~/Workspaces/bulllion-dealer` | vitalradarai-source/bulllion-dealer |
    | boundlessglobal.com | `~/Workspaces/boundless-global` | vitalradarai-source/boundless-global |
  - **Lovable blogs DO count toward the 10-blog floor.** Memory: `feedback_eros_day_10_blog_floor.md`, `feedback_lovable_sites_hosting.md`, Master Rule (revised 2026-04-27).
  - **Phase 8 canary check** verifies GitHub HEAD vs live site after every Lovable commit — surfaces DRIFT (= "Lovable editor needs Pull + Publish click") in the email so Angelo can complete the loop.

### 4d. Verify (test-before-done)

Memory: `feedback_test_before_done.md` — never mark complete without verification:

- BirdsEye View + Lovable repos: `npm run build` must pass
- Static microsites: wrangler deploy must return success URL
- Scripts: `--dry-run` before live run
- Deployed page: `curl -s https://<domain>/<path> | wc -w` must be > 400 (not an empty shell)
- **Fact-check verifier** *(added 2026-05-12)*: `node ~/Workspaces/eros-workspace/scripts/verify-blog-facts.mjs --recent=2`
  - Scans last 2 days of deployed blogs for: false claims ("72-hour mandatory hold" myth), CA Penal Code citations without canonical context, unauthorized phone numbers, Insurance Code §1800.4 misuse
  - HARD errors (myth claims, wrong phone) → exit code 1 → DO NOT consider session complete until fixed
  - WARN issues → log in Phase 8 final report Section #26, fix in next session
  - Output: `~/Workspaces/eros-workspace/data/daily/<date>/factcheck-audit.json`

### 4e. Update calendars + mark published

After each blog ships:
- Mark the date as published in the site's April calendar
- **Blog email URLs:** always live site URL (`https://site.com/blog/slug`). NEVER `driveDocUrl`. Memory: `feedback_blog_email_urls.md`

**Realistic pace** (memory `feedback_blog_realistic_pace.md`):
- Microsites: 4-8 quality posts per session
- Main sites: 2-4 per session
- Never promise "all 28 today"
- **HARD FLOOR — 10 blogs/day minimum** *(added 2026-05-14)*. The pace ranges above are guidance; the 10-blog floor is a quota gate. Session is NOT complete until ≥10 blog files were authored + deployed today. Counted by `build-site-changelog.mjs` (Phase 8 step 8.5) which feeds Section #27. If blocked, document the blocker in the Phase 8 email — never silently skip the floor. Memory: `feedback_eros_day_10_blog_floor.md`.

---

## Phase 5 — GBP Posts *(Mondays only, replaces Mon 12pm cron)*

**Skip condition:** today is not Monday.

1. `node ~/Workspaces/reenergized/scripts/generate-gbp-posts.mjs --email` — weekly GBP post content
2. Boundless Global GBP: **skip** (cancelled 2026-03-20 — memory `feedback_boundless_gbp_cancelled.md`)
3. **Never rename a GBP** — hard suspension trigger. Use `parentOrganization` schema + weekly local posts + geotagged photos instead. Memory: `feedback_gbp_strategy_sean.md`

---

## Phase 6 — Email Digest *(replaces daily 7am cron)*

1. `node ~/Workspaces/eros-workspace/scripts/eros-email-digest.mjs`
2. Sends to `4434lifeline@gmail.com` only (never third parties — memory `feedback_email_send_only_to_angelo.md`)
3. Subject → `safeSubject()`, body → `markdownToHtml()` (memory `feedback_email_formatting.md`)
4. Gmail OAuth uses local `.env` GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN, never claude.ai Gmail integration (memory `feedback_gmail_local_oauth.md`)
5. `sendEmail(gmail, to, subject, html)` is positional — not object form (memory `feedback_email_utils_signatures.md`)

---

## Phase 7 — ClickUp Sync

1. Pull open/overdue tasks via ClickUp API
2. Close duplicate/stale tasks: `node ~/Workspaces/angelos-workspace/scripts/audit-close-dupes.mjs`
3. Create tasks for work done this session. **Always assign Angelo** (ID 88483014) on create via POST, PUT for updates. Memory: `feedback_clickup_assignee.md`
4. Update status on tasks touched: to do → in progress → (blocked or pending-review tag if applicable) → complete. Use `STATUS` constants from `~/Workspaces/angelos-workspace/scripts/eros-task-manager.mjs`. Post comment on every status change. Memory: `feedback_clickup_task_lifecycle.md`, `feedback_clickup_mandatory.md`
5. **Local tasks.md sync** — every workspace has `tasks.md` synced with ClickUp. Read both at session start, update both on task changes. Close completed ClickUp tasks immediately. Memory: `feedback_task_sync_local_md.md`
6. **Task saving protocol** — Angelo-needed items → `todo-angelo.md`. EROS unfinished tasks → project workspace (e.g., `seo-tasks/`, scripts). Rules/patterns → memory. Never silently drop a task. Memory: `feedback_task_saving_protocol.md`
7. Report: open / overdue / blocked count

---

## Phase 8 — Session End *(replaces all 35 autosave crons + log-session-progress)*

1. For each workspace touched this session (SKIP this whole phase for workspaces with 0 dirty files — no-op session for that repo):
   - `git status` → if dirty, `git add -A && git commit -m "session(YYYY-MM-DD): <summary>"`
   - `git push` (uses `~/.netrc` PAT, not Keychain)
   - **Never use `--allow-empty`** (no-empty-commits rule — memory `feedback_autosave_no_empty_commits.md`). Check `if git diff --staged --quiet; then exit 0; fi` first.
2. **Lovable canary check** (MANDATORY when any Lovable repo committed this session): `node ~/Workspaces/eros-workspace/scripts/lovable-canary-check.mjs`
   - Verifies GitHub HEAD matches live site. Catches the Lovable "GitHub pushed but publish not clicked" failure mode.
   - If DRIFT → include in summary email with action line: "Open Lovable editor for <repo> → Pull from GitHub → Publish."
   - If SHELL → canary cannot verify (4 Lovable sites serve empty HTML to bots). Note in session log, no action.
3. Run `node scripts/log-session-progress.mjs` in each touched workspace where present. Missing in: bailbondsdomesticviolence, vital-radar-ai-seo (fallback: `bash ~/Workspaces/angelos-workspace/scripts/eros-session-end-hook.sh`)
4. Create today's **Claude Progress doc** in Drive folder `1RmGJ0ND1eTfGk2b9yzInwpIpNdpGUtfO`:
   - Use **project-organized format** (Lovable / ReEnergized / Microsites / EROS infra / Blocked / Session log) — memory `feedback_progress_docs_project_organized.md`
   - Script pattern: `~/Workspaces/eros-workspace/scripts/create-april-progress-docs.mjs` + `reorganize-april-progress-docs.mjs`
5. Send EROS Day summary email (subject: `EROS Day — YYYY-MM-DD`, body: markdown→HTML). Email utils: `~/Workspaces/eros-workspace/scripts/email-utils.mjs`
   - **Always include tl;dr line at top** — 3 sentences max, SMS-friendly: "Shipped: X. Frozen until: Y. Next: Z."
6. Append any new learning to `~/Workspaces/angelos-workspace/eros/learning-log.md`
7. **Performance self-eval** (memory: `eros_core_identity.md`) — for any measurable output:
   - Rate 1-100 (data-driven, not effort-based)
   - What worked (cite numbers)
   - What did NOT work (honest failures)
   - What could be better (prescriptive)
   - Include action plan in email + ClickUp
8.5. **Per-site change log + Apply Loop scorer + Strategy results** *(added 2026-05-13)*: run THREE scripts BEFORE the final report so Section #27, #28, and #29 have data to render.
   - `node ~/Workspaces/eros-workspace/scripts/build-site-changelog.mjs` — scans git log across 35 active site repos for commits dated today; writes `data/daily/<date>/site-changelog.json` keyed by site → blog/service-page/schema/fix/deploy counts + commit details
   - `node ~/Workspaces/eros-workspace/scripts/compute-apply-ratio.mjs` — compares today's audit findings (uniqueness, fact-check) vs prior-session baseline; counts fixes applied; computes pass/fail per quota; writes `data/daily/<date>/apply-ratio.json` with verdict HEALTHY / NEEDS ATTENTION / RED
   - `node ~/Workspaces/eros-workspace/scripts/measure-strategy-results.mjs` — reads `~/Workspaces/eros-dashboard/strategies.json` registry; for every ACTIVE strategy, pulls treatment + control page GSC deltas vs start-date baseline; nets out via control; emits KEEP_SUCCESS / KILL_FAIL / NEUTRAL / IN_PROGRESS verdicts; writes `data/daily/<date>/strategy-results.json`. Surfaces check-in milestones (7/14/21/28 day) requiring decision.
   - `node ~/Workspaces/eros-workspace/scripts/build-strategy-timeline.mjs` *(added 2026-05-14)* — for each strategy, computes days elapsed / windowDays as a progress bar, mines past `strategy-results.json` files to build day-by-day delta history (clicks Δ, imps Δ), computes trend (PROGRESSING / FLAT / REGRESSING / VERDICT). Writes `data/daily/<date>/strategy-timeline.json`. Also auto-appends terminal verdicts (KEEP / KILL / NEUTRAL) to `~/Workspaces/eros-workspace/data/strategy-lessons-learned.md` for the running learning log. Final report Section #29.5 renders this with visual progress bars + last-7-day history table per strategy.
   - `node ~/Workspaces/eros-workspace/scripts/check-dashboard-sync.mjs` *(added 2026-05-13)* — audits the EROS Dashboard for drift. Verifies: server reachable on :3737, /api/skills matches disk, every Phase has data-sinks + plain-language coverage, glossary covers acronyms, skill-audit covers every skill, referenced scripts exist on disk, today's data JSONs preview-able. Writes `data/daily/<date>/dashboard-sync.json` with verdict IN SYNC / DRIFTING / BROKEN. Exit code 1 on any FAIL check. Section #30 renders this in the final report. Without this check, the dashboard could silently lag behind skill edits (a new Phase added but no plain-language summary → users see incomplete view).
   - Run order matters: build-site-changelog FIRST, then compute-apply-ratio (reads the changelog as research-apply evidence), then measure-strategy-results, then check-dashboard-sync (last — depends on everything else being on disk)

9. **MANDATORY — Refresh Blog Links Sheet + Keyword Bank** (added 2026-04-29, reinforced 2026-05-06):
   - `node ~/Workspaces/eros-workspace/scripts/blog-links-sheet.mjs` — refreshes the master blog index
     - Scans every site's blog directory + `src/data/blogPosts.ts` and writes 1 tab per site to a single Google Sheet
     - Sheet ID stored at `~/Workspaces/eros-workspace/config/blog-links-sheet-id.txt`
     - Includes SUMMARY tab with blog count + latest publish per site
     - Rate-limited (1.1s pause between writes + 65s backoff on quota)
     - Per-row data: Publish Date, Title, Slug, Live URL, File path, Word count
     - Memory: `feedback_blog_links_sheet.md`
   - `node ~/Workspaces/eros-workspace/scripts/sync-keyword-bank.mjs` — refreshes the EROS keyword bank with today's GSC pull (no-op if already run in Phase 1; safe to re-run as a backstop)
   - Run BOTH BEFORE the final report so the report links to the freshly-updated sheets and the keyword-bank summary feeds the per-site totals section.

9. **MANDATORY — EROS Day Final Report** (added 2026-04-28, enriched 2026-04-29 + 2026-05-06): `node ~/Workspaces/eros-workspace/scripts/eros-day-final-report.mjs`
   - **The single source-of-truth end-of-session deliverable. Sent to Angelo's email every /eros-day.**
   - Sections (always all of them, in this order):
     1. **Blog Links Sheet callout** — link to per-site blog index sheet
     2. **🔑 EROS Keyword Bank top callout** *(added 2026-05-06)* — sheet link + last-sync state + per-site totals table + grand total at the **top** of the email so Angelo sees the keyword pulse without scrolling. Mirrors the Blog Links callout style.
     3. **Rotation Target — Path C** — today's bucket sites + ✅/⬜ fulfillment vs target
     4. **Today's Session Activity** — quick numbers (blogs published / sites touched / Lovable commits / other commits) + per-repo commit list
     5. **Quality Gates** — uniqueness check + fact-check signature count
     6. **Position Improvements vs Last Week** — improved/regressed counts + per-site detail
     7. **In-Progress Audit** — open ClickUp count + overdue/blocked/pending-review + todo-angelo standing reminders + todo-eros carry-over + Lovable deferred-value backlog
     8. **Current GSC Standing** — per-site clicks/impressions/avg-pos/queries/strength keywords
     9. **GA4 Standing** *(added 2026-05-06)* — per-property sessions/users/conversions with WoW Δ vs prior snapshot
     10. **Network Kaizen Score WoW Δ** *(added 2026-05-06)* — per-site score + change vs prior snapshot + verdict
     11. **Microsite Network GSC Standing** — per-site clicks/imp/keywords/best-position table
     12. **Best Position Per Site** — lowest-pos strength keyword per site
     13. **Keyword Priorities — Where to Focus This Week** *(added 2026-05-06, extended 2026-05-12)* — TWO subsections, two questions:
         - **A. GSC Priorities** — top 20 network-wide keywords ranked by monthly clicks upside (`impressions × CTR-gap`). Each row labeled CTR-FIX (pos 1-10) or CONTENT-PUSH (pos 11-25). Answers *"what we already rank for — what's the CTR upside?"* Source: `prioritize-keywords.mjs`.
         - **B. Semrush Low-Hanging Fruit** *(added 2026-05-12)* — top 20 keywords from the local Semrush XLSX ranked by Volume × (1 − KD/100), cross-referenced against today's GSC. Each row labeled ALREADY-RANKING / STRIKING-DISTANCE / NET-NEW / DEEP-RESULTS + market SOCAL/NATIONAL. Answers *"what should we WRITE next?"* Source: `compute-semrush-lhf.py`. Per Angelo 2026-05-12: Semrush is REFERENCE; GSC + GA4 are the live BASIS.
     14. **Keyword Movement** — NEW / LOST / position-changed strength keywords vs prior week
     15. **Multi-Period Trend** — per-site 7d / 7w / 7m tables (depth grows naturally with each daily pull)
     16. **Keyword Bank Status (detailed)** — full per-site totals table + auto-sync logic + refresh state (✅ refreshed / 🚨 OAuth dead / ⚠️ stale). Auto-syncs if >7 days stale. Pairs with the top-of-email callout (#2) so Angelo sees the summary at a glance and the detail below.
     17. **Lovable Canary** — publish-drift items requiring Angelo action
     18. **What Worked / Could Be Better / Not Working** — auto-generated heuristics
     19. **Action Queue** — top keyword priority + Lovable drift + standing reminders
     20. **Bail-Bond Network Snapshot** *(added 2026-05-07)* — short summary of the latest `/bail-reports` weekly tab so daily session has the strategic picture without re-running the heavy report. Pulls from `~/Workspaces/test-1-bail-bond/dns-audit/master-domain-inventory-scored.json`:
         - Latest weekly tab name + age (e.g. "Report 2026-W19, 1 day old")
         - Tier counts: S/A/B/C/D
         - Decommission shortlist count
         - GSC group totals (Bail / Sean Sites / ReEnergized) for last 90 days
         - Link to master sheet
         - **5 lines max** — this is a pointer, not the full report. If data is >14 days stale, surface "Run /bail-reports to refresh."
     21. **Challenges Encountered & Fixes Applied** *(added 2026-05-08)* — auto-derived from today's git log across all workspaces (commits matching keywords like fix/repair/correct/violation/error). If `~/Workspaces/eros-workspace/data/daily/<date>/session-notes.md` exists, that file is rendered verbatim (richer context for the operator to capture issues the git log won't show, e.g., user-flagged regressions, vendor outages, design decisions).
     22. **Status Summary — Completed / In Progress / Blocked / Pending** *(added 2026-05-08)* — one-table snapshot reading `~/Workspaces/eros-workspace/data/daily/<date>/clickup-status.json` (populated by Phase 7). Sections: ✅ Completed today + 🟡 In Progress + 🔴 Blocked + ⏳ Pending Angelo review with task titles. Falls back gracefully if cache missing.
     23. **Active Site Tier Rankings** *(added 2026-05-11)* — S/A/B/C/D tier per active site, sorted DESC by score within each tier. Reads `~/Workspaces/eros-workspace/data/daily/<date>/active-tiers.json` (written by Phase 2 step 6 via `score-active-sites.mjs`). Sections: per-tier table with score / kind / GSC 90d clicks/imps/avg-pos / source (bail-master or Lovable parallel). Closing block re-states the Phase 3 triage rule so the daily decision-maker (or future-EROS reading the report) can act on the tier signal without scrolling. Drives priority for tomorrow's rotation: A-tier gets CTR rewrites, B-tier gets blog content, C-tier gets infra fixes, D-tier needs re-activate decision.
     24. **Full Bail-Bond Network Detail (from /bail-reports)** *(added 2026-05-12)* — the complete /bail-reports content rendered inline so the daily session has the full picture without opening the master sheet. Per Angelo 2026-05-12: "include all from /bail-reports in /eros-day as additional, do not remove anything already in eros day." Section #20 stays as the 5-line summary; Section #23 stays as the 35-active-sites tier table; Section #24 is the deep dive on all 215 bail domains. Subsections:
         - **24.1 Tier Distribution** — S/A/B/C/D counts + percentages + meaning per tier
         - **24.2 GSC Three-Group Totals — 5 Windows** — Bail / Sean Sites / ReEnergized aggregated separately (never blended — the 2026-05-07 reenergized-inflation regression stays permanently fixed via local SEAN_SITES + REENERGIZED constants matching `bail-reports-weekly.mjs`). Windows: current month, prev month, last 3mo, last 6mo, YTD
         - **24.3 Top 10 by Score** — domain, tier, score, GSC 90d, hosting, top keyword
         - **24.4 Per-Tier Full Listing** — every domain in every tier sorted by score DESC. Columns: domain, score, clicks 90d, imps 90d, avg pos, hosting, GBP, status. Long section (200+ rows) — by design; same data as the weekly sheet tab
         - **24.5 HTTP Probe Health** — Live / Redirect / Server problem / Unreachable counts from latest probe
         - **24.6 Hosting Breakdown** — CF Pages / Lovable / WordPress / Unknown counts
         - **24.7 Decommission Shortlist** — D-tier + auto-renew ON + zero GSC traffic, sorted by expiry date. Surfaces non-renewal candidates for Angelo decision
         - Reads same files /bail-reports consumes: `master-domain-inventory-scored.json`, `gsc-multi-window-YYYY-MM-DD.json`, `http-probe-YYYY-MM-DD.json` (all under `~/Workspaces/test-1-bail-bond/dns-audit/`)
     25. **Uniqueness Audit (Blog Network)** *(added 2026-05-12)* — reads `~/Workspaces/eros-workspace/data/daily/<date>/uniqueness-audit.json` (written by Phase 2 step 7 via `check-external-duplicates.mjs`). Shows: total blogs scanned, pass-rate %, count below 70% floor, top 10 worst-offender pages with sister-match. The "Apply Loop" Phase 4 rule requires ≥2 of these be rewritten this session — Section #28 reports whether the quota was met.
     26. **Fact-Check Audit** *(added 2026-05-12)* — reads `~/Workspaces/eros-workspace/data/daily/<date>/factcheck-audit.json` (written by Phase 4d via `verify-blog-facts.mjs`). Sections: HARD errors (must be zero — blocks deploy), WARN list (target zero, drawn down ≥3/session). The 3 hard-error blogs flagged 2026-05-12 must be cleared before any new content publishes.
     27. **Per-Site Change Log (Today)** *(added 2026-05-13)* — reads `~/Workspaces/eros-workspace/data/daily/<date>/site-changelog.json` (written by Phase 8 step 9 via `build-site-changelog.mjs`). One row per touched site with: blog count added, meta files modified, schema files modified, deploys, fixes. Answers the question "what actually shipped to each site today" — Angelo's recurring ask for visible per-site impact. Surfaces in Phase 8 email so review takes <1 min.
     28. **Apply Loop Score — Audits Applied vs Found** *(added 2026-05-13)* — counts audit findings (uniqueness, fact-check, research-apply, no-loans, GBP recovery) vs how many were actually fixed this session. Calculates apply ratio %. If <50%, surfaces RED warning + adds to standing-reminder list. If ≥80%, marks "Healthy Apply Loop". Memory: `feedback_apply_loop_mandatory.md`. This is the section that prevents the regression Angelo flagged 2026-05-13 ("we keep running this but we are not actually doing anything to improve our traffics").
     29. **Strategy Tests — What's Working / Not Working** *(added 2026-05-13)* — reads `data/daily/<date>/strategy-results.json`. Renders per-strategy table: id, title, status (active/planned/completed), days-in-test, verdict (KEEP_SUCCESS / KILL_FAIL / NEUTRAL / IN_PROGRESS / NOT_STARTED / NO_DATA), net clicks Δ %, net imps Δ %, decision. Test design rules table at the bottom (default window 28d, success criteria, kill criteria). Registry: `~/Workspaces/eros-dashboard/strategies.json` — add new experiments by appending to `strategies[]` with status `planned`. When ready to start, set `startDate` + `status: 'active'`. Auto-evaluated against control pages per Phase 8 step 8.5. Dashboard tab `🧪 Strategies` shows the same data with start/stop buttons.
     29.5. **Strategy Timeline — Progress, Regress, Verdict** *(added 2026-05-14)* — reads `data/daily/<date>/strategy-timeline.json` (written by `build-strategy-timeline.mjs`). Visual per-strategy progress bars showing days elapsed of 28-day window. For each strategy: trend (📈 PROGRESSING / 📉 REGRESSING / ➡️ FLAT / 🟡 BASELINE / ✅ KEEP / 🚨 KILL / ⚪ NEUTRAL / ⏳ planned), next check-in milestone with countdown date, last-7-day history table showing clicks Δ + imps Δ per day. Below each strategy entry. At bottom: pointer to `~/Workspaces/eros-workspace/data/strategy-lessons-learned.md` — auto-appended running log of terminal verdicts (KEEP / KILL / NEUTRAL) with strategy, source, date. This section answers "is the strategy progressing or regressing?" and "when is the next decision date?" without scrolling.
     30. **Dashboard Sync Check** *(added 2026-05-13)* — reads `data/daily/<date>/dashboard-sync.json`. Audits whether the EROS Dashboard at `http://127.0.0.1:3737` is in sync with the actual skill .md files + supporting JSON registries (data-sinks, plain-language, glossary, skill-audit, strategies). Renders the drift score (0-100%) + verdict (IN SYNC ≥90 / DRIFTING ≥60 / BROKEN <60) + every check with pass/warn/fail icon + the exact remediation command. Without this section, the dashboard could silently lag behind skill edits — e.g., a new Phase added to /eros-day but no plain-language summary written, so dashboard users see incomplete view. If drift score <90, surfaces as Phase 0 standing reminder so the operator fixes the drift before next session.
   - **Per-day Google Doc creation** *(added 2026-05-08)*: after the markdown report is saved + emailed, the same content is written to a Google Doc titled `EROS Day - YYYY-MM-DD` in Drive folder `1RmGJ0ND1eTfGk2b9yzInwpIpNdpGUtfO`. If today's doc already exists, content is replaced (not duplicated). Doc link is appended to the email body.
   - **Saves** to `~/Workspaces/angelos-workspace/eros/daily-reports/<date>.md` (durable file)
   - **Emails** to 4434lifeline@gmail.com (graceful-fails to file-only if OAuth dead — run `oauth-reauth.mjs` to fix)
   - Run as the FINAL step of every /eros-day. Never skip.
   - Re-runnable for any past date: `node eros-day-final-report.mjs YYYY-MM-DD`
   - Memory: `feedback_eros_day_final_report.md`. OAuth helper: `~/Workspaces/eros-workspace/scripts/oauth-reauth.mjs`

---

## Phase 9 — Continuous Self-Research *(Mondays only, added 2026-05-12)*

**Skip condition:** today is not Monday. This phase is heavy (WebSearch + synthesis), so it runs once per week.

**Goal:** keep EROS current with the latest SEO/AEO/GEO/hyperlocal/Claude best practices. The web moves fast — what worked in March may be obsolete by May. This phase captures the delta and surfaces it as actionable changes.

### What to do

1. **Pick 3–4 topics from the rotation list** (rotate so the same topic doesn't recur weekly):
   - Edward Sturm — Compact Keywords + 2026 SEO Playbook (the canonical reference for our keyword strategy)
   - Matt Diamante (HeyTony) — 2026 local SEO best practices, solution-based SEO
   - AEO best practices (ChatGPT / Perplexity / AI Overviews) — Answer Blocks pattern
   - GEO (Generative Engine Optimization) — schema markup + statistics + author authority for AI citation
   - Hyperlocal bail-bond / law-firm SEO — Google ads-banned-since-2018 context
   - YouTube SEO — for the deferred video coverage strategy
   - Claude API best practices — prompt caching, batch API, token efficiency (for when API credits resume)
2. **WebSearch each topic with current year** (e.g., "AEO best practices 2026 ChatGPT")
3. **Synthesize findings into `~/Workspaces/eros-workspace/data/research/<date>/findings.md`** using the template:
   - Bullet list of practices, each marked `✅ ALREADY DO / 🟡 PARTIAL / 🔴 ADD`
   - Cross-reference each finding to current EROS practice
   - Surface 2–3 actionable improvements at the end
4. **Update memory if a finding becomes a rule** — add to `~/.claude/projects/-Users-emmanuelpableo-Workspaces/memory/feedback_*.md` + MEMORY.md
5. **Surface in Phase 0 of next Tuesday's /eros-day** — if `data/research/<date>/findings.md` exists and was created today, mention in Phase 0 report

### Output

`~/Workspaces/eros-workspace/data/research/<date>/findings.md` — markdown research summary. The EROS Dashboard surfaces all research files in its "📚 Research" tab so Angelo can read accumulated learnings anytime.

### First run

Already executed 2026-05-12. Findings: `~/Workspaces/eros-workspace/data/research/2026-05-12/findings.md`. Two memory typo corrections (Edward Stern → Edward Sturm) applied + new actionable improvements identified (Answer Blocks pattern, Local Landmarks section, original-statistics for GEO citation).

### Memory

`feedback_continuous_self_research.md` (to be created in next session).

---

## Hard Rules (always apply)

### 🚨 The Master Rule (revised 2026-04-27)

**"If Googlebot can't see it now, write it for the day prerender ships."**

Content shipped into SPA-shell sites accrues value that activates the moment rendering is fixed. Direct visitors and brand-search traffic see the content immediately; Googlebot only sees it post-prerender. This is **deferred-value work, not wasted work** — provided two conditions hold:

1. The prerender decision (Path A/B/C) stays on the standing-reminder list and does not silently age out
2. Phase 8 summary email reports how much content went into SPA-shell sites this session, so Angelo sees the deferred-value backlog growing

**Phase 0 still runs the rendering gate** (2-signal test: empty React root + zero `<h1>`) and surfaces the FROZEN-shell status. The status informs strategy, not a hard freeze. Angelo can elect to write into shell sites; EROS executes and tracks.

**The "frozen" label is reserved for** sites that fail the gate AND have no clear prerender plan. Currently no site is fully frozen — all 4 Lovable sites have a deferred Path A/B/C decision in flight.

Why this rule was revised: April 2026 — original strict freeze ("don't write at all") felt safer but ignored two facts. (1) Direct/social/email visitors do see Lovable content right now. (2) Once prerender ships (whichever path Angelo picks), pre-existing content gets indexed at the speed of Googlebot's next crawl. Stockpiling content during the freeze period is not wasted — it front-loads the post-prerender SEO recovery.

Empirical evidence the SEO methodology itself is sound: ReEnergized (WordPress, non-Lovable) — 165 clicks / 14,082 imp / 442 keywords from the exact same methodology. The methodology works where rendering works.

### Content
- **No API calls for AI content generation** — credits=0. All blog/meta/FAQ writing happens in this session directly. Memory: `feedback_claude_code_only_generation.md`
- **Fact-check gate is mandatory** — WebSearch primary keyword + verify laws/stats BEFORE writing any YMYL content. Memory: `feedback_blog_fact_check.md`
- **One focused primary keyword per page** — Edward Sturm compact keyword rule. Memory: `feedback_compact_keywords.md`
- **E-E-A-T on every piece** — author bio, JSON-LD schema, specific CA Penal Codes, county jail/courthouse info, "not legal advice" disclaimer, empathetic tone. Memory: `feedback_eeat_all_content.md`
- **CTR meta — urgency-first** ("Arrested in [City]?" not company name). Memory: `feedback_ctr_meta_descriptions.md`
- **🚨 NO LOANS AS A SERVICE — surface-aware (refined 2026-05-07).** Sean does **bonds**, not loans. Two surface types — different rules:
  - **Service surfaces (zero tolerance):** homepage, services, about, contact, meta titles describing the service, JSON-LD `Service`/`Offer`, GBP descriptions, ClickUp task titles, email subjects. ZERO hits on `grep -iE "\b(loan|lend|lender|lending|borrow|financ|credit)\b"` allowed (excluding the licensed-credential exception strings).
  - **Comparison/educational content (allowed AND encouraged):** blog posts, FAQ pages, educational sections within service pages titled "Bail Bonds vs Bail Loans" or similar. Use loan vocabulary deliberately to rank for the query, then pivot to the bond product. Always cite §1800.4. Always close with the licensed bondsman CTA.
  - **Broader keyword strategy:** pursue high-volume low-difficulty queries beyond just "bail loans" — "free bail money", "no money down bail", "credit card bail", "no collateral bail", "low bail [city]", etc. Same pattern: rank for the query, correct the misconception, route to bond service. Niche stays bonds — keep ≥70% pure bond content, ≤30% comparison/educational.
  - Memory: `feedback_no_bail_loans.md`. The 10% premium is a STATUTORY FEE (Cal Ins Code §1800.4), not money lent.
- **Microsite keyword stagger** — never same topic across 28 cities on one day. Memory: `feedback_microsite_keyword_stagger.md`
- **Blog pace** — realistic: 4-8 microsite posts or 2-4 main-site posts per session. Memory: `feedback_blog_realistic_pace.md`
- **Blog floor** — minimum 10 blogs per weekday /eros-day session (added 2026-05-14). Quota gate, not target. Memory: `feedback_eros_day_10_blog_floor.md`

### Deploy
- **Lovable SPA sites — continue authoring + push to GitHub (updated 2026-05-14)** — BailbondsDV, VitalRadar, Boundless, Bullion. Googlebot indexing waits for prerender to ship, but EROS keeps writing + pushing to each site's GitHub remote (vitalradarai-source/<repo>) so the content backlog is ready the moment prerender goes live. Lovable blog commits count toward the 10-blog/day floor. Memory: `feedback_spa_prerender_budget.md`, `feedback_lovable_sites_hosting.md`, `feedback_eros_day_10_blog_floor.md`, Master Rule (revised 2026-04-27).
- **Workspace folder ≠ production domain** — always resolve via `npx wrangler pages project list`. Memory: `feedback_microsite_domain_map.md`
- **Test before done** — `npm run build` for Lovable repos, dry-run for scripts, curl check for deployed pages. Memory: `feedback_test_before_done.md`

### Tooling
- **No MCP servers** — all removed 2026-04-07. Use `curl`, scripts, `wrangler` for all services. Memory: `feedback_no_mcp_pure_api.md`
- **Auto model switching** — Haiku (parsing/batch/status), Sonnet (reports/analysis/code), Opus (YMYL legal/strategy). Default Sonnet. Memory: `feedback_auto_model_switching.md`
- **GBP rename = hard suspension** — never rename a GBP. Use `parentOrganization` schema instead. Memory: `feedback_gbp_strategy_sean.md`

### Communication
- **Email only to 4434lifeline@gmail.com** — never third parties.
- **Blog email URLs:** live site URL only (`https://site.com/blog/slug`). NEVER `driveDocUrl`.
- **Email formatting:** `safeSubject()` + `markdownToHtml()` + `emailShell()`. Never raw markdown in email body.
- **ClickUp: always assign Angelo** (ID 88483014) on create.
- **Status constants** — use `STATUS` from `eros-task-manager.mjs` for all ClickUp transitions.

### Files & commits
- **No emojis in files** unless explicitly requested.
- **Never `--allow-empty`** in commits. Check `git diff --staged --quiet` first.
- **`.env.shared`** at `~/Workspaces/.env.shared` (0600, outside git) is central credentials. Per-project `.env` files remain as fallback.

---

## Migration from crons (ref)

Former cron → new phase map:

| Former cron | Replaced by |
|---|---|
| GSC weekly reports (daily Mon-Fri 9am × 5 sites) | Phase 1 |
| Keyword bank sync (daily Mon-Fri 6:45am) | Phase 1 |
| SEO improve (daily Mon-Fri 10am × 5 sites) | Phase 2 |
| Kaizen daily (6am) | Phase 2 |
| Watchdog health checks | Phase 2 |
| GBP posts (Mon 12pm) | Phase 5 |
| Email digest (daily 7am) | Phase 6 |
| Autosave scripts (every 5min × 35 workspaces) | Phase 8 + Stop hook |

Crontab backup: `eros-workspace/config/crontab-backup-2026-04-23.txt` (restore with `crontab < backup.txt` if needed).

---

## Memory references (deep rules)

All feedback memories at `~/.claude/projects/-Users-emmanuelpableo-Workspaces/memory/`. Reading order when in doubt:

1. `feedback_no_crons.md` — this skill IS the scheduler
2. `feedback_eros_day_bail_reports_integration.md` — how /eros-day references /bail-reports without duplicating work
3. `feedback_blog_fact_check.md` — mandatory fact-check gate
3. `feedback_eeat_all_content.md` — E-E-A-T requirements
4. `feedback_ctr_meta_descriptions.md` — urgency-first pattern
5. `feedback_compact_keywords.md` — one focused primary
6. `feedback_no_bail_loans.md` — Sean is a bondsman
7. `feedback_microsite_keyword_stagger.md` — stagger rule
8. `feedback_blog_realistic_pace.md` — 4-8 / 2-4 pace
9. `feedback_microsite_domain_map.md` — folder ≠ domain
10. `feedback_test_before_done.md` — verify before complete
11. `project_keyword_bank_gsheet.md` — source of truth for topics
12. `feedback_data_driven_seo_triage.md` — 0 clicks = skip blog
