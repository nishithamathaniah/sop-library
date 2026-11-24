/* Storage layer.
 * Everything lives in IndexedDB in this browser ("local mode").
 * The rest of the app only calls DB.all / get / put / del / clear, so a hosted
 * backend (see supabase/schema.sql) can replace this file without touching the UI.
 */
'use strict';

const DB = (() => {
  const NAME = 'sop-library';
  const VERSION = 1;
  const STORES = ['users', 'sops', 'versions', 'images', 'comments', 'meta'];
  let dbp = null;

  function open() {
    if (!dbp) {
      dbp = new Promise((resolve, reject) => {
        const req = indexedDB.open(NAME, VERSION);
        req.onupgradeneeded = () => {
          const d = req.result;
          STORES.forEach((s) => {
            if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' });
          });
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

  return {
    all: (s) => run(s, 'readonly', (st) => st.getAll()),
    get: (s, id) => run(s, 'readonly', (st) => st.get(id)),
    put: (s, v) => run(s, 'readwrite', (st) => { st.put(v); }),
    putMany: (s, list) => run(s, 'readwrite', (st) => { list.forEach((v) => st.put(v)); }),
    del: (s, id) => run(s, 'readwrite', (st) => { st.delete(id); }),
    clear: (s) => run(s, 'readwrite', (st) => { st.clear(); }),
    STORES,
  };
})();

/* Password hashing for local mode. A hosted backend does this server-side. */
async function hashPassword(pw, salt) {
  const text = `${salt}:${pw}`;
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 0; // fallback for very old browsers / insecure contexts
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return 'x' + (h >>> 0).toString(16);
}

/* ---------- First-run demo data ---------- */

function mockScreenshot(title, rows, highlightRow) {
  const c = document.createElement('canvas');
  c.width = 1200; c.height = 90 + rows.length * 52 + 40;
  const x = c.getContext('2d');
  x.fillStyle = '#f1f3f4'; x.fillRect(0, 0, 1200, c.height);
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 1200, 56);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => {
    x.fillStyle = col; x.beginPath(); x.arc(28 + i * 22, 28, 7, 0, Math.PI * 2); x.fill();
  });
  x.fillStyle = '#202124'; x.font = '600 20px system-ui, sans-serif'; x.fillText(title, 110, 35);
  x.fillStyle = '#0f9d58'; x.fillRect(0, 56, 1200, 6);
  const cols = [60, 420, 640, 860, 1140];
  const top = 90, rh = 52;
  rows.forEach((r, ri) => {
    const y = top + ri * rh;
    x.fillStyle = ri === 0 ? '#e8eaed' : '#ffffff';
    x.fillRect(40, y, 1120, rh);
    x.strokeStyle = '#dadce0'; x.lineWidth = 1; x.strokeRect(40, y, 1120, rh);
    x.fillStyle = '#202124';
    x.font = (ri === 0 ? '600 ' : '') + '19px system-ui, sans-serif';
    r.forEach((cell, ci) => x.fillText(cell, cols[ci], y + 33));
  });
  if (highlightRow != null) {
    const y = top + highlightRow * rh;
    x.strokeStyle = '#e53935'; x.lineWidth = 5; x.strokeRect(34, y - 6, 1132, rh + 12);
  }
  return c.toDataURL('image/png');
}

async function seedDemoData() {
  const t = new Date().toISOString();
  const salt = () => Math.random().toString(36).slice(2, 10);
  const people = [
    { id: 'u_mercy', name: 'Mercy', email: 'mercy@team.local', role: 'admin' },
    { id: 'u_princess', name: 'Princess', email: 'princess@team.local', role: 'owner' },
    { id: 'u_laveena', name: 'Laveena', email: 'laveena@team.local', role: 'owner' },
    { id: 'u_mohan', name: 'Mohan', email: 'mohan@team.local', role: 'owner' },
    { id: 'u_newjoiner', name: 'New Joiner', email: 'new@team.local', role: 'reader' },
  ];
  const users = [];
  for (const p of people) {
    const s = salt();
    users.push({ ...p, active: true, salt: s, hash: await hashPassword('welcome', s), createdAt: t });
  }
  await DB.putMany('users', users);

  await DB.put('meta', {
    id: 'settings',
    categories: ['Admin', 'Finance', 'Communication', 'Operations', 'Other'],
    seeded: t,
  });

  const img1 = 'img_seed1', img2 = 'img_seed2';
  await DB.put('images', {
    id: img1,
    data: mockScreenshot('Attendance 2026 – Google Sheets',
      [['Week', 'Class', 'Present', 'Absent'], ['Week 46', 'Grade 4', '31', '2'], ['Week 47', 'Grade 4', '', ''], ['Week 47', 'Grade 5', '', '']], 2),
  });
  await DB.put('images', {
    id: img2,
    data: mockScreenshot('Attendance 2026 – Share',
      [['Send to', 'Role', 'Access', ''], ['principal@school', 'Principal', 'Viewer', ''], ['office@school', 'Office', 'Editor', '']], 1),
  });

  const sixMonths = new Date(); sixMonths.setMonth(sixMonths.getMonth() + 6);
  const step = (text, extra = {}) => ({ id: 'st_' + Math.random().toString(36).slice(2, 9), text, imageId: '', caption: '', link: '', linkLabel: '', note: '', video: '', ...extra });

  const example = {
    id: 'sop_example',
    name: 'Update weekly attendance sheet',
    ownerId: 'u_mercy', backupId: 'u_princess',
    category: 'Admin', frequency: 'Weekly',
    purpose: 'The principal reviews attendance every Monday. This sheet is the only record, so it must be complete by Friday.',
    whenToDo: 'Every Friday before 5 pm',
    tools: ['Google account with access to "Attendance 2026" (ask Mercy to share it)', 'Class registers from each teacher (paper or photo)'],
    steps: [
      step('Collect the class registers from each teacher by 3 pm. If one is missing, message that teacher on the staff WhatsApp group.', { note: 'Do not guess numbers. Leave the row empty and write "pending" in the Notes column.' }),
      step('Open the Attendance 2026 sheet and go to this week\'s tab.', { link: 'https://docs.google.com/spreadsheets', linkLabel: 'Open Attendance 2026', imageId: img1, caption: 'Fill the row for the current week (outlined in red).' }),
      step('For each class, type the number present and absent. The Total column fills in by itself.'),
      step('Click Share and check the principal still has Viewer access. Then send the link in the Office group with the message "Attendance for week __ is updated".', { imageId: img2, caption: 'The principal must be listed as Viewer.' }),
    ],
    links: [{ label: 'Attendance 2026 sheet', url: 'https://docs.google.com/spreadsheets' }, { label: 'Registers folder', url: 'https://drive.google.com' }],
    mistakes: ['Typing into the Total column: it has a formula. Undo with Ctrl+Z.', 'Updating last week\'s tab: check the date in cell A1 first.'],
    doneChecklist: ['Every class has a number for present and absent', 'The Total row shows no errors', 'Link sent in the Office group'],
    output: 'An updated weekly tab in Attendance 2026, shared with the principal.',
    status: 'Published',
    reviewDate: sixMonths.toISOString().slice(0, 10),
    createdAt: t, updatedAt: t, updatedBy: 'u_mercy',
  };

  const blank = (id, name, ownerId, category, frequency) => ({
    id, name, ownerId, backupId: '', category, frequency,
    purpose: '', whenToDo: '', tools: [''], steps: [step('')], links: [], mistakes: [], doneChecklist: [''],
    output: '', status: 'Draft', reviewDate: '', createdAt: t, updatedAt: t, updatedBy: ownerId,
  });

  await DB.putMany('sops', [
    example,
    blank('sop_s1', 'Process petty cash claims', 'u_mercy', 'Finance', 'Weekly'),
    blank('sop_s2', 'Prepare monthly fee report', 'u_princess', 'Finance', 'Monthly'),
    blank('sop_s3', 'Send parent newsletter', 'u_princess', 'Communication', 'Monthly'),
    blank('sop_s4', 'Order classroom supplies', 'u_laveena', 'Operations', 'Termly'),
    blank('sop_s5', 'Update staff leave register', 'u_laveena', 'Admin', 'As needed'),
    blank('sop_s6', 'Back up the shared drive', 'u_mohan', 'Operations', 'Weekly'),
    blank('sop_s7', 'Book transport for field trips', 'u_mohan', 'Operations', 'As needed'),
  ]);
}
