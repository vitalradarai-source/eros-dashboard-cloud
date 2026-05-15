#!/usr/bin/env node
/**
 * Publish local dashboard data → eros-dashboard-cloud/data/
 *
 * Reads from the operator's Mac and writes static JSON files the Pages
 * SPA can fetch from same-origin /data/* paths after auth gate.
 *
 * Run by /eros-day Phase 8 step 8.6 (or manually as `eros-publish`).
 *
 * Inputs:
 *   ~/.claude/commands/*.md                     — skill files
 *   ~/Workspaces/eros-dashboard/data-sinks.json
 *   ~/Workspaces/eros-dashboard/glossary.json
 *   ~/Workspaces/eros-dashboard/plain-language.json
 *   ~/Workspaces/eros-dashboard/skill-audit.json
 *   ~/Workspaces/eros-dashboard/strategies.json
 *   ~/Workspaces/eros-dashboard/bail-tabs-cache.json
 *   ~/Workspaces/eros-workspace/data/daily/<latest>/*.json
 *   ~/Workspaces/eros-workspace/data/research/<date>/findings.md
 *   ~/Workspaces/angelos-workspace/eros/daily-reports/*.md
 *
 * Outputs (all relative to eros-dashboard-cloud/data/):
 *   meta.json                — publish timestamp, source dates
 *   skills-list.json         — array of {name, sizeBytes, mtime}
 *   skills/<name>.json       — parsed structure per skill
 *   skills-md/<name>.md      — raw .md content per skill
 *   sinks.json               — full data-sinks registry
 *   glossary.json
 *   plain-language.json
 *   skill-audit.json
 *   strategies.json
 *   strategy-timeline.json   — latest from data/daily
 *   apply-ratio.json         — latest from data/daily
 *   uniqueness-audit.json    — latest
 *   factcheck-audit.json     — latest
 *   active-tiers.json        — latest
 *   site-changelog.json      — latest
 *   bail-tabs.json
 *   bail-master.json         — bail-bond master inventory (215 domains)
 *   research-list.json       — array of {date, title, sizeBytes}
 *   research/<date>.md       — raw findings per date
 *   reports-list.json        — array of EROS Day report dates
 *   reports/<date>.md        — raw daily report per date
 */
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, basename } from 'node:path';

const HOME = homedir();
const WORKSPACES = `${HOME}/Workspaces`;
const COMMANDS_DIR = `${HOME}/.claude/commands`;
const DASHBOARD_DIR = `${WORKSPACES}/eros-dashboard`;
const CLOUD_REPO = `${WORKSPACES}/eros-dashboard-cloud`;
const DATA_OUT = `${CLOUD_REPO}/data`;

function ensureDir(d) { if (!existsSync(d)) mkdirSync(d, { recursive: true }); }
function readJson(p, fb = null) { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fb; } }
function writeJson(p, obj) { ensureDir(p.replace(/\/[^/]+$/, '')); writeFileSync(p, JSON.stringify(obj, null, 2)); }

// ── parse a skill .md (same logic as local server.mjs) ────────────────
function parseSkill(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const name = basename(filePath, '.md');
  const stat = statSync(filePath);
  const lines = raw.split('\n');
  const sections = [];
  let currentSection = null;
  let titleLine = '';
  const preamble = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('# ') && !titleLine) {
      titleLine = line.replace(/^#\s+/, '').trim();
      continue;
    }
    if (line.startsWith('## ')) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        heading: line.replace(/^##\s+/, '').trim(),
        depth: 2,
        startLine: i + 1,
        body: '',
        subsections: [],
        scripts: [],
        files: [],
        urls: [],
      };
      continue;
    }
    if (line.startsWith('### ') && currentSection) {
      currentSection.subsections.push({
        heading: line.replace(/^###\s+/, '').trim(),
        startLine: i + 1,
      });
    }
    if (currentSection) {
      currentSection.body += line + '\n';
      const scriptMatch = line.match(/(node|python3?|bash|sh|wrangler)\s+[^`'"\n]*?([a-zA-Z0-9_\-/.~]+\.(mjs|js|py|sh|html|json))/g);
      if (scriptMatch) {
        for (const m of scriptMatch) {
          if (!currentSection.scripts.includes(m)) currentSection.scripts.push(m.slice(0, 200));
        }
      }
      const fileMatch = line.match(/(~\/Workspaces\/[a-zA-Z0-9_\-/.]+|\/Users\/[a-zA-Z0-9_\-/.]+)/g);
      if (fileMatch) {
        for (const m of fileMatch) {
          if (!currentSection.files.includes(m) && m.length < 200) currentSection.files.push(m);
        }
      }
      const urlMatch = line.match(/https?:\/\/[^\s)\]"`]+/g);
      if (urlMatch) {
        for (const m of urlMatch) {
          if (!currentSection.urls.includes(m) && m.length < 300) currentSection.urls.push(m);
        }
      }
    } else if (titleLine) {
      preamble.push(line);
    }
  }
  if (currentSection) sections.push(currentSection);

  for (const s of sections) {
    const m = s.heading.match(/^Phase\s+(\d+(?:\.\d+)?)\b/i);
    s.isPhase = !!m;
    s.phaseNumber = m ? m[1] : null;
  }

  return {
    name,
    title: titleLine || name,
    filePath,
    mtime: stat.mtime.toISOString(),
    sizeBytes: stat.size,
    preamble: preamble.join('\n').trim(),
    sections,
    rawLength: raw.length,
    sectionCount: sections.length,
    phaseCount: sections.filter((s) => s.isPhase).length,
  };
}

// ── 1. Skills ─────────────────────────────────────────────────────────
console.log('📚 Publishing skills...');
const skillFiles = existsSync(COMMANDS_DIR)
  ? readdirSync(COMMANDS_DIR).filter((f) => f.endsWith('.md'))
  : [];

ensureDir(`${DATA_OUT}/skills`);
ensureDir(`${DATA_OUT}/skills-md`);
const skillsList = [];
for (const f of skillFiles) {
  const fp = `${COMMANDS_DIR}/${f}`;
  const name = basename(f, '.md');
  try {
    const parsed = parseSkill(fp);
    writeJson(`${DATA_OUT}/skills/${name}.json`, parsed);
    copyFileSync(fp, `${DATA_OUT}/skills-md/${f}`);
    skillsList.push({
      name,
      filePath: fp,
      sizeBytes: parsed.sizeBytes,
      mtime: parsed.mtime,
    });
  } catch (e) {
    console.warn(`  ⚠️  Failed to parse ${f}: ${e.message}`);
  }
}
writeJson(`${DATA_OUT}/skills-list.json`, skillsList);
console.log(`  ✓ ${skillsList.length} skills`);

// ── 2. Registries (resolve sinks live for freshness data) ─────────────
console.log('📋 Publishing registries...');
for (const reg of ['data-sinks', 'glossary', 'plain-language', 'skill-audit', 'strategies']) {
  const src = `${DASHBOARD_DIR}/${reg}.json`;
  if (!existsSync(src)) { console.warn(`  ⚠️  ${reg}.json missing`); continue; }
  const data = readJson(src);
  delete data._doc;
  delete data._lastUpdated;
  delete data._ratingScale;
  const outName = reg === 'data-sinks' ? 'sinks' : reg;
  writeJson(`${DATA_OUT}/${outName}.json`, data);
  console.log(`  ✓ ${outName}.json`);
}

// ── 3. Today's daily snapshot ─────────────────────────────────────────
console.log('📊 Publishing today\'s daily data...');
const dailyRoot = `${WORKSPACES}/eros-workspace/data/daily`;
if (existsSync(dailyRoot)) {
  const dates = readdirSync(dailyRoot)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .reverse();
  const latest = dates[0];
  if (latest) {
    const latestDir = `${dailyRoot}/${latest}`;
    for (const f of readdirSync(latestDir)) {
      if (!f.endsWith('.json')) continue;
      copyFileSync(`${latestDir}/${f}`, `${DATA_OUT}/${f}`);
    }
    console.log(`  ✓ daily snapshot from ${latest}`);
  }
}

// ── 4. Bail master inventory + tab list ───────────────────────────────
console.log('🏛 Publishing bail master inventory...');
const bailMaster = `${WORKSPACES}/test-1-bail-bond/dns-audit/master-domain-inventory-scored.json`;
if (existsSync(bailMaster)) {
  copyFileSync(bailMaster, `${DATA_OUT}/bail-master.json`);
  console.log('  ✓ bail-master.json (215 domains)');
}
const bailTabs = `${DASHBOARD_DIR}/bail-tabs-cache.json`;
if (existsSync(bailTabs)) {
  copyFileSync(bailTabs, `${DATA_OUT}/bail-tabs.json`);
  console.log('  ✓ bail-tabs.json');
}

// ── 5. Research findings ──────────────────────────────────────────────
console.log('📚 Publishing research findings...');
const researchRoot = `${WORKSPACES}/eros-workspace/data/research`;
ensureDir(`${DATA_OUT}/research`);
const researchList = [];
if (existsSync(researchRoot)) {
  const dates = readdirSync(researchRoot)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .reverse();
  for (const d of dates) {
    const file = `${researchRoot}/${d}/findings.md`;
    if (!existsSync(file)) continue;
    const stat = statSync(file);
    const content = readFileSync(file, 'utf8');
    const titleMatch = content.match(/^#\s+(.+)$/m);
    copyFileSync(file, `${DATA_OUT}/research/${d}.md`);
    researchList.push({
      date: d,
      title: titleMatch ? titleMatch[1] : `Research ${d}`,
      sizeBytes: stat.size,
      mtime: stat.mtime.toISOString(),
    });
  }
}
writeJson(`${DATA_OUT}/research-list.json`, { entries: researchList });
console.log(`  ✓ ${researchList.length} research entries`);

// ── 6. EROS Day reports (last 30 days) ────────────────────────────────
console.log('📝 Publishing EROS Day reports...');
const reportsRoot = `${WORKSPACES}/angelos-workspace/eros/daily-reports`;
ensureDir(`${DATA_OUT}/reports`);
const reportsList = [];
if (existsSync(reportsRoot)) {
  const files = readdirSync(reportsRoot)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .sort()
    .reverse()
    .slice(0, 30);
  for (const f of files) {
    const src = `${reportsRoot}/${f}`;
    const stat = statSync(src);
    copyFileSync(src, `${DATA_OUT}/reports/${f}`);
    reportsList.push({
      date: f.replace('.md', ''),
      sizeBytes: stat.size,
      mtime: stat.mtime.toISOString(),
    });
  }
}
writeJson(`${DATA_OUT}/reports-list.json`, { reports: reportsList });
console.log(`  ✓ ${reportsList.length} daily reports`);

// ── 7. Meta + publish timestamp ───────────────────────────────────────
const meta = {
  publishedAt: new Date().toISOString(),
  publishedDate: new Date().toISOString().slice(0, 10),
  skillCount: skillsList.length,
  researchCount: researchList.length,
  reportCount: reportsList.length,
  bailDomainCount: existsSync(`${DATA_OUT}/bail-master.json`) ? readJson(`${DATA_OUT}/bail-master.json`, []).length : 0,
};
writeJson(`${DATA_OUT}/meta.json`, meta);
console.log('');
console.log(`✅ Publish complete — ${DATA_OUT}`);
console.log(`   Skills: ${meta.skillCount} · Research: ${meta.researchCount} · Reports: ${meta.reportCount} · Bail domains: ${meta.bailDomainCount}`);
console.log(`   Run: cd ${CLOUD_REPO} && git add data && git commit -m "publish dashboard data" && git push`);
