# EROS Dashboard — Cloud

Cloudflare Pages deployment of the EROS internal dashboard. Login-gated. Auto-deploys on push to `main`.

## Architecture

```
Frontend (SPA)        → Cloudflare Pages (static)
Backend (auth + KV)   → Cloudflare Pages Functions
Database              → GitHub repo (data/) + Cloudflare KV (operator notes, session log)
Source of truth       → Local Mac (~/.claude/commands/, ~/Workspaces/eros-workspace/data/)
Publish flow          → /eros-day Phase 8.6 runs publish-dashboard.mjs → git push → Pages auto-deploy
```

## Auth

HTTP password protection via signed JWT cookie:

1. User visits `eros.bail-bonds.com` (or any subdomain)
2. `functions/_middleware.js` checks `eros_session` cookie
3. Missing or invalid → redirect to `/login.html`
4. POST `/api/login` verifies username/password against env vars
5. Issues 7-day JWT cookie (HttpOnly, Secure, SameSite=Lax)
6. Subsequent requests authenticated transparently
7. Logout link in sidebar clears cookie

**Required Pages env vars** (set in Cloudflare dashboard → Pages → Project → Settings → Environment Variables):

- `DASHBOARD_USER` — username (default: `vitalradar`)
- `DASHBOARD_PASSWORD_HASH` — PBKDF2-SHA256 hash in format `salt$iterations$hash`. Generate with `scripts/hash-password.mjs <password>`.
- `JWT_SECRET` — random 32+ char string for HMAC signing

## Publishing data

Local Mac runs:
```bash
node ~/Workspaces/eros-dashboard-cloud/scripts/publish-dashboard.mjs
cd ~/Workspaces/eros-dashboard-cloud && git add data && git commit -m "publish dashboard data" && git push
```

That triggers Pages auto-deploy (~60 sec). The dashboard then reflects the new snapshot.

For automation: `/eros-day` Phase 8.6 runs the script + push automatically every weekday session.

## Local development

```bash
npx wrangler pages dev . --port 8788
```

Serves the SPA + Functions on `http://127.0.0.1:8788`. Env vars from `.dev.vars`.

## Repository structure

```
eros-dashboard-cloud/
├── public/
│   ├── index.html        — main SPA shell
│   ├── login.html        — login form
│   ├── app.js            — SPA logic (cloud-mode adapter at top)
│   └── style.css
├── functions/
│   ├── _middleware.js    — auth gate on all routes
│   └── api/
│       ├── login.js      — POST /api/login
│       ├── logout.js     — POST /api/logout
│       └── health.js     — GET /api/health
├── data/                 — committed by /eros-day Phase 8.6
│   ├── meta.json         — publish timestamp
│   ├── skills-list.json
│   ├── skills/<name>.json
│   ├── skills-md/<name>.md
│   ├── sinks.json
│   ├── glossary.json
│   ├── plain-language.json
│   ├── skill-audit.json
│   ├── strategies.json
│   ├── strategy-timeline.json
│   ├── apply-ratio.json
│   ├── uniqueness-audit.json
│   ├── factcheck-audit.json
│   ├── active-tiers.json
│   ├── site-changelog.json
│   ├── bail-master.json
│   ├── bail-tabs.json
│   ├── research-list.json + research/<date>.md
│   └── reports-list.json + reports/<date>.md
└── scripts/
    └── publish-dashboard.mjs  — compiles local files → data/
```
