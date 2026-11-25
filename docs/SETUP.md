# Going live: shared Finance Handbook for the team

About 20–30 minutes, once. Free for a team this size.
You need: a Supabase account (free) and somewhere to host the files (Vercel,
Netlify or GitHub Pages, all free).

Until you do this, the app runs in **local mode**: everything stays in one
browser, with demo data. Fine for trying it, not for the team.

---

## 1. Create the database (Supabase)

1. Go to <https://supabase.com> and sign up. Use a **church-owned email**
   (e.g. the office or finance Google account), not a personal one, so the
   handbook never depends on one person's account.
2. Supabase asks you to **create an organization** first. Every project lives
   inside one.
   - Name: **The Father's House**
   - Type: the closest option (e.g. "Personal" or "N/A"). It's only a label.
   - Plan: **Free**
3. Click **New project**:
   - Name: `tfh-finance-handbook`
   - Database password: tap **Generate**, and save it in the church's password
     manager. The app never asks for it, but support might.
   - Region: **South Asia (Mumbai)**, closest to the team
4. Optional but recommended: organization **Team** settings → invite a second
   trusted person (e.g. Mercy) as **Owner**.
5. When the project is ready, open **SQL Editor → New query**, paste the whole
   of [`supabase/schema.sql`](../supabase/schema.sql), and click **Run**.
   It should say "Success. No rows returned".

## 2. Sign-in settings

In **Authentication**:

- **Sign In / Providers → Email**: on. Keep **Confirm email** on, so nobody
  can sign up with someone else's address.
- **URL Configuration** (password-reset and confirmation emails link back here):
  - **Site URL:** `https://tfh-finance-handbook.vercel.app` (exactly this, no slash at the end)
  - **Redirect URLs → Add URL:** `https://tfh-finance-handbook.vercel.app/**`
  - **Save**
- **Google sign-in (optional)**: see 2a below. If you skip it, set
  `googleSignIn: false` in `config.js` so the button is hidden. Everyone can
  still sign in with email and password, and you can add Google later.

### 2a. Google sign-in (optional, about 10 minutes)

Google needs to know about the app first. You create a **Client ID** and a
**Client Secret** in Google Cloud, then paste them into Supabase.

**In Supabase:** Authentication → Sign In / Providers → **Google** → turn on
**Enable Sign in with Google**. At the bottom, tap **Copy** next to
**Callback URL** (it looks like `https://<your-project>.supabase.co/auth/v1/callback`).
Leave this panel open.

**In Google Cloud** (<https://console.cloud.google.com>, signed in with the church account):

1. Top bar → project picker → **New project** → name it `TFH Finance Handbook` → Create, and select it.
2. Menu → **APIs & Services → OAuth consent screen** (newer screens call it
   **Google Auth Platform → Get started**):
   - App name: `Finance Handbook`
   - User support email: the church email
   - Audience: **External**
   - Contact email: the church email → **Create**
3. **Audience** → **Publish app**, so the status shows **In production**.
   The app only asks for name and email, so Google doesn't need to review it.
   (If you leave it in "Testing", only people you add as test users can sign in.)
4. **Clients** (or **Credentials → Create credentials → OAuth client ID**):
   - Application type: **Web application**
   - Name: `Finance Handbook`
   - **Authorized redirect URIs → Add URI** → paste the Callback URL from Supabase
   - **Create**
5. Google shows a **Client ID** (ends in `.apps.googleusercontent.com`) and a
   **Client Secret**. Keep this window open.

**Back in Supabase**, in the Google panel:

| Field | What to do |
| --- | --- |
| Client IDs | Paste the Client ID |
| Client Secret (for OAuth) | Paste the Client Secret |
| Skip nonce checks | Leave **off** |
| Allow users without an email | Leave **off** |

Tap **Save**.

The Client Secret is private: it only goes into this Supabase box. Never put
it in `config.js`, the app files or a chat message.

Supabase's built-in email sender is fine for a small team (a few emails an
hour). If invites or resets stop arriving, add your own SMTP under
Authentication → Emails.

## 3. Connect the app

In Supabase, open **Project Settings → API** (or **Connect**) and copy:

- **Project URL**
- the **anon / publishable** key (never the `service_role` / secret key)

Put both in [`config.js`](../config.js):

```js
supabaseUrl: 'https://xxxx.supabase.co',
supabaseAnonKey: 'eyJ...',
```

The anon key is designed to be public. The access rules in `schema.sql`
protect the data on the server.

## 4. Put it online

Any static host works; there's no build step.

- **Vercel**: New Project → import the `sop-library` repo → Framework preset
  **Other** → Deploy.
- **Netlify**: drag the project folder onto <https://app.netlify.com/drop>.
- **GitHub Pages**: repo Settings → Pages → deploy from the `main` branch.

Then update the Site URL in step 2 if the address changed.

## 5. First sign-in

1. **Mercy signs up first.** The first account automatically becomes Admin.
2. Admin → **Accounts & categories**: add LifeHub, Father's House,
   You are Loved and the others.
3. Admin → **People → Add person** for Princess, Laveena and Mohan (role
   Owner). Tap **Copy invite** and send the message on WhatsApp. When they
   create an account with that email (or use Google), they get access straight away.
4. Each person opens **My tasks → Add several** and pastes their 10–15 task names.

Anyone who signs up without an invite waits on a "Waiting for access" screen
until the Admin taps **Give access**.

## Good to know

- **Free plan pause:** Supabase pauses free projects after about a week with
  no activity. Everyday use keeps it awake; if it does pause, click
  **Restore** in the Supabase dashboard. Nothing is lost.
- **Backups:** once a month, Admin → Backup & export → **Download a full
  backup** and keep the file in the church's shared drive.
- **Moving a trial in:** if someone tried the app in local mode first,
  download a backup there and use **Import guides from a backup** in the
  shared app.
- **This repository is public.** The church's guides live in Supabase, not
  here, but the demo names in `js/db.js` and the logo are visible. Make the
  repository private in GitHub settings if you prefer.

## Updates

Run each of these once in Supabase → **SQL Editor → New query** → paste → **Run**
(new installs already have them inside `schema.sql`):

| File | Adds |
| --- | --- |
| [`supabase/migrations/002_task_runs.sql`](../supabase/migrations/002_task_runs.sql) | The **Checklist**: "Mark as done", overdue tasks, history and the task log |
| [`supabase/migrations/003_full_template.sql`](../supabase/migrations/003_full_template.sql) | The full SOP template (SOP number, department, scope, roles, worked example, controls, exceptions, records), **sign-off** (prepared/reviewed/approved by), **numbered versions**, and **account numbers** in Admin |

Supabase may show "Potential issue detected" for these. They only add tables, columns and access rules; no data is deleted, so tap **Run query**.
