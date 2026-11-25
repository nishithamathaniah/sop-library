/* Storage and sign-in.
 *
 * Two backends with the same interface:
 *  - Cloud (Supabase): used when config.js has a project URL and anon key.
 *    One shared library for the whole team, real accounts (email or Google),
 *    access rules enforced on the server (supabase/schema.sql).
 *  - Local (IndexedDB): used otherwise. Everything stays in this browser.
 *    Good for trying the app; comes with demo data.
 *
 * The rest of the app only uses DB.* and Auth.*.
 */
'use strict';

const CONFIG = window.SOP_CONFIG || {};
const CLOUD = !!(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);

/* ---------- Local backend (IndexedDB) ---------- */
const LocalDB = (() => {
  const NAME = 'sop-library';
  const VERSION = 2; // 2: added 'runs' (task completions)
  const STORES = ['users', 'sops', 'versions', 'images', 'comments', 'meta', 'runs'];
  let dbp = null;

  function open() {
    if (!dbp) {
      dbp = new Promise((resolve, reject) => {
        const req = indexedDB.open(NAME, VERSION);
        req.onupgradeneeded = () => {
          const d = req.result;
          STORES.forEach((s) => { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' }); });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbp;
  }
  async function run(store, mode, fn) {
    const d = await open();
    return new Promise((resolve, reject) => {
      const t = d.transaction(store, mode);
      const req = fn(t.objectStore(store));
      t.oncomplete = () => resolve(req && 'result' in req ? req.result : undefined);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  }
  const all = (s) => run(s, 'readonly', (st) => st.getAll());
  return {
    all,
    get: (s, id) => run(s, 'readonly', (st) => st.get(id)),
    where: async (s, field, value) => (await all(s)).filter((x) => x[field] === value),
    since: async (s, field, iso) => (await all(s)).filter((x) => (x[field] || '') >= iso),
    put: (s, v) => run(s, 'readwrite', (st) => { st.put(v); }),
    putMany: (s, list) => run(s, 'readwrite', (st) => { list.forEach((v) => st.put(v)); }),
    del: (s, id) => run(s, 'readwrite', (st) => { st.delete(id); }),
    clear: (s) => run(s, 'readwrite', (st) => { st.clear(); }),
    STORES,
  };
})();

/* ---------- Cloud backend (Supabase) ---------- */
/* On the live site, talk to Supabase through the site's own address (/sb, see
   vercel.json). Some networks (including Indian ISPs) block supabase.co
   directly; going through the site's address avoids that. Elsewhere
   (e.g. testing on a computer) the Supabase address is used as-is. */
const SB_ENDPOINT = CLOUD && CONFIG.supabaseProxy && location.protocol === 'https:' && !/^(localhost|127\.)/.test(location.hostname)
  ? location.origin + CONFIG.supabaseProxy
  : CONFIG.supabaseUrl;
const sb = CLOUD && window.supabase
  ? window.supabase.createClient(SB_ENDPOINT, CONFIG.supabaseAnonKey, { auth: { persistSession: true, detectSessionInUrl: true } })
  : null;

const CloudDB = (() => {
  if (!CLOUD) return null;
  const TABLE = { users: 'profiles', sops: 'sops', versions: 'sop_versions', comments: 'comments', meta: 'settings', invites: 'invites', runs: 'task_runs' };
  const KEY = { invites: 'email' };
  const BUCKET = 'screenshots';
  // App fields ending in Id/Date/By/At are nullable columns: '' <-> null
  const NULLABLE = /(Id|Date|By|At)$/;
  const snake = (k) => k.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
  const camel = (k) => k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  const toRow = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'salt' && k !== 'hash').map(([k, v]) => [snake(k), v === '' && NULLABLE.test(k) ? null : v]));
  const fromRow = (r) => Object.fromEntries(Object.entries(r).map(([k, v]) => { const c = camel(k); return [c, v === null && NULLABLE.test(c) ? '' : v]; }));
  const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

  const blobToDataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
  const dataUrlToBlob = async (url) => (await fetch(url)).blob();

  async function getImage(id) {
    const { data, error } = await sb.storage.from(BUCKET).download(id);
    if (error) return undefined;
    return { id, data: await blobToDataUrl(data) };
  }

  async function put(store, v) {
    if (store === 'images') {
      const blob = await dataUrlToBlob(v.data);
      ok(await sb.storage.from(BUCKET).upload(v.id, blob, { contentType: blob.type || 'image/webp', upsert: false }));
      return;
    }
    const t = TABLE[store], key = KEY[store] || 'id';
    const row = toRow(v);
    // Update first, insert if nothing matched. (A plain upsert would also run the
    // insert policy, which blocks e.g. an owner resolving a reader's comment.)
    const updated = ok(await sb.from(t).update(row).eq(key, row[key]).select(key));
    if (!updated.length) ok(await sb.from(t).insert(row));
  }

  return {
    async all(store) {
      if (store === 'images') {
        const files = ok(await sb.storage.from(BUCKET).list('', { limit: 10000 }));
        return (await Promise.all(files.map((f) => getImage(f.name)))).filter(Boolean);
      }
      return ok(await sb.from(TABLE[store]).select('*')).map(fromRow);
    },
    async get(store, id) {
      if (store === 'images') return getImage(id);
      const r = ok(await sb.from(TABLE[store]).select('*').eq(KEY[store] || 'id', id).maybeSingle());
      return r ? fromRow(r) : undefined;
    },
    async where(store, field, value) {
      return ok(await sb.from(TABLE[store]).select('*').eq(snake(field), value)).map(fromRow);
    },
    async since(store, field, iso) {
      return ok(await sb.from(TABLE[store]).select('*').gte(snake(field), iso)).map(fromRow);
    },
    put,
    async putMany(store, list) { for (const v of list) await put(store, v); },
    async del(store, id) { ok(await sb.from(TABLE[store]).delete().eq(KEY[store] || 'id', id)); },
    async clear() { throw new Error('Not available in the shared library'); },
    STORES: ['users', 'sops', 'versions', 'images', 'comments', 'meta', 'runs'],
  };
})();

const DB = CLOUD ? CloudDB : LocalDB;

/* ---------- Sign-in (cloud only; local mode checks hashed passwords in app.js) ---------- */
const Auth = CLOUD ? (() => {
  const here = location.origin + location.pathname;
  const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
  return {
    async currentUserId() { const { data } = await sb.auth.getSession(); return data.session?.user?.id || null; },
    async currentEmail() { const { data } = await sb.auth.getSession(); return data.session?.user?.email || ''; },
    signIn: async (email, password) => ok(await sb.auth.signInWithPassword({ email, password })),
    signUp: async (name, email, password) => ok(await sb.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: here } })),
    google: async () => ok(await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: here } })),
    sendReset: async (email) => ok(await sb.auth.resetPasswordForEmail(email, { redirectTo: here })),
    setPassword: async (password) => ok(await sb.auth.updateUser({ password })),
    signOut: async () => { await sb.auth.signOut(); },
    onRecovery(fn) { sb.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') fn(); }); },
  };
})() : null;

/* Password hashing for local mode only. */
async function hashPassword(pw, salt) {
  const text = `${salt}:${pw}`;
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return 'x' + (h >>> 0).toString(16);
}

/* ---------- Demo data (local mode only) ---------- */
function mockScreenshot(title, rows, highlightRow) {
  const c = document.createElement('canvas');
  c.width = 1200; c.height = 90 + rows.length * 52 + 40;
  const x = c.getContext('2d');
  x.fillStyle = '#f1f3f4'; x.fillRect(0, 0, 1200, c.height);
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 1200, 56);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => { x.fillStyle = col; x.beginPath(); x.arc(28 + i * 22, 28, 7, 0, Math.PI * 2); x.fill(); });
  x.fillStyle = '#202124'; x.font = '600 20px system-ui, sans-serif'; x.fillText(title, 110, 35);
  x.fillStyle = '#0f9d58'; x.fillRect(0, 56, 1200, 6);
  const cols = [60, 420, 640, 860, 1140];
  rows.forEach((r, ri) => {
    const y = 90 + ri * 52;
    x.fillStyle = ri === 0 ? '#e8eaed' : '#ffffff'; x.fillRect(40, y, 1120, 52);
    x.strokeStyle = '#dadce0'; x.lineWidth = 1; x.strokeRect(40, y, 1120, 52);
    x.fillStyle = '#202124'; x.font = (ri === 0 ? '600 ' : '') + '19px system-ui, sans-serif';
    r.forEach((cell, ci) => x.fillText(cell, cols[ci], y + 33));
  });
  if (highlightRow != null) { const y = 90 + highlightRow * 52; x.strokeStyle = '#e53935'; x.lineWidth = 5; x.strokeRect(34, y - 6, 1132, 64); }
  return c.toDataURL('image/png');
}

async function seedDemoData() {
  const t = new Date().toISOString();
  const longAgo = new Date(Date.now() - 120 * 86400000).toISOString(); // tasks tracked for ~4 months
  const salt = () => Math.random().toString(36).slice(2, 10);
  const people = [
    { id: 'u_mercy', name: 'Mercy', email: 'mercy@team.local', role: 'admin' },
    { id: 'u_princess', name: 'Princess', email: 'princess@team.local', role: 'owner' },
    { id: 'u_laveena', name: 'Laveena', email: 'laveena@team.local', role: 'owner' },
    { id: 'u_mohan', name: 'Mohan', email: 'mohan@team.local', role: 'owner' },
    { id: 'u_newjoiner', name: 'New Joiner', email: 'new@team.local', role: 'reader' },
  ];
  const users = [];
  for (const p of people) { const s = salt(); users.push({ ...p, active: true, salt: s, hash: await hashPassword('welcome', s), createdAt: t }); }
  await LocalDB.putMany('users', users);
  await LocalDB.put('meta', {
    id: 'settings',
    accounts: ['LifeHub', 'Father\'s House', 'You are Loved'],
    categories: ['Cash', 'Bank transfers', 'Reimbursements', 'Invoices & bills', 'Tallying & reconciliation', 'Records & reports', 'Other'],
  });

  await LocalDB.put('images', { id: 'img_seed1', data: mockScreenshot('Offering count – Sunday 23 Nov – Google Sheets',
    [['Item', 'Count', 'Amount (₹)', 'Counted by'], ['Notes ₹500', '38', '19,000', 'Princess + Mohan'], ['Cheques (3)', '3', '12,500', 'Princess + Mohan'], ['TOTAL', '', '31,500', 'Both sign']], 3) });
  await LocalDB.put('images', { id: 'img_seed2', data: mockScreenshot('Offerings ledger 2026 – Google Sheets',
    [['Date', 'Fund', 'Amount (₹)', 'Deposit slip no.'], ['16 Nov', 'General', '28,400', '004512'], ['23 Nov', 'General', '31,500', '004513'], ['23 Nov', 'Building fund', '5,000', '004513']], 2) });

  const review = new Date(); review.setMonth(review.getMonth() + 6);
  const step = (text, extra = {}) => ({ id: 'st_' + Math.random().toString(36).slice(2, 9), text, imageId: '', caption: '', link: '', linkLabel: '', note: '', video: '', ...extra });

  const example = {
    id: 'sop_example',
    name: 'Count and deposit the Sunday offering',
    ownerId: 'u_mercy', backupId: 'u_princess', category: 'Cash', frequency: 'Weekly', accounts: ['*'],
    purpose: 'Every rupee given on Sunday is counted by two people, recorded against the right account, and deposited in that account\'s bank, so the giving is safe and the books are accurate.',
    whenToDo: 'Count every Sunday after the last service. Deposit at the bank by Monday 12 pm.',
    tools: ['Two counters: never one person alone (the treasurer keeps the counter rota)', 'Edit access to the "Offering count" and "Offerings ledger" sheets (ask Mercy)', 'Deposit slip book and the counting room key (with the treasurer)'],
    steps: [
      step('Two counters collect the sealed offering bags from the ushers and take them straight to the counting room.', { note: 'Never count alone and never leave the bags unattended. If a bag is not sealed, both counters write that on the count sheet and tell the treasurer the same day.' }),
      step('Open the Offering count sheet and make a copy of the template tab for this Sunday. Enter the cash by note and coin, and list every cheque with the giver\'s name and amount.', { link: 'https://docs.google.com/spreadsheets', linkLabel: 'Open the Offering count sheet', imageId: 'img_seed1', caption: 'The TOTAL row adds itself up. Both counters check it.' }),
      step('Write each gift against the account it was given to (for example LifeHub or You are Loved), and keep designated gifts such as the building fund on their own lines. Never mix accounts in one total.'),
      step('Both counters check that the cash in hand matches the TOTAL, then print the sheet and both sign it.'),
      step('Fill in the bank deposit slip. One counter and the treasurer deposit it on Monday by 12 pm. Keep the bank counterfoil.', { note: 'Until it is deposited, the money stays in the locked safe. It never goes home with anyone.' }),
      step('Record the deposit in the Offerings ledger with the date, fund, amount and deposit slip number.', { imageId: 'img_seed2', caption: 'One row per fund, with the same slip number.' }),
    ],
    links: [{ label: 'Offering count sheet', url: 'https://docs.google.com/spreadsheets' }, { label: 'Offerings ledger 2026', url: 'https://docs.google.com/spreadsheets' }, { label: 'Signed count sheets folder', url: 'https://drive.google.com' }],
    mistakes: ['Counting with only one person. Wait for the second counter, even if it takes longer.', 'Putting a building fund cheque into the general offering total. Check the envelope before you add it.', 'Forgetting to write the slip number in the ledger, which makes the monthly bank reconciliation much harder.'],
    doneChecklist: ['Count sheet signed by both counters and filed', 'Bank counterfoil matches the count sheet total', 'Ledger row added for each fund with the slip number'],
    output: 'Money deposited in the church account; signed count sheet and bank counterfoil in the Offerings folder; Offerings ledger updated.',
    status: 'Published', reviewDate: review.toISOString().slice(0, 10),
    createdAt: longAgo, updatedAt: t, updatedBy: 'u_mercy',
  };
  const blank = (id, name, ownerId, category, frequency, accounts) => ({
    id, name, ownerId, backupId: '', category, frequency, accounts, purpose: '', whenToDo: '', tools: [''], steps: [step('')],
    links: [], mistakes: [], doneChecklist: [''], output: '', status: 'Draft', reviewDate: '', createdAt: longAgo, updatedAt: t, updatedBy: ownerId,
  });
  await LocalDB.putMany('sops', [
    example,
    blank('sop_s1', 'Prepare the monthly accounts report', 'u_mercy', 'Records & reports', 'Monthly', ['*']),
    blank('sop_s2', 'Tally the cash book with the bank statement', 'u_princess', 'Tallying & reconciliation', 'Monthly', ['LifeHub']),
    blank('sop_s3', 'Process reimbursement requests', 'u_princess', 'Reimbursements', 'Weekly', ['*']),
    blank('sop_s4', 'Make vendor payments by bank transfer', 'u_laveena', 'Bank transfers', 'Weekly', ['Father\'s House']),
    blank('sop_s5', 'Record and file supplier invoices', 'u_laveena', 'Invoices & bills', 'As needed', ['Father\'s House', 'You are Loved']),
    blank('sop_s6', 'Top up and count petty cash', 'u_mohan', 'Cash', 'Weekly', ['LifeHub']),
    blank('sop_s7', 'Prepare quarterly accounts for the auditor', 'u_mohan', 'Records & reports', 'Quarterly', ['You are Loved']),
  ]);

  // Completions, so the Checklist shows a realistic mix of done, due and overdue
  const day = 86400000;
  const run = (sopId, freq, when, by, note = '') => {
    const at = new Date(when);
    const p = periodOf(freq, at);
    return { id: 'run_' + Math.random().toString(36).slice(2, 9), sopId, period: p ? p.key : 'adhoc', label: p ? p.label : '', doneAt: at.toISOString(), doneBy: by, note };
  };
  const now = Date.now();
  const thisWeek = periodOf('Weekly').start.getTime();
  const lastWeek = thisWeek - 7 * day;
  const lastMonth = periodOf('Monthly').start.getTime() - 20 * day;
  const lastQuarter = periodOf('Quarterly').start.getTime() - 30 * day;
  await LocalDB.putMany('runs', [
    run('sop_example', 'Weekly', lastWeek + 1 * day + 10 * 3600000, 'u_princess', 'Deposited ₹31,500. Slip 004513.'),
    run('sop_example', 'Weekly', lastWeek - 6 * day, 'u_mercy'),
    run('sop_s1', 'Monthly', lastMonth + 2 * day, 'u_mercy', 'Shared with the church committee.'),
    run('sop_s2', 'Monthly', Math.min(now, periodOf('Monthly').start.getTime() + 4 * day + 15 * 3600000), 'u_princess', 'All entries matched.'),
    run('sop_s2', 'Monthly', lastMonth, 'u_princess'),
    run('sop_s3', 'Weekly', Math.min(now, thisWeek + 9 * 3600000), 'u_princess', '3 requests paid.'),
    run('sop_s3', 'Weekly', lastWeek + 2 * day, 'u_princess'),
    run('sop_s4', 'Weekly', Math.min(now, thisWeek + 11 * 3600000), 'u_laveena'),
    run('sop_s4', 'Weekly', lastWeek + 2 * day, 'u_laveena'),
    run('sop_s6', 'Weekly', lastWeek - 4 * day, 'u_mohan'),
    run('sop_s7', 'Quarterly', lastQuarter, 'u_mohan', 'Sent to the auditor.'),
    run('sop_s5', 'As needed', now - 5 * day, 'u_laveena', 'Two supplier invoices filed.'),
    run('sop_s5', 'As needed', now - 19 * day, 'u_laveena'),
  ]);
}
