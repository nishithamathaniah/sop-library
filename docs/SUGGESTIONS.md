# Suggested changes to the requirements

The requirements document is solid. These changes make the app easier to use
every day and more likely to meet the real success test: *a new person
completes the task correctly on the first try, without calling anyone.*

They also fit the team: the finance team of The Father's House, handling
cash, bank transfers, reimbursements, invoices, tallying and records across
several accounts (LifeHub, Father's House, You are Loved, …).

## Built into this version

### Fitting a church finance team

| # | Change | Why |
| --- | --- | --- |
| 1 | **Accounts on every task guide** (one, several, or "All accounts"), plus an account filter on All tasks and the handover pack. The Admin manages the list. | The same kind of task (a bank transfer, a reimbursement) is done differently per account. Someone covering for LifeHub should see only LifeHub's tasks. |
| 2 | **Categories match the work**: Cash, Bank transfers, Reimbursements, Invoices & bills, Tallying & reconciliation, Records & reports, Other. | Taken from how the team describes its work. Editable by the Admin. |
| 3 | **"Termly" became "Quarterly".** | Accounting runs on quarters (auditor, statements), not school terms. |
| 4 | **Sensitive-number warning**: the field turns red for passwords, PINs and OTPs, and also for bank account, card and UPI numbers written next to their label. Amounts and phone numbers don't trigger it. | Finance guides are exactly where people are tempted to paste login details or account numbers. The guide should say *who* gives access, not the secret itself. |
| 5 | **The worked example is a real finance task** ("Count and deposit the Sunday offering"), showing two-person counting, keeping accounts separate, and recording the deposit slip number. | People copy what they see. A good example is the "proper SOP model" the voice note asked for. |
| 6 | **Named for the church**: "Finance Handbook" with The Father's House logo and colours; "task guide" instead of "SOP" in the app. | Feels like the team's own tool. "SOP" is jargon to most volunteers. |

### Making it effortless

| # | Change | Why |
| --- | --- | --- |
| 7 | **Task and guide are one thing.** No separate "task entry" step (F3 + F4 merged). | "New task" asks four questions and opens the editor. |
| 8 | **"Add several" tasks at once.** Paste 10–15 task names; each becomes a draft. | Matches the voice note ("a list of works per person"). Progress shows from day one. |
| 9 | **Progress per person** (*3 of 12 published*) and a progress ring on My tasks. | The goal is "every task has a guide". Visible progress gets it done. |
| 10 | **"Ready to publish" panel** with clickable missing parts. Publishing is blocked until they're filled. | Stops half-finished guides being published, and teaches the template as you go. |
| 11 | **Autosave**, one history version per editing session, and "Not saved yet, retrying…" if the connection drops. | No lost work and no "did I save?" worry. |
| 12 | **Paste a screenshot straight into the editor**, and **mark it up with red boxes**. | Do the task, take a screenshot, paste, type one line, repeat. |
| 13 | **Follow-along mode** (F19) and **"Something unclear?"** (F17) moved into the first version. | These directly test and improve the success criterion. |
| 14 | **Review date set automatically** (6 months after publishing), with "Confirm still correct". | F16 only works if nobody has to remember it. |
| 15 | **Hand over** (Admin): move all of one person's tasks to someone else, keeping the old owner as backup. | The "replacement takes over a role" flow, in one action. |
| 16 | **Invites**: the Admin adds name, email and role; the person signs up (or uses Google) and gets access straight away. Unknown sign-ups wait for approval. The first account becomes Admin. | Nobody has to share passwords, and strangers can't get in. |
| 17 | **Shared backend** (Supabase) with the access rules enforced in the database, not just hidden in the app. | F12 holds even if someone bypasses the app. Tested against a real Supabase instance. |

## Recommended next

1. **Go live**: follow [SETUP.md](SETUP.md) (about 30 minutes, free).
2. **Two-person rule as a field.** Many finance tasks need a second person
   (counting cash, approving a transfer). Today that goes in a step's warning
   note. If it comes up a lot, add an optional "Needs a second person: who"
   field shown at the top of the guide.
3. **Tamil interface** (open question in section 10). The UI text is in plain
   strings in `js/`, so a language switch is a contained change.
4. **Email or WhatsApp nudge** when a guide becomes overdue or gets a
   question. (Out of scope for v1, cheap now that there is a backend.)

## Decisions still needed (from section 10)

- **Who approves before publishing?** Currently the owner publishes; the
  "Ready to publish" check is a light review. For finance work, consider asking
  Mercy (Admin) to read each guide once after it's published.
- **Which accounts?** Add the full list in Admin → Accounts & categories.
- **Share outside the team?** Not built, on purpose: finance procedures stay
  private. Use the PDF if an auditor needs a copy.
- **Hosting budget?** Supabase free + Vercel or Netlify free should cover it.
