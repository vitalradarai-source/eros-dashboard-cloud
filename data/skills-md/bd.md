# /bd — Update BirdsEye View

When Angelo says `/bd` or "update bd", he means: update the Angels Bail Bonds pipeline data in BirdsEye View.

## What to do

Angelo will provide one or more site slugs and a status update. Apply the following:

### Common status updates:

**"DNS in GoDaddy" / "DNS elsewhere"**
- Set `dns: "godaddy"` on the site in `angels-bail-bonds-sites.json`
- Set `active_site: "[domain]"` if an active competing site exists at a similar domain
- Recalculate `summary.dns_godaddy` count
- Update `cloudflare-deploy-results.json` with same `dns` and `active_site` fields

**"Removed from Cloudflare"**
- Set `deploy_status: "removed"` or note it in CF results
- Keep the site in BirdsEye — never delete, just update status

**"GSC connected"**
- Set `gsc_connected: true` on the site
- Recalculate `summary.gsc_connected` count

**"GA4 connected"**
- Set `ga4_connected: true` on the site
- Recalculate `summary.ga4_connected` count

**"Custom domain live"**
- Set `custom_domain_live: true`, `custom_domain: "https://[domain]"`, `dns: "cloudflare"`
- Recalculate `summary.custom_domain_live` and `summary.pages_dev_only`
- **AUTO-ONBOARDING TRIGGER:** Create a ClickUp task in Angels Bail Bonds Website/SEO list (901414136549):
  - Title: `Write DV blog post for [slug] — [domain]`
  - Status: `to do`
  - Priority: `high`
  - Description: `New site went live. Write a domestic violence bail bonds blog post for /blog/[city]-domestic-violence-bail-bonds.html. Follow the standard DV blog format: city jail + courthouse, PC § 273.5 / 243(e)(1) / 422 bail amounts, no false 72-hour hold, EPO contact-restriction only, 10% premium.`
- Also check if a local `blog/` dir exists for the slug — if not, note it as an action item

**"SEO audit active"**
- Set `seo_audit_active: true`
- Recalculate `summary.seo_audit_active`

## Files to update

1. `/Users/emmanuelpableo/Workspaces/birdseye-view/src/data/angels-bail-bonds-sites.json`
2. `/Users/emmanuelpableo/Workspaces/sean-projects/microsites/cloudflare-deploy-results.json` (if deploy status changed)

## After updating

Always:
1. Recalculate all affected summary counts
2. `npm run build` in `/Users/emmanuelpableo/Workspaces/birdseye-view` to verify no errors
3. Commit + push both repos (birdseye-view + sean-projects)

Commit message format:
```
bd update: [slug] — [what changed]
```
