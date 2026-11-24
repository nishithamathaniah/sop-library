/* Builds the Getting Started guide PDF from the screenshots taken by capture.js.
 *
 *   node tools/guide/build.js <shotsDir> <out.pdf>
 *
 * Each screenshot has numbered red markers; the numbered list under it
 * explains them, in the same order.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [SHOTS, OUT] = process.argv.slice(2);
const ROOT = path.resolve(__dirname, '../..');
const manifest = JSON.parse(fs.readFileSync(path.join(SHOTS, 'manifest.json'), 'utf8'));
const logo = fs.readFileSync(path.join(ROOT, 'logo.svg'), 'utf8');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<span class="ui">$1</span>');

/* ---------- Content ---------- */
const S = [];
const section = (title, lead, blocks, opts = {}) => S.push({ title, lead, blocks, ...opts });
const shot = (name, items, opts = {}) => ({ shot: name, items, ...opts });
const steps = (title, list) => ({ steps: list, title });
const tip = (text, kind = '') => ({ tip: text, kind });

section('Signing in', 'Open the link your admin sent you. You only create your account once.', [
  shot('login', [
    ['Continue with Google', 'The quickest way in, if you have a Google account with the email your admin added.'],
    ['Email', 'Or type your email address…'],
    ['Password', '…and your password.'],
    ['Sign in', 'Opens the handbook.'],
    ['Forgot password?', 'Sends you an email with a link to choose a new password.'],
    ['Create an account', 'First time here? Start with this.'],
  ], { size: 'half' }),
  shot('signup', [
    ['Your name', 'As your team knows you.'],
    ['Email', 'Use the **same email your admin added** for you. Then you get access straight away.'],
    ['Create your account', 'You may get an email asking you to confirm. Click the link in it.'],
  ], { size: 'half' }),
  shot('waiting', [['Check again', 'You see this screen if your admin hasn\'t added you yet. Ask them to tap `Give access`, then tap Check again.']], { size: 'small' }),
]);

section('Finding your way around', 'The first screen after signing in. Everything is one or two taps from here.', [
  shot('all-tasks', [
    ['All tasks', 'Every task guide the team has written.'],
    ['My tasks', 'Only your tasks, and what needs your attention. The number shows how many.'],
    ['New task', 'Start writing a guide for one of your tasks.'],
    ['Progress per person', 'How many of each person\'s tasks are written and published. Tap a name to see only their tasks.'],
    ['Search', 'Finds a task by any word in its name or steps. Press `/` on a keyboard to jump here.'],
    ['Filters', 'Narrow the list by **account** (LifeHub, Father\'s House…), person, status, how often or category.'],
    ['A task', 'Tap to open its guide. The account is shown in red under the name.'],
    ['Your account', 'Change your password or sign out.'],
  ]),
]);

section('Reading a task guide', 'Every guide has the same parts in the same order, so they are easy to follow.', [
  shot('guide-top', [
    ['Status and account', '**Published** guides are ready to use. The red tag shows which account it is for.'],
    ['Follow along', 'Do the task one step at a time (see the next section).'],
    ['Edit', 'Only shown to the person who owns the task (and the Admin).'],
    ['PDF', 'Print it or save it as a PDF.'],
    ['More ( ⋯ )', 'Duplicate, version history and other actions.'],
    ['Key facts', 'When to do it, how often, who owns it, and who covers when they are away.'],
    ['Tools and access', 'What you need before you start, and who gives you access.'],
  ]),
  shot('guide-steps', [
    ['Step number', 'Do the steps in order.'],
    ['Instruction', 'What to do in this step.'],
    ['Screenshot', 'Shows exactly where to click. Tap it to see it bigger.'],
    ['Link', 'Opens the sheet, folder or website for this step.'],
    ['Questions', 'Questions others have asked about this step.'],
    ['Something unclear?', 'Tell the owner what\'s confusing, so they can fix it.'],
  ]),
]);

section('Follow along', 'The best way to do a task you don\'t know yet: one step at a time, with big text. Works well on a phone.', [
  shot('follow', [
    ['Close', 'Back to the guide. Your place is remembered.'],
    ['Where you are', 'Task name, and which step you are on.'],
    ['Progress', 'How much of the task is done.'],
    ['Step dots', 'Tap a dot to jump to a step. Done steps turn green.'],
    ['Instruction', 'What to do now, with its screenshot below.'],
    ['Link', 'Opens what you need for this step.'],
    ['Back', 'Go to the previous step.'],
    ['Done, next', 'Tap when you\'ve finished the step.'],
  ]),
  shot('follow-end', [
    ['Done checklist', 'Tick each item to confirm the task is really finished.'],
    ['Finish', 'Unlocks when every item is ticked.'],
  ], { size: 'small' }),
]);

section('My tasks', 'Your own list: what to write next and what needs fixing.', [
  shot('my-tasks', [
    ['Your progress', 'How many of your tasks have a published guide.'],
    ['Add several', 'Paste your whole list of tasks at once (see the next section).'],
    ['Needs your attention', 'Drafts, guides marked "Needs update", review dates that have passed, and questions from readers.'],
    ['Why', 'What exactly needs doing on this task.'],
    ['Status', 'Draft, Published or Needs update. A yellow flag means someone asked a question.'],
  ]),
]);

section('Adding your tasks', 'Start by listing your recurring tasks. You can write each guide later.', [
  shot('add-several', [
    ['For', 'Admin only: whose tasks these are.'],
    ['Defaults', 'How often and which category, for all of them. You can change each one later.'],
    ['Accounts', 'Which account these tasks are for. Pick "All accounts" if they apply to every account.'],
    ['Your tasks', 'One task per line. Copy and paste from a list or a WhatsApp message.'],
    ['Add tasks', 'Each line becomes a draft in My tasks.'],
  ], { size: 'half' }),
  shot('new-task', [
    ['Task name', 'Short and specific, e.g. "Pay the LifeHub electricity bill".'],
    ['Accounts', 'Which account(s) this task is for.'],
    ['Owner', 'Admin only: who is responsible for it.'],
    ['How often', 'Daily, Weekly, Monthly, Quarterly, Yearly or As needed.'],
    ['Category', 'Cash, Bank transfers, Reimbursements, Invoices, Tallying, Records…'],
    ['Start from', 'Copy an existing guide that is similar. Saves time.'],
    ['Create and add steps', 'Opens the editor.'],
  ], { size: 'half' }),
]);

section('Writing a guide: the basics', 'Fill the top of the template first. Everything saves by itself as you type.', [
  shot('editor-basics', [
    ['Done', 'Back to the guide. There is no Save button: changes save automatically.'],
    ['Saved', 'Shows "Saving…" while you type, then "Saved".'],
    ['Task name', 'Tap to change it.'],
    ['Accounts', 'Which account(s) this guide is for.'],
    ['Owner', 'Who is responsible.'],
    ['Backup person', 'Who does the task when the owner is away.'],
    ['Review by', 'Leave empty: it is set to 6 months after publishing.'],
    ['Progress', 'How many required parts are filled in.'],
    ['What\'s missing', 'Tap any item to jump straight to it.'],
    ['Publish', 'Makes the guide visible to everyone (see "Publishing").'],
  ]),
]);

section('Writing a guide: steps and screenshots', 'One step = one action. Add a screenshot whenever there is something to click.', [
  steps('The quickest way to add a step with a screenshot', [
    'Do the task on your computer as normal.',
    'Take a screenshot: **Windows** `Win + Shift + S` · **Mac** `Cmd + Shift + Ctrl + 4` · **Phone** take a photo or screenshot and upload it.',
    'Click the step in the editor, then press `Ctrl + V` (`Cmd + V` on a Mac).',
    'Type one line saying what to do. Repeat for the next step.',
  ]),
  shot('editor-step', [
    ['Step number', 'Steps are numbered automatically.'],
    ['Instruction', 'What to do, in plain words.'],
    ['Screenshot', 'Pasted or uploaded. Large pictures are made smaller automatically.'],
    ['Mark up', 'Draw a red box around the button or field to click. Replace or remove the picture here too.'],
    ['Caption', 'Optional: what to look at in the picture.'],
    ['Link', 'Optional: the sheet, folder or website, plus the text for its button.'],
    ['Warning or tip', 'Something to watch out for. Shown in yellow.'],
    ['Step tools', 'Move up, move down, insert a step below, or delete.'],
  ]),
  shot('editor-drop', [
    ['Screenshot box', 'Paste here, drag a picture onto it, or tap "browse" to pick a file.'],
    ['Add step', 'Adds a new step at the end.'],
  ], { size: 'half' }),
  shot('markup', [
    ['Draw', 'Drag across the picture to draw a red box. Draw as many as you need.'],
    ['Undo', 'Removes the last box.'],
    ['Save', 'Saves the marked-up picture to the step.'],
  ], { size: 'half' }),
]);

section('Keeping it safe', 'Guides are read by many people. Some things must never go in them.', [
  shot('secret-warning', [['Warning', 'Appears in red if you type a password, PIN, OTP, or a bank account, card or UPI number. Delete it and write **who** gives access instead.']], { size: 'wide-small' }),
  tip('**Never write in a guide:** passwords, PINs, OTPs, full bank account numbers, card numbers or UPI IDs.<br>**Write instead:** "Mercy has the net banking login" or "Ask the treasurer for the safe key".', 'red'),
]);

section('Publishing', 'When a guide is complete, publish it so everyone can use it.', [
  steps('Before you publish', [
    'Fill every part marked **required**. The panel on the right shows what\'s left.',
    'Tap `Preview as a reader` and read the guide **as if you had never done the task**.',
    'Fix anything unclear, then tap `Publish`.',
  ]),
  shot('status', [
    ['Status', '**Draft**: only the team can see it. **Published**: ready to use. **Needs update**: still visible, with a warning that it may be out of date.'],
    ['Publish', 'Checks that everything required is filled in first.'],
    ['Preview as a reader', 'See the guide exactly as others will.'],
  ], { size: 'half' }),
  shot('publish-missing', [
    ['What\'s missing', 'If something required is empty, you\'ll see this list. Tap an item to go to it.'],
    ['OK', 'Close and fill them in.'],
  ], { size: 'half' }),
]);

section('Questions and fixes', 'If a step is confusing or out of date, say so. That\'s how guides get better.', [
  shot('ask', [
    ['What\'s unclear', 'Tap `Something unclear?` under any step, and write what confused you or what has changed.'],
    ['Needs update', 'Owners and Admin only: also mark the whole guide as needing an update.'],
    ['Send', 'The owner sees it in My tasks.'],
  ], { size: 'half' }),
  shot('question', [
    ['Question', 'Shown under the step for everyone, until it is resolved.'],
    ['Resolve', 'Once the guide is fixed, the owner (or the person who asked) taps Resolve.'],
  ], { size: 'half' }),
]);

section('More actions', 'Tap `⋯` at the top of a guide.', [
  shot('more-menu', [
    ['Duplicate', 'Copy this guide as a starting point for a similar task.'],
    ['Version history', 'Every earlier version, with who changed it and when.'],
    ['Mark as needs update', 'Warns readers that the guide may be out of date.'],
    ['Confirm still correct', 'Checked it and nothing changed? This moves the review date 6 months ahead.'],
    ['Copy link', 'Send someone a direct link to this guide.'],
  ], { size: 'half' }),
  shot('history', [
    ['This version', 'The guide as it is now.'],
    ['Restore', 'Bring back an earlier version. The current one is kept in the history, so nothing is lost.'],
  ], { size: 'half' }),
]);

section('Printing and the handover pack', 'Print one guide with the `PDF` button on it, or print many at once here.', [
  shot('pack', [
    ['Account', 'Only the guides for one account, e.g. everything for LifeHub.'],
    ['Person', 'Only one person\'s guides. Ideal when someone hands over their role.'],
    ['Print / Save as PDF', 'Choose "Save as PDF" as the printer to get a file.'],
    ['Contents', 'The pack starts with a list of every guide in it.'],
  ]),
  tip('Screenshots stay in place in the PDF, and links are printed in full so they still work on paper.'),
]);

section('For the Admin: people', 'Admin → People. Only the Admin sees this.', [
  shot('people', [
    ['Waiting for access', 'Someone signed up without being added. Check who it is.'],
    ['Give access', 'Lets them in with the role chosen beside it.'],
    ['Role', '**Admin**: everything. **Owner**: writes their own guides. **Reader**: reads and prints only (for stand-ins and new joiners).'],
    ['Invited', 'Added, but hasn\'t signed up yet.'],
    ['Copy invite', 'Copies a ready-made message with the link. Paste it into WhatsApp or email.'],
    ['Hand over', 'Moves all of someone\'s tasks to another person.'],
    ['Add person', 'Add someone by name, email and role.'],
  ]),
  shot('add-person', [
    ['Name', 'As the team knows them.'],
    ['Email', 'The email they will sign in with.'],
    ['Role', 'Owner for team members, Reader for someone covering or new.'],
    ['Add', 'Then tap `Copy invite` and send it to them.'],
  ], { size: 'half' }),
  shot('handover', [
    ['New owner', 'Who takes over the tasks.'],
    ['Keep as backup', 'The previous owner stays listed as backup, so people know who to ask.'],
    ['Hand over', 'Moves every task in one go.'],
  ], { size: 'half' }),
]);

section('For the Admin: accounts, categories and backups', 'Admin → Accounts & categories, and Admin → Backup & export.', [
  shot('lists', [
    ['Accounts', 'The accounts the team looks after: LifeHub, Father\'s House, You are Loved… The number shows how many tasks use each one.'],
    ['Add an account', 'Type a name and tap Add.'],
    ['Categories', 'The kinds of work. Add or remove them the same way.'],
  ]),
  shot('backup', [
    ['Handover pack', 'Print many guides at once (see "Printing").'],
    ['Download a full backup', 'One file with every guide and screenshot. **Do this once a month** and keep it in the church\'s shared drive.'],
    ['Restore or import', 'Brings guides back from a backup file. In the shared handbook this button is called **Import guides**: it adds guides and never deletes anything.'],
  ]),
]);

section('On your phone', 'Open the same link in your phone\'s browser. To keep it on your home screen: Share → Add to Home Screen (iPhone) or ⋮ → Add to Home screen (Android).', [
  { phones: ['phone-all', 'phone-guide', 'phone-follow'], captions: ['All tasks', 'A task guide', 'Follow along'] },
  shot('phone-all', [
    ['All tasks', 'The menu moves to the bottom of the screen.'],
    ['My tasks', 'Your tasks and what needs attention.'],
    ['New', 'Start a new task guide.'],
  ], { hideImage: true }),
]);

/* ---------- Pages ---------- */
const img = (name) => 'data:image/png;base64,' + fs.readFileSync(path.join(SHOTS, name + '.png')).toString('base64');

function figure(b) {
  const m = manifest[b.shot];
  if (!m) throw new Error('missing shot ' + b.shot);
  if (m.marks.length !== b.items.length) throw new Error(`${b.shot}: ${m.marks.length} marks but ${b.items.length} items`);
  // Tall pictures (dialogs, cards) sit beside their list; wide ones go full width
  const aspect = m.w / m.h;
  const side = aspect < 1.25 || m.w < 700;
  const width = side ? Math.min(92, 150 * aspect) : Math.min(182, (b.maxH || 118) * aspect);
  const legend = `<ol class="legend ${!side && b.items.length > 4 ? 'two' : ''}">${b.items.map(([label, text], i) => `<li><span class="badge">${i + 1}</span><div><strong>${esc(label)}</strong>${md(text)}</div></li>`).join('')}</ol>`;
  if (b.hideImage) return legend;
  return `<figure class="fig ${side ? 'side' : ''}">
    <div class="frame" style="width:${width.toFixed(1)}mm;aspect-ratio:${m.w}/${m.h}">
      <img src="${img(b.shot)}" alt="">
      ${m.marks.map((p, i) => `<span class="badge on" style="left:${p.x}%;top:${p.y}%">${i + 1}</span>`).join('')}
    </div>
    ${legend}
  </figure>`;
}
function block(b) {
  if (b.shot) return figure(b);
  if (b.steps) return `<div class="steps"><h3>${esc(b.title)}</h3><ol>${b.steps.map((s) => `<li><span>${md(s)}</span></li>`).join('')}</ol></div>`;
  if (b.tip) return `<div class="tip ${b.kind}">${b.tip.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</div>`;
  if (b.phones) return `<div class="phones">${b.phones.map((n, i) => `<figure><div class="frame phone" style="aspect-ratio:${manifest[n].w}/${manifest[n].h}"><img src="${img(n)}" alt="">${n === 'phone-all' ? manifest[n].marks.map((p, j) => `<span class="badge on" style="left:${p.x}%;top:${p.y}%">${j + 1}</span>`).join('') : ''}</div><figcaption>${esc(b.captions[i])}</figcaption></figure>`).join('')}</div>`;
  return '';
}

const toc = S.map((s, i) => `<li><span class="n">${i + 1}</span>${esc(s.title)}</li>`).join('');
const today = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Finance Handbook – Getting started</title><style>
@page { size: A4; margin: 14mm 14mm 16mm; }
:root { --red: #d7262c; --red-weak: #fdeced; --ink: #1b1b1d; --ink2: #45464b; --muted: #74767c; --line: #e6e6e9; --bg2: #f5f5f7; --green: #1f7a4d; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font: 10.5pt/1.45 Inter, "Inter Display", system-ui, sans-serif; color: var(--ink); }
b { font-weight: 650; }
.ui { display: inline-block; font-weight: 600; font-size: .92em; background: var(--bg2); border: 1px solid var(--line); border-radius: 5px; padding: 0 .35em; white-space: nowrap; }

/* Cover */
.cover { height: 267mm; display: flex; flex-direction: column; break-after: page; }
.cover .logo svg { height: 30mm; width: auto; display: block; }
.cover .band { margin-top: auto; background: var(--red); color: #fff; border-radius: 6mm; padding: 14mm 12mm; }
.cover h1 { font-size: 38pt; line-height: 1.05; margin: 0 0 3mm; letter-spacing: -.02em; }
.cover .sub { font-size: 16pt; font-weight: 500; opacity: .95; }
.cover .for { margin-top: 8mm; font-size: 11pt; opacity: .9; }
.cover .hero { margin: 16mm 0 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; }
.cover .hero div { border: 1px solid var(--line); border-radius: 4mm; padding: 5mm; }
.cover .hero b { display: block; font-size: 12pt; margin-bottom: 1mm; }
.cover .hero span { color: var(--ink2); font-size: 10pt; }
.cover .hero i { display: inline-grid; place-items: center; width: 9mm; height: 9mm; border-radius: 50%; background: var(--red-weak); color: var(--red); font-style: normal; font-weight: 800; margin-bottom: 3mm; }

/* Start page */
.start { break-after: page; }
h2.page { font-size: 22pt; margin: 0 0 2mm; letter-spacing: -.01em; }
.lead { color: var(--ink2); font-size: 11.5pt; margin: 0 0 6mm; }
.roles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; margin-bottom: 7mm; }
.role { border: 1px solid var(--line); border-top: 3px solid var(--red); border-radius: 3mm; padding: 4mm; }
.role h4 { margin: 0 0 1mm; font-size: 12pt; }
.role .who { color: var(--red); font-weight: 600; font-size: 9.5pt; margin-bottom: 2mm; }
.role ul { margin: 0; padding-left: 4.5mm; color: var(--ink2); font-size: 9.5pt; }
.week { background: var(--bg2); border-radius: 3mm; padding: 5mm 6mm; margin-bottom: 7mm; }
.week h3, .steps h3 { margin: 0 0 3mm; font-size: 12pt; }
.week ol, .steps ol { margin: 0; padding: 0; list-style: none; counter-reset: s; display: grid; gap: 2.2mm; }
.week li, .steps li { counter-increment: s; display: grid; grid-template-columns: 8mm 1fr; align-items: start; }
.week li::before, .steps li::before { content: counter(s); width: 6mm; height: 6mm; border-radius: 50%; background: var(--ink); color: #fff; font-weight: 700; font-size: 8.5pt; display: grid; place-items: center; margin-top: .3mm; }
.toc { columns: 2; column-gap: 8mm; padding: 0; margin: 0; list-style: none; }
.toc li { break-inside: avoid; padding: 1.6mm 0; border-bottom: 1px dotted #ccc; display: flex; gap: 3mm; align-items: center; }
.toc .n { width: 6mm; height: 6mm; border-radius: 50%; background: var(--red); color: #fff; font-weight: 700; font-size: 8.5pt; display: grid; place-items: center; flex: none; }

/* Sections */
.section { break-before: page; }
.sec-head { display: flex; align-items: center; gap: 4mm; margin-bottom: 1.5mm; }
.sec-head .num { width: 11mm; height: 11mm; border-radius: 50%; background: var(--red); color: #fff; font-size: 15pt; font-weight: 800; display: grid; place-items: center; flex: none; }
.sec-head h2 { margin: 0; font-size: 19pt; letter-spacing: -.01em; }
.section > .lead { margin: 0 0 5mm 15mm; }
.fig { margin: 0 0 6mm; break-inside: avoid; }
.frame { position: relative; border: 1px solid var(--line); border-radius: 2.5mm; overflow: visible; background: #fff; box-shadow: 0 1mm 4mm rgba(0,0,0,.06); }
.frame img { display: block; width: 100%; height: 100%; border-radius: 2.5mm; }
.fig.side { display: flex; gap: 7mm; align-items: flex-start; }
.fig.side .frame { flex: none; }
.fig.side .legend { flex: 1; margin-top: 0; }
.badge { display: inline-grid; place-items: center; width: 5.6mm; height: 5.6mm; border-radius: 50%; background: var(--red); color: #fff; font-weight: 800; font-size: 9pt; flex: none; line-height: 1; }
.badge.on { position: absolute; transform: translate(-50%, -50%) scale(.9); box-shadow: 0 0 0 .7mm #fff, 0 .5mm 2mm rgba(0,0,0,.35); }
.legend { list-style: none; margin: 4mm 0 0; padding: 0; display: grid; gap: 2.4mm; }
.legend.two { grid-template-columns: 1fr 1fr; column-gap: 7mm; }
.legend li { display: flex; gap: 2.8mm; align-items: flex-start; break-inside: avoid; }
.legend li > div { color: var(--ink2); }
.legend li strong { color: var(--ink); display: block; font-weight: 650; }
.legend li b { color: var(--ink); }
.steps { border: 1px solid var(--line); border-left: 3px solid var(--ink); border-radius: 2.5mm; padding: 4.5mm 5mm; margin-bottom: 6mm; break-inside: avoid; }
.tip { background: var(--bg2); border-radius: 2.5mm; padding: 4mm 5mm; margin: 0 0 6mm; break-inside: avoid; }
.tip.red { background: var(--red-weak); border-left: 3px solid var(--red); }
.phones { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; margin-bottom: 6mm; }
.phones figure { margin: 0; text-align: center; }
.phones .frame { border-radius: 5mm; border: 1.6mm solid #1b1b1d; max-height: 118mm; }
.phones .frame img { border-radius: 3mm; object-fit: cover; object-position: top; }
.phones figcaption { margin-top: 2mm; font-weight: 600; font-size: 9.5pt; }

/* Quick reference */
table.qr { width: 100%; border-collapse: collapse; margin-bottom: 5mm; font-size: 9.5pt; }
.qr th { text-align: left; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); border-bottom: 2px solid var(--ink); padding: 2mm; }
.qr td { border-bottom: 1px solid var(--line); padding: 1.5mm 2mm; vertical-align: top; }
.qr td:first-child { font-weight: 600; width: 45%; }
.habits { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
.habits div { border-radius: 3mm; padding: 4.5mm 5mm; }
.habits .do { background: #e9f6ee; } .habits .dont { background: var(--red-weak); }
.habits h3 { margin: 0 0 2mm; font-size: 12pt; }
.habits ul { margin: 0; padding-left: 4.5mm; font-size: 9.5pt; } .habits li { margin: .6mm 0; }
</style></head><body>

<section class="cover">
  <div class="logo">${logo}</div>
  <div class="hero">
    <div><i>1</i><b>Write it once</b><span>Each person writes a step-by-step guide for every task they do.</span></div>
    <div><i>2</i><b>Anyone can follow it</b><span>Screenshots and links show exactly what to click and where.</span></div>
    <div><i>3</i><b>Nothing gets stuck</b><span>When someone is away or moves on, the work still gets done.</span></div>
  </div>
  <div class="band">
    <h1>Finance Handbook</h1>
    <div class="sub">Getting started guide</div>
    <div class="for">For the finance team of The Father's House · ${esc(today)}</div>
  </div>
</section>

<section class="start">
  <h2 class="page">Start here</h2>
  <p class="lead">The Finance Handbook keeps a step-by-step guide for every recurring finance task (cash, bank transfers, reimbursements, invoices, tallying and records) for every account we look after, so anyone can pick up any task without having to ask.</p>
  <div class="roles">
    <div class="role"><h4>Admin</h4><div class="who">Mercy, or whoever coordinates</div><ul><li>Adds people and accounts</li><li>Can edit every guide</li><li>Hands tasks over when someone leaves</li><li>Downloads the monthly backup</li></ul></div>
    <div class="role"><h4>Owner</h4><div class="who">Each team member</div><ul><li>Writes guides for their own tasks</li><li>Keeps them up to date</li><li>Answers questions on them</li><li>Reads everyone else's guides</li></ul></div>
    <div class="role"><h4>Reader</h4><div class="who">A stand-in or new joiner</div><ul><li>Reads and follows published guides</li><li>Prints or saves them as PDF</li><li>Asks questions on unclear steps</li><li>Can't edit anything</li></ul></div>
  </div>
  <div class="week">
    <h3>Your first week</h3>
    <ol>
      <li><span><b>Sign in</b> with the link and email your admin sent you (section 1).</span></li>
      <li><span><b>List your tasks</b>: My tasks → <span class="ui">Add several</span>, and paste all 10–15 of them (section 6).</span></li>
      <li><span><b>Write three guides</b> for the tasks you do most often, with screenshots (sections 7 and 8).</span></li>
      <li><span><b>Test one</b>: ask a teammate to do the task using only your guide, in Follow along mode. Fix anything they ask about.</span></li>
    </ol>
  </div>
  <h3 style="margin:0 0 2mm;font-size:12pt">In this guide</h3>
  <ol class="toc">${toc}<li><span class="n">✓</span>Quick reference and good habits</li></ol>
</section>

${S.map((s, i) => `<section class="section">
  <div class="sec-head"><span class="num">${i + 1}</span><h2>${esc(s.title)}</h2></div>
  <p class="lead">${md(s.lead)}</p>
  ${s.blocks.map(block).join('')}
</section>`).join('')}

<section class="section">
  <div class="sec-head"><span class="num">✓</span><h2>Quick reference</h2></div>
  <p class="lead">Keep this page handy.</p>
  <table class="qr">
    <tr><th>I want to…</th><th>Go to</th></tr>
    <tr><td>Do a task I haven't done before</td><td>All tasks → open the task → <span class="ui">Follow along</span></td></tr>
    <tr><td>See only one account's tasks</td><td>All tasks → <span class="ui">All accounts</span> filter → pick the account</td></tr>
    <tr><td>Find a task quickly</td><td>Search box on All tasks (or press <span class="ui">/</span>)</td></tr>
    <tr><td>Add my list of tasks</td><td>My tasks → <span class="ui">Add several</span></td></tr>
    <tr><td>Write a guide</td><td>My tasks → tap the task, or <span class="ui">New task</span></td></tr>
    <tr><td>Add a screenshot to a step</td><td>Click the step, then <span class="ui">Ctrl + V</span> (or drop the picture on it)</td></tr>
    <tr><td>Point at a button in a screenshot</td><td>Step → <span class="ui">Mark up</span> → drag a red box</td></tr>
    <tr><td>Make a guide available to everyone</td><td>Editor → <span class="ui">Publish</span></td></tr>
    <tr><td>Report a confusing step</td><td>Under the step → <span class="ui">Something unclear?</span></td></tr>
    <tr><td>Copy a guide for a similar task</td><td>Guide → <span class="ui">⋯</span> → Duplicate</td></tr>
    <tr><td>Undo a change to a guide</td><td>Guide → <span class="ui">⋯</span> → Version history → Restore</td></tr>
    <tr><td>Print or save as PDF</td><td>Guide → <span class="ui">PDF</span>, or Admin → Handover pack for many</td></tr>
    <tr><td>Give someone access</td><td>Admin → People → <span class="ui">Add person</span> → Copy invite</td></tr>
    <tr><td>Give a person's tasks to someone else</td><td>Admin → People → <span class="ui">Hand over</span></td></tr>
    <tr><td>Change my password</td><td>Your name (bottom left, or top right on a phone) → Change my password</td></tr>
  </table>
  <div class="habits">
    <div class="do"><h3>Good habits</h3><ul>
      <li>One guide per task, one action per step.</li>
      <li>Add a screenshot whenever there is something to click.</li>
      <li>Say which account the task is for, and keep accounts separate in every step.</li>
      <li>Note where a second person is needed (counting cash, approving transfers).</li>
      <li>Read your guide as if you were new before publishing.</li>
      <li>When something changes, update the guide the same day.</li>
    </ul></div>
    <div class="dont"><h3>Never</h3><ul>
      <li>Write passwords, PINs or OTPs in a guide.</li>
      <li>Write full bank account, card or UPI numbers.</li>
      <li>Share login details in questions or captions.</li>
      <li>Leave a guide as "Needs update" without fixing it.</li>
    </ul><p style="margin:3mm 0 0;font-size:9.5pt;color:#45464b">Write <b>who</b> gives access instead, e.g. "Mercy has the net banking login".</p></div>
  </div>
</section>
</body></html>`;

(async () => {
  fs.writeFileSync(OUT.replace(/\.pdf$/, '.html'), html);
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent(html, { waitUntil: 'load' });
  await p.pdf({
    path: OUT, format: 'A4', printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;font:8px Inter,sans-serif;color:#9a9a9f;padding:0 14mm;display:flex;justify-content:space-between"><span>Finance Handbook · Getting started</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
  });
  await b.close();
  console.log('PDF written:', OUT);
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
