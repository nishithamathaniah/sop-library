/* Finance Handbook: state, helpers, routing and the read-only screens.
 * The editor lives in editor.js.
 */
'use strict';

const FREQ = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly', 'As needed'];
const STATUSES = ['Draft', 'Published', 'Needs update'];
const ROLES = { admin: 'Admin', owner: 'Owner', reader: 'Reader' };
const REVIEW_MONTHS = 6;
const APP_NAME = CONFIG.appName || 'Finance Handbook';
const ORG_NAME = CONFIG.orgName || '';
const hasLogo = () => CONFIG.orgLogo !== false && !!window.ORG_LOGO;
const orgLogo = (cls = '') => hasLogo() ? `<span class="org-logo ${cls}">${window.ORG_LOGO}</span>` : '';
// Sidebar / top bar: church logo + app name, or a plain icon + names when there's no logo
const brandMark = () => hasLogo()
  ? `${orgLogo('sm')}<span class="brand-text"><span>${esc(APP_NAME)}</span></span>`
  : `<span class="logo">${ico('list')}</span><span class="brand-text">${ORG_NAME ? `<small>${esc(ORG_NAME)}</small>` : ''}<span>${esc(APP_NAME)}</span></span>`;
// Sign-in page and printed cover
const heroMark = () => hasLogo() ? orgLogo('lg') : `<span class="logo lg">${ico('list')}</span>${ORG_NAME ? `<p class="org">${esc(ORG_NAME)}</p>` : ''}`;

const S = {
  users: [], sops: [], comments: [],
  meta: { id: 'settings', categories: [] },
  me: null,
  filters: { q: '', account: '', owner: '', status: '', frequency: '', category: '' },
};
const imgCache = new Map();

/* ---------- Small helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = (p = '') => p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const now = () => new Date().toISOString();
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = (o) => JSON.parse(JSON.stringify(o));

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
function ago(iso) {
  if (!iso) return '—';
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) { const d = Math.floor(s / 86400); return d === 1 ? 'yesterday' : `${d} days ago`; }
  return fmtDate(iso);
}
function addMonths(d, n) { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }

const user = (id) => S.users.find((u) => u.id === id);
const uname = (id) => user(id)?.name || '—';
const sopById = (id) => S.sops.find((s) => s.id === id);

function avatar(id, cls = '') {
  const u = user(id);
  const name = u?.name || '?';
  const hues = [158, 200, 262, 330, 24, 45, 120];
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const ini = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return `<span class="avatar ${cls}" style="--h:${hues[h % hues.length]}" title="${esc(name)}">${esc(ini)}</span>`;
}

function safeUrl(u) {
  u = String(u || '').trim();
  if (!u) return '';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u;
  return /^(https?:|mailto:)/i.test(u) ? u : '';
}
function prettyUrl(u) {
  try { const x = new URL(safeUrl(u)); return x.hostname.replace(/^www\./, '') + (x.pathname.length > 1 ? x.pathname.slice(0, 24) + (x.pathname.length > 24 ? '…' : '') : ''); }
  catch { return u; }
}
/* Escaped text with clickable links and line breaks. */
function fmtText(t) {
  return esc(t).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, '<br>');
}

/* ---------- Icons (inline SVG, stroke style) ---------- */
const ICONS = {
  plus: 'M12 5v14M5 12h14',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  check: 'M5 12l5 5L20 7',
  alert: 'M12 3l10 18H2zM12 10v4M12 17.5v.5',
  link: 'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 8.5h.01',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  print: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  play: 'M7 4l13 8-13 8z',
  x: 'M6 6l12 12M18 6L6 18',
  left: 'M19 12H5M11 6l-6 6 6 6',
  right: 'M5 12h14M13 6l6 6-6 6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  logout: 'M15 4h4v16h-4M10 17l5-5-5-5M15 12H3',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  video: 'M3 6h12v12H3zM15 10l6-3v10l-6-3',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  key: 'M2.6 17.4A2 2 0 0 0 2 18.8V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.2a2 2 0 0 0 1.4-.6l.8-.8a6.5 6.5 0 1 0-4-4zM16.5 7.5h.01',
  download: 'M12 4v12M6 10l6 6 6-6M4 20h16',
  upload: 'M12 20V8M6 14l6-6 6 6M4 4h16',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4-6.3',
  tag: 'M3 3h8l10 10-8 8L3 11zM7.5 7.5h.01',
  pen: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  square: 'M4 4h16v16H4z',
  undo: 'M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  msg: 'M21 12a8 8 0 0 1-11.6 7.2L4 21l1.8-5.4A8 8 0 1 1 21 12z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  swap: 'M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
  home: 'M3 11l9-7 9 7M5 10v10h14V10',
};
const ico = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n]}"/></svg>`;

/* ---------- Permissions & derived state ---------- */
const isAdmin = () => S.me?.role === 'admin';
const canCreate = () => S.me && S.me.role !== 'reader';
const canEdit = (s) => isAdmin() || (S.me?.role === 'owner' && s.ownerId === S.me.id);
const canView = (s) => S.me.role !== 'reader' || s.status !== 'Draft';
const owners = () => S.users.filter((u) => (u.role !== 'reader' && u.active) || S.sops.some((s) => s.ownerId === u.id));

function reviewDue(s) {
  if (s.status !== 'Published') return false;
  const due = s.reviewDate ? new Date(s.reviewDate + 'T23:59:59') : addMonths(s.updatedAt, REVIEW_MONTHS);
  return due < new Date();
}
const openFlags = (sopId) => S.comments.filter((c) => c.sopId === sopId && !c.resolved);

/* What still blocks publishing. Each item: [anchor id, label]. */
function checkSop(s) {
  const miss = [];
  const has = (v) => String(v || '').trim().length > 0;
  if (!has(s.name)) miss.push(['f-name', 'Task name']);
  if (!s.ownerId) miss.push(['f-owner', 'Owner']);
  if (S.meta.accounts.length && !(s.accounts || []).length) miss.push(['f-accounts', 'Which account(s)']);
  if (!s.category) miss.push(['f-category', 'Category']);
  if (!s.frequency) miss.push(['f-frequency', 'Frequency']);
  if (!has(s.purpose)) miss.push(['f-purpose', 'Purpose']);
  if (!has(s.whenToDo)) miss.push(['f-when', 'When to do it']);
  if (!s.tools.some(has)) miss.push(['f-tools', 'Tools and access']);
  const filled = s.steps.filter((st) => has(st.text));
  if (!filled.length) miss.push(['f-steps', 'At least one step']);
  else if (s.steps.some((st) => !has(st.text) && (st.imageId || st.link || st.note))) miss.push(['f-steps', 'Every step needs an instruction']);
  if (!s.doneChecklist.some(has)) miss.push(['f-done', 'Done checklist']);
  const TOTAL = S.meta.accounts.length ? 10 : 9;
  return { missing: miss, done: TOTAL - miss.length, total: TOTAL };
}

// Passwords, PINs and OTPs, plus bank account, card and UPI numbers written next to their label
const SECRET_RE = /\b(pass(word|wd|code)?|pwd|pin|otp)\b\s*(is|[:=-])\s*\S+|\b(a\/c|account|acct|card|upi)\s*(no\.?|number|num|#|id)?\s*(is|[:=-])?\s*[\w.@-]*\d{6,}/i;

function statusPill(s, opts = {}) {
  const map = { Draft: 'draft', Published: 'pub', 'Needs update': 'upd' };
  let h = `<span class="pill ${map[s.status]}">${esc(s.status)}</span>`;
  if (reviewDue(s)) h += ` <span class="pill due" title="Review date has passed">${ico('clock')}Review due</span>`;
  if (opts.flags) {
    const n = openFlags(s.id).length;
    if (n) h += ` <span class="pill flag" title="Open questions from readers">${ico('flag')}${n}</span>`;
  }
  return h;
}

/* Accounts (e.g. LifeHub, Father's House, You are Loved). '*' means all accounts. */
const acctLabel = (s) => (s.accounts || []).includes('*') ? 'All accounts' : (s.accounts || []).join(', ');
const acctPills = (s) => (s.accounts || []).includes('*')
  ? '<span class="pill acct">All accounts</span>'
  : (s.accounts || []).map((a) => `<span class="pill acct">${esc(a)}</span>`).join('');
/* Checkbox chips for choosing accounts in a form */
function acctPicker(selected = [], name = 'accounts') {
  if (!S.meta.accounts.length) return '';
  const all = selected.includes('*');
  return `<div class="field"><span>Account${S.meta.accounts.length > 1 ? 's' : ''}</span><div class="picks">
    ${S.meta.accounts.map((a) => `<label class="pick"><input type="checkbox" name="${name}" value="${esc(a)}" ${!all && selected.includes(a) ? 'checked' : ''}><span>${esc(a)}</span></label>`).join('')}
    ${S.meta.accounts.length > 1 ? `<label class="pick all"><input type="checkbox" name="${name}" value="*" ${all ? 'checked' : ''}><span>All accounts</span></label>` : ''}
  </div></div>`;
}
/* Keep "All accounts" and single accounts mutually exclusive */
document.addEventListener('change', (e) => {
  const t = e.target;
  if (!t.matches('.picks input[type=checkbox]') || !t.checked) return;
  $$('input[type=checkbox]', t.closest('.picks')).forEach((x) => { if (x !== t && (t.value === '*' || x.value === '*')) x.checked = false; });
});
const pickedAccounts = (form, name = 'accounts') => new FormData(form).getAll(name);

/* ---------- Data writes ---------- */
async function saveSop(s) {
  s.updatedAt = now();
  s.updatedBy = S.me.id;
  await DB.put('sops', clone(s));
  const i = S.sops.findIndex((x) => x.id === s.id);
  if (i >= 0) S.sops[i] = clone(s); else S.sops.push(clone(s));
}
async function pushVersion(prev) {
  await DB.put('versions', { id: uid('v_'), sopId: prev.id, at: prev.updatedAt, by: prev.updatedBy, data: clone(prev) });
  const all = (await DB.where('versions', 'sopId', prev.id)).sort((a, b) => b.at.localeCompare(a.at));
  for (const old of all.slice(30)) await DB.del('versions', old.id);
}
async function saveUser(u) {
  await DB.put('users', u);
  const i = S.users.findIndex((x) => x.id === u.id);
  if (i >= 0) S.users[i] = u; else S.users.push(u);
}
async function saveMeta() { await DB.put('meta', S.meta); }

function newSop(fields) {
  return {
    id: uid('sop_'), name: '', ownerId: S.me.id, backupId: '', category: S.meta.categories[0] || 'Other', frequency: 'Weekly',
    purpose: '', whenToDo: '', tools: [''], steps: [newStep()], links: [], mistakes: [], doneChecklist: [''],
    output: '', status: 'Draft', reviewDate: '', createdAt: now(), updatedAt: now(), updatedBy: S.me.id,
    accounts: S.meta.accounts.length === 1 ? [S.meta.accounts[0]] : [],
    ...fields,
  };
}
function newStep(f = {}) {
  return { id: uid('st_'), text: '', imageId: '', caption: '', link: '', linkLabel: '', note: '', video: '', ...f };
}

/* ---------- Images ---------- */
async function getImage(id) {
  if (!id) return '';
  if (imgCache.has(id)) return imgCache.get(id);
  const rec = await DB.get('images', id);
  const data = rec?.data || '';
  imgCache.set(id, data);
  return data;
}
async function hydrateImages(root = document) {
  const imgs = $$('img[data-img]', root);
  await Promise.all(imgs.map(async (el) => {
    const src = await getImage(el.dataset.img);
    if (src) { el.src = src; await el.decode().catch(() => {}); } else el.closest('figure, .shot-wrap')?.classList.add('missing');
  }));
}

/* ---------- UI primitives: toast, modal, confirm ---------- */
function toast(msg, kind = '') {
  let box = $('#toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.innerHTML = `${kind === 'err' ? ico('alert') : ico('check')}<span>${esc(msg)}</span>`;
  box.appendChild(t);
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3000);
}

function modal(html, { wide = false, onMount } = {}) {
  const d = document.createElement('dialog');
  d.className = 'modal' + (wide ? ' wide' : '');
  d.innerHTML = html;
  document.body.appendChild(d);
  d.addEventListener('close', () => d.remove());
  d.addEventListener('click', (e) => {
    if (e.target === d) d.close();
    if (e.target.closest('[data-close]')) d.close();
  });
  d.showModal();
  onMount && onMount(d);
  const f = $('[autofocus]', d) || $('input, textarea, select', d);
  f && f.focus();
  return d;
}

function ask(title, text, { ok = 'OK', danger = false, cancel = 'Cancel' } = {}) {
  return new Promise((resolve) => {
    const d = modal(`
      <form method="dialog" class="modal-body">
        <h2>${esc(title)}</h2>
        ${text ? `<p class="muted">${esc(text)}</p>` : ''}
        <div class="modal-actions">
          <button value="no" class="btn ghost">${esc(cancel)}</button>
          <button value="yes" class="btn ${danger ? 'danger' : 'primary'}" autofocus>${esc(ok)}</button>
        </div>
      </form>`);
    d.addEventListener('close', () => resolve(d.returnValue === 'yes'));
  });
}

function sel(name, placeholder, options, value, attrs = '') {
  return `<select ${attrs} data-filter="${name}" aria-label="${esc(placeholder)}">
    <option value="">${esc(placeholder)}</option>
    ${options.map(([v, l]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(l)}</option>`).join('')}
  </select>`;
}

/* ---------- Routing ---------- */
function route() {
  const h = location.hash.slice(1) || '/';
  const [path, qs] = h.split('?');
  return { parts: path.split('/').filter(Boolean), q: new URLSearchParams(qs || '') };
}
const go = (hash) => { location.hash = hash; };

async function render() {
  if (window.Editor) await Editor.flush();
  if (!S.me) { renderLogin(); return; }
  const { parts, q } = route();
  const app = $('#app');

  // Full-screen views without the navigation shell
  if (parts[0] === 'sop' && parts[2] === 'follow') {
    const s = sopById(parts[1]);
    if (s && canView(s)) { renderFollow(s); return; }
  }
  if (parts[0] === 'pack') { renderPack(q); return; }

  let html, active = 'library', after = null;
  if (parts[0] === 'sop' && parts[1]) {
    const s = sopById(parts[1]);
    if (!s || !canView(s)) html = notFound();
    else if (parts[2] === 'edit' && canEdit(s)) { html = Editor.view(s); after = () => Editor.mount(s); active = s.ownerId === S.me.id ? 'mine' : 'library'; }
    else { html = viewSop(s); after = () => mountSop(s); }
  } else if (parts[0] === 'mine' && canCreate()) { html = mineView(); active = 'mine'; }
  else if (parts[0] === 'admin' && isAdmin()) { html = adminView(q); active = 'admin'; }
  else { html = libraryView(); active = 'library'; after = renderList; }

  app.innerHTML = shell(html, active);
  document.title = APP_NAME;
  window.scrollTo(0, 0);
  after && after();
  hydrateImages(app);
}

function shell(content, active) {
  const nav = [
    ['library', '#/', 'book', 'All tasks'],
    ...(canCreate() ? [['mine', '#/mine', 'user', 'My tasks']] : []),
    ...(isAdmin() ? [['admin', '#/admin', 'settings', 'Admin']] : []),
  ];
  const mineCount = canCreate() ? S.sops.filter((s) => s.ownerId === S.me.id && (s.status !== 'Published' || reviewDue(s) || openFlags(s.id).length)).length : 0;
  const link = ([k, href, i, label], cls) => `<a href="${href}" class="${cls} ${active === k ? 'on' : ''}">${ico(i)}<span>${label}</span>${k === 'mine' && mineCount ? `<b class="count">${mineCount}</b>` : ''}</a>`;
  return `
  <div class="shell">
    <aside class="side no-print">
      <a class="brand" href="#/">${brandMark()}</a>
      ${canCreate() ? `<button class="btn primary block" data-action="new-task">${ico('plus')} New task</button>` : ''}
      <nav>${nav.map((n) => link(n, 'nav-link')).join('')}</nav>
      <div class="grow"></div>
      <button class="me" data-action="me-menu">${avatar(S.me.id)}<span><b>${esc(S.me.name)}</b><small>${ROLES[S.me.role]}</small></span></button>
    </aside>
    <header class="topbar no-print">
      <a class="brand" href="#/">${brandMark()}</a>
      <button class="me" data-action="me-menu" aria-label="Account">${avatar(S.me.id)}</button>
    </header>
    <main class="main">${content}</main>
    <nav class="tabbar no-print">
      ${nav.map((n) => link(n, 'tab')).join('')}
      ${canCreate() ? `<button class="tab new" data-action="new-task">${ico('plus')}<span>New</span></button>` : ''}
    </nav>
  </div>`;
}

const notFound = () => `<div class="empty big">${ico('search')}<h2>Not found</h2><p>This task guide doesn't exist or you don't have access to it.</p><a class="btn" href="#/">Back to all tasks</a></div>`;

/* ---------- Login ---------- */
function renderLogin() {
  if (CLOUD) { renderCloudLogin('in'); return; }
  const demo = S.users.filter((u) => u.active && u.email.endsWith('@team.local'));
  $('#app').innerHTML = `
  <div class="login">
    <form class="login-card" id="login-form">
      ${heroMark()}
      <h1>${esc(APP_NAME)}</h1>
      <p class="muted">Your team's step-by-step guides, so anyone can pick up any task.</p>
      <label class="field"><span>Email</span><input name="email" type="email" autocomplete="username" required autofocus></label>
      <label class="field"><span>Password</span><input name="password" type="password" autocomplete="current-password" required></label>
      <p class="error" id="login-err" hidden></p>
      <button class="btn primary block lg">Sign in</button>
      ${demo.length ? `
      <div class="demo">
        <p class="muted small">Demo accounts (password <code>welcome</code>). Tap one to fill in:</p>
        <div class="demo-list">${demo.map((u) => `<button type="button" class="chip" data-demo="${esc(u.email)}">${avatar(u.id, 'sm')} ${esc(u.name)} <small>${ROLES[u.role]}</small></button>`).join('')}</div>
      </div>` : ''}
    </form>
  </div>`;
  const f = $('#login-form');
  $$('[data-demo]').forEach((b) => b.addEventListener('click', () => {
    f.email.value = b.dataset.demo; f.password.value = 'welcome'; f.requestSubmit();
  }));
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#login-err');
    const u = S.users.find((x) => x.email.toLowerCase() === f.email.value.trim().toLowerCase());
    if (!u || !u.active || (await hashPassword(f.password.value, u.salt)) !== u.hash) {
      err.textContent = !u ? 'No account with that email.' : !u.active ? 'This account has been deactivated. Ask your admin.' : 'Wrong password.';
      err.hidden = false; return;
    }
    S.me = u;
    localStorage.setItem('sop-session', u.id);
    render();
  });
}

/* Sign-in for the shared (cloud) library: password or Google, sign-up, reset. */
function renderCloudLogin(mode) {
  const titles = { in: 'Sign in', up: 'Create your account', reset: 'Send reset link' };
  const google = CONFIG.googleSignIn !== false && mode !== 'reset';
  $('#app').innerHTML = `
  <div class="login">
    <form class="login-card" id="login-form" novalidate>
      ${heroMark()}
      <h1>${esc(APP_NAME)}</h1>
      <p class="muted">${mode === 'up' ? 'Use the email your admin added you with, so you get access straight away.' : mode === 'reset' ? "We'll email you a link to set a new password." : "Your team's step-by-step guides, so anyone can pick up any task."}</p>
      ${google ? `<button type="button" class="btn block lg google" data-google>${GOOGLE_G} Continue with Google</button>
      <div class="or"><span>or</span></div>` : ''}
      ${mode === 'up' ? '<label class="field"><span>Your name</span><input name="name" autocomplete="name" required></label>' : ''}
      <label class="field"><span>Email</span><input name="email" type="email" autocomplete="username" required></label>
      ${mode !== 'reset' ? `<label class="field"><span>Password</span><input name="password" type="password" minlength="6" autocomplete="${mode === 'up' ? 'new-password' : 'current-password'}" required></label>` : ''}
      <p class="error" id="login-err" hidden></p>
      <p class="notice" id="login-ok" hidden></p>
      <button class="btn primary block lg">${titles[mode]}</button>
      <div class="login-links">
        ${mode === 'in' ? '<button type="button" class="linkish" data-mode="reset">Forgot password?</button><button type="button" class="linkish" data-mode="up">Create an account</button>' : '<button type="button" class="linkish" data-mode="in">Back to sign in</button>'}
      </div>
    </form>
  </div>`;
  const f = $('#login-form'), err = $('#login-err'), okMsg = $('#login-ok');
  const fail = (m) => { err.textContent = m; err.hidden = false; okMsg.hidden = true; };
  const done = (m) => { okMsg.textContent = m; okMsg.hidden = false; err.hidden = true; };
  $$('[data-mode]').forEach((b) => b.addEventListener('click', () => renderCloudLogin(b.dataset.mode)));
  $('[data-google]')?.addEventListener('click', async () => { try { await Auth.google(); } catch (e) { fail(e.message); } });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = f.email.value.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail('Enter a valid email address.');
    if (f.password && f.password.value.length < 6) return fail('The password needs at least 6 characters.');
    if (f.name && !f.name.value.trim()) return fail('Enter your name.');
    const btn = $('button.primary', f); btn.disabled = true;
    try {
      if (mode === 'reset') {
        await Auth.sendReset(email);
        done('Check your email for a link to set a new password.');
      } else if (mode === 'up') {
        const res = await Auth.signUp(f.name.value.trim(), email, f.password.value);
        if (!res.session) done('Almost done: check your email and click the link to confirm your account.');
        else await afterCloudSignIn();
      } else {
        await Auth.signIn(email, f.password.value);
        await afterCloudSignIn();
      }
    } catch (ex) {
      fail(/invalid login/i.test(ex.message) ? 'Wrong email or password.'
        : /already registered/i.test(ex.message) ? 'That email already has an account. Sign in instead.'
        : /not confirmed/i.test(ex.message) ? 'Please confirm your email first: check your inbox for the link.'
        : ex.message);
    } finally { btn.disabled = false; }
  });
}
const GOOGLE_G = '<svg class="g" viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" fill="#4285F4"/><path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" fill="#34A853"/><path d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z" fill="#FBBC05"/><path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 6 12 6z" fill="#EA4335"/></svg>';

async function afterCloudSignIn() {
  const id = await Auth.currentUserId();
  if (!id) { S.me = null; renderLogin(); return; }
  await loadAll();
  const me = S.users.find((u) => u.id === id);
  if (!me || !me.active) { renderPending(me); return; }
  S.me = me;
  render();
}

function renderPending(me) {
  S.me = null;
  $('#app').innerHTML = `
  <div class="login">
    <div class="login-card">
      <span class="logo lg">${ico('clock')}</span>
      <h1>Waiting for access</h1>
      <p class="muted">You're signed in${me ? ` as <b>${esc(me.email)}</b>` : ''}, but an admin still needs to give you access. Ask them to add you in <b>Admin → People</b>, then tap Check again.</p>
      <div class="modal-actions"><button class="btn ghost" data-out>Sign out</button><button class="btn primary" data-reload>Check again</button></div>
    </div>
  </div>`;
  $('[data-out]').onclick = () => signOut();
  $('[data-reload]').onclick = () => afterCloudSignIn();
}

async function signOut() {
  if (window.Editor) await Editor.flush();
  if (CLOUD) await Auth.signOut();
  localStorage.removeItem('sop-session');
  S.me = null;
  if (CLOUD) { S.users = []; S.sops = []; S.comments = []; imgCache.clear(); }
  location.hash = '#/';
  renderLogin();
}

/* ---------- Library (master list) ---------- */
function libraryView() {
  const f = S.filters;
  return `
  <header class="page-head">
    <div><h1>All tasks</h1><p class="sub">Every recurring task, written down so anyone can do it.</p></div>
    ${isAdmin() ? `<a class="btn ghost no-mobile" href="#/pack">${ico('print')} Handover pack</a>` : ''}
  </header>
  ${coverage()}
  <div class="filters">
    <label class="search">${ico('search')}<input id="q" type="search" placeholder="Search tasks and steps…" value="${esc(f.q)}" data-filter="q" autocomplete="off"><kbd>/</kbd></label>
    <div class="filter-row">
      ${S.meta.accounts.length ? sel('account', 'All accounts', S.meta.accounts.map((x) => [x, x]), f.account) : ''}
      ${sel('owner', 'Everyone', owners().map((u) => [u.id, u.name]), f.owner)}
      ${sel('status', 'Any status', [...STATUSES.map((x) => [x, x]), ['due', 'Review due'], ['flagged', 'Has questions']], f.status)}
      ${sel('frequency', 'Any frequency', FREQ.map((x) => [x, x]), f.frequency)}
      ${sel('category', 'Any category', S.meta.categories.map((x) => [x, x]), f.category)}
      <button class="btn ghost sm" data-action="clear-filters" ${Object.values(f).some(Boolean) ? '' : 'hidden'}>${ico('x')} Clear</button>
    </div>
  </div>
  <div id="list"></div>`;
}

function coverage() {
  const people = owners().filter((u) => u.active);
  if (!people.length) return '';
  return `<section class="coverage" aria-label="Progress by person">${people.map((u) => {
    const mine = S.sops.filter((s) => s.ownerId === u.id);
    const pub = mine.filter((s) => s.status === 'Published').length;
    const pct = mine.length ? Math.round((pub / mine.length) * 100) : 0;
    const due = mine.filter(reviewDue).length + mine.filter((s) => s.status === 'Needs update').length;
    return `<button class="cov ${S.filters.owner === u.id ? 'on' : ''}" data-action="filter-owner" data-id="${u.id}">
      <div class="cov-top">${avatar(u.id, 'sm')}<b>${esc(u.name)}</b>${due ? `<span class="dot-warn" title="${due} need attention"></span>` : ''}</div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <small>${pub} of ${mine.length} published</small>
    </button>`;
  }).join('')}</section>`;
}

function searchText(s) {
  return [s.name, s.purpose, s.whenToDo, s.output, s.category, uname(s.ownerId), acctLabel(s), ...s.tools, ...s.mistakes, ...s.doneChecklist,
    ...s.links.map((l) => l.label), ...s.steps.flatMap((x) => [x.text, x.note, x.caption, x.linkLabel])].join('\n').toLowerCase();
}

function filteredSops() {
  const f = S.filters;
  const terms = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  return S.sops.filter(canView).filter((s) =>
    (!f.account || s.accounts.includes(f.account) || s.accounts.includes('*')) &&
    (!f.owner || s.ownerId === f.owner) &&
    (!f.frequency || s.frequency === f.frequency) &&
    (!f.category || s.category === f.category) &&
    (!f.status || (f.status === 'due' ? reviewDue(s) : f.status === 'flagged' ? openFlags(s.id).length > 0 : s.status === f.status)) &&
    (!terms.length || terms.every((t) => searchText(s).includes(t)))
  ).sort((a, b) => a.name.localeCompare(b.name));
}

function matchSnippet(s, terms) {
  if (!terms.length) return '';
  const nameHit = terms.every((t) => s.name.toLowerCase().includes(t));
  if (nameHit) return '';
  const i = s.steps.findIndex((st) => terms.some((t) => (st.text + ' ' + st.note).toLowerCase().includes(t)));
  if (i < 0) return '';
  const txt = s.steps[i].text || s.steps[i].note;
  const t = terms.find((x) => txt.toLowerCase().includes(x)) || terms[0];
  const at = Math.max(0, txt.toLowerCase().indexOf(t) - 30);
  let snip = esc((at ? '…' : '') + txt.slice(at, at + 110));
  terms.forEach((x) => { snip = snip.replace(new RegExp(`(${x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'), '<mark>$1</mark>'); });
  return `<div class="snippet">Step ${i + 1}: ${snip}</div>`;
}

function renderList() {
  const box = $('#list');
  if (!box) return;
  const list = filteredSops();
  const terms = S.filters.q.toLowerCase().split(/\s+/).filter(Boolean);
  $('[data-action="clear-filters"]')?.toggleAttribute('hidden', !Object.values(S.filters).some(Boolean));
  if (!list.length) {
    box.innerHTML = `<div class="empty">${ico('search')}<h3>No tasks match</h3><p>Try a different word, or clear the filters.</p></div>`;
    return;
  }
  box.innerHTML = `
  <p class="result-count">${list.length} task${list.length === 1 ? '' : 's'}</p>
  <div class="table">
    <div class="tr th"><span>Task</span><span>Owner</span><span>Frequency</span><span>Status</span><span>Updated</span></div>
    ${list.map((s) => {
      const chk = s.status !== 'Published' ? checkSop(s) : null;
      return `<a class="tr" href="#/sop/${s.id}">
        <span class="t-name"><b>${esc(s.name || 'Untitled task')}</b><small class="cat">${acctLabel(s) ? `<span class="acct">${esc(acctLabel(s))}</span> · ` : ''}${esc(s.category)}</small>${matchSnippet(s, terms)}</span>
        <span class="t-owner">${avatar(s.ownerId, 'sm')}<span>${esc(uname(s.ownerId))}</span></span>
        <span class="t-freq">${esc(s.frequency)}</span>
        <span class="t-status">${statusPill(s, { flags: true })}${chk && s.status === 'Draft' ? `<span class="mini-bar" title="${chk.done} of ${chk.total} required parts filled"><i style="width:${(chk.done / chk.total) * 100}%"></i></span>` : ''}</span>
        <span class="t-upd">${ago(s.updatedAt)}</span>
      </a>`;
    }).join('')}
  </div>`;
}

/* ---------- My tasks ---------- */
function mineView() {
  const mine = S.sops.filter((s) => s.ownerId === S.me.id).sort((a, b) => a.name.localeCompare(b.name));
  const backup = S.sops.filter((s) => s.backupId === S.me.id && canView(s));
  const attention = mine.filter((s) => s.status !== 'Published' || reviewDue(s) || openFlags(s.id).length);
  const done = mine.filter((s) => !attention.includes(s));
  const pub = mine.filter((s) => s.status === 'Published').length;
  const pct = mine.length ? Math.round((pub / mine.length) * 100) : 0;

  const why = (s) => {
    const r = [];
    if (s.status === 'Draft') { const c = checkSop(s); r.push(c.missing.length ? `${c.missing.length} part${c.missing.length > 1 ? 's' : ''} left to fill` : 'Ready to publish'); }
    if (s.status === 'Needs update') r.push('Marked as needing an update');
    if (reviewDue(s)) r.push('Review date has passed: check it is still right');
    const n = openFlags(s.id).length; if (n) r.push(`${n} open question${n > 1 ? 's' : ''} from readers`);
    return r.join(' · ');
  };
  const card = (s, showWhy) => `
    <a class="task-card" href="#/sop/${s.id}${showWhy && s.status !== 'Published' ? '/edit' : ''}">
      <div><b>${esc(s.name || 'Untitled task')}</b><small>${acctLabel(s) ? `${esc(acctLabel(s))} · ` : ''}${esc(s.frequency)} · ${esc(s.category)}</small>${showWhy ? `<p class="why">${esc(why(s))}</p>` : ''}</div>
      <div class="tc-right">${statusPill(s, { flags: true })}${ico('right', 'chev')}</div>
    </a>`;

  return `
  <header class="page-head">
    <div><h1>My tasks</h1><p class="sub">Write each task down once. Your replacement will thank you.</p></div>
    <div class="head-actions">
      <button class="btn ghost" data-action="bulk-add">${ico('list')} Add several</button>
      <button class="btn primary no-mobile" data-action="new-task">${ico('plus')} New task</button>
    </div>
  </header>
  <section class="progress-card">
    <div class="ring" style="--p:${pct}"><span>${pct}%</span></div>
    <div><h2>${pub} of ${mine.length} published</h2>
    <p class="muted">${mine.length === 0 ? 'Start by listing your recurring tasks. Use "Add several" to paste them all at once.' : attention.length ? `${attention.length} task${attention.length > 1 ? 's' : ''} need${attention.length > 1 ? '' : 's'} your attention.` : 'Everything is published and up to date. Nice work.'}</p></div>
  </section>
  ${attention.length ? `<h2 class="section-title">Needs your attention</h2><div class="cards">${attention.map((s) => card(s, true)).join('')}</div>` : ''}
  ${done.length ? `<h2 class="section-title">Published</h2><div class="cards">${done.map((s) => card(s, false)).join('')}</div>` : ''}
  ${backup.length ? `<h2 class="section-title">You're the backup for</h2><div class="cards">${backup.map((s) => card(s, false)).join('')}</div>` : ''}`;
}

/* ---------- SOP read view ---------- */
function viewSop(s) {
  const edit = canEdit(s);
  const flags = openFlags(s.id);
  const stepFlags = (stId) => flags.filter((c) => c.stepId === stId);
  const steps = s.steps.filter((st) => st.text.trim() || st.imageId);
  const due = s.reviewDate ? s.reviewDate : addMonths(s.updatedAt, REVIEW_MONTHS).toISOString().slice(0, 10);

  return `
  <article class="sop">
    <div class="crumbs no-print"><a href="#/">${ico('left')} All tasks</a></div>
    ${s.status === 'Needs update' ? `<div class="banner warn">${ico('alert')}<div><b>This guide may be out of date.</b> Follow it with care and check with ${esc(uname(s.ownerId))}${s.backupId ? ` or ${esc(uname(s.backupId))}` : ''} if something doesn't match.</div></div>` : ''}
    ${s.status === 'Draft' ? `<div class="banner">${ico('edit')}<div><b>Draft.</b> Not yet published, so readers can't see it.${edit ? ' Read it once as if you were new, then publish.' : ''}</div></div>` : ''}
    <header class="sop-head">
      <div class="sop-title">
        <div class="pills">${statusPill(s)}${acctPills(s)}<span class="pill soft">${esc(s.category)}</span></div>
        <h1>${esc(s.name || 'Untitled task')}</h1>
        ${s.purpose ? `<p class="lead">${fmtText(s.purpose)}</p>` : ''}
      </div>
      <div class="sop-actions no-print">
        ${steps.length ? `<a class="btn primary" href="#/sop/${s.id}/follow">${ico('play')} Follow along</a>` : ''}
        ${edit ? `<a class="btn" href="#/sop/${s.id}/edit">${ico('edit')} Edit</a>` : ''}
        <button class="btn" data-action="print">${ico('print')} PDF</button>
        <button class="btn icon" data-action="sop-more" data-id="${s.id}" aria-label="More actions">⋯</button>
      </div>
    </header>

    <dl class="facts">
      <div><dt>When</dt><dd>${esc(s.whenToDo || '—')}</dd></div>
      <div><dt>How often</dt><dd>${esc(s.frequency)}</dd></div>
      <div><dt>Owner</dt><dd>${avatar(s.ownerId, 'xs')} ${esc(uname(s.ownerId))}</dd></div>
      <div><dt>Backup</dt><dd>${s.backupId ? `${avatar(s.backupId, 'xs')} ${esc(uname(s.backupId))}` : '—'}</dd></div>
    </dl>

    ${s.tools.some((t) => t.trim()) ? `
    <section class="block"><h2>${ico('key')} Tools and access you need</h2>
      <ul class="bullets">${s.tools.filter((t) => t.trim()).map((t) => `<li>${fmtText(t)}</li>`).join('')}</ul></section>` : ''}

    ${s.links.some((l) => l.url) ? `
    <section class="block"><h2>${ico('link')} Links</h2>
      <div class="link-list">${s.links.filter((l) => safeUrl(l.url)).map((l) => `<a class="link-card" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener">${ico('external')}<span><b>${esc(l.label || prettyUrl(l.url))}</b><small>${esc(prettyUrl(l.url))}</small></span></a>`).join('')}</div></section>` : ''}

    <section class="block"><h2>${ico('list')} Steps</h2>
      ${steps.length ? `<ol class="steps">${steps.map((st, i) => {
        const fl = stepFlags(st.id);
        return `
        <li class="step-v" id="step-${st.id}">
          <span class="num">${i + 1}</span>
          <div class="step-body">
            <div class="instr">${fmtText(st.text)}</div>
            ${st.note ? `<div class="callout warn">${ico('alert')}<div>${fmtText(st.note)}</div></div>` : ''}
            ${st.imageId ? `<figure class="shot"><img data-img="${st.imageId}" alt="Screenshot for step ${i + 1}" data-action="zoom">${st.caption ? `<figcaption>${esc(st.caption)}</figcaption>` : ''}</figure>` : ''}
            ${safeUrl(st.link) || safeUrl(st.video) ? `<div class="step-links">
              ${safeUrl(st.link) ? `<a class="btn sm" href="${esc(safeUrl(st.link))}" target="_blank" rel="noopener">${ico('external')} ${esc(st.linkLabel || prettyUrl(st.link))}</a>` : ''}
              ${safeUrl(st.video) ? `<a class="btn sm" href="${esc(safeUrl(st.video))}" target="_blank" rel="noopener">${ico('video')} Watch video</a>` : ''}
              <span class="print-only url">${esc(safeUrl(st.link))}</span>
            </div>` : ''}
            ${fl.length ? `<div class="flags">${fl.map((c) => flagHtml(c, s)).join('')}</div>` : ''}
            <button class="unclear no-print" data-action="flag" data-sop="${s.id}" data-step="${st.id}">${ico('flag')} Something unclear?</button>
          </div>
        </li>`;
      }).join('')}</ol>` : `<p class="muted">No steps yet.</p>`}
    </section>

    ${s.mistakes.some((t) => t.trim()) ? `
    <section class="block"><h2>${ico('alert')} Common mistakes</h2>
      <ul class="bullets warn">${s.mistakes.filter((t) => t.trim()).map((t) => `<li>${fmtText(t)}</li>`).join('')}</ul></section>` : ''}

    ${s.doneChecklist.some((t) => t.trim()) ? `
    <section class="block"><h2>${ico('check')} How to know it's done</h2>
      <ul class="checks">${s.doneChecklist.filter((t) => t.trim()).map((t) => `<li><span class="box"></span>${fmtText(t)}</li>`).join('')}</ul></section>` : ''}

    ${s.output ? `<section class="block"><h2>${ico('download')} Output</h2><p>${fmtText(s.output)}</p></section>` : ''}

    ${flags.filter((c) => !c.stepId).length ? `<section class="block no-print"><h2>${ico('msg')} Questions about this guide</h2><div class="flags">${flags.filter((c) => !c.stepId).map((c) => flagHtml(c, s)).join('')}</div></section>` : ''}

    <footer class="sop-foot">
      Last updated ${fmtDate(s.updatedAt)} by ${esc(uname(s.updatedBy))} · Review by ${fmtDate(due)}
      <button class="linkish no-print" data-action="flag" data-sop="${s.id}" data-step="">${ico('flag')} Ask a question about this guide</button>
    </footer>
  </article>`;
}

function flagHtml(c, s) {
  const canResolve = canEdit(s) || c.userId === S.me.id;
  return `<div class="flag-item">${avatar(c.userId, 'xs')}<div><b>${esc(uname(c.userId))}</b> <small>${ago(c.at)}</small><p>${fmtText(c.text)}</p></div>
    ${canResolve ? `<button class="btn sm ghost" data-action="resolve-flag" data-id="${c.id}">${ico('check')} Resolve</button>` : ''}</div>`;
}

function mountSop(s) { document.title = `${s.name} · ${APP_NAME}`; }

/* ---------- Follow-along mode ---------- */
function renderFollow(s) {
  const steps = s.steps.filter((st) => st.text.trim() || st.imageId);
  const checks = s.doneChecklist.filter((t) => t.trim());
  const key = `follow:${S.me.id}:${s.id}`;
  const st = JSON.parse(localStorage.getItem(key) || 'null') || { i: 0, done: [], checks: [] };
  const total = steps.length + 1; // last screen = done checklist
  st.i = Math.min(st.i, total - 1);
  const save = () => localStorage.setItem(key, JSON.stringify(st));

  function draw() {
    const atEnd = st.i >= steps.length;
    const step = steps[st.i];
    const pct = Math.round((st.done.length / Math.max(1, steps.length)) * 100);
    $('#app').innerHTML = `
    <div class="follow">
      <header class="follow-head">
        <a class="btn icon ghost" href="#/sop/${s.id}" aria-label="Close">${ico('x')}</a>
        <div class="fh-mid"><b>${esc(s.name)}</b><small>${atEnd ? 'Final check' : `Step ${st.i + 1} of ${steps.length}`}</small></div>
        <span class="fh-pct">${pct}%</span>
      </header>
      <div class="follow-bar"><i style="width:${pct}%"></i></div>
      <div class="dots">${steps.map((x, i) => `<button class="${i === st.i ? 'cur' : ''} ${st.done.includes(x.id) ? 'ok' : ''}" data-go="${i}" aria-label="Step ${i + 1}"></button>`).join('')}<button class="${atEnd ? 'cur' : ''} end" data-go="${steps.length}" aria-label="Final check"></button></div>
      <main class="follow-stage">
        ${atEnd ? `
          <h1>${ico('check')} Check it's done</h1>
          ${checks.length ? `<ul class="checks big">${checks.map((t, i) => `<li><label><input type="checkbox" data-chk="${i}" ${st.checks.includes(i) ? 'checked' : ''}><span>${fmtText(t)}</span></label></li>`).join('')}</ul>` : '<p class="muted">No checklist for this task.</p>'}
          ${s.output ? `<div class="callout">${ico('download')}<div><b>Output:</b> ${fmtText(s.output)}</div></div>` : ''}
        ` : `
          <div class="big-num">${st.i + 1}</div>
          <div class="instr lg">${fmtText(step.text)}</div>
          ${step.note ? `<div class="callout warn">${ico('alert')}<div>${fmtText(step.note)}</div></div>` : ''}
          ${step.imageId ? `<figure class="shot"><img data-img="${step.imageId}" alt="" data-action="zoom">${step.caption ? `<figcaption>${esc(step.caption)}</figcaption>` : ''}</figure>` : ''}
          <div class="step-links">
            ${safeUrl(step.link) ? `<a class="btn" href="${esc(safeUrl(step.link))}" target="_blank" rel="noopener">${ico('external')} ${esc(step.linkLabel || prettyUrl(step.link))}</a>` : ''}
            ${safeUrl(step.video) ? `<a class="btn" href="${esc(safeUrl(step.video))}" target="_blank" rel="noopener">${ico('video')} Watch video</a>` : ''}
          </div>
          <button class="unclear" data-action="flag" data-sop="${s.id}" data-step="${step.id}">${ico('flag')} Something unclear?</button>
        `}
      </main>
      <footer class="follow-foot">
        <button class="btn lg ghost" data-nav="-1" ${st.i === 0 ? 'disabled' : ''}>${ico('left')} Back</button>
        ${atEnd
          ? `<button class="btn lg primary" data-finish ${checks.length && st.checks.length < checks.length ? 'disabled' : ''}>${ico('check')} Finish</button>`
          : `<button class="btn lg primary" data-nav="1">${ico('check')} Done, next ${ico('right')}</button>`}
      </footer>
    </div>`;
    hydrateImages($('#app'));
    $$('[data-go]').forEach((b) => b.onclick = () => { st.i = +b.dataset.go; save(); draw(); });
    $$('[data-nav]').forEach((b) => b.onclick = () => move(+b.dataset.nav));
    $$('[data-chk]').forEach((c) => c.onchange = () => {
      const i = +c.dataset.chk;
      st.checks = c.checked ? [...new Set([...st.checks, i])] : st.checks.filter((x) => x !== i);
      save(); draw();
    });
    const fin = $('[data-finish]');
    fin && (fin.onclick = () => { localStorage.removeItem(key); toast('Task complete. Well done!'); go(`#/sop/${s.id}`); });
  }
  function move(d) {
    if (d > 0 && st.i < steps.length && !st.done.includes(steps[st.i].id)) st.done.push(steps[st.i].id);
    st.i = Math.max(0, Math.min(total - 1, st.i + d));
    save(); draw(); window.scrollTo(0, 0);
  }
  followKeys = (e) => {
    if (e.target.closest('input, textarea, dialog')) return;
    if (e.key === 'ArrowRight') move(1);
    if (e.key === 'ArrowLeft') move(-1);
  };
  draw();
}
let followKeys = null;

/* ---------- Handover pack (print several SOPs) ---------- */
async function renderPack(q) {
  const ownerId = q.get('owner') || '';
  const account = q.get('account') || '';
  const list = S.sops.filter((s) => s.status !== 'Draft' && canView(s)
    && (!ownerId || s.ownerId === ownerId)
    && (!account || s.accounts.includes(account) || s.accounts.includes('*'))).sort((a, b) => a.name.localeCompare(b.name));
  const scope = [account && `${esc(account)} account`, ownerId && `owned by ${esc(uname(ownerId))}`].filter(Boolean).join(', ');
  $('#app').innerHTML = `
  <div class="pack">
    <div class="pack-bar no-print">
      <a class="btn ghost" href="#/">${ico('left')} Back</a>
      ${S.meta.accounts.length ? `<select id="pack-account" aria-label="Account"><option value="">All accounts</option>${S.meta.accounts.map((a) => `<option ${a === account ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select>` : ''}
      <select id="pack-owner" aria-label="Owner"><option value="">Everyone</option>${owners().map((u) => `<option value="${u.id}" ${u.id === ownerId ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select>
      <button class="btn primary" data-action="print">${ico('print')} Print / Save as PDF</button>
    </div>
    <section class="pack-cover">
      ${heroMark()}
      <h1>Handover pack</h1>
      <p class="lead">${scope ? `Task guides: ${scope}` : 'All published task guides'} · ${fmtDate(now())}</p>
      <ol class="toc">${list.map((s) => `<li><span>${esc(s.name)}</span><small>${acctLabel(s) ? `${esc(acctLabel(s))} · ` : ''}${esc(s.frequency)} · ${esc(uname(s.ownerId))}</small></li>`).join('')}</ol>
      ${list.length ? '' : '<p class="muted">No published guides match.</p>'}
    </section>
    ${list.map((s) => `<div class="pack-sop">${viewSop(s)}</div>`).join('')}
  </div>`;
  const repack = () => {
    const p = new URLSearchParams();
    const a = $('#pack-account')?.value, o = $('#pack-owner').value;
    if (a) p.set('account', a);
    if (o) p.set('owner', o);
    go('#/pack' + (p.toString() ? `?${p}` : ''));
  };
  $('#pack-owner').onchange = repack;
  if ($('#pack-account')) $('#pack-account').onchange = repack;
  await hydrateImages($('#app'));
}

/* ---------- Admin ---------- */
function adminView(q) {
  const tab = q.get('tab') || 'users';
  const tabs = [['users', 'users', 'People'], ['lists', 'tag', 'Accounts & categories'], ['data', 'download', 'Backup & export']];
  let body = '';
  if (tab === 'users') {
    const list = [...S.users].sort((a, b) => (b.active - a.active) || a.name.localeCompare(b.name));
    const waiting = list.filter((u) => !u.active && !S.sops.some((s) => s.ownerId === u.id));
    body = `
    ${CLOUD && waiting.length ? `<div class="banner warn">${ico('clock')}<div><b>${waiting.length} ${waiting.length === 1 ? 'person is' : 'people are'} waiting for access.</b> Choose their role, then tap <b>Give access</b>.</div></div>` : ''}
    <div class="table users">
      <div class="tr th"><span>Person</span><span>Role</span><span>Tasks</span><span></span></div>
      ${list.map((u) => `
      <div class="tr ${u.active ? '' : 'inactive'}">
        <span class="t-name">${avatar(u.id, 'sm')}<span><b>${esc(u.name)}</b><small>${esc(u.email)}${u.active ? '' : CLOUD ? ' · no access' : ' · deactivated'}</small></span></span>
        <span><select data-action-change="set-role" data-id="${u.id}" ${u.id === S.me.id ? 'disabled' : ''}>${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${u.role === k ? 'selected' : ''}>${v}</option>`).join('')}</select></span>
        <span>${S.sops.filter((s) => s.ownerId === u.id).length}</span>
        <span class="row-actions">
          ${u.active ? '' : `<button class="btn sm primary" data-action="activate" data-id="${u.id}">${ico('check')}<span>Give access</span></button>`}
          <button class="btn sm ghost" data-action="edit-user" data-id="${u.id}">${ico('edit')}<span>Edit</span></button>
          <button class="btn sm ghost" data-action="handover" data-id="${u.id}">${ico('swap')}<span>Hand over</span></button>
        </span>
      </div>`).join('')}
      ${(S.invites || []).map((iv) => `
      <div class="tr invited">
        <span class="t-name"><span class="avatar sm ghost">${ico('msg')}</span><span><b>${esc(iv.name)}</b><small>${esc(iv.email)} · invited, hasn't signed up yet</small></span></span>
        <span>${ROLES[iv.role]}</span>
        <span>—</span>
        <span class="row-actions">
          <button class="btn sm ghost" data-action="copy-invite" data-email="${esc(iv.email)}">${ico('copy')}<span>Copy invite</span></button>
          <button class="btn sm ghost danger-text" data-action="revoke-invite" data-email="${esc(iv.email)}">${ico('x')}<span>Cancel</span></button>
        </span>
      </div>`).join('')}
    </div>
    <button class="btn primary" data-action="edit-user">${ico('plus')} Add person</button>
    ${CLOUD ? `<p class="muted small" style="margin-top:.8rem">New people sign up at <b>${esc(appUrl())}</b> with the email you add here (or Continue with Google) and get their role straight away.</p>` : ''}`;
  } else if (tab === 'lists') {
    const listEditor = (key, title, help, placeholder, count) => `
    <section class="list-block">
      <h2>${title}</h2>
      <p class="muted">${help}</p>
      <div class="chips">${S.meta[key].map((c, i) => `<span class="chip">${esc(c)} <small title="Tasks using it">${count(c)}</small><button data-action="del-item" data-key="${key}" data-i="${i}" aria-label="Remove ${esc(c)}">${ico('x')}</button></span>`).join('') || '<span class="muted small">None yet.</span>'}</div>
      <form class="inline-form item-form" data-key="${key}"><input name="item" placeholder="${placeholder}" required><button class="btn">${ico('plus')} Add</button></form>
    </section>`;
    body = listEditor('accounts', 'Accounts', 'The separate accounts the team looks after. Each task guide says which account(s) it is for, so someone covering can filter to just that account.', "e.g. Father's House", (c) => S.sops.filter((s) => s.accounts.includes(c)).length)
      + listEditor('categories', 'Categories', 'The kinds of work, used to group and filter tasks. Removing one doesn\'t change existing tasks.', 'e.g. Bank transfers', (c) => S.sops.filter((s) => s.category === c).length);
  } else {
    body = `
    <div class="cards">
      <div class="card-action"><div>${ico('print')}<b>Handover pack</b><p class="muted">Print every published guide, or one person's or one account's, as a single PDF.</p></div><a class="btn" href="#/pack">Open</a></div>
      <div class="card-action"><div>${ico('download')}<b>Download a full backup</b><p class="muted">One file with every guide, screenshot, person and version. Keep it somewhere safe.</p></div><button class="btn" data-action="export">Download</button></div>
      ${CLOUD
        ? `<div class="card-action"><div>${ico('upload')}<b>Import guides from a backup</b><p class="muted">Adds the guides and screenshots from a backup file, for example one made while trying the app on your own computer. Owners are matched by email; anyone not found becomes you.</p></div><label class="btn">Choose file<input type="file" accept=".json,application/json" data-action-change="import" hidden></label></div>`
        : `<div class="card-action"><div>${ico('upload')}<b>Restore from a backup</b><p class="muted">Replaces everything in this app with the contents of a backup file.</p></div><label class="btn">Choose file<input type="file" accept=".json,application/json" data-action-change="import" hidden></label></div>
      <div class="card-action danger"><div>${ico('trash')}<b>Reset to demo data</b><p class="muted">Deletes everything and reloads the example team.</p></div><button class="btn danger" data-action="reset">Reset</button></div>`}
    </div>`;
  }
  return `
  <header class="page-head"><div><h1>Admin</h1><p class="sub">People, accounts, categories and backups.</p></div></header>
  <nav class="tabs">${tabs.map(([k, i, l]) => `<a href="#/admin?tab=${k}" class="${tab === k ? 'on' : ''}">${ico(i)} ${l}</a>`).join('')}</nav>
  <section class="admin-body">${body}</section>`;
}

/* ---------- Actions (event delegation) ---------- */
const actions = {
  'new-task': () => newTaskModal(),
  'bulk-add': () => bulkAddModal(),
  'print': () => window.print(),
  'clear-filters': () => { S.filters = { q: '', account: '', owner: '', status: '', frequency: '', category: '' }; render(); },
  'filter-owner': (el) => { S.filters.owner = S.filters.owner === el.dataset.id ? '' : el.dataset.id; render(); },
  'me-menu': () => meMenu(),
  'zoom': (el) => modal(`<div class="lightbox"><img src="${el.src}" alt=""><button class="btn icon" data-close aria-label="Close">${ico('x')}</button></div>`, { wide: true }),
  'flag': (el) => flagModal(el.dataset.sop, el.dataset.step),
  'resolve-flag': async (el) => {
    const c = S.comments.find((x) => x.id === el.dataset.id);
    c.resolved = true; c.resolvedBy = S.me.id; c.resolvedAt = now();
    await DB.put('comments', c); toast('Marked as resolved'); render();
  },
  'sop-more': (el) => sopMoreMenu(sopById(el.dataset.id)),
  'edit-user': (el) => userModal(el.dataset.id ? user(el.dataset.id) : null),
  'handover': (el) => handoverModal(user(el.dataset.id)),
  'del-item': async (el) => {
    const key = el.dataset.key, c = S.meta[key][+el.dataset.i];
    if (!(await ask(`Remove "${c}"?`, key === 'accounts' ? 'Task guides that mention this account keep it until they are edited.' : 'Existing tasks keep this category until they are edited.', { ok: 'Remove', danger: true }))) return;
    S.meta[key].splice(+el.dataset.i, 1); await saveMeta(); render();
  },
  'export': () => exportBackup(),
  'activate': async (el) => { const u = user(el.dataset.id); u.active = true; await saveUser(u); toast(`${u.name} can now sign in as ${ROLES[u.role]}`); render(); },
  'copy-invite': (el) => {
    const iv = S.invites.find((x) => x.email === el.dataset.email);
    const text = `Hi ${iv.name}, you've been added to our ${APP_NAME}. Open ${appUrl()} and choose "Create an account" (or "Continue with Google") using ${iv.email}.`;
    navigator.clipboard?.writeText(text);
    toast('Invite message copied. Paste it into WhatsApp or email.');
  },
  'revoke-invite': async (el) => {
    if (!(await ask('Cancel this invite?', `${el.dataset.email} will no longer get access automatically when they sign up.`, { ok: 'Cancel invite', danger: true, cancel: 'Keep' }))) return;
    await DB.del('invites', el.dataset.email); S.invites = S.invites.filter((x) => x.email !== el.dataset.email); render();
  },
  'reset': async () => {
    if (!(await ask('Reset everything?', 'All guides, people and screenshots in this browser will be deleted and replaced with the demo team. Download a backup first if you need it.', { ok: 'Delete and reset', danger: true }))) return;
    for (const s of DB.STORES) await DB.clear(s);
    imgCache.clear(); localStorage.removeItem('sop-session');
    await seedDemoData(); await loadAll(); S.me = null; go('#/'); render();
  },
};
const changeActions = {
  'set-role': async (el) => { const u = user(el.dataset.id); u.role = el.value; await saveUser(u); toast(`${u.name} is now ${ROLES[u.role]}`); render(); },
  'import': (el) => importBackup(el.files[0]),
};

/* ---------- Modals ---------- */
function ownerOptions(selected, { allowEmpty = false } = {}) {
  const list = S.users.filter((u) => u.active && u.role !== 'reader');
  return (allowEmpty ? '<option value="">No one</option>' : '') + list.map((u) => `<option value="${u.id}" ${u.id === selected ? 'selected' : ''}>${esc(u.name)}</option>`).join('');
}

function newTaskModal() {
  const examples = S.sops.filter((s) => s.status === 'Published' && canView(s));
  const d = modal(`
  <form class="modal-body" id="nt">
    <h2>New task</h2>
    <p class="muted">Start with the basics. You'll add the steps on the next screen.</p>
    <label class="field"><span>Task name</span><input name="name" required placeholder='e.g. "Count and deposit the Sunday offering"' autofocus></label>
    ${acctPicker(S.filters.account ? [S.filters.account] : S.meta.accounts.length === 1 ? [S.meta.accounts[0]] : [])}
    <div class="${isAdmin() ? 'grid3' : 'grid2'}">
      ${isAdmin() ? `<label class="field"><span>Owner</span><select name="ownerId">${ownerOptions(S.me.id)}</select></label>` : ''}
      <label class="field"><span>How often</span><select name="frequency">${FREQ.map((f) => `<option ${f === 'Weekly' ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
      <label class="field"><span>Category</span><select name="category">${S.meta.categories.map((c) => `<option>${esc(c)}</option>`).join('')}</select></label>
    </div>
    ${examples.length ? `<label class="field"><span>Start from</span><select name="from"><option value="">A blank template</option>${examples.map((s) => `<option value="${s.id}">Copy of "${esc(s.name)}"</option>`).join('')}</select></label>` : ''}
    <div class="modal-actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Create and add steps ${ico('right')}</button></div>
  </form>`);
  $('#nt', d).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    let s;
    const from = f.get('from') && sopById(f.get('from'));
    if (from) s = duplicateOf(from);
    else s = newSop({});
    Object.assign(s, { name: f.get('name').trim(), frequency: f.get('frequency'), category: f.get('category'), ownerId: f.get('ownerId') || S.me.id, accounts: pickedAccounts(e.target) });
    await saveSop(s);
    d.close();
    go(`#/sop/${s.id}/edit`);
  });
}

function duplicateOf(src) {
  const s = clone(src);
  return Object.assign(s, {
    id: uid('sop_'), name: src.name + ' (copy)', status: 'Draft', ownerId: S.me.role === 'reader' ? src.ownerId : (isAdmin() ? src.ownerId : S.me.id),
    reviewDate: '', createdAt: now(), steps: s.steps.map((st) => ({ ...st, id: uid('st_') })),
  });
}

function bulkAddModal() {
  const d = modal(`
  <form class="modal-body" id="ba">
    <h2>Add several tasks</h2>
    <p class="muted">Paste your list of recurring tasks, one per line. Each becomes a draft you can fill in later.</p>
    ${isAdmin() ? `<label class="field"><span>For</span><select name="ownerId">${ownerOptions(S.me.id)}</select></label>` : ''}
    <div class="grid2">
      <label class="field"><span>Default frequency</span><select name="frequency">${FREQ.map((f) => `<option ${f === 'Weekly' ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
      <label class="field"><span>Default category</span><select name="category">${S.meta.categories.map((c) => `<option>${esc(c)}</option>`).join('')}</select></label>
    </div>
    ${acctPicker(S.filters.account ? [S.filters.account] : [])}
    <label class="field"><span>Tasks</span><textarea name="list" rows="8" required placeholder="Pay the electricity bill&#10;Process reimbursement requests&#10;Tally the cash book with the bank statement"></textarea></label>
    <div class="modal-actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Add tasks</button></div>
  </form>`);
  $('#ba', d).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const names = f.get('list').split('\n').map((x) => x.replace(/^[\s\-*•\d.)]+/, '').trim()).filter(Boolean);
    const accounts = pickedAccounts(e.target);
    for (const name of names) await saveSop(newSop({ name, ownerId: f.get('ownerId') || S.me.id, frequency: f.get('frequency'), category: f.get('category'), accounts }));
    d.close(); toast(`${names.length} task${names.length === 1 ? '' : 's'} added as drafts`); render();
  });
}

function flagModal(sopId, stepId) {
  const s = sopById(sopId);
  const idx = s.steps.filter((st) => st.text.trim() || st.imageId).findIndex((st) => st.id === stepId);
  const d = modal(`
  <form class="modal-body" id="fl">
    <h2>${stepId ? `Something unclear in step ${idx + 1}?` : 'Ask about this guide'}</h2>
    <p class="muted">${esc(uname(s.ownerId))} will see this on their task list and can fix the guide.</p>
    <label class="field"><span>What's unclear or wrong?</span><textarea name="text" rows="4" required autofocus placeholder="e.g. The button in the screenshot is now called 'Export', not 'Download'."></textarea></label>
    ${canEdit(s) && s.status === 'Published' ? `<label class="check"><input type="checkbox" name="mark"> Also mark this guide as <b>Needs update</b></label>` : ''}
    <div class="modal-actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">${ico('flag')} Send</button></div>
  </form>`);
  $('#fl', d).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const c = { id: uid('c_'), sopId, stepId: stepId || '', userId: S.me.id, text: f.get('text').trim(), at: now(), resolved: false };
    await DB.put('comments', c); S.comments.push(c);
    if (f.get('mark')) { await pushVersion(sopById(sopId)); const x = clone(s); x.status = 'Needs update'; await saveSop(x); }
    d.close(); toast('Thanks, your note was sent'); render();
  });
}

function menu(items) {
  const d = modal(`<div class="menu">${items.map((it) => it === '-' ? '<hr>' : `<button class="menu-item ${it.danger ? 'danger' : ''}" data-i="${it.key}">${ico(it.icon)} ${esc(it.label)}</button>`).join('')}</div>`);
  d.classList.add('sheet');
  $$('[data-i]', d).forEach((b) => b.addEventListener('click', () => { d.close(); items.find((x) => x.key === b.dataset.i).run(); }));
}

function sopMoreMenu(s) {
  const edit = canEdit(s);
  const items = [];
  if (canCreate()) items.push({ key: 'dup', icon: 'copy', label: 'Duplicate as a new task', run: async () => { const c = duplicateOf(s); await saveSop(c); toast('Copy created'); go(`#/sop/${c.id}/edit`); } });
  if (edit) {
    items.push({ key: 'hist', icon: 'history', label: 'Version history', run: () => historyModal(s) });
    if (s.status === 'Published') items.push({ key: 'nu', icon: 'alert', label: 'Mark as needs update', run: async () => { await pushVersion(s); const x = clone(s); x.status = 'Needs update'; await saveSop(x); render(); } });
    if (s.status === 'Published' || s.status === 'Needs update') items.push({ key: 'rev', icon: 'check', label: 'Confirm still correct (reset review date)', run: async () => { await pushVersion(s); const x = clone(s); x.status = 'Published'; x.reviewDate = addMonths(new Date(), REVIEW_MONTHS).toISOString().slice(0, 10); await saveSop(x); toast('Review date moved forward 6 months'); render(); } });
  }
  items.push({ key: 'copy', icon: 'link', label: 'Copy link', run: () => { navigator.clipboard?.writeText(location.href); toast('Link copied'); } });
  if (isAdmin() || (edit && s.status === 'Draft')) items.push('-', { key: 'del', icon: 'trash', label: 'Delete task', danger: true, run: async () => {
    if (!(await ask(`Delete "${s.name}"?`, 'This removes the guide and its history. This cannot be undone.', { ok: 'Delete', danger: true }))) return;
    await DB.del('sops', s.id); S.sops = S.sops.filter((x) => x.id !== s.id); toast('Deleted'); go('#/');
  } });
  menu(items);
}

async function historyModal(s) {
  const versions = (await DB.where('versions', 'sopId', s.id)).sort((a, b) => b.at.localeCompare(a.at));
  const d = modal(`
  <div class="modal-body">
    <h2>Version history</h2>
    <p class="muted">A version is saved each time someone finishes an editing session or changes the status.</p>
    <ul class="history">
      <li class="cur">${avatar(s.updatedBy, 'sm')}<div><b>Current version</b><small>${fmtDate(s.updatedAt)}, ${new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${esc(uname(s.updatedBy))} · ${esc(s.status)}</small></div></li>
      ${versions.map((v) => `<li>${avatar(v.by, 'sm')}<div><b>${esc(v.data.name)}</b><small>${fmtDate(v.at)}, ${new Date(v.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${esc(uname(v.by))} · ${esc(v.data.status)} · ${v.data.steps.length} steps</small></div><button class="btn sm" data-restore="${v.id}">Restore</button></li>`).join('')}
    </ul>
    ${versions.length ? '' : '<p class="muted">No earlier versions yet.</p>'}
    <div class="modal-actions"><button class="btn" data-close>Close</button></div>
  </div>`);
  $$('[data-restore]', d).forEach((b) => b.addEventListener('click', async () => {
    const v = versions.find((x) => x.id === b.dataset.restore);
    if (!(await ask('Restore this version?', 'The current version is kept in the history, so you can switch back.', { ok: 'Restore' }))) return;
    await pushVersion(sopById(s.id));
    const x = clone(v.data); x.id = s.id;
    await saveSop(x); d.close(); toast('Version restored'); render();
  }));
}

function meMenu() {
  menu([
    { key: 'pw', icon: 'key', label: 'Change my password', run: () => passwordModal(S.me, true) },
    { key: 'out', icon: 'logout', label: 'Sign out', run: () => signOut() },
  ]);
}

function passwordModal(u, self, { recovery = false } = {}) {
  const askOld = self && !CLOUD;
  const d = modal(`
  <form class="modal-body" id="pw">
    <h2>${recovery ? 'Set a new password' : self ? 'Change your password' : `Set a new password for ${esc(u.name)}`}</h2>
    ${askOld ? '<label class="field"><span>Current password</span><input name="old" type="password" required autocomplete="current-password"></label>' : ''}
    <label class="field"><span>New password</span><input name="pw" type="password" minlength="6" required autocomplete="new-password"></label>
    <p class="error" hidden></p>
    <div class="modal-actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save</button></div>
  </form>`);
  $('#pw', d).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const er = $('.error', d);
    if (CLOUD) {
      try { await Auth.setPassword(f.pw.value); } catch (ex) { er.textContent = ex.message; er.hidden = false; return; }
      d.close(); toast('Password updated'); return;
    }
    if (askOld && (await hashPassword(f.old.value, u.salt)) !== u.hash) { er.textContent = 'Current password is wrong.'; er.hidden = false; return; }
    u.salt = uid(); u.hash = await hashPassword(f.pw.value, u.salt);
    await saveUser(u); d.close(); toast('Password updated');
  });
}

function userModal(u) {
  const isNew = !u;
  const d = modal(`
  <form class="modal-body" id="um">
    <h2>${isNew ? 'Add a person' : `Edit ${esc(u.name)}`}</h2>
    <label class="field"><span>Name</span><input name="name" required value="${esc(u?.name || '')}" autofocus></label>
    <label class="field"><span>Email</span><input name="email" type="email" required value="${esc(u?.email || '')}" ${CLOUD && !isNew ? 'disabled' : ''}>${CLOUD && !isNew ? '<small class="hint">This is the email they sign in with, so it can\'t be changed here.</small>' : ''}</label>
    <label class="field"><span>Role</span><select name="role" ${u?.id === S.me.id ? 'disabled' : ''}>
      ${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${(u?.role || 'owner') === k ? 'selected' : ''}>${v} — ${{ admin: 'manages people and can edit everything', owner: 'writes and edits their own task guides', reader: 'reads and prints published guides' }[k]}</option>`).join('')}
    </select></label>
    ${isNew && !CLOUD ? '<label class="field"><span>Temporary password</span><input name="pw" required minlength="6" value="welcome1"><small class="hint">Share it with them; they can change it after signing in.</small></label>' : ''}
    ${isNew && CLOUD ? '<p class="muted small">They\'ll get this role as soon as they create an account with this email, or use Continue with Google. You can copy an invite message afterwards.</p>' : ''}
    <p class="error" hidden></p>
    <div class="modal-actions spread">
      ${!isNew && u.id !== S.me.id ? `<div><button type="button" class="btn ghost ${u.active ? 'danger-text' : ''}" data-toggle>${u.active ? 'Deactivate' : 'Reactivate'}</button><button type="button" class="btn ghost" data-reset>Reset password</button></div>` : '<span></span>'}
      <div><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">${isNew ? 'Add' : 'Save'}</button></div>
    </div>
  </form>`);
  const f = $('#um', d);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (u && CLOUD ? u.email : f.email.value).trim().toLowerCase();
    const er = $('.error', d);
    if (S.users.some((x) => x.email.toLowerCase() === email && x.id !== u?.id)) { er.textContent = 'Someone already uses that email.'; er.hidden = false; return; }
    if (isNew && CLOUD) {
      const iv = { email, name: f.name.value.trim(), role: f.role.value, invitedBy: S.me.id };
      try { await DB.put('invites', iv); } catch (ex) { er.textContent = ex.message; er.hidden = false; return; }
      S.invites = [...(S.invites || []).filter((x) => x.email !== email), iv];
      d.close(); toast(`${iv.name} added. Copy the invite to send them the link.`); render();
      return;
    }
    const x = u ? { ...u } : { id: uid('u_'), active: true, createdAt: now(), salt: uid() };
    x.name = f.name.value.trim(); x.email = email;
    if (f.role && !f.role.disabled) x.role = f.role.value;
    if (isNew) x.hash = await hashPassword(f.pw.value, x.salt);
    await saveUser(x);
    if (x.id === S.me.id) S.me = x;
    d.close(); toast(isNew ? `${x.name} added` : 'Saved'); render();
  });
  $('[data-toggle]', d)?.addEventListener('click', async () => {
    if (u.active && !(await ask(`Deactivate ${u.name}?`, 'They will no longer be able to sign in. Their guides stay in the handbook. Use "Hand over" to give their tasks to someone else.', { ok: 'Deactivate', danger: true }))) return;
    u.active = !u.active; await saveUser(u); d.close(); render();
  });
  $('[data-reset]', d)?.addEventListener('click', async () => {
    d.close();
    if (!CLOUD) { passwordModal(u, false); return; }
    try { await Auth.sendReset(u.email); toast(`Password reset email sent to ${u.email}`); } catch (ex) { toast(ex.message, 'err'); }
  });
}

function handoverModal(from) {
  const tasks = S.sops.filter((s) => s.ownerId === from.id);
  if (!tasks.length) { toast(`${from.name} doesn't own any tasks`); return; }
  const d = modal(`
  <form class="modal-body" id="ho">
    <h2>Hand over ${esc(from.name)}'s tasks</h2>
    <p class="muted">Move all ${tasks.length} task${tasks.length > 1 ? 's' : ''} to a new owner. Use this when someone leaves or changes role.</p>
    <label class="field"><span>New owner</span><select name="to" required>${S.users.filter((u) => u.active && u.role !== 'reader' && u.id !== from.id).map((u) => `<option value="${u.id}">${esc(u.name)}</option>`).join('')}</select></label>
    <label class="check"><input type="checkbox" name="backup" checked> Make ${esc(from.name)} the backup person on these tasks</label>
    <div class="modal-actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">${ico('swap')} Hand over</button></div>
  </form>`);
  $('#ho', d).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    for (const s of tasks) {
      const x = clone(s); x.ownerId = f.get('to');
      if (f.get('backup') && from.active) x.backupId = from.id; else if (x.backupId === f.get('to')) x.backupId = '';
      await saveSop(x);
    }
    d.close(); toast(`${tasks.length} tasks handed over to ${uname(f.get('to'))}`); render();
  });
}

/* ---------- Backup ---------- */
async function exportBackup() {
  const data = { app: 'sop-library', version: 1, exportedAt: now() };
  for (const s of DB.STORES) data[s] = await DB.all(s);
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `sop-library-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Backup downloaded');
}
async function importBackup(file) {
  if (!file) return;
  let data;
  try { data = JSON.parse(await file.text()); } catch { toast('That file is not a valid backup', 'err'); return; }
  if (data.app !== 'sop-library' || !Array.isArray(data.sops) || !Array.isArray(data.users)) { toast('That file is not a backup from this app', 'err'); return; }
  if (CLOUD) { await importIntoCloud(data); return; }
  if (!(await ask('Restore this backup?', `It has ${data.sops.length} guides and ${data.users.length} people, from ${fmtDate(data.exportedAt)}. Everything currently in the app will be replaced.`, { ok: 'Replace and restore', danger: true }))) return;
  for (const s of DB.STORES) { await DB.clear(s); if (Array.isArray(data[s])) await DB.putMany(s, data[s]); }
  imgCache.clear(); await loadAll();
  S.me = S.users.find((u) => u.id === S.me.id && u.active) || null;
  if (!S.me) localStorage.removeItem('sop-session');
  toast('Backup restored'); go('#/'); render();
}

/* Shared library: add SOPs from a backup without touching what's already there.
   People are matched by email, because ids differ between installs. */
async function importIntoCloud(data) {
  const byEmail = (oldId) => {
    const old = data.users.find((u) => u.id === oldId);
    return old && S.users.find((u) => u.email.toLowerCase() === old.email.toLowerCase())?.id;
  };
  const sops = data.sops.filter((s) => !(s.status === 'Draft' && !s.steps.some((x) => x.text.trim())));
  const skipped = data.sops.length - sops.length;
  if (!(await ask(`Import ${sops.length} guide${sops.length === 1 ? '' : 's'}?`,
    `Owners are matched by email; guides whose owner isn't here yet are given to you.${skipped ? ` ${skipped} empty draft${skipped === 1 ? '' : 's'} will be skipped.` : ''} Guides that already exist are updated.`, { ok: 'Import' }))) return;
  const images = new Map((data.images || []).map((i) => [i.id, i.data]));
  // Bring over account and category names the guides use
  const meta = (data.meta || []).find((m) => m.id === 'settings');
  let metaChanged = false;
  for (const k of ['accounts', 'categories']) {
    for (const v of meta?.[k] || []) if (!S.meta[k].includes(v)) { S.meta[k].push(v); metaChanged = true; }
  }
  if (metaChanged) await saveMeta();
  let done = 0;
  toast('Importing… keep this page open');
  for (const s of sops) {
    const x = clone(s);
    x.ownerId = byEmail(s.ownerId) || S.me.id;
    x.backupId = byEmail(s.backupId) || '';
    x.updatedBy = S.me.id;
    for (const st of x.steps) {
      if (!st.imageId) continue;
      if (!images.has(st.imageId)) { st.imageId = ''; continue; }
      const newId = uid('img_');
      await DB.put('images', { id: newId, data: images.get(st.imageId) });
      st.imageId = newId;
    }
    await DB.put('sops', x);
    done++;
  }
  await loadAll();
  toast(`${done} guide${done === 1 ? '' : 's'} imported`); go('#/'); render();
}

const appUrl = () => location.origin + location.pathname;

/* ---------- Boot ---------- */
async function loadAll() {
  [S.users, S.sops, S.comments] = await Promise.all([DB.all('users'), DB.all('sops'), DB.all('comments')]);
  S.meta = (await DB.get('meta', 'settings')) || { id: 'settings', categories: ['Cash', 'Bank transfers', 'Reimbursements', 'Invoices & bills', 'Tallying & reconciliation', 'Records & reports', 'Other'] };
  S.meta.categories = S.meta.categories || [];
  S.meta.accounts = S.meta.accounts || [];
  S.sops.forEach((s) => { s.accounts = s.accounts || []; });
  S.invites = CLOUD ? await DB.all('invites').catch(() => []) : [];
  if (S.me) S.me = S.users.find((u) => u.id === S.me.id) || S.me;
}

/* Any failed save or load shows a message instead of failing silently. */
window.addEventListener('unhandledrejection', (e) => {
  const msg = String(e.reason?.message || e.reason || 'Something went wrong');
  toast(/fetch|network/i.test(msg) ? "Couldn't reach the server. Check your internet connection and try again." : /row-level security|permission/i.test(msg) ? "You don't have permission to do that." : msg, 'err');
});

/* Shared library: pick up teammates' changes when you come back to the tab. */
let lastRefresh = Date.now();
document.addEventListener('visibilitychange', async () => {
  if (!CLOUD || document.hidden || !S.me || Date.now() - lastRefresh < 15000) return;
  const { parts } = route();
  if (parts[2] === 'edit' || parts[2] === 'follow' || $('dialog[open]')) return;
  lastRefresh = Date.now();
  await loadAll();
  if (!S.me.active) { renderPending(S.me); return; }
  if (parts[0] === 'sop' || parts[0] === 'mine' || parts[0] === 'admin' || !parts.length) render();
});

document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-action]');
  if (a && actions[a.dataset.action] && !a.closest('.editor')) { e.preventDefault(); actions[a.dataset.action](a, e); }
});
document.addEventListener('change', (e) => {
  const a = e.target.closest('[data-action-change]');
  if (a && changeActions[a.dataset.actionChange]) changeActions[a.dataset.actionChange](a, e);
  const f = e.target.closest('select[data-filter]');
  if (f) { S.filters[f.dataset.filter] = f.value; renderList(); $$('.cov').forEach((c) => c.classList.toggle('on', c.dataset.id === S.filters.owner)); }
});
document.addEventListener('input', (e) => {
  if (e.target.matches('input[data-filter="q"]')) { S.filters.q = e.target.value; renderList(); }
});
document.addEventListener('submit', async (e) => {
  if (e.target.matches('.item-form')) {
    e.preventDefault();
    const key = e.target.dataset.key, v = e.target.item.value.trim();
    if (v && !S.meta[key].some((x) => x.toLowerCase() === v.toLowerCase())) { S.meta[key].push(v); await saveMeta(); render(); }
  }
});
document.addEventListener('keydown', (e) => {
  if (followKeys && route().parts[2] === 'follow') followKeys(e);
  if (e.key === '/' && !e.target.closest('input, textarea, select, [contenteditable]') && !$('dialog[open]')) {
    const q = $('#q');
    if (q) { e.preventDefault(); q.focus(); } else if (S.me) { go('#/'); setTimeout(() => $('#q')?.focus(), 50); }
  }
});
window.addEventListener('hashchange', render);

(async function boot() {
  if (CLOUD) {
    if (!sb) {
      $('#app').innerHTML = `<div class="empty big">${ico('alert')}<h2>Couldn't load</h2><p>The sign-in library didn't load. Check your internet connection and reload.</p></div>`;
      return;
    }
    Auth.onRecovery(() => setTimeout(() => passwordModal(S.me, true, { recovery: true }), 300));
    try { await afterCloudSignIn(); } catch (err) {
      $('#app').innerHTML = `<div class="empty big">${ico('alert')}<h2>Couldn't connect</h2><p>${esc(err.message)}</p><button class="btn" onclick="location.reload()">Try again</button></div>`;
    }
    return;
  }
  try {
    if (!(await DB.all('users')).length) await seedDemoData();
    await loadAll();
    const sid = localStorage.getItem('sop-session');
    S.me = S.users.find((u) => u.id === sid && u.active) || null;
  } catch (err) {
    $('#app').innerHTML = `<div class="empty big">${ico('alert')}<h2>Couldn't open storage</h2><p>This browser blocked local storage (private mode?). ${esc(err.message)}</p></div>`;
    return;
  }
  render();
})();
