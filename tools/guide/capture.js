/* Takes the screenshots for the Getting Started guide and records where each
 * numbered marker goes.
 *
 *   node tools/guide/capture.js <appUrl> <outDir> [supabaseUrl anonKey]
 *
 * Local-mode screens use the demo data. If a Supabase URL and anon key are
 * given (an EMPTY test project), the sign-in and People screens are captured
 * in shared mode too.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [SRC, OUT, SB_URL, SB_KEY] = process.argv.slice(2);
// Pages are loaded at the real public address (so it shows in screenshots)
// but served from the local copy given as SRC.
const APP = process.env.GUIDE_SITE || 'https://tfh-finance-handbook.vercel.app/';
const SB_PUBLIC = 'https://supabase-local.test';
const LOCAL_CFG = "window.SOP_CONFIG={supabaseUrl:'',supabaseAnonKey:'',appName:'Finance Handbook',orgName:\"The Father's House\",orgLogo:true,googleSignIn:false};";
fs.mkdirSync(OUT, { recursive: true });
const manifest = {};
const HIDE = '#toasts{display:none!important} *{caret-color:transparent!important} dialog.modal[open]{animation:none!important}';

/* marks: [selector, position?] → numbered badges 1..n */
async function shot(page, name, marks = [], { clip, el, pad = 16 } = {}) {
  await page.waitForTimeout(350);
  const vp = page.viewportSize();
  if (el) {
    const b = await page.locator(el).first().boundingBox();
    clip = { x: Math.max(0, b.x - pad), y: Math.max(0, b.y - pad), width: Math.min(vp.width, b.width + pad * 2), height: Math.min(vp.height, b.height + pad * 2) };
  }
  clip = clip || { x: 0, y: 0, width: vp.width, height: vp.height };
  const pts = [];
  for (const m of marks) {
    const [sel, pos = 'left'] = Array.isArray(m) ? m : [m];
    const b = await page.locator(sel).first().boundingBox();
    if (!b) throw new Error(`${name}: no box for ${sel}`);
    // Markers sit just outside the item so they never hide its text
    let x = b.x - 17, y = b.y + b.height / 2;
    if (pos === 'right') x = b.x + b.width + 17;
    if (pos === 'top') { x = b.x + b.width / 2; y = b.y - 17; }
    if (pos === 'center') x = b.x + b.width / 2;
    if (pos === 'topleft') { x = b.x; y = b.y; }
    pts.push({ x: Math.min(Math.max(x - clip.x, 14), clip.width - 14), y: Math.min(Math.max(y - clip.y, 14), clip.height - 14) });
  }
  await page.screenshot({ path: path.join(OUT, name + '.png'), clip });
  manifest[name] = { w: clip.width, h: clip.height, marks: pts.map((p) => ({ x: +(p.x / clip.width * 100).toFixed(2), y: +(p.y / clip.height * 100).toFixed(2) })) };
}

async function newPage(b, opts = {}, cfg) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, ...opts });
  await ctx.route(APP + '**', async (r) => r.fulfill({ response: await r.fetch({ url: r.request().url().replace(APP, SRC) }) }));
  // The page is https, so reach a local Supabase through an https stand-in address
  if (SB_URL && SB_URL.startsWith('http://')) await ctx.route(SB_PUBLIC + '/**', async (r) => r.fulfill({ response: await r.fetch({ url: r.request().url().replace(SB_PUBLIC, SB_URL) }) }));
  await ctx.route('**/config.js', (r) => r.fulfill({ contentType: 'application/javascript', body: cfg || LOCAL_CFG }));
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await p.addInitScript((css) => { addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }); }, HIDE);
  return p;
}
const demo = async (p, email) => { await p.goto(APP); await p.waitForSelector('.login-card'); await p.click(`[data-demo="${email}"]`); await p.waitForSelector('.shell'); };

(async () => {
  const b = await chromium.launch();

  /* ---------- Local mode (demo data) ---------- */
  // A reader leaves a question so the guide shows one
  const r = await newPage(b);
  await demo(r, 'new@team.local');
  const p = r; // same browser storage: switch user by signing out
  await p.goto(APP + '#/sop/sop_example'); await p.waitForSelector('.steps');
  await p.locator('[data-action="flag"]').nth(1).click();
  await p.fill('#fl textarea', 'Which safe do we use if the office is locked?');
  await p.click('#fl button.primary'); await p.waitForTimeout(500);
  await p.evaluate(() => { localStorage.removeItem('sop-session'); });
  await demo(p, 'mercy@team.local');

  // 2. All tasks
  await p.goto(APP + '#/'); await p.waitForSelector('#list a.tr');
  await shot(p, 'all-tasks', [
    '.side .nav-link:nth-child(1)', '.side .nav-link:nth-child(3)', ['.side .btn.primary', 'left'],
    '.coverage .cov', '.search input', 'select[data-filter="account"]', '#list a.tr', '.side .me',
  ]);

  // 3. Reading a guide
  await p.goto(APP + '#/sop/sop_example'); await p.waitForSelector('.steps'); await p.waitForTimeout(400);
  await shot(p, 'guide-top', ['.pills', '.sop-actions .btn.primary', '.sop-actions a.btn:not(.primary)', '.sop-actions button.btn:not(.icon)', ['.sop-actions .btn.icon', 'right'], '.facts', '.sop .block']);
  await p.evaluate(() => document.querySelectorAll('.step-v')[1].scrollIntoView({ block: 'start' }));
  await p.evaluate(() => window.scrollBy(0, -20));
  await shot(p, 'guide-steps', ['.step-v:nth-child(2) .num', '.step-v:nth-child(2) .instr', '.step-v:nth-child(2) .shot img', '.step-v:nth-child(2) .step-links .btn', '.step-v:nth-child(2) .flags', '.step-v:nth-child(2) .unclear']);

  // 4. Follow along
  await p.goto(APP + '#/sop/sop_example/follow'); await p.waitForSelector('.follow-stage');
  await p.click('[data-nav="1"]'); await p.waitForSelector('.follow-stage img'); await p.waitForTimeout(400);
  await shot(p, 'follow', [['.follow-head .btn', 'right'], '.fh-mid', ['.fh-pct', 'left'], '.dots', '.instr.lg', '.follow-stage .btn', '[data-nav="-1"]', '[data-nav="1"]']);
  await p.goto(APP + '#/sop/sop_example/follow');
  await p.click('.dots .end'); await p.waitForSelector('.checks.big');
  await p.click('.checks.big label >> nth=0');
  await shot(p, 'follow-end', ['.checks.big', '[data-finish]']);

  // 5. My tasks
  await p.goto(APP + '#/mine'); await p.waitForSelector('.progress-card');
  await shot(p, 'my-tasks', ['.progress-card .ring', '[data-action="bulk-add"]', '.section-title', '.task-card .why', ['.task-card .tc-right', 'left']]);

  // Checklist
  await p.goto(APP + '#/due'); await p.waitForSelector('.due-summary');
  await shot(p, 'checklist', [['.side .nav-link:nth-child(2)', 'left'], '.due-summary .ds.overdue', 'select[data-due="account"]', '#due-overdue .due-check', '#due-overdue .due-main', ['#due-overdue .due-when', 'left'], '#due-done .due-check']);
  await p.goto(APP + '#/sop/sop_s6'); await p.waitForSelector('.track-bar');
  await shot(p, 'track-bar', ['.track-bar .tb-text', ['.track-bar [data-action="run-history"]', 'left'], ['.track-bar [data-action="mark-done"]', 'left']], { el: '.track-bar', pad: 14 });
  await p.click('.track-bar [data-action="mark-done"]'); await p.waitForSelector('#md');
  await p.fill('#md textarea', 'Topped up ₹5,000. Receipt in the petty cash folder.');
  await shot(p, 'mark-done', ['#md .picks', '#md textarea', ['#md button.primary', 'left']], { el: 'dialog[open]', pad: 0 });
  await p.keyboard.press('Escape');

  // 6. New task + Add several
  await p.click('.side [data-action="new-task"]'); await p.waitForSelector('#nt');
  await p.fill('#nt input[name=name]', 'Pay the LifeHub electricity bill');
  await p.click('#nt .pick:has-text("LifeHub")');
  await shot(p, 'new-task', ['#nt input[name=name]', '#nt .picks', '#nt select[name=ownerId]', '#nt select[name=frequency]', '#nt select[name=category]', '#nt select[name=from]', ['#nt button.primary', 'left']], { el: 'dialog[open]', pad: 0 });
  await p.keyboard.press('Escape');
  await p.goto(APP + '#/mine'); await p.waitForSelector('[data-action="bulk-add"]');
  await p.click('[data-action="bulk-add"]'); await p.waitForSelector('#ba');
  await p.fill('#ba textarea', 'Pay the electricity bill\nProcess reimbursement requests\nTally the cash book with the bank statement\nFile supplier invoices');
  await p.click('#ba .pick:has-text("Father")');
  await shot(p, 'add-several', ['#ba select[name=ownerId]', '#ba select[name=frequency]', '#ba .picks', '#ba textarea', ['#ba button.primary', 'left']], { el: 'dialog[open]', pad: 0 });
  await p.keyboard.press('Escape');

  // 7. Editor basics (Princess's draft, opened by the Admin)
  await p.goto(APP + '#/sop/sop_s2/edit'); await p.waitForSelector('.editor');
  await p.fill('[data-f="purpose"]', 'Makes sure every rupee in the LifeHub cash book matches the bank, so mistakes are caught within the month.');
  await p.waitForTimeout(900);
  await shot(p, 'editor-basics', ['.ed-head .btn', ['.save-state', 'left'], '.title-input', '#f-accounts .picks', '#f-owner select', 'select[data-f="backupId"]', 'input[data-f="reviewDate"]', '.ready .ring', '.missing', '.ready .btn.primary']);

  // 8. Steps and screenshots
  await p.fill('[data-f="whenToDo"]', 'First working day of each month, after the bank statement arrives');
  await p.fill('[data-list="tools"] [data-li="0"]', 'Edit access to the LifeHub cash book (ask Mercy)');
  await p.fill('.step-e textarea[data-sf="text"]', 'Download last month\'s LifeHub bank statement as a PDF from net banking.');
  await p.click('.step-e textarea[data-sf="text"]');
  await p.click('[data-ed="st-add"]');
  await p.keyboard.type('Open the cash book and tick each entry that matches a line on the statement.');
  await p.evaluate(async () => {
    const url = mockScreenshot('LifeHub cash book – November', [['Date', 'Details', 'Amount (₹)', 'On statement?'], ['03 Nov', 'Electricity bill', '4,250', '✓'], ['10 Nov', 'Reimbursement – Joy', '1,200', ''], ['17 Nov', 'Sunday offering deposit', '31,500', '✓']], 2);
    const blob = await (await fetch(url)).blob();
    const dt = new DataTransfer(); dt.items.add(new File([blob], 'shot.png', { type: 'image/png' }));
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
  });
  await p.waitForSelector('.step-e:nth-child(2) .shot-wrap img[src^="data:"]');
  const s2 = '.step-e:nth-child(2)';
  await p.fill(`${s2} [data-sf="caption"]`, 'Entries without a tick need checking.');
  await p.fill(`${s2} [data-sf="link"]`, 'https://docs.google.com/spreadsheets');
  await p.fill(`${s2} [data-sf="linkLabel"]`, 'Open the LifeHub cash book');
  await p.click(`${s2} details summary`);
  await p.fill(`${s2} [data-sf="note"]`, 'Never change an amount to make it match. Write "check" and tell Mercy.');
  await p.waitForTimeout(900);
  await p.evaluate((sel) => document.querySelector(sel).scrollIntoView({ block: 'start' }), s2);
  await p.evaluate(() => window.scrollBy(0, -90));
  await shot(p, 'editor-step', [`${s2} .se-head .num`, `${s2} textarea[data-sf="text"]`, `${s2} .shot-wrap img`, `${s2} [data-ed="markup"]`, `${s2} [data-sf="caption"]`, `${s2} [data-sf="link"]`, `${s2} [data-sf="note"]`, [`${s2} .se-tools`, 'left']], { el: `${s2}`, pad: 24 });
  await p.evaluate(() => document.querySelector('.add-step').scrollIntoView({ block: 'center' }));
  await shot(p, 'editor-drop', ['.step-e:nth-child(1) .drop', '.add-step'], { el: '#f-steps', pad: 8 });

  // Mark up
  await p.evaluate((sel) => document.querySelector(sel).scrollIntoView({ block: 'center' }), s2);
  await p.click(`${s2} [data-ed="markup"]`); await p.waitForSelector('dialog canvas'); await p.waitForTimeout(300);
  const cb = await p.locator('dialog canvas').boundingBox();
  await p.mouse.move(cb.x + cb.width * 0.03, cb.y + cb.height * 0.46); await p.mouse.down();
  await p.mouse.move(cb.x + cb.width * 0.97, cb.y + cb.height * 0.70, { steps: 8 }); await p.mouse.up();
  await shot(p, 'markup', ['dialog canvas', '[data-mk="undo"]', ['[data-mk="save"]', 'left']], { el: 'dialog[open]', pad: 0 });
  await p.click('[data-mk="save"]'); await p.waitForTimeout(600);

  // Password / account number warning
  await p.evaluate(() => document.querySelector('#f-tools').scrollIntoView({ block: 'center' }));
  await p.fill('[data-list="tools"] [data-li="0"]', 'Net banking login: user lifehub01, password: Grace@2024');
  await shot(p, 'secret-warning', ['#f-tools .secret-hint'], { el: '#f-tools', pad: 14 });
  await p.fill('[data-list="tools"] [data-li="0"]', 'LifeHub net banking (Mercy has the login)');
  await p.waitForTimeout(900);

  // 9. Publishing
  await p.goto(APP + '#/sop/sop_s3/edit'); await p.waitForSelector('.editor');
  await p.click('.ed-side .btn.primary'); await p.waitForSelector('dialog .missing');
  await shot(p, 'publish-missing', ['dialog .missing li:first-child button', ['dialog .btn.primary', 'left']], { el: 'dialog[open]', pad: 0 });
  await p.keyboard.press('Escape');
  await shot(p, 'status', ['.seg', '.ready .btn.primary', '.ready a.btn'], { el: '.ready', pad: 10 });

  // 10. Questions
  await p.goto(APP + '#/sop/sop_example'); await p.waitForSelector('.steps');
  await p.evaluate(() => document.querySelector('.flag-item').scrollIntoView({ block: 'center' }));
  await shot(p, 'question', ['.flag-item', ['.flag-item .btn', 'left']], { el: '.step-v:nth-child(2) .step-body', pad: 12 });
  await p.locator('[data-action="flag"]').first().click(); await p.waitForSelector('#fl');
  await p.fill('#fl textarea', 'The deposit slip book has moved to the treasurer\'s drawer.');
  await shot(p, 'ask', ['#fl textarea', '#fl .check', ['#fl button.primary', 'left']], { el: 'dialog[open]', pad: 0 });
  await p.keyboard.press('Escape');

  // 11. More actions + history
  await p.click('[data-action="sop-more"]'); await p.waitForSelector('.menu');
  await shot(p, 'more-menu', ['.menu-item:nth-child(1)', '.menu-item:nth-child(2)', '.menu-item:nth-child(3)', '.menu-item:nth-child(4)', '.menu-item:nth-child(5)'], { el: 'dialog[open]', pad: 0 });
  await p.keyboard.press('Escape');
  await p.goto(APP + '#/sop/sop_s2'); await p.waitForSelector('.sop');
  await p.click('[data-action="sop-more"]'); await p.click('.menu-item:has-text("Version history")'); await p.waitForSelector('.history');
  await shot(p, 'history', ['.history li.cur', ['.history [data-restore]', 'left']], { el: 'dialog[open]', pad: 0 });
  await p.keyboard.press('Escape');

  // 12. Handover pack
  await p.goto(APP + '#/pack'); await p.waitForSelector('.pack-cover'); await p.waitForTimeout(500);
  await shot(p, 'pack', ['#pack-account', '#pack-owner', ['.pack-bar .btn.primary', 'left'], '.toc']);

  // 13. Admin: hand over + lists + data
  await p.goto(APP + '#/admin'); await p.waitForSelector('.table.users');
  await p.click('[data-action="handover"][data-id="u_laveena"]'); await p.waitForSelector('#ho');
  await shot(p, 'handover', ['#ho select', '#ho .check', ['#ho button.primary', 'left']], { el: 'dialog[open]', pad: 0 });
  await p.keyboard.press('Escape');
  await p.goto(APP + '#/admin?tab=lists'); await p.waitForSelector('.list-block');
  await shot(p, 'lists', ['.list-block:nth-of-type(1) .chips', '.list-block:nth-of-type(1) .item-form input', '.list-block:nth-of-type(2) .chips']);
  await p.goto(APP + '#/admin?tab=data'); await p.waitForSelector('.card-action');
  await shot(p, 'backup', ['.card-action:nth-child(1)', '.card-action:nth-child(2)', '.card-action:nth-child(3)', '.card-action:nth-child(4)'], { el: '.admin-body', pad: 10 });

  // 15. Phone
  const ph = await newPage(b, { viewport: { width: 390, height: 780 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await demo(ph, 'princess@team.local');
  await ph.goto(APP + '#/'); await ph.waitForSelector('#list a.tr');
  await shot(ph, 'phone-all', ['.tabbar .tab:nth-child(1)', '.tabbar .tab:nth-child(2)', '.tabbar .tab.new']);
  await ph.goto(APP + '#/sop/sop_example'); await ph.waitForSelector('.steps'); await ph.waitForTimeout(400);
  await shot(ph, 'phone-guide');
  await ph.goto(APP + '#/sop/sop_example/follow'); await ph.waitForSelector('.follow-stage');
  await ph.click('[data-nav="1"]'); await ph.waitForTimeout(500);
  await shot(ph, 'phone-follow');

  /* ---------- Shared mode (sign-in, people) ---------- */
  if (SB_URL && SB_KEY) {
    const cfg = `window.SOP_CONFIG={supabaseUrl:'${SB_URL.startsWith('http://') ? SB_PUBLIC : SB_URL}',supabaseAnonKey:'${SB_KEY}',appName:'Finance Handbook',orgName:"The Father's House",orgLogo:true,googleSignIn:false};`;
    const signUp = async (q, name, email) => {
      await q.goto(APP); await q.waitForSelector('#login-form'); await q.click('[data-mode="up"]');
      await q.fill('input[name=name]', name); await q.fill('input[name=email]', email); await q.fill('input[name=password]', 'secret123');
      await q.click('#login-form button.primary'); await q.waitForSelector('.shell, .login-card h1:has-text("Waiting")');
    };
    const m = await newPage(b, {}, cfg);
    await m.goto(APP); await m.waitForSelector('#login-form');
    await shot(m, 'login', ['input[name=email]', 'input[name=password]', '#login-form button.primary', '[data-mode="reset"]', ['[data-mode="up"]', 'right']], { el: '.login-card', pad: 24 });
    await m.click('[data-mode="up"]');
    await shot(m, 'signup', ['input[name=name]', 'input[name=email]', '#login-form button.primary'], { el: '.login-card', pad: 24 });
    await signUp(m, 'Mercy', 'mercy@example.com');
    await m.goto(APP + '#/admin?tab=lists'); await m.waitForSelector('.list-block');
    for (const a of ['LifeHub', "Father's House", 'You are Loved']) { await m.fill('.item-form[data-key="accounts"] input', a); await m.click('.item-form[data-key="accounts"] button'); await m.waitForTimeout(400); }
    const invite = async (name, email, role) => {
      await m.goto(APP + '#/admin'); await m.waitForSelector('.table.users');
      await m.click('button.primary[data-action="edit-user"]'); await m.waitForSelector('#um');
      await m.fill('#um input[name=name]', name); await m.fill('#um input[name=email]', email); await m.selectOption('#um select[name=role]', role);
      if (name === 'Laveena') await shot(m, 'add-person', ['#um input[name=name]', '#um input[name=email]', '#um select[name=role]', ['#um button.primary', 'left']], { el: 'dialog[open]', pad: 0 });
      await m.click('#um button.primary'); await m.waitForTimeout(600);
    };
    await invite('Princess', 'princess@example.com', 'owner');
    await invite('Laveena', 'laveena@example.com', 'owner');
    await invite('Mohan', 'mohan@example.com', 'owner');
    const pr = await newPage(b, {}, cfg); await signUp(pr, 'Princess', 'princess@example.com');
    const g = await newPage(b, {}, cfg); await signUp(g, 'Grace', 'grace@example.com');
    await shot(g, 'waiting', ['[data-reload]'], { el: '.login-card', pad: 24 });
    await m.goto(APP + '#/'); await m.goto(APP + '#/admin'); await m.reload(); await m.waitForSelector('.table.users');
    await shot(m, 'people', ['.admin-body .banner', '[data-action="activate"]', '.tr:not(.th) select', ['.tr.invited .t-name', 'left'], '[data-action="copy-invite"]', '[data-action="handover"]', '.admin-body > .btn.primary']);
  }

  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
  console.log('captured', Object.keys(manifest).length, 'screens');
  await b.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
