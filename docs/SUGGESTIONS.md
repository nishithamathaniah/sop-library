# Suggested changes to the requirements

The requirements document is solid. These changes make the app easier to use
every day and more likely to meet the real success test: *a new person
completes the task correctly on the first try, without calling anyone.*

## Built into this version

| # | Change | Why |
| --- | --- | --- |
| 1 | **Task and SOP are one thing.** No separate "task entry" step (F3 + F4 merged). | Non-technical users shouldn't have to understand two objects. "New task" asks four questions and opens the editor. |
| 2 | **"Add several" tasks at once.** Paste 10–15 task names; each becomes a draft. | Matches the voice note ("a list of works per person"). The master list shows real progress from day one instead of being empty. |
| 3 | **Progress per person** on the library (e.g. *3 of 12 published*) and a progress ring on My tasks. | The goal is "every task has an SOP". Making progress visible is what gets it done. |
| 4 | **"Ready to publish" panel** with the missing required parts, each one clickable. Publishing is blocked until they're filled. | Stops half-finished SOPs being published. It also teaches the template as you go, which helps the "first SOP in under 15 minutes" goal. |
| 5 | **Autosave**, plus one history version per editing session (not one per keystroke). | No lost work and no "did I save?" worry. History stays readable. |
| 6 | **Live password warning**: the field turns red if it sees "password: …", "PIN …" or "OTP …". | A banner alone is easy to ignore (section 7, Security). |
| 7 | **Paste a screenshot straight into the editor.** It goes into the selected step, or creates a new step if that one already has a screenshot. | Fastest way to document: do the task, take a screenshot, paste, type one line, repeat. |
| 8 | **Mark up screenshots** with red boxes. | "Click *this*" is clearer than a caption alone. |
| 9 | **Follow-along mode** (F19) and **"Something unclear?"** (F17) moved into the first version. | These two directly test and improve the success criterion. Both are cheap to build. |
| 10 | **Review date set automatically** to 6 months after publishing, with a "Confirm still correct" one-click action. | F16 only works if nobody has to remember to set it. |
| 11 | **Hand over** (Admin): move all of one person's tasks to someone else, keeping the old owner as backup. | This *is* the "replacement takes over a role" flow, in one action. |
| 12 | **Readers can't see drafts**; "Needs update" SOPs stay visible, with a warning banner. | A slightly outdated SOP is still better than nothing for a newcomer, as long as it's clearly marked. |
| 13 | **Handover pack**: one printable PDF of everyone's SOPs, or one person's, with a contents page. | F20, and it's the natural thing to give a replacement on day one. |

## Recommended next (phase 2)

1. **Move to a shared hosted backend.** Right now data stays in one browser.
   Recommended: **Supabase** (free tier) for login (email + Google), the
   database, screenshot storage and server-side access rules, with the static
   files on Netlify, Vercel or GitHub Pages. That means no servers and about
   $0/month for 4–20 users. The schema is ready in `supabase/schema.sql`.
2. **Real "Download PDF" button.** Today PDF export uses the browser's
   "Save as PDF", which works everywhere and keeps links clickable. A generated
   PDF is only worth adding if people find the print dialog confusing.
3. **Tamil interface** (open question in section 10). All UI text is in plain
   strings in `js/`, so a language switch is a contained change.
4. **Email nudge** when an SOP becomes overdue or gets a reader question.
   (Out of scope for v1 per section 3, but cheap once a backend exists.)

## Decisions still needed (from section 10)

- **App or Google Docs?** Try this build with three real tasks per person
  (the MVP "done when" test) before deciding. If it's faster than Docs, keep it.
- **Phone tasks?** Photos from a phone camera can already be uploaded to any
  step. If many tasks are done on phones, a short video link per step (F18) is
  already supported.
- **Who approves before publishing?** Currently the owner publishes, and the
  "Ready to publish" check acts as a light review. Recommend keeping it that way
  for v1; add an "Admin approves" step only if quality becomes a problem.
- **Share outside the team?** Not built. Use the PDF for outsiders.
- **Hosting budget?** Supabase free tier + Netlify free tier should cover it.
