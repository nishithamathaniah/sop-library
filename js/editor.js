/* SOP editor: template fields, steps, screenshots, autosave, publish check. */
'use strict';

const Editor = (() => {
  let E = null; // { sop, dirty, timer, snapshotted, activeStep, root }

  /* ---------- Rendering ---------- */
  function view(s) {
    E = { sop: clone(s), dirty: false, timer: null, snapshotted: false, activeStep: null, root: null };
    return `<div class="editor">${inner()}</div>`;
  }

  function inner() {
    const s = E.sop;
    return `
    <div class="ed-head">
      <a class="btn ghost sm" href="#/sop/${s.id}">${ico('left')} Done</a>
      <span class="save-state" id="save-state">${ico('check')} Saved</span>
    </div>
    <div class="ed-grid">
      <div class="ed-main">
        <div class="ed-titlebar">
          <input class="title-input" id="f-name" data-f="name" value="${esc(s.name)}" placeholder="Task name, e.g. Count and deposit the Sunday offering" aria-label="Task name">
        </div>

        <section class="card">
          ${S.meta.accounts.length ? `
          <div class="field" id="f-accounts"><span>Which account${S.meta.accounts.length > 1 ? '(s)' : ''} is this for? <em>required</em></span>
            <div class="picks">
              ${S.meta.accounts.map((a) => `<label class="pick"><input type="checkbox" data-acct="${esc(a)}" ${!s.accounts.includes('*') && s.accounts.includes(a) ? 'checked' : ''}><span>${esc(a)}</span></label>`).join('')}
              ${S.meta.accounts.length > 1 ? `<label class="pick all"><input type="checkbox" data-acct="*" ${s.accounts.includes('*') ? 'checked' : ''}><span>All accounts</span></label>` : ''}
            </div>
          </div>` : ''}
          <div class="grid3">
            <label class="field" id="f-owner"><span>Owner</span>
              ${isAdmin() ? `<select data-f="ownerId">${ownerOptions(s.ownerId)}</select>` : `<div class="static">${avatar(s.ownerId, 'xs')} ${esc(uname(s.ownerId))}</div>`}
            </label>
            <label class="field"><span>Backup person</span>
              <select data-f="backupId"><option value="">No one yet</option>${S.users.filter((u) => u.active && u.role !== 'reader' && u.id !== s.ownerId).map((u) => `<option value="${u.id}" ${u.id === s.backupId ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select>
            </label>
            <label class="field" id="f-category"><span>Category</span>
              <select data-f="category">${[...new Set([...S.meta.categories, s.category].filter(Boolean))].map((c) => `<option ${c === s.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
            </label>
            <label class="field" id="f-frequency"><span>How often</span>
              <select data-f="frequency">${FREQ.map((f) => `<option ${f === s.frequency ? 'selected' : ''}>${f}</option>`).join('')}</select>
            </label>
            <label class="field"><span>Review by</span>
              <input type="date" data-f="reviewDate" value="${esc(s.reviewDate)}">
              <small class="hint">Empty = 6 months after publishing</small>
            </label>
          </div>
        </section>

        <section class="card">
          <h2 class="card-title"><span class="n">1</span> Why and when</h2>
          <label class="field secret-scope" id="f-purpose"><span>Purpose <em>required</em></span>
            <textarea data-f="purpose" rows="2" placeholder="One or two lines: why this task exists and who relies on it.">${esc(s.purpose)}</textarea>
            ${secretHint()}
          </label>
          <label class="field secret-scope" id="f-when"><span>When to do it <em>required</em></span>
            <input data-f="whenToDo" value="${esc(s.whenToDo)}" placeholder='e.g. "Every Sunday after the last service" or "When a ministry leader submits a bill"'>
            ${secretHint()}
          </label>
          <div class="field secret-scope" id="f-tools"><span>Tools and access needed <em>required</em></span>
            ${listEd('tools', 'App, sheet or account, and who gives access', 'Add tool')}
            ${secretHint()}
          </div>
        </section>

        <section class="card" id="f-steps">
          <h2 class="card-title"><span class="n">2</span> Steps <small class="muted">Tip: paste a screenshot with Ctrl+V (⌘V on Mac) to add it to the selected step.</small></h2>
          <div class="steps-ed">${s.steps.map((st, i) => stepEd(st, i, s.steps.length)).join('')}</div>
          <button class="add-step" data-ed="st-add">${ico('plus')} Add step</button>
        </section>

        <section class="card">
          <h2 class="card-title"><span class="n">3</span> Finish</h2>
          <div class="field secret-scope" id="f-done"><span>How to know it's done <em>required</em></span>
            ${listEd('doneChecklist', 'e.g. Deposit slip filed in the Offerings folder', 'Add check', 'box')}
            ${secretHint()}
          </div>
          <div class="field secret-scope"><span>Common mistakes</span>
            ${listEd('mistakes', 'What usually goes wrong, and how to fix it', 'Add mistake', 'warn')}
            ${secretHint()}
          </div>
          <label class="field secret-scope"><span>Output</span>
            <textarea data-f="output" rows="2" placeholder="What is produced, and where it is saved or sent.">${esc(s.output)}</textarea>
            ${secretHint()}
          </label>
        </section>

        <section class="card">
          <h2 class="card-title">${ico('link')} Useful links</h2>
          <div class="links-ed">
            ${s.links.map((l, i) => `
            <div class="link-row">
              <input data-lk="${i}" data-lf="label" value="${esc(l.label)}" placeholder="Name, e.g. Offering count sheets">
              <input data-lk="${i}" data-lf="url" value="${esc(l.url)}" placeholder="https://…" inputmode="url">
              <button class="icon-btn" data-ed="lk-del" data-i="${i}" aria-label="Remove link">${ico('x')}</button>
            </div>`).join('')}
          </div>
          <button class="add-line" data-ed="lk-add">${ico('plus')} Add link</button>
        </section>
      </div>
      <aside class="ed-side">${side()}</aside>
    </div>`;
  }

  const secretHint = () => `<div class="secret-hint">${ico('alert')} This looks like a password, PIN or account number. Don't store these here. Write who gives access instead (e.g. "the treasurer has the login").</div>`;

  function listEd(key, placeholder, addLabel, kind = '') {
    const items = E.sop[key];
    return `<div class="list-ed ${kind}" data-list="${key}">
      ${items.map((v, i) => `<div class="li-row"><span class="mark"></span><input value="${esc(v)}" data-li="${i}" placeholder="${esc(placeholder)}"><button class="icon-btn" data-ed="li-del" data-i="${i}" aria-label="Remove" tabindex="-1">${ico('x')}</button></div>`).join('')}
      <button class="add-line" data-ed="li-add">${ico('plus')} ${addLabel}</button>
    </div>`;
  }

  function stepEd(st, i, n) {
    return `
    <div class="step-e secret-scope ${E.activeStep === st.id ? 'active' : ''}" data-step="${st.id}">
      <div class="se-head">
        <span class="num">${i + 1}</span>
        <div class="se-tools">
          <button class="icon-btn" data-ed="st-up" ${i === 0 ? 'disabled' : ''} aria-label="Move up" title="Move up">${ico('up')}</button>
          <button class="icon-btn" data-ed="st-down" ${i === n - 1 ? 'disabled' : ''} aria-label="Move down" title="Move down">${ico('down')}</button>
          <button class="icon-btn" data-ed="st-ins" aria-label="Insert a step below" title="Insert a step below">${ico('plus')}</button>
          <button class="icon-btn danger" data-ed="st-del" aria-label="Delete step" title="Delete step">${ico('trash')}</button>
        </div>
      </div>
      <textarea data-sf="text" rows="2" placeholder="${i === 0 ? 'What to do first, e.g. Open the offering count sheet for this Sunday' : 'What to do next'}">${esc(st.text)}</textarea>
      ${st.imageId ? `
        <div class="shot-wrap">
          <img data-img="${st.imageId}" alt="Screenshot for step ${i + 1}">
          <div class="shot-tools">
            <button class="btn sm" data-ed="markup">${ico('pen')} Mark up</button>
            <label class="btn sm">${ico('image')} Replace<input type="file" accept="image/*" data-ed-file hidden></label>
            <button class="btn sm danger-text" data-ed="img-del">${ico('trash')} Remove</button>
          </div>
        </div>
        <input class="caption" data-sf="caption" value="${esc(st.caption)}" placeholder="Caption (optional): what to look at in this screenshot">
      ` : `
        <label class="drop">
          ${ico('image')}
          <span><b>Paste a screenshot</b> or drop one here · <u>browse</u></span>
          <input type="file" accept="image/*" data-ed-file hidden>
        </label>`}
      <div class="grid2">
        <input data-sf="link" value="${esc(st.link)}" placeholder="Link (optional)" inputmode="url">
        <input data-sf="linkLabel" value="${esc(st.linkLabel)}" placeholder="Button text, e.g. Open the count sheet">
      </div>
      <details ${st.note || st.video ? 'open' : ''}>
        <summary>Warning, tip or video</summary>
        <textarea data-sf="note" rows="2" placeholder="Something to watch out for in this step">${esc(st.note)}</textarea>
        <input data-sf="video" value="${esc(st.video)}" placeholder="Short video link (Loom, YouTube, Drive)" inputmode="url">
      </details>
      ${secretHint()}
    </div>`;
  }

  function side() {
    const s = E.sop;
    const c = checkSop(s);
    const pct = Math.round((c.done / c.total) * 100);
    return `
    <div class="card ready">
      <div class="ready-top">
        <div class="ring sm" style="--p:${pct}"><span>${c.done}/${c.total}</span></div>
        <div><b>${c.missing.length ? 'Keep going' : 'Ready to publish'}</b>
        <small>${c.missing.length ? `${c.missing.length} required part${c.missing.length > 1 ? 's' : ''} left` : 'Everything a newcomer needs is here.'}</small></div>
      </div>
      ${c.missing.length ? `<ul class="missing">${c.missing.map(([a, l]) => `<li><button data-ed="jump" data-to="${a}">${esc(l)}</button></li>`).join('')}</ul>` : ''}
      <div class="seg" role="radiogroup" aria-label="Status">
        ${STATUSES.map((x) => `<button role="radio" aria-checked="${s.status === x}" class="${s.status === x ? 'on' : ''}" data-ed="status" data-v="${x}">${x}</button>`).join('')}
      </div>
      ${s.status !== 'Published' ? `<button class="btn primary block" data-ed="status" data-v="Published">${ico('check')} Publish</button>` : ''}
      <a class="btn ghost block" href="#/sop/${s.id}">Preview as a reader</a>
    </div>
    <div class="card tip">${ico('key')}<p><b>No passwords or account numbers.</b> Never write passwords, PINs, OTPs or full bank and card numbers in a guide. Write who grants access instead.</p></div>`;
  }

  /* ---------- Mount & events ---------- */
  function mount() {
    const root = $('.editor');
    E.root = root;
    document.title = `Editing ${E.sop.name || 'task'} · ${APP_NAME}`;
    afterDraw();
    root.addEventListener('input', onInput);
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    root.addEventListener('keydown', onKey);
    root.addEventListener('focusin', (e) => { const st = e.target.closest('[data-step]'); if (st) setActive(st.dataset.step); });
    root.addEventListener('pointerdown', (e) => { const st = e.target.closest('[data-step]'); if (st) setActive(st.dataset.step); });
    root.addEventListener('dragover', (e) => { const z = e.target.closest('[data-step]'); if (z) { e.preventDefault(); z.classList.add('drag'); } });
    root.addEventListener('dragleave', (e) => { e.target.closest('[data-step]')?.classList.remove('drag'); });
    root.addEventListener('drop', (e) => {
      const z = e.target.closest('[data-step]');
      if (!z) return;
      e.preventDefault(); z.classList.remove('drag');
      const f = [...e.dataTransfer.files].find((x) => x.type.startsWith('image/'));
      if (f) addImage(f, z.dataset.step);
    });
  }

  function setActive(id) {
    if (E.activeStep === id) return;
    E.activeStep = id;
    $$('.step-e', E.root).forEach((el) => el.classList.toggle('active', el.dataset.step === id));
  }

  function afterDraw() {
    $$('textarea', E.root).forEach(autosize);
    $$('.secret-scope', E.root).forEach(checkSecret);
    hydrateImages(E.root);
  }
  function redraw(focusSel) {
    const y = window.scrollY;
    E.root.innerHTML = inner();
    afterDraw();
    window.scrollTo(0, y);
    if (focusSel) { const el = $(focusSel, E.root); el && el.focus({ preventScroll: false }); }
  }
  function autosize(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 2 + 'px'; }
  function checkSecret(scope) {
    const hit = $$('input, textarea', scope).some((x) => SECRET_RE.test(x.value));
    scope.classList.toggle('has-secret', hit);
  }

  const stepOf = (el) => E.sop.steps.find((x) => x.id === el.closest('[data-step]')?.dataset.step);

  function onInput(e) {
    const t = e.target, s = E.sop;
    if (t.dataset.acct != null) {
      const a = t.dataset.acct;
      if (a === '*') s.accounts = t.checked ? ['*'] : [];
      else {
        s.accounts = s.accounts.filter((x) => x !== '*' && x !== a);
        if (t.checked) s.accounts.push(a);
        s.accounts.sort((x, y) => S.meta.accounts.indexOf(x) - S.meta.accounts.indexOf(y));
      }
      $$('[data-acct]', E.root).forEach((x) => { x.checked = s.accounts.includes(x.dataset.acct); });
      changed();
      return;
    }
    if (t.dataset.f) s[t.dataset.f] = t.value;
    else if (t.dataset.sf) stepOf(t)[t.dataset.sf] = t.value;
    else if (t.dataset.li != null) s[t.closest('[data-list]').dataset.list][+t.dataset.li] = t.value;
    else if (t.dataset.lk != null) s.links[+t.dataset.lk][t.dataset.lf] = t.value;
    else return;
    if (t.tagName === 'TEXTAREA') autosize(t);
    const scope = t.closest('.secret-scope'); scope && checkSecret(scope);
    if (t.dataset.f === 'ownerId') { changed(); redraw(); return; }
    changed();
  }

  function onChange(e) {
    if (e.target.matches('[data-ed-file]')) {
      const f = e.target.files[0];
      if (f) addImage(f, e.target.closest('[data-step]').dataset.step);
    }
  }

  function onKey(e) {
    const t = e.target;
    if (t.dataset.li == null) return;
    const key = t.closest('[data-list]').dataset.list;
    const i = +t.dataset.li;
    if (e.key === 'Enter') {
      e.preventDefault();
      E.sop[key].splice(i + 1, 0, '');
      changed(); redraw(`[data-list="${key}"] [data-li="${i + 1}"]`);
    } else if (e.key === 'Backspace' && t.value === '' && E.sop[key].length > 1) {
      e.preventDefault();
      E.sop[key].splice(i, 1);
      changed(); redraw(`[data-list="${key}"] [data-li="${Math.max(0, i - 1)}"]`);
    }
  }

  async function onClick(e) {
    const b = e.target.closest('[data-ed]');
    if (!b) return;
    e.preventDefault();
    const s = E.sop;
    const act = b.dataset.ed;
    const st = b.closest('[data-step]') ? stepOf(b) : null;
    const si = st ? s.steps.indexOf(st) : -1;

    switch (act) {
      case 'st-add': {
        const n = newStep(); s.steps.push(n); E.activeStep = n.id;
        changed(); redraw(`[data-step="${n.id}"] textarea`); break;
      }
      case 'st-ins': {
        const n = newStep(); s.steps.splice(si + 1, 0, n); E.activeStep = n.id;
        changed(); redraw(`[data-step="${n.id}"] textarea`); break;
      }
      case 'st-up': case 'st-down': {
        const j = act === 'st-up' ? si - 1 : si + 1;
        [s.steps[si], s.steps[j]] = [s.steps[j], s.steps[si]];
        changed(); redraw(`[data-step="${st.id}"] [data-ed="${act}"]:not([disabled])`); break;
      }
      case 'st-del': {
        const hasContent = st.text.trim() || st.imageId || st.note || st.link;
        if (hasContent && !(await ask(`Delete step ${si + 1}?`, 'Its text and screenshot will be removed.', { ok: 'Delete', danger: true }))) return;
        s.steps.splice(si, 1);
        changed(); redraw(); break;
      }
      case 'li-add': {
        const key = b.closest('[data-list]').dataset.list;
        s[key].push(''); changed(); redraw(`[data-list="${key}"] [data-li="${s[key].length - 1}"]`); break;
      }
      case 'li-del': {
        const key = b.closest('[data-list]').dataset.list;
        s[key].splice(+b.dataset.i, 1); changed(); redraw(); break;
      }
      case 'lk-add': s.links.push({ label: '', url: '' }); changed(); redraw(`[data-lk="${s.links.length - 1}"]`); break;
      case 'lk-del': s.links.splice(+b.dataset.i, 1); changed(); redraw(); break;
      case 'img-del': st.imageId = ''; st.caption = ''; changed(); redraw(); break;
      case 'markup': markup(st); break;
      case 'jump': {
        const el = document.getElementById(b.dataset.to);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const target = el.matches('input, textarea, select') ? el : $('input, textarea, select', el) || (b.dataset.to === 'f-steps' ? $('.step-e textarea', el) : null);
          target && setTimeout(() => target.focus({ preventScroll: true }), 300);
          el.classList.add('pulse'); setTimeout(() => el.classList.remove('pulse'), 1400);
        }
        break;
      }
      case 'status': setStatus(b.dataset.v); break;
    }
  }

  /* ---------- Saving ---------- */
  function setSaveState(txt, busy) {
    const el = $('#save-state');
    if (el) { el.innerHTML = (busy ? '<span class="spin"></span>' : ico('check')) + esc(txt); el.classList.toggle('busy', !!busy); }
  }
  function changed() {
    E.dirty = true;
    setSaveState('Saving…', true);
    clearTimeout(E.timer);
    E.timer = setTimeout(flush, 700);
    const panel = $('.ed-side', E.root);
    if (panel) panel.innerHTML = side();
  }

  async function flush() {
    if (!E || !E.dirty) return;
    clearTimeout(E.timer);
    E.dirty = false;
    const mine = E;
    try {
      if (!mine.snapshotted) {
        const prev = sopById(mine.sop.id);
        if (prev) await pushVersion(prev);
        mine.snapshotted = true;
      }
      await saveSop(mine.sop);
      if (E === mine) setSaveState('Saved');
      window.removeEventListener('beforeunload', warnUnsaved);
    } catch (err) {
      // Keep the changes and try again; warn before closing the tab.
      mine.dirty = true;
      window.addEventListener('beforeunload', warnUnsaved);
      if (!mine.failed) toast(/fetch|network/i.test(err.message) ? "Couldn't save: no connection. Your changes are kept and will be saved when you're back online." : `Couldn't save: ${err.message}`, 'err');
      mine.failed = true;
      if (E === mine) {
        setSaveState('Not saved yet, retrying…', true);
        mine.timer = setTimeout(flush, 5000);
      }
      return;
    }
    mine.failed = false;
  }
  function warnUnsaved(e) { e.preventDefault(); e.returnValue = ''; }

  async function setStatus(v) {
    const s = E.sop;
    if (v === s.status) return;
    if (v === 'Published') {
      const c = checkSop(s);
      if (c.missing.length) {
        const d = modal(`
          <div class="modal-body">
            <h2>A few things are missing</h2>
            <p class="muted">A newcomer needs these to do the task without asking anyone:</p>
            <ul class="missing big">${c.missing.map(([a, l]) => `<li><button class="linkish" data-to="${a}">${esc(l)}</button></li>`).join('')}</ul>
            <div class="modal-actions"><button class="btn primary" data-close>OK, I'll fill them in</button></div>
          </div>`);
        $$('[data-to]', d).forEach((b) => b.addEventListener('click', () => { d.close(); $(`[data-ed="jump"][data-to="${b.dataset.to}"]`)?.click(); }));
        return;
      }
      // Drop completely empty rows so the published SOP reads cleanly
      s.steps = s.steps.filter((x) => x.text.trim() || x.imageId);
      ['tools', 'mistakes', 'doneChecklist'].forEach((k) => { s[k] = s[k].filter((x) => x.trim()); });
      s.links = s.links.filter((l) => l.url.trim());
      if (!s.reviewDate) s.reviewDate = addMonths(new Date(), REVIEW_MONTHS).toISOString().slice(0, 10);
    }
    s.status = v;
    E.dirty = true;
    await flush();
    if (E.dirty) return; // save failed; the retry message is already showing
    if (v === 'Published') { toast('Published. Readers can see it now.'); go(`#/sop/${s.id}`); }
    else { toast(`Status: ${v}`); redraw(); }
  }

  /* ---------- Images ---------- */
  function canvasData(c) {
    let d = c.toDataURL('image/webp', 0.85);
    if (!d.startsWith('data:image/webp')) d = c.toDataURL('image/jpeg', 0.85);
    return d;
  }
  async function compressImage(file, max = 1600) {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = url; await img.decode();
      const scale = Math.min(1, max / img.naturalWidth);
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
      const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      x.imageSmoothingQuality = 'high';
      x.drawImage(img, 0, 0, c.width, c.height);
      return canvasData(c);
    } finally { URL.revokeObjectURL(url); }
  }
  async function storeImage(data) {
    const id = uid('img_');
    await DB.put('images', { id, data, createdAt: now() });
    imgCache.set(id, data);
    return id;
  }
  async function addImage(file, stepId) {
    const st = E.sop.steps.find((x) => x.id === stepId);
    if (!st) return;
    setSaveState('Adding screenshot…', true);
    try {
      st.imageId = await storeImage(await compressImage(file));
      changed(); redraw();
    } catch (err) {
      toast("Couldn't read that image", 'err'); setSaveState('Saved');
    }
  }

  /* Paste anywhere in the editor: the screenshot goes to the selected step,
     or into a new step if that one already has a screenshot. */
  document.addEventListener('paste', async (e) => {
    if (!E || !E.root || !document.body.contains(E.root) || $('dialog[open]')) return;
    const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
    if (!item) return;
    e.preventDefault();
    const s = E.sop;
    let st = s.steps.find((x) => x.id === E.activeStep);
    if (!st) { const last = s.steps[s.steps.length - 1]; st = last && !last.imageId ? last : null; }
    if (!st || st.imageId) {
      const n = newStep();
      s.steps.splice(st ? s.steps.indexOf(st) + 1 : s.steps.length, 0, n);
      st = n; E.activeStep = n.id;
    }
    await addImage(item.getAsFile(), st.id);
    const i = s.steps.indexOf(st);
    toast(`Screenshot added to step ${i + 1}`);
    $(`[data-step="${st.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  async function markup(st) {
    const src = await getImage(st.imageId);
    const img = new Image(); img.src = src; await img.decode();
    const rects = []; let drawing = null;
    const d = modal(`
      <div class="modal-body markup">
        <h2>Mark up screenshot</h2>
        <p class="muted">Drag to draw a red box around the button or field the reader should look at.</p>
        <div class="mk-canvas"><canvas></canvas></div>
        <div class="modal-actions spread">
          <button class="btn ghost" data-mk="undo">${ico('undo')} Undo</button>
          <div><button class="btn ghost" data-close>Cancel</button><button class="btn primary" data-mk="save">Save</button></div>
        </div>
      </div>`, { wide: true });
    const cv = $('canvas', d);
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const ctx = cv.getContext('2d');
    const lw = Math.max(3, Math.round(img.naturalWidth / 260));
    const paint = () => {
      ctx.drawImage(img, 0, 0);
      [...rects, drawing].filter(Boolean).forEach((r) => {
        ctx.strokeStyle = '#e53935'; ctx.lineWidth = lw; ctx.lineJoin = 'round';
        ctx.strokeRect(r.x, r.y, r.w, r.h);
      });
    };
    const pos = (e) => { const b = cv.getBoundingClientRect(); return { x: (e.clientX - b.left) * cv.width / b.width, y: (e.clientY - b.top) * cv.height / b.height }; };
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); const p = pos(e); drawing = { x: p.x, y: p.y, w: 0, h: 0, ox: p.x, oy: p.y }; });
    cv.addEventListener('pointermove', (e) => {
      if (!drawing) return;
      const p = pos(e);
      Object.assign(drawing, { x: Math.min(p.x, drawing.ox), y: Math.min(p.y, drawing.oy), w: Math.abs(p.x - drawing.ox), h: Math.abs(p.y - drawing.oy) });
      paint();
    });
    cv.addEventListener('pointerup', () => { if (drawing && drawing.w > 6 && drawing.h > 6) rects.push(drawing); drawing = null; paint(); });
    paint();
    $('[data-mk="undo"]', d).addEventListener('click', () => { rects.pop(); paint(); });
    $('[data-mk="save"]', d).addEventListener('click', async () => {
      if (rects.length) { paint(); st.imageId = await storeImage(canvasData(cv)); changed(); redraw(); }
      d.close();
    });
  }

  return { view, mount, flush };
})();
