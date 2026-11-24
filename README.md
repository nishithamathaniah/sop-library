# TFH Finance Handbook

Step-by-step task guides for The Father's House finance team, so anyone can
pick up any task: cash, bank transfers, reimbursements, invoices, tallying
and records, across all the accounts the team looks after (LifeHub,
Father's House, You are Loved, …).

Built from *SOP Documentation App – Requirements Document* (Nov 12, 2026).
Changes made to that spec, and why: [docs/SUGGESTIONS.md](docs/SUGGESTIONS.md).
**To set up the shared version for the team: [docs/SETUP.md](docs/SETUP.md).**
**New to the app? Read the [Getting Started guide (PDF)](docs/Finance-Handbook-Getting-Started.pdf).**

## Try it now (local mode)

```bash
python3 -m http.server 8000     # or: npx serve .
# open http://localhost:8000
```

Tap a demo account (password `welcome`): **Mercy** (Admin), **Princess**,
**Laveena**, **Mohan** (Owners) or **New Joiner** (Reader). The finished
example guide is **"Count and deposit the Sunday offering"**.

In local mode everything is saved in that browser only. The shared version
(Supabase) gives the whole team one handbook with real sign-in; see SETUP.md.

## What's in it

| Screen | What you can do |
| --- | --- |
| **All tasks** | Progress per person (*3 of 12 published*), search across names and steps, filter by **account**, person, status, frequency and category, "Review due" and "Has questions" filters |
| **Task guide** | Clean page with the account(s), **Follow along**, **PDF**, Edit (owner only), Duplicate, Version history, "Something unclear?" on every step |
| **Follow along** | One step at a time, big text, works on a phone, remembers where you stopped, ends with the done checklist |
| **Editor** | Which account(s), the fixed template, autosave, steps you can add, insert, reorder and delete, paste a screenshot (Ctrl+V) or drop one in, red-box mark-up, link and warning per step, "Ready to publish 7/10" panel, warning when a password, PIN or bank, card or UPI number is typed |
| **My tasks** | Your progress, what needs attention, tasks you're the backup for, **Add several** (paste a list of task names) |
| **Admin** | People and roles (invite, give access, deactivate), **Hand over** one person's tasks to another, **Accounts & categories**, handover pack PDF by person or account, backup download and import |

### Requirements coverage

All **Must** (F1–F12), **Should** (F13–F16) and **Could** (F17–F20) items
are in. Plus: accounts per task, the shared backend with server-side access
rules, invites, and moving a trial library into the shared one.

| ID | Where |
| --- | --- |
| F1 Sign in + roles | Email + password or Google (shared mode); Admin / Owner / Reader |
| F2 Manage users | Admin → People |
| F3–F4 Task + fixed template | New task → Editor |
| F5 Steps | Editor → Steps: add, insert, reorder, delete |
| F6 Screenshots | Paste, drop or browse; compressed on upload; Mark up; caption |
| F7 Links | Per step and "Useful links" |
| F8 Status | Draft / Published / Needs update |
| F9 Master list | All tasks, filters |
| F10 Search | Names, steps, notes, tools, accounts |
| F11 PDF | "PDF" button: print layout keeps screenshots on the page and prints link URLs |
| F12 Permissions | Enforced by the database in shared mode (`supabase/schema.sql`) |
| F13 Backup person | Editor; shown on the guide |
| F14 Version history + restore | ⋯ → Version history |
| F15 Duplicate | ⋯ → Duplicate, or "Start from" when creating |
| F16 Review date + overdue | Auto-set 6 months after publishing; "Review due" badge and filter |
| F17 Comments on a step | "Something unclear?" |
| F18 Video link per step | Editor → "Warning, tip or video" |
| F19 Checklist mode | Follow along |
| F20 Handover pack | Admin → Handover pack (PDF), filter by person or account; full backup download |

## Files

```
index.html            app shell
config.js             app name, logo on/off, Supabase connection
css/styles.css        styling (Father's House red, light + dark, mobile, print)
js/logo.js, logo.svg  The Father's House wordmark (vector)
js/db.js              storage: local (IndexedDB) or shared (Supabase), demo data
js/app.js             screens: all tasks, guide, follow along, my tasks, admin
js/editor.js          guide editor, screenshots, mark-up, autosave
vendor/               supabase-js 2.119.2 (bundled, no CDN needed)
supabase/schema.sql   database, access rules, screenshot storage
docs/SETUP.md         going live, step by step
docs/Finance-Handbook-Getting-Started.pdf   illustrated guide for the team
tools/guide/          scripts that take the screenshots and build that PDF
docs/SUGGESTIONS.md   changes to the original spec and open decisions
```

## Tested

Both modes were tested in a real browser (Playwright). The shared mode was
tested against a local Supabase stack with four people signing in at once:
- an Owner trying to change someone else's guide straight through the API was refused
- a Reader couldn't see drafts or create guides
- an uninvited sign-up waited until the Admin gave access
- screenshots loaded for other people
- importing from a local backup worked
