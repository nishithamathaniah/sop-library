/* Task tracker: is each task done for this period, due soon, or overdue?
 *
 * A "run" records that a task was done: { id, sopId, period, label, doneAt, doneBy, note }.
 * Periods follow the task's frequency. Quarters and years follow the
 * financial year (April–March by default; config.js → yearStartMonth).
 * Loaded before app.js; uses its helpers only when called.
 */
'use strict';

const FY_START = Math.min(12, Math.max(1, (window.SOP_CONFIG || {}).yearStartMonth || 4)) - 1; // 0-based month
const DAY = 86400000;
// How many days before the end of a period it counts as "due soon"
const SOON_DAYS = { Daily: 1, Weekly: 2, Monthly: 10, Quarterly: 21, Termly: 21, Yearly: 30 };

const pad2 = (n) => String(n).padStart(2, '0');
const isoDay = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const shortDate = (d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const monthName = (d, len = 'long') => d.toLocaleDateString(undefined, { month: len });

/* The period a date falls in, for a frequency. null for "As needed". */
function periodOf(freq, d = new Date()) {
  const y = d.getFullYear(), m = d.getMonth();
  if (freq === 'Daily') {
    const s = new Date(y, m, d.getDate());
    const today = isoDay(new Date()) === isoDay(s);
    return { key: isoDay(s), label: today ? 'Today' : s.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }), start: s, end: new Date(y, m, d.getDate() + 1) };
  }
  if (freq === 'Weekly') {
    const s = new Date(y, m, d.getDate() - ((d.getDay() + 6) % 7)); // weeks start on Monday
    return { key: 'W' + isoDay(s), label: `Week of ${shortDate(s)}`, start: s, end: new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7) };
  }
  if (freq === 'Monthly') {
    const s = new Date(y, m, 1);
    return { key: `${y}-${pad2(m + 1)}`, label: `${monthName(s)} ${y}`, start: s, end: new Date(y, m + 1, 1) };
  }
  if (freq === 'Quarterly' || freq === 'Termly') {
    const qm = m - ((m - FY_START + 12) % 3);
    const s = new Date(y, qm, 1), e = new Date(y, qm + 3, 1), last = new Date(e - DAY);
    return { key: 'Q' + isoDay(s), label: `${monthName(s, 'short')}–${monthName(last, 'short')} ${last.getFullYear()}`, start: s, end: e };
  }
  if (freq === 'Yearly') {
    const fy = m >= FY_START ? y : y - 1;
    const s = new Date(fy, FY_START, 1), e = new Date(fy + 1, FY_START, 1);
    return { key: 'Y' + fy, label: FY_START === 0 ? String(fy) : `FY ${fy}–${String(fy + 1).slice(2)}`, start: s, end: e };
  }
  return null;
}
const prevPeriod = (freq, p) => periodOf(freq, new Date(p.start.getTime() - 1));

const runsFor = (sopId) => (S.runs || []).filter((r) => r.sopId === sopId).sort((a, b) => b.doneAt.localeCompare(a.doneAt));

/* Where a task stands right now. */
function track(s) {
  const runs = runsFor(s.id);
  const last = runs[0] || null;
  const p = periodOf(s.frequency);
  if (!p) return { state: 'adhoc', last, text: last ? `Last done ${ago(last.doneAt)}` : 'Not done yet' };
  const run = runs.find((r) => r.period === p.key) || null;
  const prev = prevPeriod(s.frequency, p);
  // Only count a missed previous period if the task already existed then
  const prevMissed = new Date(s.createdAt) < prev.start && !runs.some((r) => r.period === prev.key);
  const daysLeft = Math.ceil((p.end - Date.now()) / DAY);
  if (prevMissed) return { state: 'overdue', p, prev, run, last, text: `Was due ${shortDate(new Date(prev.end - DAY))}` };
  if (run) return { state: 'done', p, run, last, text: `Done ${ago(run.doneAt)} · ${uname(run.doneBy)}` };
  if (daysLeft <= (SOON_DAYS[s.frequency] || 0)) return { state: 'soon', p, last, daysLeft, text: daysLeft <= 1 ? 'Due today' : `Due in ${daysLeft} days` };
  return { state: 'upcoming', p, last, text: `Due by ${shortDate(new Date(p.end - DAY))}` };
}

const STATE_LABEL = { overdue: 'Overdue', soon: 'Due soon', upcoming: 'Coming up', done: 'Done', adhoc: 'As needed' };
const trackable = (s) => !!S.me && canView(s) && !S.runsMissing;
const overdueCount = () => S.sops.filter(canView).filter((s) => track(s).state === 'overdue').length;

/* ---------- Saving ---------- */
async function saveRun(s, period, note = '') {
  const key = period ? period.key : 'adhoc';
  const existing = period && (S.runs || []).find((x) => x.sopId === s.id && x.period === key);
  if (existing) return existing; // already recorded for this period
  const r = { id: uid('run_'), sopId: s.id, period: period ? period.key : 'adhoc', label: period ? period.label : '', doneAt: now(), doneBy: S.me.id, note: note.trim() };
  await DB.put('runs', r);
  S.runs = [...(S.runs || []), r];
  return r;
}

/* Get the latest completions for one task (someone else may have just marked it). */
async function refreshRuns(sopId) {
  try {
    const fresh = await DB.where('runs', 'sopId', sopId);
    S.runs = [...(S.runs || []).filter((r) => r.sopId !== sopId), ...fresh];
  } catch { /* keep what we have */ }
}

async function markDoneModal(s) {
  await refreshRuns(s.id);
  const t = track(s);
  if (t.state === 'done') { toast(`Already marked as done by ${uname(t.run.doneBy)}`); render(); return; }
  const periods = [];
  if (t.state === 'overdue') periods.push([t.prev, `${t.prev.label} (overdue)`]);
  if (t.p && !t.run) periods.push([t.p, t.p.label]);
  if (t.state === 'overdue' && t.run) periods.length = 1;
  const d = modal(`
  <form class="modal-body" id="md">
    <h2>Mark as done</h2>
    <p class="muted">${esc(s.name)}</p>
    ${periods.length > 1 ? `<div class="field"><span>Which period did you do?</span><div class="picks">${periods.map(([p, l], i) => `<label class="pick"><input type="radio" name="period" value="${i}" ${i === 0 ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div></div>`
      : periods.length === 1 ? `<p class="period-line">${ico('clock')} For <b>${esc(periods[0][1])}</b></p>` : `<p class="period-line">${ico('clock')} Done today</p>`}
    <label class="field secret-scope"><span>Note <em>optional</em></span>
      <textarea name="note" rows="2" placeholder="e.g. Paid ₹4,250 on 3 Nov, receipt in the Bills folder"></textarea>
      <div class="secret-hint">${ico('alert')} This looks like a password, PIN or account number. Don't store these here.</div>
    </label>
    <div class="modal-actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">${ico('check')} Mark as done</button></div>
  </form>`);
  const f = $('#md', d);
  f.note.addEventListener('input', () => f.note.closest('.secret-scope').classList.toggle('has-secret', SECRET_RE.test(f.note.value)));
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const chosen = periods.length ? periods[+(new FormData(f).get('period') || 0)][0] : null;
    await saveRun(s, chosen, f.note.value);
    d.close();
    toast(`Marked as done${chosen ? ` for ${chosen.label}` : ''}`);
    render();
  });
}

async function runHistoryModal(s) {
  let runs = runsFor(s.id);
  try { runs = (await DB.where('runs', 'sopId', s.id)).sort((a, b) => b.doneAt.localeCompare(a.doneAt)); } catch { /* fall back to recent runs */ }
  const canUndo = (r) => r.doneBy === S.me.id || isAdmin();
  const d = modal(`
  <div class="modal-body">
    <h2>When it was done</h2>
    <p class="muted">${esc(s.name)} · ${esc(s.frequency)}</p>
    ${runs.length ? `<ul class="history runs">${runs.map((r) => `
      <li>${avatar(r.doneBy, 'sm')}<div><b>${esc(r.label || 'Done')}</b><small>${fmtDate(r.doneAt)} · ${esc(uname(r.doneBy))}</small>${r.note ? `<p class="run-note">${esc(r.note)}</p>` : ''}</div>
      ${canUndo(r) ? `<button class="btn sm ghost danger-text" data-undo="${r.id}">Undo</button>` : ''}</li>`).join('')}</ul>`
      : '<p class="muted">Not done yet.</p>'}
    <div class="modal-actions"><button class="btn" data-close>Close</button></div>
  </div>`);
  $$('[data-undo]', d).forEach((b) => b.addEventListener('click', async () => {
    const r = runs.find((x) => x.id === b.dataset.undo);
    if (!(await ask('Undo this?', `"${r.label || 'Done'}" will be marked as not done.`, { ok: 'Undo', danger: true }))) return;
    await DB.del('runs', r.id);
    S.runs = S.runs.filter((x) => x.id !== r.id);
    d.close(); toast('Undone'); render();
  }));
}

/* ---------- Bits used on other screens ---------- */
function trackBar(s) {
  if (!trackable(s)) return '';
  const t = track(s);
  const icon = { overdue: 'alert', soon: 'clock', upcoming: 'clock', done: 'check', adhoc: 'history' }[t.state];
  const period = t.state === 'overdue' ? t.prev.label : t.p ? t.p.label : '';
  return `<div class="track-bar ${t.state} no-print">
    <span class="tb-ico">${ico(icon)}</span>
    <div class="tb-text"><b>${t.state === 'adhoc' ? 'As needed' : esc(period)}</b><span>${esc(t.state === 'overdue' ? 'Not done yet: overdue' : t.text)}</span></div>
    <div class="tb-actions">
      <button class="btn sm ghost" data-action="run-history" data-id="${s.id}">${ico('history')} History</button>
      ${t.state === 'done' ? '' : `<button class="btn sm ${t.state === 'overdue' || t.state === 'soon' ? 'primary' : ''}" data-action="mark-done" data-id="${s.id}">${ico('check')} Mark as done</button>`}
    </div>
  </div>`;
}

function dueChip(s) {
  if (!trackable(s)) return '';
  const t = track(s);
  if (t.state === 'overdue') return `<span class="pill due">${ico('alert')}Overdue</span>`;
  if (t.state === 'soon') return `<span class="pill upd">${ico('clock')}${esc(t.text)}</span>`;
  if (t.state === 'done') return `<span class="pill pub">${ico('check')}Done</span>`;
  return '';
}

/* ---------- Checklist page ---------- */

function dueView() {
  if (S.runsMissing) {
    return `<header class="page-head"><div><h1>Checklist</h1></div></header>
    <div class="banner warn">${ico('alert')}<div><b>One more setup step is needed.</b> ${isAdmin() ? 'In Supabase, open SQL Editor → New query, paste the file <code>supabase/migrations/002_task_runs.sql</code> from the project, and tap Run. Then reload this page.' : 'Ask your admin to run the database update in Supabase (see docs/SETUP.md).'}</div></div>`;
  }
  const f = S.due;
  const list = S.sops.filter(canView).filter((s) =>
    (!f.account || s.accounts.includes(f.account) || s.accounts.includes('*')) &&
    (!f.owner || s.ownerId === f.owner || (f.owner === S.me.id && s.backupId === S.me.id)));
  const groups = { overdue: [], soon: [], upcoming: [], done: [], adhoc: [] };
  const items = list.map((s) => ({ s, t: track(s) }));
  items.forEach((x) => groups[x.t.state].push(x));
  const sortBy = { overdue: (a, b) => a.t.prev.start - b.t.prev.start, soon: (a, b) => a.t.daysLeft - b.t.daysLeft, upcoming: (a, b) => a.t.p.end - b.t.p.end, done: (a, b) => b.t.run.doneAt.localeCompare(a.t.run.doneAt), adhoc: (a, b) => a.s.name.localeCompare(b.s.name) };
  Object.keys(groups).forEach((k) => groups[k].sort(sortBy[k]));
  const tracked = items.length - groups.adhoc.length;

  const row = ({ s, t }) => `
    <div class="due-row ${t.state}">
      ${t.state === 'done'
        ? `<button class="due-check on" data-action="run-history" data-id="${s.id}" aria-label="Done. See history">${ico('check')}</button>`
        : `<button class="due-check" data-action="mark-done" data-id="${s.id}" aria-label="Mark as done"></button>`}
      <a class="due-main" href="#/sop/${s.id}">
        <b>${esc(s.name || 'Untitled task')}</b>
        <small>${acctLabel(s) ? `<span class="acct">${esc(acctLabel(s))}</span> · ` : ''}${esc(t.state === 'overdue' ? t.prev.label : t.p ? t.p.label : s.frequency)}</small>
      </a>
      <span class="due-owner">${avatar(s.ownerId, 'xs')}<span>${esc(uname(s.ownerId))}</span></span>
      <span class="due-when">${esc(t.text)}</span>
    </div>`;
  const section = (key, title, hint) => groups[key].length ? `
    <section class="due-group ${key}" id="due-${key}">
      <h2 class="section-title">${title} <span>${groups[key].length}</span></h2>
      ${hint ? `<p class="muted small due-hint">${hint}</p>` : ''}
      <div class="due-list">${groups[key].map(row).join('')}</div>
    </section>` : '';

  return `
  <header class="page-head">
    <div><h1>Checklist</h1><p class="sub">What's due, what's overdue and what's done, for every task.</p></div>
    ${canCreate() ? `<button class="btn ghost no-mobile" data-action="runs-csv">${ico('download')} Download log</button>` : ''}
  </header>
  <div class="due-summary">
    ${[['overdue', 'Overdue'], ['soon', 'Due soon'], ['upcoming', 'Coming up'], ['done', 'Done']].map(([k, l]) => `<a class="ds ${k}" href="javascript:void(0)" data-jump="due-${k}"><b>${groups[k].length}</b><span>${l}</span></a>`).join('')}
    <div class="ds progress"><div class="ring sm" style="--p:${tracked ? Math.round(groups.done.length / tracked * 100) : 0}"><span>${tracked ? Math.round(groups.done.length / tracked * 100) : 0}%</span></div><span>done this period</span></div>
  </div>
  <div class="filters"><div class="filter-row">
    ${S.meta.accounts.length ? `<select data-due="account" aria-label="Account"><option value="">All accounts</option>${S.meta.accounts.map((a) => `<option ${a === f.account ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select>` : ''}
    <select data-due="owner" aria-label="Person"><option value="">Everyone</option>${S.me.role !== 'reader' ? `<option value="${S.me.id}" ${f.owner === S.me.id ? 'selected' : ''}>Only mine</option>` : ''}${owners().filter((u) => u.id !== S.me.id).map((u) => `<option value="${u.id}" ${u.id === f.owner ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select>
  </div></div>
  ${items.length ? '' : `<div class="empty">${ico('check')}<h3>No tasks yet</h3><p>Tasks appear here once they are added.</p></div>`}
  ${section('overdue', 'Overdue', 'The last period was not marked as done.')}
  ${section('soon', 'Due soon')}
  ${section('upcoming', 'Coming up')}
  ${section('done', 'Done this period')}
  ${section('adhoc', 'As needed', 'No fixed schedule. Mark them as done whenever you do them, so there is a record.')}`;
}

function mountDue() {
  $$('[data-due]').forEach((el) => el.addEventListener('change', () => { S.due[el.dataset.due] = el.value; render(); }));
  $$('[data-jump]').forEach((el) => el.addEventListener('click', () => document.getElementById(el.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' })));
}

/* ---------- Log for the auditor ---------- */
async function exportRunsCsv() {
  let runs = S.runs || [];
  try { runs = await DB.all('runs'); } catch { /* recent only */ }
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['Task', 'Account(s)', 'Category', 'Frequency', 'Period', 'Done on', 'Done by', 'Note']];
  runs.sort((a, b) => a.doneAt.localeCompare(b.doneAt)).forEach((r) => {
    const s = sopById(r.sopId) || {};
    rows.push([s.name || '(deleted task)', s.accounts ? acctLabel(s) : '', s.category || '', s.frequency || '', r.label || '', new Date(r.doneAt).toLocaleString(), uname(r.doneBy), r.note || '']);
  });
  const blob = new Blob(['﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `task-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Task log downloaded. Open it in Excel or Google Sheets.');
}

const TrackerActions = {
  'mark-done': (el) => markDoneModal(sopById(el.dataset.id)),
  'run-history': (el) => runHistoryModal(sopById(el.dataset.id)),
  'runs-csv': () => exportRunsCsv(),
};
