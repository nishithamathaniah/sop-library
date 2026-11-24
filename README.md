# SOP Library

A simple web app where each team member writes down their recurring tasks as
step-by-step SOPs, with screenshots and links, so a new person can take over a
role and do the work without asking anyone.

Built from *SOP Documentation App – Requirements Document* (Nov 12, 2026).
Changes made to that spec, and why, are in [docs/SUGGESTIONS.md](docs/SUGGESTIONS.md).

## Try it

No build step and no install. Serve the folder and open it:

```bash
python3 -m http.server 8000     # or: npx serve .
# open http://localhost:8000
```

Sign in with a demo account (password `welcome`): **Mercy** (Admin),
**Princess**, **Laveena**, **Mohan** (Owners) or **New Joiner** (Reader).
One complete example SOP, "Update weekly attendance sheet", shows what a
finished SOP looks like.

## What's in it

| Screen | What you can do |
| --- | --- |
| **Library** (master list) | Progress card per person (*3 of 12 published*), search across titles and step text, filter by person, status, frequency and category, "Review due" and "Has questions" filters |
| **SOP view** | Clean read-only page, **Follow along**, **PDF** (print), Edit (owner only), Duplicate, Version history, "Something unclear?" on every step |
| **Follow along** | One step at a time, big text, works on a phone, remembers where you stopped, ends with the done checklist |
| **Editor** | The fixed template, autosave, steps you can add, insert, reorder and delete, paste a screenshot with Ctrl+V or drag and drop it, mark up a screenshot with red boxes, link and warning per step, live "Ready to publish 6/9" panel, password warning |
| **My tasks** | Your progress ring, what needs attention (drafts, needs update, review due, reader questions), tasks you're the backup for, **Add several** (paste a list of task names) |
| **Admin** | Add, edit and deactivate people and change roles, **Hand over** all of one person's tasks to another, categories, handover pack PDF, full backup download and restore |

### Requirements coverage

All **Must** (F1–F12), all **Should** (F13–F16) and all **Could** (F17–F20)
items are in. F1 is local accounts for now; Google sign-in comes with the
hosted backend (below).

| ID | Where |
| --- | --- |
| F1 Sign in + roles | Login screen; roles Admin / Owner / Reader |
| F2 Manage users | Admin → People |
| F3–F4 Task + fixed template | New task → Editor |
| F5 Steps add/reorder/edit/delete | Editor → Steps |
| F6 Screenshot paste/upload + caption | Editor: paste, drop or browse; Mark up; caption |
| F7 Links | Per step and "Useful links" |
| F8 Status | Draft / Published / Needs update |
| F9 Master list + filters | Library |
| F10 Search | Library search (titles, steps, notes, tools) |
| F11 PDF | "PDF" button → browser "Save as PDF"; print layout keeps screenshots on the page and prints link URLs |
| F12 Permissions | Owners edit only their own; Readers only see published SOPs and can't edit |
| F13 Backup person | Editor; shown on the SOP |
| F14 Version history + restore | ⋯ → Version history |
| F15 Duplicate | ⋯ → Duplicate, or "Start from" when creating |
| F16 Review date + overdue flag | Auto-set 6 months after publishing; "Review due" badge and filter |
| F17 Comments on a step | "Something unclear?" |
| F18 Video link per step | Editor → "Warning, tip or video" |
| F19 Checklist mode | Follow along |
| F20 Handover pack | Admin → Handover pack (PDF) and backup download |

## Important: where the data lives right now

This first version stores everything **in the browser** (IndexedDB). That's
ideal for trying it out and getting the template right, but:

- each browser and device has its **own separate copy**, so the team can't share one library yet
- the sign-in is a convenience lock, not real security

Use **Admin → Backup & export → Download** to keep a copy.

**Next step for real team use:** connect the hosted backend in
[`supabase/schema.sql`](supabase/schema.sql) (Supabase free tier: real login
including Google, a shared database, screenshot storage, and the access rules
enforced on the server), and host the files on Netlify, Vercel or GitHub Pages.
All storage calls go through `js/db.js`, so the screens don't need to change.

## Files

```
index.html          app shell
css/styles.css      all styling (light + dark, mobile, print)
js/db.js            storage (IndexedDB) + demo data
js/app.js           state, routing, library, SOP view, follow mode, admin
js/editor.js        SOP editor, screenshots, mark-up, autosave
supabase/schema.sql database and access rules for the hosted version
docs/SUGGESTIONS.md changes to the original spec and open decisions
```
