// EROS Dashboard — Phase 1 client
// Renders .md skill files as a navigable tree. Marked converts the body
// of each section to HTML on the client so what the user sees is 1:1
// with the source markdown.

const skillList = document.getElementById('skill-list');
const content = document.getElementById('content');
const skillTitle = document.getElementById('skill-title');
const skillMeta = document.getElementById('skill-meta');
const serverStatus = document.getElementById('server-status');
const tabTree = document.getElementById('tab-tree');
const tabFlow = document.getElementById('tab-flow');
const tabSource = document.getElementById('tab-source');

// Initialize Mermaid for flow diagrams
if (typeof mermaid !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      primaryColor: '#1e293b',
      primaryTextColor: '#e2e8f0',
      primaryBorderColor: '#38bdf8',
      lineColor: '#94a3b8',
      secondaryColor: '#334155',
      tertiaryColor: '#0f172a',
    },
    flowchart: { curve: 'basis', padding: 18 },
  });
}

let currentSkillName = null;
let currentSkillData = null;
let currentSkillSinks = null;
let currentSkillPlain = null;
let currentView = 'tree';
let glossary = {};
let plainMode = true; // default ON for non-tech-friendly experience
const layout = document.querySelector('.layout');
const previewClose = document.getElementById('preview-close');
const previewTitle = document.getElementById('preview-title');
const previewMeta = document.getElementById('preview-meta');
const previewContent = document.getElementById('preview-content');

// ── API helpers ───────────────────────────────────────────────────────
//
// Cloud-mode adapter — Pages serves static /data/*.json files instead of
// running a live Express server. This adapter maps the original /api/*
// paths used in the SPA to the static file layout produced by
// publish-dashboard.mjs.
//
// /api/health                  → /api/health (real Pages Function)
// /api/skills                  → /data/skills-list.json
// /api/skills/:name            → /data/skills/:name.json
// /api/skill-source/:name      → /data/skills-md/:name.md (text)
// /api/sinks/:skill            → /data/sinks.json (filtered client-side)
// /api/glossary                → /data/glossary.json
// /api/plain-language          → /data/plain-language.json
// /api/plain-language/:skill   → /data/plain-language.json (filtered)
// /api/audit                   → /data/skill-audit.json
// /api/research                → /data/research-list.json
// /api/research/:date          → /data/research/:date.md (wrapped)
// /api/strategies              → /data/strategies.json
// /api/strategy-timeline       → /data/strategy-timeline.json
// /api/reports                 → /data/reports-list.json
// /api/reports/eros-day/:date  → /data/reports/:date.md (wrapped)
// /api/bail-tabs               → /data/bail-tabs.json
// /api/preview, /api/events    → unsupported in cloud mode

function cloudMapPath(path) {
  // Login + logout + health pass through unchanged (real Functions)
  if (path === '/api/health' || path === '/api/login' || path === '/api/logout') return null;

  const m1 = path.match(/^\/api\/skills$/);
  if (m1) return { url: '/data/skills-list.json' };

  const m2 = path.match(/^\/api\/skills\/([^/]+)$/);
  if (m2) return { url: `/data/skills/${m2[1]}.json` };

  const m3 = path.match(/^\/api\/skill-source\/([^/]+)$/);
  if (m3) return { url: `/data/skills-md/${m3[1]}.md`, asText: true };

  const m4 = path.match(/^\/api\/sinks\/([^/]+)$/);
  if (m4) {
    return {
      url: '/data/sinks.json',
      transform: (data) => data[m4[1]] || {},
    };
  }

  if (path === '/api/glossary') return { url: '/data/glossary.json' };

  const m5 = path.match(/^\/api\/plain-language\/([^/]+)$/);
  if (m5) return { url: '/data/plain-language.json', transform: (data) => data[m5[1]] || {} };
  if (path === '/api/plain-language') return { url: '/data/plain-language.json' };

  if (path === '/api/audit') return { url: '/data/skill-audit.json' };

  if (path === '/api/research') return { url: '/data/research-list.json' };
  const m6 = path.match(/^\/api\/research\/([^/]+)$/);
  if (m6) return {
    url: `/data/research/${m6[1]}.md`,
    asText: true,
    transform: (text) => ({ date: m6[1], content: text, mtime: new Date().toISOString() }),
  };

  if (path === '/api/strategies') return { url: '/data/strategies.json',
    transform: (data) => ({ registry: data, latestResults: null }),
  };
  if (path === '/api/strategy-timeline') return {
    url: '/data/strategy-timeline.json',
    transform: (data) => ({ date: data.date, data }),
  };

  if (path === '/api/reports') {
    return {
      url: '/data/reports-list.json',
      transform: async (data) => {
        // Need to also include sheets + driveDocs for the Reports tab
        const sheets = [
          { key: 'bailReports', type: 'google-sheet', title: 'Bail-Bond Network Master Sheet',
            description: 'Additive weekly tabs + GSC Bank. 215-domain bail network.',
            sheetId: '1GeiGAy2kCxpm25h-1Z5vCE4IQpeP48elXNe2XYk9S-Y',
            embedUrl: 'https://docs.google.com/spreadsheets/d/1GeiGAy2kCxpm25h-1Z5vCE4IQpeP48elXNe2XYk9S-Y/htmlembed',
            openUrl: 'https://docs.google.com/spreadsheets/d/1GeiGAy2kCxpm25h-1Z5vCE4IQpeP48elXNe2XYk9S-Y',
          },
          { key: 'keywordBank', type: 'google-sheet', title: 'EROS Keyword Bank',
            description: '1 tab per site. ~1,500 keywords aggregated from GSC + Semrush.',
            sheetId: '1i1hTIw50Vzudp_0BrclAVgBcHbwQVP0PhqGHwMrl5tw',
            embedUrl: 'https://docs.google.com/spreadsheets/d/1i1hTIw50Vzudp_0BrclAVgBcHbwQVP0PhqGHwMrl5tw/htmlembed',
            openUrl: 'https://docs.google.com/spreadsheets/d/1i1hTIw50Vzudp_0BrclAVgBcHbwQVP0PhqGHwMrl5tw',
          },
          { key: 'blogLinks', type: 'google-sheet', title: 'Blog Links Index',
            description: '1 tab per site (35 sites). Every blog URL + word count.',
            sheetId: '1vjf9i4PWrcJeoRO_eQazVEjHrKM4WKusNpcTXwIFLWg',
            embedUrl: 'https://docs.google.com/spreadsheets/d/1vjf9i4PWrcJeoRO_eQazVEjHrKM4WKusNpcTXwIFLWg/htmlembed',
            openUrl: 'https://docs.google.com/spreadsheets/d/1vjf9i4PWrcJeoRO_eQazVEjHrKM4WKusNpcTXwIFLWg',
          },
        ];
        const reports = (data.reports || []).map((r) => ({
          date: r.date,
          type: 'markdown',
          title: `EROS Day Report — ${r.date}`,
          sizeBytes: r.sizeBytes,
          mtime: r.mtime,
          previewEndpoint: `/api/reports/eros-day/${r.date}`,
        }));
        return {
          categories: {
            erosDayReports: reports,
            sheets,
            driveDocs: {
              folderId: '1RmGJ0ND1eTfGk2b9yzInwpIpNdpGUtfO',
              folderUrl: 'https://drive.google.com/drive/folders/1RmGJ0ND1eTfGk2b9yzInwpIpNdpGUtfO',
              description: 'Per-day Google Doc mirror of every EROS Day report.',
              embedUrl: 'https://drive.google.com/embeddedfolderview?id=1RmGJ0ND1eTfGk2b9yzInwpIpNdpGUtfO#list',
            },
          },
        };
      },
    };
  }
  const m7 = path.match(/^\/api\/reports\/eros-day\/(.+)$/);
  if (m7) return {
    url: `/data/reports/${m7[1]}.md`,
    asText: true,
    transform: (text) => ({ date: m7[1], content: text, mtime: new Date().toISOString(), sizeBytes: text.length }),
  };

  if (path === '/api/bail-tabs') return { url: '/data/bail-tabs.json' };

  // Preview / SSE not supported in cloud mode — return graceful empty
  if (path.startsWith('/api/preview')) return { url: null, fallback: { format: 'text', content: '(preview unavailable in cloud mode)', sizeBytes: 0, mtime: '' } };

  return null;
}

async function api(path) {
  const mapping = cloudMapPath(path);
  if (mapping === null) {
    // Real endpoint (Pages Function) — call directly
    const r = await fetch(path);
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    const ct = r.headers.get('content-type') || '';
    return ct.includes('application/json') ? r.json() : r.text();
  }
  if (mapping.fallback !== undefined) return mapping.fallback;
  if (!mapping.url) throw new Error(`No cloud mapping for ${path}`);

  const r = await fetch(mapping.url);
  if (!r.ok) {
    // 404 on optional data files — return empty default so UI degrades gracefully
    if (r.status === 404) {
      if (mapping.transform) return mapping.transform({});
      return {};
    }
    throw new Error(`${r.status} ${r.statusText}`);
  }
  let raw;
  if (mapping.asText) {
    raw = await r.text();
  } else {
    const ct = r.headers.get('content-type') || '';
    raw = ct.includes('application/json') ? await r.json() : await r.text();
  }
  return mapping.transform ? await mapping.transform(raw) : raw;
}

// ── Health check ──────────────────────────────────────────────────────
api('/api/health')
  .then((h) => {
    serverStatus.textContent = `Server OK · port ${h.port}`;
    serverStatus.classList.add('ok');
  })
  .catch((e) => {
    serverStatus.textContent = `Server error: ${e.message}`;
    serverStatus.classList.add('err');
  });

// ── Skill list ────────────────────────────────────────────────────────
async function loadSkills() {
  try {
    const skills = await api('/api/skills');
    skillList.innerHTML = '';
    // Pin /eros-day and /bail-reports to the top; alphabetize the rest.
    const pinned = ['eros-day', 'bail-reports'];
    skills.sort((a, b) => {
      const ap = pinned.indexOf(a.name);
      const bp = pinned.indexOf(b.name);
      if (ap !== -1 && bp !== -1) return ap - bp;
      if (ap !== -1) return -1;
      if (bp !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
    for (const s of skills) {
      const el = document.createElement('div');
      el.className = 'skill-item';
      el.dataset.skill = s.name;
      const kb = (s.sizeBytes / 1024).toFixed(1);
      const mtime = new Date(s.mtime).toLocaleString();
      el.innerHTML = `
        <span class="skill-name">/${escapeHtml(s.name)}</span>
        <span class="skill-meta-row">${kb} KB · edited ${mtime}</span>
      `;
      el.addEventListener('click', () => selectSkill(s.name));
      skillList.appendChild(el);
    }
  } catch (e) {
    skillList.innerHTML = `<div class="loading">Failed to load: ${escapeHtml(e.message)}</div>`;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ── Render selected skill ─────────────────────────────────────────────
async function selectSkill(name) {
  currentSkillName = name;
  // Update sidebar active state
  for (const el of document.querySelectorAll('.skill-item')) {
    el.classList.toggle('active', el.dataset.skill === name);
  }
  content.innerHTML = '<div class="loading">Loading skill…</div>';
  try {
    // Load skill + sinks + plain-language in parallel
    const [data, sinksRes, plainRes] = await Promise.all([
      api(`/api/skills/${name}`),
      api(`/api/sinks/${name}`).catch(() => ({})),
      api(`/api/plain-language/${name}`).catch(() => ({})),
    ]);
    currentSkillData = data;
    currentSkillSinks = sinksRes;
    currentSkillPlain = plainRes;
    renderHeader(data);
    if (currentView === 'tree') renderTree(data);
    else if (currentView === 'flow') renderFlow(data);
    else renderSource(name);
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><p>Failed to load ${escapeHtml(name)}</p><p class="hint">${escapeHtml(e.message)}</p></div>`;
  }
}

function renderHeader(data) {
  skillTitle.textContent = `/${data.name}`;
  const mtime = new Date(data.mtime).toLocaleString();
  skillMeta.textContent = `${data.title} · ${data.sectionCount} sections · ${data.phaseCount} phases · ${(data.sizeBytes / 1024).toFixed(1)} KB · edited ${mtime}`;
}

function renderTree(data) {
  content.innerHTML = '';

  // Help banner — dismissible, shows once per skill per session
  const dismissKey = `help-dismissed-${data.name}`;
  if (!sessionStorage.getItem(dismissKey)) {
    const banner = document.createElement('div');
    banner.className = 'help-banner';
    banner.innerHTML = `
      <div>
        <strong>How to read this page:</strong>
        Each card below is one <span class="gloss-link" data-term="phase">phase</span> of <code>/${escapeHtml(data.name)}</code>.
        Click a card to expand the instructions. Look for green/yellow/red dots — they're <span class="gloss-link" data-term="freshness badge">freshness badges</span> showing how current the data is.
        Want a plain-English version? It's on by default at the top of every phase (toggle "Plain English" above).
        Stuck on a term? Hover any <span class="gloss-link" data-term="glossary">dotted-underline word</span> or open the 📖 Glossary on the left.
      </div>
      <button class="help-banner-dismiss" title="Dismiss for this session">×</button>
    `;
    content.appendChild(banner);
    banner.querySelector('.help-banner-dismiss').addEventListener('click', () => {
      sessionStorage.setItem(dismissKey, '1');
      banner.remove();
    });
  }

  // Skill-level plain-English summary (only when plain mode is on)
  if (plainMode && currentSkillPlain && currentSkillPlain._skill_summary) {
    const s = currentSkillPlain._skill_summary;
    const sum = document.createElement('div');
    sum.className = 'plain-summary';
    sum.innerHTML = `
      <div class="plain-summary-label">What this skill does</div>
      <div class="plain-summary-text">${escapeHtml(s.what || '')}</div>
      <dl class="plain-summary-grid">
        ${s.why ? `<dt>Why</dt><dd>${escapeHtml(s.why)}</dd>` : ''}
        ${s.how ? `<dt>How</dt><dd>${escapeHtml(s.how)}</dd>` : ''}
        ${s.when ? `<dt>When</dt><dd>${escapeHtml(s.when)}</dd>` : ''}
        ${s.result ? `<dt>Result</dt><dd>${escapeHtml(s.result)}</dd>` : ''}
      </dl>
    `;
    content.appendChild(sum);
  }

  if (data.preamble) {
    const pre = document.createElement('div');
    pre.className = 'section-card non-phase';
    pre.innerHTML = `
      <div class="card-header open">
        <span class="chevron">▶</span>
        <span class="card-heading">Preamble</span>
        <span class="section-badge">intro</span>
      </div>
      <div class="card-body open">
        <div class="body-content">${marked.parse(data.preamble)}</div>
      </div>
    `;
    content.appendChild(pre);
    wireCard(pre);
  }

  for (const s of data.sections) {
    const card = document.createElement('div');
    card.className = `section-card ${s.isPhase ? 'phase' : 'non-phase'}`;
    const badge = s.isPhase
      ? `<span class="phase-badge">Phase ${escapeHtml(s.phaseNumber)}</span>`
      : `<span class="section-badge">section</span>`;
    const startsOpen = s.isPhase; // phases default open; aux sections collapsed
    const openCls = startsOpen ? ' open' : '';

    const meta = [];
    if (s.scripts.length) {
      meta.push(`<div class="card-meta-row"><span class="card-meta-label">scripts</span>${
        s.scripts.map((x) => `<span class="card-meta-item">${escapeHtml(x)}</span>`).join('')
      }</div>`);
    }
    if (s.files.length) {
      meta.push(`<div class="card-meta-row"><span class="card-meta-label">files</span>${
        s.files.slice(0, 12).map((x) => `<span class="card-meta-item">${escapeHtml(x)}</span>`).join('')
      }${s.files.length > 12 ? `<span class="card-meta-item">+${s.files.length - 12} more</span>` : ''}</div>`);
    }
    if (s.urls.length) {
      meta.push(`<div class="card-meta-row"><span class="card-meta-label">links</span>${
        s.urls.slice(0, 8).map((x) => `<a class="card-meta-item" href="${escapeHtml(x)}" target="_blank" rel="noopener">${escapeHtml(x.slice(0, 80))}${x.length > 80 ? '…' : ''}</a>`).join('')
      }${s.urls.length > 8 ? `<span class="card-meta-item">+${s.urls.length - 8} more</span>` : ''}</div>`);
    }

    // Data sinks block — render below the meta, links/preview pane
    const sinks = (currentSkillSinks && currentSkillSinks[s.heading]) || null;
    const sinksHtml = sinks ? renderSinksBlock(sinks) : '';

    // Per-phase plain-English summary
    const plainEntry = currentSkillPlain && currentSkillPlain[s.heading];
    const plainHtml = (plainMode && plainEntry && plainEntry.plain)
      ? `<div class="plain-summary">
           <div class="plain-summary-label">In plain English</div>
           <div class="plain-summary-text">${escapeHtml(plainEntry.plain)}</div>
         </div>`
      : '';

    card.innerHTML = `
      <div class="card-header${openCls}">
        <span class="chevron">▶</span>
        <span class="card-heading">${escapeHtml(s.heading)}</span>
        ${badge}
        <button class="note-btn" data-skill="${escapeHtml(currentSkillName)}" data-phase="${escapeHtml(s.heading)}" title="Suggest improvement for this phase">+ note</button>
      </div>
      <div class="card-body${openCls}">
        ${plainHtml}
        <div class="body-content">${linkGlossary(marked.parse(s.body || ''))}</div>
        ${meta.length ? `<div class="card-meta">${meta.join('')}</div>` : ''}
        ${sinksHtml}
      </div>
    `;
    content.appendChild(card);
    wireCard(card);
    // Sink click handlers
    for (const sinkEl of card.querySelectorAll('.sink-item[data-preview]')) {
      sinkEl.addEventListener('click', (ev) => {
        ev.preventDefault();
        openPreview(sinkEl.dataset.path, sinkEl.dataset.label);
      });
    }
    // Note button handler
    const noteBtn = card.querySelector('.note-btn');
    if (noteBtn) {
      noteBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        openNoteModal(noteBtn.dataset.skill, noteBtn.dataset.phase);
      });
    }
  }
}

// ── Operator note modal ──────────────────────────────────────────────
function openNoteModal(skill, phase) {
  const existing = document.getElementById('note-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'note-modal';
  modal.className = 'note-modal';
  modal.innerHTML = `
    <div class="note-modal-inner">
      <header>
        <div class="note-modal-title">Suggest improvement</div>
        <button class="note-modal-close" id="note-modal-close">×</button>
      </header>
      <div class="note-modal-meta">/${escapeHtml(skill)} · ${escapeHtml(phase)}</div>
      <textarea id="note-textarea" placeholder="What would make this phase better? Surfaced in the next /eros-day Phase 0."></textarea>
      <div class="note-modal-actions">
        <button id="note-submit" class="primary">Save note</button>
        <span id="note-status" class="note-status"></span>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('note-textarea').focus();
  document.getElementById('note-modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  document.getElementById('note-submit').addEventListener('click', async () => {
    const note = document.getElementById('note-textarea').value.trim();
    const statusEl = document.getElementById('note-status');
    if (!note) {
      statusEl.textContent = 'Empty note — type something first.';
      statusEl.className = 'note-status err';
      return;
    }
    statusEl.textContent = 'Saving…';
    statusEl.className = 'note-status';
    try {
      const r = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill, phase, note }),
      });
      const data = await r.json();
      if (r.ok) {
        statusEl.textContent = `✓ Saved to ${data.savedTo.split('/').slice(-2).join('/')}`;
        statusEl.className = 'note-status ok';
        setTimeout(() => modal.remove(), 1500);
      } else {
        statusEl.textContent = `Failed: ${data.error || 'unknown'}`;
        statusEl.className = 'note-status err';
      }
    } catch (e) {
      statusEl.textContent = `Error: ${e.message}`;
      statusEl.className = 'note-status err';
    }
  });
}

function renderSinksBlock(items) {
  const rows = items.map((s) => {
    const cls = s.exists === false ? 'dead' : '';
    const dot = s.freshness || 'unknown';
    const mtimeShort = s.mtime ? new Date(s.mtime).toLocaleDateString() : '';
    // Remote sinks (urls) → open in new tab
    if (s.url) {
      return `<a class="sink-item" href="${escapeHtml(s.url)}" target="_blank" rel="noopener">
        <span class="sink-dot ${dot}"></span>
        <span class="sink-label">${escapeHtml(s.label || s.type)}</span>
        <span class="sink-type">${escapeHtml(typeLabel(s.type))}</span>
      </a>`;
    }
    // Local sinks (files) → open in preview pane
    if (s.exists === false) {
      return `<div class="sink-item dead">
        <span class="sink-dot unknown"></span>
        <span class="sink-label">${escapeHtml(s.label || s.type)}</span>
        <span class="sink-type">missing</span>
      </div>`;
    }
    const path = s.absolutePath || s.path || '';
    return `<div class="sink-item" data-preview="1" data-path="${escapeHtml(path)}" data-label="${escapeHtml(s.label || '')}">
      <span class="sink-dot ${dot}"></span>
      <span class="sink-label">${escapeHtml(s.label || s.type)}</span>
      <span class="sink-mtime">${escapeHtml(mtimeShort)}</span>
      <span class="sink-type">${escapeHtml(typeLabel(s.type))}</span>
    </div>`;
  }).join('');

  return `<div class="sinks-block">
    <div class="sinks-label">Data sinks (${items.length})</div>
    <div class="sink-grid">${rows}</div>
  </div>`;
}

function typeLabel(t) {
  return {
    'local-json': 'JSON',
    'local-md': 'MD',
    'local-script': 'script',
    'local-xlsx': 'XLSX',
    'local-json-glob': 'JSON',
    'local-md-glob': 'MD',
    'google-sheet': 'Sheets',
    'google-drive-folder': 'Drive',
    'clickup': 'ClickUp',
  }[t] || t;
}

// ── Preview pane ─────────────────────────────────────────────────────
async function openPreview(path, label) {
  layout.classList.remove('preview-collapsed');
  previewTitle.textContent = label || 'Preview';
  previewContent.innerHTML = '<div class="empty-state-sm">Loading…</div>';
  previewMeta.textContent = path;
  try {
    const data = await api(`/api/preview?path=${encodeURIComponent(path)}`);
    const kb = (data.sizeBytes / 1024).toFixed(1);
    const mtime = new Date(data.mtime).toLocaleString();
    previewMeta.innerHTML = `<div>${escapeHtml(data.path)}</div><div>${kb} KB · edited ${escapeHtml(mtime)}${data.truncated ? ' · TRUNCATED' : ''}</div>`;
    if (data.format === 'json') {
      previewContent.innerHTML = `<pre>${escapeHtml(JSON.stringify(data.content, null, 2))}</pre>`;
    } else if (data.format === 'markdown') {
      previewContent.innerHTML = `<div class="body-content">${marked.parse(data.content || '')}</div>`;
    } else {
      previewContent.innerHTML = `<pre>${escapeHtml(data.content)}</pre>`;
    }
  } catch (e) {
    previewContent.innerHTML = `<div class="empty-state-sm">Failed: ${escapeHtml(e.message)}</div>`;
  }
}

previewClose.addEventListener('click', () => {
  layout.classList.add('preview-collapsed');
});

// Default: start with preview collapsed
layout.classList.add('preview-collapsed');

function wireCard(card) {
  const header = card.querySelector('.card-header');
  const body = card.querySelector('.card-body');
  if (!header || !body) return;
  header.addEventListener('click', () => {
    header.classList.toggle('open');
    body.classList.toggle('open');
  });
}

async function renderSource(name) {
  content.innerHTML = '<div class="loading">Loading source…</div>';
  try {
    const src = await api(`/api/skill-source/${name}`);
    const pre = document.createElement('div');
    pre.className = 'source-view';
    pre.textContent = src;
    content.innerHTML = '';
    content.appendChild(pre);
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><p>Failed to load source</p><p class="hint">${escapeHtml(e.message)}</p></div>`;
  }
}

// ── View toggle ───────────────────────────────────────────────────────
function setActiveTab(view) {
  currentView = view;
  for (const btn of [tabTree, tabFlow, tabSource]) {
    btn.classList.toggle('active', btn.id === `tab-${view}`);
  }
}
tabTree.addEventListener('click', () => {
  setActiveTab('tree');
  if (currentSkillData) renderTree(currentSkillData);
});
tabFlow.addEventListener('click', () => {
  setActiveTab('flow');
  if (currentSkillData) renderFlow(currentSkillData);
});
tabSource.addEventListener('click', () => {
  setActiveTab('source');
  if (currentSkillName) renderSource(currentSkillName);
});

// ── Flow diagram (Mermaid) ───────────────────────────────────────────
function renderFlow(data) {
  content.innerHTML = '<div class="loading">Building flow diagram…</div>';
  const phases = data.sections.filter((s) => s.isPhase);
  if (phases.length === 0) {
    content.innerHTML = `<div class="empty-state"><p>No phases detected — flow view only works for skills with <code>## Phase N</code> sections.</p><p class="hint">Try /eros-day or /bail-reports.</p></div>`;
    return;
  }

  // Build a Mermaid flowchart definition.
  // Each phase = a node. Sequential phases connected. Data sinks attached as
  // sub-nodes per phase (cap at 3 per phase to keep diagram readable).
  // Cross-skill references detected by scanning body for "/bail-reports", "/eros-report-check" etc.
  const lines = ['flowchart TD'];
  lines.push('  classDef phase fill:#1e293b,stroke:#38bdf8,color:#e2e8f0,stroke-width:2px;');
  lines.push('  classDef datasink fill:#0b1220,stroke:#f59e0b,color:#fcd34d,stroke-width:1px,font-size:11px;');
  lines.push('  classDef cross fill:#7c2d12,stroke:#fbbf24,color:#fef3c7,stroke-width:2px,stroke-dasharray:4 3;');

  // Phase nodes
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    const id = `P${p.phaseNumber.replace('.', '_')}`;
    const labelClean = escapeMermaid(truncate(p.heading, 60));
    lines.push(`  ${id}["<b>Phase ${escapeMermaid(p.phaseNumber)}</b><br/>${labelClean}"]:::phase`);
    if (i > 0) {
      const prev = phases[i - 1];
      const prevId = `P${prev.phaseNumber.replace('.', '_')}`;
      lines.push(`  ${prevId} --> ${id}`);
    }
  }

  // Cross-skill references — detect mentions of /<skill> in any phase body
  const crossRefs = new Set();
  for (const p of phases) {
    const matches = (p.body || '').match(/\/([a-z][a-z0-9-]+)/g) || [];
    for (const m of matches) {
      const ref = m.slice(1);
      if (ref !== data.name && ref.length > 2 && !ref.match(/^\d/)) {
        if (['bail-reports', 'eros-report-check', 'eros-day', 'bd', 'analyze-data', 'pickleball', 'hug-prompt', 'update-looker', 'run-reenergized-analytics'].includes(ref)) {
          const pId = `P${p.phaseNumber.replace('.', '_')}`;
          crossRefs.add(`${pId}|${ref}`);
        }
      }
    }
  }
  if (crossRefs.size > 0) {
    let csIdx = 0;
    for (const ref of crossRefs) {
      const [pId, skill] = ref.split('|');
      const csId = `CS${csIdx++}`;
      lines.push(`  ${csId}{{"/${skill}"}}:::cross`);
      lines.push(`  ${pId} -.->|references| ${csId}`);
    }
  }

  // Per-phase data sinks (top 3 each, prefer remote URLs first then local files)
  if (currentSkillSinks) {
    let sIdx = 0;
    for (const p of phases) {
      const sinks = currentSkillSinks[p.heading];
      if (!sinks || sinks.length === 0) continue;
      const pId = `P${p.phaseNumber.replace('.', '_')}`;
      const top = sinks.slice(0, 3);
      for (const s of top) {
        const sId = `S${sIdx++}`;
        const label = truncate(s.label || s.type, 32);
        lines.push(`  ${sId}["${escapeMermaid(label)}"]:::datasink`);
        lines.push(`  ${pId} -.-> ${sId}`);
      }
    }
  }

  const def = lines.join('\n');
  content.innerHTML = `
    <div class="flow-view">
      <div class="mermaid" id="mermaid-graph">${escapeHtml(def)}</div>
    </div>
    <div class="flow-legend">
      <p><strong>Legend:</strong></p>
      <ul>
        <li><span style="color:#38bdf8">━━━</span> Sequential phase (solid arrow)</li>
        <li><span style="color:#94a3b8">┄┄┄</span> Data sink (dotted, yellow node)</li>
        <li><span style="color:#fbbf24">┄┄┄</span> Cross-skill reference (dashed border, hex node)</li>
      </ul>
      <p><em>Want the verbatim instructions? Switch to <strong>Tree</strong>. Want the raw .md? Switch to <strong>Source</strong>.</em></p>
    </div>
  `;
  // Mermaid render
  try {
    const el = document.getElementById('mermaid-graph');
    el.removeAttribute('data-processed');
    mermaid.run({ querySelector: '#mermaid-graph' }).catch((e) => {
      el.innerHTML = `<div class="empty-state-sm">Diagram render failed: ${escapeHtml(e.message)}</div>`;
    });
  } catch (e) {
    console.error('Mermaid error:', e);
  }
}

function escapeMermaid(s) {
  return String(s)
    .replace(/"/g, '&quot;')
    .replace(/\(/g, '&#40;')
    .replace(/\)/g, '&#41;')
    .replace(/\|/g, '&#124;');
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// ── Cloud-mode status line + logout (replaces SSE live-reload) ───────
//
// In Pages mode the dashboard reflects the LAST PUBLISH snapshot.
// Show the publish timestamp + a logout button. Re-publish happens when
// /eros-day Phase 8.6 commits + pushes to GitHub → Pages auto-deploys.
let liveStatus = document.createElement('div');
liveStatus.className = 'meta';
liveStatus.id = 'live-status';
serverStatus.parentElement.appendChild(liveStatus);

fetch('/data/meta.json').then((r) => r.json()).then((meta) => {
  const t = new Date(meta.publishedAt).toLocaleString();
  liveStatus.innerHTML = `📅 Last published: ${t}<br><a href="#" id="logout-link" style="color:var(--accent);font-size:0.74rem">Sign out</a>`;
  document.getElementById('logout-link')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await fetch('/api/logout', { method: 'POST' });
    location.href = '/login.html';
  });
}).catch(() => {
  liveStatus.textContent = '⚠️ /data/meta.json missing';
});

// SSE removed in cloud mode — keep stubs so existing code doesn't error
function connectSSE() { /* disabled in cloud mode */ }
function flashStatus(_msg) { /* disabled in cloud mode */ }
function flashCard() { /* disabled in cloud mode */ }

// Skip the rest of the original SSE setup
if (false) {
  const es = new EventSource('/api/events');
  es.addEventListener('hello', () => {
    liveStatus.textContent = '🟢 Live reload connected';
  });
  es.addEventListener('skill-changed', (ev) => {
    const data = JSON.parse(ev.data);
    flashStatus(`Skill updated: /${data.skill}`);
    // Refresh skill list metadata
    loadSkills();
    if (currentSkillName === data.skill) {
      // Re-fetch and re-render
      selectSkill(data.skill);
      flashCard();
    }
  });
  es.addEventListener('skill-added', (ev) => {
    const data = JSON.parse(ev.data);
    flashStatus(`New skill: /${data.skill}`);
    loadSkills();
  });
  es.addEventListener('skill-removed', (ev) => {
    const data = JSON.parse(ev.data);
    flashStatus(`Skill removed: /${data.skill}`);
    loadSkills();
  });
  es.addEventListener('data-changed', (ev) => {
    const data = JSON.parse(ev.data);
    flashStatus(`Data updated: ${data.path.split('/').slice(-3).join('/')}`);
    // If a sink for the current skill changed, re-render to refresh freshness badges
    if (currentSkillName) selectSkill(currentSkillName);
  });
  es.addEventListener('sinks-changed', () => {
    flashStatus('Sink registry updated');
    if (currentSkillName) selectSkill(currentSkillName);
  });
  es.addEventListener('glossary-changed', () => {
    flashStatus('Glossary updated');
    loadGlossary();
    if (currentSkillName) selectSkill(currentSkillName);
  });
  es.addEventListener('plain-language-changed', () => {
    flashStatus('Plain-English summaries updated');
    if (currentSkillName) selectSkill(currentSkillName);
  });
  es.addEventListener('audit-changed', () => {
    flashStatus('Skill audit ratings updated');
    // If the Audits panel is showing, refresh it
    if (skillTitle.textContent.includes('Audits')) showAuditsPanel();
  });
  es.addEventListener('research-changed', () => {
    flashStatus('Research findings updated');
    if (skillTitle.textContent.includes('Research')) showResearchPanel();
  });
  es.addEventListener('reports-changed', (ev) => {
    const data = JSON.parse(ev.data);
    flashStatus(`New report: ${data.path.split('/').pop()}`);
    if (skillTitle.textContent.includes('Reports')) showReportsPanel();
  });
  es.addEventListener('strategies-changed', () => {
    flashStatus('Strategy registry updated');
    if (skillTitle.textContent.includes('Strategy')) showStrategiesPanel();
  });
  es.onerror = () => {
    liveStatus.textContent = '🟡 Live reload reconnecting…';
    setTimeout(connectSSE, 2000);
    es.close();
  };
}

// Original flashStatus/flashCard removed — replaced by no-op stubs above
// for cloud mode. Live updates require a fresh publish + reload.

// ── Glossary ──────────────────────────────────────────────────────────
async function loadGlossary() {
  try {
    glossary = await api('/api/glossary');
    renderGlossaryList();
  } catch (e) {
    console.warn('Glossary load failed:', e.message);
  }
}

function renderGlossaryList(filter = '') {
  const listEl = document.getElementById('glossary-list');
  if (!listEl) return;
  const terms = Object.entries(glossary)
    .filter(([t, v]) => !filter || t.toLowerCase().includes(filter.toLowerCase()) || (v.short || '').toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => a[0].localeCompare(b[0]));
  if (terms.length === 0) {
    listEl.innerHTML = `<div class="empty-state-sm">No matches for "${escapeHtml(filter)}"</div>`;
    return;
  }
  listEl.innerHTML = terms.map(([term, v]) => `
    <div class="glossary-entry" data-term="${escapeHtml(term)}">
      <div class="glossary-term">
        <span class="gloss-chevron">▶</span>
        ${escapeHtml(term)}
      </div>
      <div class="glossary-short">${escapeHtml(v.short || '')}</div>
      <div class="glossary-long">${escapeHtml(v.long || '')}</div>
    </div>
  `).join('');
  for (const entry of listEl.querySelectorAll('.glossary-entry')) {
    const termEl = entry.querySelector('.glossary-term');
    const longEl = entry.querySelector('.glossary-long');
    termEl.addEventListener('click', () => {
      termEl.classList.toggle('open');
      longEl.classList.toggle('open');
    });
  }
}

function openGlossary(focusTerm = null) {
  document.getElementById('glossary-drawer').classList.add('open');
  document.getElementById('glossary-backdrop').classList.add('open');
  if (focusTerm) {
    setTimeout(() => {
      const match = document.querySelector(`.glossary-entry[data-term="${focusTerm}"]`);
      if (match) {
        match.scrollIntoView({ behavior: 'smooth', block: 'center' });
        match.querySelector('.glossary-term').click();
      }
    }, 250);
  }
}
function closeGlossary() {
  document.getElementById('glossary-drawer').classList.remove('open');
  document.getElementById('glossary-backdrop').classList.remove('open');
}

document.getElementById('btn-glossary').addEventListener('click', () => openGlossary());

// ── Research panel ────────────────────────────────────────────────────
async function showResearchPanel() {
  content.innerHTML = '<div class="loading">Loading research…</div>';
  skillTitle.textContent = '📚 Research & Learnings';
  skillMeta.textContent = 'Latest findings from /eros-day Phase 9 (Mondays) + ad-hoc deep research. Newest first.';
  try {
    const data = await api('/api/research');
    if (!data.entries || data.entries.length === 0) {
      content.innerHTML = '<div class="empty-state"><p>No research findings yet.</p><p class="hint">Run /eros-day Phase 9 on a Monday to generate the first one.</p></div>';
      return;
    }
    content.innerHTML = '';
    for (const entry of data.entries) {
      const card = document.createElement('div');
      card.className = 'section-card phase';
      card.innerHTML = `
        <div class="card-header open" data-date="${entry.date}">
          <span class="chevron">▶</span>
          <span class="card-heading">${escapeHtml(entry.title)}</span>
          <span class="phase-badge">${escapeHtml(entry.date)}</span>
        </div>
        <div class="card-body open" id="research-body-${entry.date}">
          <div class="loading">Loading findings…</div>
        </div>
      `;
      content.appendChild(card);
      wireCard(card);
      // Lazy-load content
      api(`/api/research/${entry.date}`).then((r) => {
        const body = document.getElementById(`research-body-${entry.date}`);
        if (body) body.innerHTML = `<div class="body-content">${linkGlossary(marked.parse(r.content))}</div>`;
      });
    }
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><p>Failed to load research</p><p class="hint">${escapeHtml(e.message)}</p></div>`;
  }
}

// ── Audits panel ──────────────────────────────────────────────────────
async function showAuditsPanel() {
  content.innerHTML = '<div class="loading">Loading audits…</div>';
  skillTitle.textContent = '🚦 Skill Audits & Flags';
  skillMeta.textContent = 'Per-skill rating (1-10), what works, what does not, what could be better. Updated continuously.';
  try {
    const data = await api('/api/audit');
    content.innerHTML = '';
    const skills = Object.keys(data).sort((a, b) => (data[b].rating || 0) - (data[a].rating || 0));
    for (const skill of skills) {
      const a = data[skill];
      const ratingColor = a.rating >= 8 ? 'var(--ok)' : a.rating >= 6 ? 'var(--warn)' : 'var(--err)';
      const card = document.createElement('div');
      card.className = 'section-card phase';
      const sections = [];
      if (a.whatWorks?.length) {
        sections.push(`<h3>✅ What works</h3><ul>${a.whatWorks.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`);
      }
      if (a.whatDoesntWork?.length) {
        sections.push(`<h3>❌ What doesn't work</h3><ul>${a.whatDoesntWork.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`);
      }
      if (a.couldBeBetter?.length) {
        sections.push(`<h3>💡 Could be better</h3><ul>${a.couldBeBetter.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`);
      }
      if (a.flaggedObsolete?.length) {
        sections.push(`<h3>🚩 Flagged obsolete</h3><ul>${a.flaggedObsolete.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`);
      }
      card.innerHTML = `
        <div class="card-header open">
          <span class="chevron">▶</span>
          <span class="card-heading">/${escapeHtml(skill)}</span>
          <span style="background:${ratingColor};color:var(--bg);font-weight:700;padding:3px 10px;border-radius:10px;font-size:0.78rem">${a.rating}/10</span>
        </div>
        <div class="card-body open">
          <div class="body-content">
            <p><strong>${escapeHtml(a.summary || '')}</strong></p>
            ${sections.join('\n')}
          </div>
        </div>
      `;
      content.appendChild(card);
      wireCard(card);
    }
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><p>Failed to load audits</p><p class="hint">${escapeHtml(e.message)}</p></div>`;
  }
}

document.getElementById('btn-research').addEventListener('click', () => {
  for (const el of document.querySelectorAll('.skill-item')) el.classList.remove('active');
  currentSkillName = null;
  currentSkillData = null;
  showResearchPanel();
});

// ── Reports panel ─────────────────────────────────────────────────────
let currentReportsTab = 'eros-day';
let cachedReports = null;

async function showReportsPanel() {
  for (const el of document.querySelectorAll('.skill-item')) el.classList.remove('active');
  currentSkillName = null;
  currentSkillData = null;
  content.innerHTML = '<div class="loading">Loading reports…</div>';
  skillTitle.textContent = '📊 Reports';
  skillMeta.textContent = 'EROS Day daily reports (markdown rendered inline) + Bail-Bond network + Keyword Bank + Blog Links sheets (Google embed) + Drive Docs folder.';
  try {
    cachedReports = await api('/api/reports');
    renderReportsPanel();
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><p>Failed to load reports</p><p class="hint">${escapeHtml(e.message)}</p></div>`;
  }
}

function renderReportsPanel() {
  const { erosDayReports, sheets, driveDocs } = cachedReports.categories;
  const tabs = `
    <div class="reports-tabs">
      <button class="reports-tab ${currentReportsTab === 'eros-day' ? 'active' : ''}" data-tab="eros-day">
        EROS Day Reports <span class="reports-tab-count">${erosDayReports.length}</span>
      </button>
      <button class="reports-tab ${currentReportsTab === 'bail-reports' ? 'active' : ''}" data-tab="bail-reports">
        Bail Reports (weekly)
      </button>
      <button class="reports-tab ${currentReportsTab === 'sheets' ? 'active' : ''}" data-tab="sheets">
        All Sheets <span class="reports-tab-count">${sheets.length}</span>
      </button>
      <button class="reports-tab ${currentReportsTab === 'docs' ? 'active' : ''}" data-tab="docs">
        Drive Docs Folder
      </button>
    </div>
  `;
  let body = '';
  if (currentReportsTab === 'eros-day') body = renderErosDayTab(erosDayReports);
  else if (currentReportsTab === 'bail-reports') body = '<div class="loading">Loading weekly tabs…</div>';
  else if (currentReportsTab === 'sheets') body = renderSheetsTab(sheets);
  else body = renderDocsTab(driveDocs);
  content.innerHTML = tabs + body;

  for (const btn of content.querySelectorAll('.reports-tab')) {
    btn.addEventListener('click', () => {
      currentReportsTab = btn.dataset.tab;
      renderReportsPanel();
    });
  }
  if (currentReportsTab === 'eros-day') wireErosDayTab();
  if (currentReportsTab === 'bail-reports') renderBailReportsTab();
}

// ── /bail-reports weekly tabs panel ──────────────────────────────────
async function renderBailReportsTab() {
  // Find the sub-container (the body part of the panel, after the tabs row)
  const container = content.children[content.children.length - 1];
  const sheetId = '1GeiGAy2kCxpm25h-1Z5vCE4IQpeP48elXNe2XYk9S-Y';
  try {
    const data = await api('/api/bail-tabs');
    const tabs = data.tabs || [];
    const weeklyTabs = tabs.filter((t) => /^Report \d{4}-W\d{2}$/.test(t.title) || /^GSC Bank \d{4}-W\d{2}$/.test(t.title));
    const otherTabs = tabs.filter((t) => !weeklyTabs.includes(t));

    const noticeHtml = data.error
      ? `<div class="help-banner"><div><strong>⚠️ Live tab list unavailable.</strong> Showing cached tabs from ${escapeHtml(new Date(data.cachedAt || '').toLocaleDateString())}. ${escapeHtml(data.error)}</div></div>`
      : `<div class="help-banner"><div><strong>✅ Live</strong> · ${tabs.length} total tabs · ${data.weeklyTabCount || 0} weekly reports · fetched ${escapeHtml(new Date(data.fetchedAt || '').toLocaleString())}</div></div>`;

    const weeklyHtml = weeklyTabs.length === 0
      ? '<div class="empty-state-sm">No weekly tabs found. Run /bail-reports on a Monday to create the first.</div>'
      : weeklyTabs.map((t) => {
          const embedUrl = t.gid != null
            ? `https://docs.google.com/spreadsheets/d/${sheetId}/htmlembed?gid=${t.gid}&single=true&widget=true&headers=false`
            : null;
          const openUrl = t.gid != null
            ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=${t.gid}`
            : `https://docs.google.com/spreadsheets/d/${sheetId}`;
          const isReport = t.title.startsWith('Report');
          return `
            <div class="sheet-card">
              <div class="sheet-card-title">${isReport ? '📊' : '📁'} ${escapeHtml(t.title)}</div>
              <div class="sheet-card-desc">${isReport ? 'Comprehensive S→D breakdown for that ISO week' : 'Per-site contribution detail (5 windows)'} · gid <code>${t.gid || 'unknown'}</code></div>
              <div class="sheet-card-actions">
                ${embedUrl ? `<button data-action="toggle-embed-tab" data-embed="${escapeHtml(embedUrl)}" data-tab="${escapeHtml(t.title)}">Toggle Embed</button>` : ''}
                <a href="${escapeHtml(openUrl)}" target="_blank" rel="noopener">Open in Google Sheets</a>
              </div>
              <div id="embed-tab-${escapeHtml(t.title.replace(/[^a-zA-Z0-9]/g, '-'))}" class="embed-container"></div>
            </div>
          `;
        }).join('');

    const otherHtml = otherTabs.length === 0
      ? ''
      : `<h3 style="color:var(--accent);margin-top:24px">Other tabs in this sheet</h3>` +
        otherTabs.map((t) => {
          const openUrl = t.gid != null
            ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=${t.gid}`
            : `https://docs.google.com/spreadsheets/d/${sheetId}`;
          return `<div class="sink-item"><span class="sink-dot green"></span><span class="sink-label"><a href="${escapeHtml(openUrl)}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">${escapeHtml(t.title)}</a></span><span class="sink-type">tab</span></div>`;
        }).join('');

    container.outerHTML = `
      <div>
        ${noticeHtml}
        <p style="color:var(--muted);font-size:0.85rem;margin-bottom:18px"><strong>How /bail-reports works:</strong> Each run (cadence: weekly Mondays, full refresh first Monday of month) creates TWO new tabs — <code>Report YYYY-Www</code> + <code>GSC Bank YYYY-Www</code> — additively. Prior weeks are NEVER overwritten so you have full week-over-week history. Click "Toggle Embed" to view a tab inline.</p>
        ${weeklyHtml}
        ${otherHtml}
      </div>
    `;

    // Wire embed-toggle buttons
    setTimeout(() => {
      for (const btn of content.querySelectorAll('[data-action="toggle-embed-tab"]')) {
        btn.addEventListener('click', () => {
          const slug = btn.dataset.tab.replace(/[^a-zA-Z0-9]/g, '-');
          const cont = document.getElementById(`embed-tab-${slug}`);
          if (!cont) return;
          if (cont.children.length > 0) {
            cont.innerHTML = '';
            btn.textContent = 'Toggle Embed';
          } else {
            cont.innerHTML = `<iframe class="embed-iframe" src="${escapeHtml(btn.dataset.embed)}" loading="lazy"></iframe>`;
            btn.textContent = 'Hide Embed';
          }
        });
      }
    }, 30);
  } catch (e) {
    container.outerHTML = `<div class="empty-state"><p>Failed to load /bail-reports tabs</p><p class="hint">${escapeHtml(e.message)}</p></div>`;
  }
}

function renderErosDayTab(reports) {
  if (reports.length === 0) {
    return '<div class="empty-state"><p>No EROS Day reports yet. Run /eros-day to generate the first one.</p></div>';
  }
  const listing = reports.map((r) => `
    <div class="report-listing-item" data-date="${r.date}">
      <div class="report-listing-date">${escapeHtml(r.date)}</div>
      <div class="report-listing-meta">${(r.sizeBytes / 1024).toFixed(1)} KB</div>
    </div>
  `).join('');
  return `
    <div class="report-list">
      <div class="report-listing">${listing}</div>
      <div class="report-viewer" id="report-viewer">
        <div class="empty-state-sm">Pick a date from the left to view the report.</div>
      </div>
    </div>
  `;
}

function wireErosDayTab() {
  const items = content.querySelectorAll('.report-listing-item');
  for (const item of items) {
    item.addEventListener('click', () => {
      for (const el of items) el.classList.remove('active');
      item.classList.add('active');
      loadErosDayReport(item.dataset.date);
    });
  }
  // Auto-load the latest report on first show
  if (items.length > 0) items[0].click();
}

async function loadErosDayReport(date) {
  const viewer = document.getElementById('report-viewer');
  if (!viewer) return;
  viewer.innerHTML = '<div class="loading">Loading report…</div>';
  try {
    const r = await api(`/api/reports/eros-day/${date}`);
    const sizeKb = (r.sizeBytes / 1024).toFixed(1);
    const mtime = new Date(r.mtime).toLocaleString();
    const docLink = extractDocLink(r.content);
    viewer.innerHTML = `
      <div class="report-viewer-header">
        <div>
          <div class="report-viewer-title">EROS Day Report — ${escapeHtml(date)}</div>
          <div class="report-listing-meta">${sizeKb} KB · saved ${escapeHtml(mtime)}</div>
        </div>
        <div class="report-viewer-actions">
          ${docLink ? `<a href="${escapeHtml(docLink)}" target="_blank" rel="noopener">Open Google Doc</a>` : ''}
          <a href="https://mail.google.com/mail/u/0/#search/EROS+Day+${escapeHtml(date)}" target="_blank" rel="noopener">Find Email in Gmail</a>
        </div>
      </div>
      <div class="body-content">${linkGlossary(marked.parse(r.content))}</div>
    `;
  } catch (e) {
    viewer.innerHTML = `<div class="empty-state-sm">Failed to load: ${escapeHtml(e.message)}</div>`;
  }
}

function extractDocLink(content) {
  const m = content.match(/(https:\/\/docs\.google\.com\/document\/d\/[a-zA-Z0-9_-]+[^\s)\]]*)/);
  return m ? m[1] : null;
}

function renderSheetsTab(sheets) {
  return sheets.map((s) => `
    <div class="sheet-card">
      <div class="sheet-card-title">${escapeHtml(s.title)}</div>
      <div class="sheet-card-desc">${escapeHtml(s.description)}</div>
      <div class="sheet-card-actions">
        <button data-action="toggle-embed" data-key="${escapeHtml(s.key)}">Toggle Embed</button>
        <a href="${escapeHtml(s.openUrl)}" target="_blank" rel="noopener">Open in Google Sheets</a>
      </div>
      <div id="embed-${escapeHtml(s.key)}" class="embed-container"></div>
    </div>
  `).join('') + `<p style="color:var(--muted);font-size:0.8rem;margin-top:14px"><strong>Note:</strong> Iframe embed requires the sheet to be shared "Anyone with the link can view." If embed shows a Google login screen, open the sheet directly to grant access, or rely on the "Open in Google Sheets" link.</p>` + wireSheetsTabScript(sheets);
}

function wireSheetsTabScript(sheets) {
  // Defer wiring until DOM is updated — use setTimeout
  setTimeout(() => {
    for (const btn of content.querySelectorAll('[data-action="toggle-embed"]')) {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        const sheet = sheets.find((s) => s.key === key);
        const container = document.getElementById(`embed-${key}`);
        if (!container) return;
        if (container.children.length > 0) {
          container.innerHTML = '';
          btn.textContent = 'Toggle Embed';
        } else {
          container.innerHTML = `<iframe class="embed-iframe" src="${sheet.embedUrl}" loading="lazy"></iframe>`;
          btn.textContent = 'Hide Embed';
        }
      });
    }
  }, 50);
  return '';
}

function renderDocsTab(docs) {
  return `
    <div class="sheet-card">
      <div class="sheet-card-title">EROS Day Google Doc Folder</div>
      <div class="sheet-card-desc">${escapeHtml(docs.description)}</div>
      <div class="sheet-card-actions">
        <a href="${escapeHtml(docs.folderUrl)}" target="_blank" rel="noopener">Open Drive Folder</a>
      </div>
      <iframe class="embed-iframe" src="${escapeHtml(docs.embedUrl)}" loading="lazy"></iframe>
    </div>
    <p style="color:var(--muted);font-size:0.85rem">Each EROS Day session writes a Google Doc to this folder titled <code>EROS Day - YYYY-MM-DD</code>. Same content as the email + the markdown report. Click a doc thumbnail above to open it in Drive.</p>
  `;
}

document.getElementById('btn-reports').addEventListener('click', showReportsPanel);

// ── Strategy timeline (added 2026-05-14) ─────────────────────────────
async function showStrategyTimelineInline(containerId) {
  try {
    const r = await api('/api/strategy-timeline');
    if (!r.data) {
      document.getElementById(containerId).innerHTML = '<div class="empty-state-sm">No timeline data yet. Run /eros-day Phase 8.5 to build.</div>';
      return;
    }
    const tl = r.data;
    const s = tl.summary;
    const trendEmoji = {
      PROGRESSING: '📈',
      REGRESSING: '📉',
      FLAT: '➡️',
      BASELINE: '🟡',
      KEEP_SUCCESS: '✅',
      KILL_FAIL: '🚨',
      NEUTRAL: '⚪',
      NO_DATA: '⏳',
    };
    let html = `
      <div class="sheet-card">
        <div class="sheet-card-title">📊 Timeline Summary — ${tl.date}</div>
        <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:8px;font-size:0.9rem">
          <span>📈 ${s.progressing} progressing</span>
          <span>📉 ${s.regressing} regressing</span>
          <span>➡️ ${s.flat} flat</span>
          <span>🟡 ${s.baseline} baseline</span>
          <span>⏳ ${s.planned} planned</span>
          <span>✅ ${s.keep} KEEP · 🚨 ${s.kill} KILL · ⚪ ${s.neutral} NEUTRAL</span>
        </div>
      </div>
    `;
    for (const t of tl.timelines) {
      const e = trendEmoji[t.currentTrend] || '?';
      const m = t.currentMetrics;
      const fmt = (v) => v === null || v === undefined ? '—' : `${v > 0 ? '+' : ''}${v}%`;
      html += `
        <div class="sheet-card" style="margin-top:14px">
          <div class="sheet-card-title">${e} ${escapeHtml(t.id)}</div>
          <div class="sheet-card-desc">${escapeHtml(t.title)}</div>
          <div style="font-family:ui-monospace,monospace;color:var(--accent);margin:10px 0;font-size:0.95rem">${escapeHtml(t.progressBar)} · day ${t.daysSinceStart}/${t.windowDays}</div>
          ${t.startDate ? `
            <div style="font-size:0.85rem;color:var(--muted);margin-bottom:8px">
              Started ${escapeHtml(t.startDate)} · Ends ${escapeHtml(t.endDate)} · ${t.daysRemaining} days left
            </div>
            ${t.nextMilestone ? `<div style="font-size:0.88rem">⏰ <strong>Next check-in:</strong> day ${t.nextMilestone.day} (${escapeHtml(t.nextMilestone.date)}, in ${t.nextMilestone.daysAway} days)</div>` : ''}
            ${m ? `<div style="font-size:0.88rem;margin-top:6px">📊 <strong>Net deltas:</strong> clicks ${fmt(m.netClicks)} · imps ${fmt(m.netImps)} · pos ${m.netPos !== null ? (m.netPos > 0 ? '+' : '') + m.netPos : '—'} · ctr ${fmt(m.netCtr)}</div>` : ''}
            ${t.history && t.history.length > 1 ? `
              <details style="margin-top:10px"><summary style="cursor:pointer;color:var(--accent);font-size:0.85rem">📅 Last ${t.history.length} days history</summary>
                <table style="width:100%;margin-top:8px;font-size:0.85rem;border-collapse:collapse">
                  <thead><tr style="border-bottom:1px solid var(--border)">
                    <th style="text-align:left;padding:4px 8px">Date</th><th style="text-align:right;padding:4px 8px">Day</th>
                    <th style="text-align:right;padding:4px 8px">Clicks Δ</th><th style="text-align:right;padding:4px 8px">Imps Δ</th>
                    <th style="text-align:left;padding:4px 8px">Trend</th>
                  </tr></thead>
                  <tbody>${t.history.map((h) => `<tr>
                    <td style="padding:4px 8px">${escapeHtml(h.date)}</td>
                    <td style="text-align:right;padding:4px 8px">${h.daysSinceStart}</td>
                    <td style="text-align:right;padding:4px 8px">${h.netClicks !== null ? `${h.netClicks > 0 ? '+' : ''}${h.netClicks}%` : '—'}</td>
                    <td style="text-align:right;padding:4px 8px">${h.netImps !== null ? `${h.netImps > 0 ? '+' : ''}${h.netImps}%` : '—'}</td>
                    <td style="padding:4px 8px">${trendEmoji[h.verdict] || h.verdict}</td>
                  </tr>`).join('')}</tbody>
                </table>
              </details>
            ` : ''}
          ` : `<div style="font-size:0.88rem;color:var(--muted)">Not started yet. Pending activation. Treatment: ${t.treatmentCount} pages · Control: ${t.controlCount} pages.</div>`}
        </div>
      `;
    }
    document.getElementById(containerId).innerHTML = html;
  } catch (e) {
    document.getElementById(containerId).innerHTML = `<div class="empty-state-sm">Timeline load failed: ${escapeHtml(e.message)}</div>`;
  }
}

// ── Strategies panel ─────────────────────────────────────────────────
async function showStrategiesPanel() {
  for (const el of document.querySelectorAll('.skill-item')) el.classList.remove('active');
  currentSkillName = null;
  currentSkillData = null;
  content.innerHTML = '<div class="loading">Loading strategies…</div>';
  skillTitle.textContent = '🧪 Strategy Tests';
  skillMeta.textContent = 'A/B experiments tracking what works vs what doesn\'t. Treatment vs control. 28-day default window. Auto-evaluated via GSC every /eros-day.';
  try {
    const data = await api('/api/strategies');
    const reg = data.registry;
    const results = data.latestResults;
    const rules = reg['_test-design-rules'];
    const strategies = reg.strategies || [];
    const verdictMap = {};
    if (results?.data?.results) {
      for (const r of results.data.results) verdictMap[r.id] = r;
    }

    const designRulesHtml = `
      <div class="sheet-card">
        <div class="sheet-card-title">📏 Test Design Rules</div>
        <div class="sheet-card-desc">All experiments follow these. Edit <code>~/Workspaces/eros-dashboard/strategies.json</code> to tune.</div>
        <ul style="font-size:0.88rem;line-height:1.8">
          <li><strong>Default window:</strong> ${rules.windowDefaultDays} days (min ${rules.windowMinDays}, max ${rules.windowMaxDays})</li>
          <li><strong>Reasoning:</strong> ${rules.reasoning}</li>
          <li><strong>Success:</strong> +${rules.successCriteria.impressions.split(' ')[0]} vs control imps · +${rules.successCriteria.clicks.split(' ')[0]} clicks · pos ${rules.successCriteria.avgPosition.split('≥')[1]} better · CTR ${rules.successCriteria.ctr.split('≥')[1]}+</li>
          <li><strong>Kill:</strong> ${rules.killCriteria.anyMetricDown}</li>
          <li><strong>Neutral:</strong> ${rules.killCriteria.noChange}</li>
        </ul>
      </div>
    `;

    const tableRows = strategies.map((s) => {
      const result = verdictMap[s.id];
      const verdict = result?.verdict || (s.status === 'planned' ? 'PLANNED' : 'NOT_STARTED');
      const verdictColor = verdict === 'KEEP_SUCCESS' ? 'var(--ok)'
                          : verdict === 'KILL_FAIL' ? 'var(--err)'
                          : verdict === 'NEUTRAL' ? 'var(--muted)'
                          : verdict === 'IN_PROGRESS' ? 'var(--phase)'
                          : 'var(--warn)';
      const days = result?.daysSinceStart ?? '—';
      const netClicks = result?.metrics?.net?.clicks !== undefined ? `${result.metrics.net.clicks > 0 ? '+' : ''}${result.metrics.net.clicks}%` : '—';
      const netImps = result?.metrics?.net?.impressions !== undefined ? `${result.metrics.net.impressions > 0 ? '+' : ''}${result.metrics.net.impressions}%` : '—';
      const decisionEmoji = verdict === 'KEEP_SUCCESS' ? '✅ KEEP'
                          : verdict === 'KILL_FAIL' ? '🚨 KILL'
                          : verdict === 'NEUTRAL' ? '⚪ DROP'
                          : verdict === 'IN_PROGRESS' ? '⏳' : '—';
      return `
        <tr>
          <td><code>${escapeHtml(s.id)}</code></td>
          <td>${escapeHtml(s.title)}</td>
          <td><span style="color:${verdictColor};font-weight:600">${escapeHtml(verdict)}</span></td>
          <td>${days}</td>
          <td>${escapeHtml(netClicks)}</td>
          <td>${escapeHtml(netImps)}</td>
          <td>${decisionEmoji}</td>
        </tr>
      `;
    }).join('');

    const tableHtml = `
      <div class="sheet-card">
        <div class="sheet-card-title">🧪 ${strategies.length} Experiments</div>
        <div class="sheet-card-desc">${results ? `Last measured ${results.date}` : 'Not yet measured — run <code>measure-strategy-results.mjs</code>'}</div>
        <table class="body-content" style="width:100%;border-collapse:collapse">
          <thead><tr style="border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:8px">ID</th>
            <th style="text-align:left;padding:8px">Title</th>
            <th style="text-align:left;padding:8px">Verdict</th>
            <th style="text-align:left;padding:8px">Days</th>
            <th style="text-align:left;padding:8px">Net Clicks</th>
            <th style="text-align:left;padding:8px">Net Imps</th>
            <th style="text-align:left;padding:8px">Decision</th>
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    `;

    const detailCards = strategies.map((s) => {
      const result = verdictMap[s.id];
      return `
        <div class="section-card phase">
          <div class="card-header">
            <span class="chevron">▶</span>
            <span class="card-heading">${escapeHtml(s.title)}</span>
            <span class="phase-badge">${escapeHtml(s.status)}</span>
          </div>
          <div class="card-body">
            <div class="body-content">
              <p><strong>Hypothesis:</strong> ${escapeHtml(s.hypothesis)}</p>
              <p><strong>Source:</strong> <code>${escapeHtml(s.source || 'manual')}</code></p>
              <p><strong>Window:</strong> ${s.windowDays} days · Started: ${s.startDate || 'not yet'} · Ends: ${s.endDate || 'TBD'}</p>
              <p><strong>Primary metric:</strong> ${s.metrics?.primary || '—'} · Secondary: ${(s.metrics?.secondary || []).join(', ')}</p>
              <p><strong>Treatment pages (${s.treatmentPages?.length || 0}):</strong></p>
              <ul>${(s.treatmentPages || []).map(p => `<li><code>${escapeHtml(p)}</code></li>`).join('')}</ul>
              <p><strong>Control pages (${s.controlPages?.length || 0}):</strong></p>
              <ul>${(s.controlPages || []).map(p => `<li><code>${escapeHtml(p)}</code></li>`).join('')}</ul>
              ${s.notes ? `<p><strong>Notes:</strong> ${escapeHtml(s.notes)}</p>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    content.innerHTML =
      designRulesHtml +
      tableHtml +
      '<h3 style="color:var(--accent);margin-top:24px">📈 Timeline — Progress / Regress / Verdict</h3>' +
      '<div id="strategy-timeline-inline"></div>' +
      '<h3 style="color:var(--accent);margin-top:24px">Per-strategy detail</h3>' +
      detailCards;
    for (const card of content.querySelectorAll('.section-card')) wireCard(card);
    showStrategyTimelineInline('strategy-timeline-inline');
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><p>Failed: ${escapeHtml(e.message)}</p></div>`;
  }
}

document.getElementById('btn-strategies').addEventListener('click', showStrategiesPanel);
document.getElementById('btn-audits').addEventListener('click', () => {
  for (const el of document.querySelectorAll('.skill-item')) el.classList.remove('active');
  currentSkillName = null;
  currentSkillData = null;
  showAuditsPanel();
});
document.getElementById('glossary-close').addEventListener('click', closeGlossary);
document.getElementById('glossary-backdrop').addEventListener('click', closeGlossary);
document.getElementById('glossary-search').addEventListener('input', (e) => renderGlossaryList(e.target.value));

// Wire any .gloss-link in the document to open the glossary on its term
document.addEventListener('click', (e) => {
  const link = e.target.closest('.gloss-link');
  if (link) {
    e.preventDefault();
    openGlossary(link.dataset.term);
  }
});

// Auto-link known glossary terms inside rendered markdown.
// Wraps the first occurrence of each term per phase body in a .gloss-link span.
function linkGlossary(html) {
  if (!html || Object.keys(glossary).length === 0) return html;
  // Sort by length DESC so longer phrases match before substrings
  const terms = Object.keys(glossary).sort((a, b) => b.length - a.length);
  // Track which terms we've already linked in this html chunk
  const linked = new Set();
  let result = html;
  for (const term of terms) {
    if (linked.has(term)) continue;
    // Build a case-insensitive whole-word regex. Avoid touching inside tags/attributes.
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![\\w>])(${escaped})(?![\\w<])`, 'i');
    const m = result.match(re);
    if (m && !isInsideTag(result, m.index)) {
      const replacement = `<span class="gloss-link" data-term="${term}" title="Click for definition">${m[1]}</span>`;
      result = result.slice(0, m.index) + replacement + result.slice(m.index + m[1].length);
      linked.add(term);
    }
  }
  return result;
}

function isInsideTag(html, idx) {
  // Don't link inside <pre> or <code> blocks or HTML attributes
  const before = html.slice(0, idx);
  const lastOpen = before.lastIndexOf('<');
  const lastClose = before.lastIndexOf('>');
  if (lastOpen > lastClose) return true; // inside a tag
  const lastPreOpen = before.lastIndexOf('<pre');
  const lastPreClose = before.lastIndexOf('</pre>');
  if (lastPreOpen > lastPreClose) return true;
  const lastCodeOpen = before.lastIndexOf('<code');
  const lastCodeClose = before.lastIndexOf('</code>');
  if (lastCodeOpen > lastCodeClose) return true;
  return false;
}

// ── Plain English toggle ──────────────────────────────────────────────
const plainCheckbox = document.getElementById('plain-mode');
plainCheckbox.checked = plainMode;
plainCheckbox.addEventListener('change', (e) => {
  plainMode = e.target.checked;
  localStorage.setItem('plain-mode', plainMode ? '1' : '0');
  if (currentSkillData) renderTree(currentSkillData);
});
const savedPlainMode = localStorage.getItem('plain-mode');
if (savedPlainMode !== null) {
  plainMode = savedPlainMode === '1';
  plainCheckbox.checked = plainMode;
}

// ── Onboarding tour ───────────────────────────────────────────────────
const tourSteps = [
  {
    title: 'Welcome to EROS Dashboard',
    body: `
      <p>This is your visual map of every EROS skill. The instructions you see come straight from the <kbd>.md</kbd> files in <code>~/.claude/commands/</code> — when those files change, the dashboard updates automatically.</p>
      <p><strong>Why it's useful:</strong> you can see exactly what each skill does, where its data lives, and (with Plain English mode on) what it all means without needing to read code.</p>
    `,
  },
  {
    title: 'Step 1 — Pick a skill',
    body: `
      <p>The left sidebar lists every skill EROS knows about. <kbd>/eros-day</kbd> and <kbd>/bail-reports</kbd> are pinned at the top because you use them most.</p>
      <p>Click any skill to open it. The "edited" timestamp tells you when the file last changed.</p>
    `,
  },
  {
    title: 'Step 2 — Three ways to view a skill',
    body: `
      <ul>
        <li><strong>Tree</strong> (default) — each phase as an expandable card. Easiest to read.</li>
        <li><strong>Flow</strong> — a diagram showing how phases connect. Best for seeing the big picture.</li>
        <li><strong>Source</strong> — the raw <kbd>.md</kbd> file. For when you want to see exactly what Claude reads.</li>
      </ul>
      <p>Try clicking each — the content updates instantly.</p>
    `,
  },
  {
    title: 'Step 3 — Plain English mode',
    body: `
      <p>The toggle in the top-right of the main panel: <strong>Plain English</strong>. When ON (it's the default), every skill and every phase shows a plain-language summary <em>above</em> the technical instructions.</p>
      <p>Turn it OFF if you want only the source text. Your preference is remembered.</p>
    `,
  },
  {
    title: 'Step 4 — Data sinks (the green dots)',
    body: `
      <p>Each phase shows the files, sheets, and links it produces or reads. Click any sink card to preview it.</p>
      <ul>
        <li>🟢 <strong>Green dot</strong> = updated within 24 hours (fresh)</li>
        <li>🟡 <strong>Yellow</strong> = within a week (getting old)</li>
        <li>🔴 <strong>Red</strong> = over a week (probably stale)</li>
      </ul>
      <p>This is how you know at a glance whether the data behind a phase is current.</p>
    `,
  },
  {
    title: 'Step 5 — Live reload + improvement loop',
    body: `
      <p>The green dot in the top-left says "🟢 Live reload connected". That means: <strong>edit any skill file, and this dashboard updates automatically within 1 second.</strong> No refresh needed.</p>
      <p>Have an idea to improve a phase? Click the <strong>+ note</strong> button on its card. Write your thought. The next <kbd>/eros-day</kbd> session reads your notes and acts on them.</p>
      <p>Stuck on a term? Hover any <span class="gloss-link" data-term="phase">dotted-underline word</span> or open the 📖 <strong>Glossary</strong> in the sidebar.</p>
    `,
  },
];
let tourStep = 0;
const tourModal = document.getElementById('tour-modal');
function showTour() {
  tourStep = 0;
  tourModal.classList.remove('hidden');
  renderTourStep();
}
function renderTourStep() {
  const s = tourSteps[tourStep];
  document.getElementById('tour-step').textContent = `Step ${tourStep + 1} of ${tourSteps.length}`;
  document.getElementById('tour-body').innerHTML = `<h2>${s.title}</h2>${s.body}`;
  document.getElementById('tour-prev').disabled = tourStep === 0;
  document.getElementById('tour-next').textContent = tourStep === tourSteps.length - 1 ? 'Finish ✓' : 'Next →';
}
function closeTour() {
  tourModal.classList.add('hidden');
  localStorage.setItem('tour-seen', '1');
}
document.getElementById('tour-close').addEventListener('click', closeTour);
document.getElementById('tour-prev').addEventListener('click', () => {
  if (tourStep > 0) { tourStep--; renderTourStep(); }
});
document.getElementById('tour-next').addEventListener('click', () => {
  if (tourStep < tourSteps.length - 1) { tourStep++; renderTourStep(); }
  else { closeTour(); }
});
document.getElementById('btn-tour').addEventListener('click', showTour);

// First-visit auto-launch
if (!localStorage.getItem('tour-seen')) {
  setTimeout(showTour, 800);
}

// ── Boot ──────────────────────────────────────────────────────────────
loadSkills();
loadGlossary();
connectSSE();
