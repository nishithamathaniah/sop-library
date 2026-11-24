# Going live: shared Finance Handbook for the team

About 20–30 minutes, once. Free for a team this size.
You need: a Supabase account (free) and somewhere to host the files (Vercel,
Netlify or GitHub Pages, all free).

Until you do this, the app runs in **local mode**: everything stays in one
browser, with demo data. Fine for trying it, not for the team.

---

## 1. Create the database (Supabase)

1. Go to <https://supabase.com>, sign up, and click **New project**.
   - Name: `tfh-finance-handbook`
   - Region: **Mumbai (ap-south-1)**, closest to the team
   - Set a database password and keep it somewhere safe (you won't need it in the app).
2. When the project is ready, open **SQL Editor → New query**, paste the whole
   of [`supabase/schema.sql`](../supabase/schema.sql), and click **Run**.
   It should say "Success. No rows returned".

## 2. Sign-in settings

In **Authentication**:

- **Sign In / Providers → Email**: on. Keep **Confirm email** on, so nobody
  can sign up with someone else's address.
- **URL Configuration**: set **Site URL** to the address where you host the
  app (step 4), e.g. `https://tfh-finance.vercel.app`, and add the same
  address under **Redirect URLs**. Password-reset and confirmation emails link
  back here.
- **Google sign-in (optional)**: Providers → Google. It needs a Google Cloud
  OAuth client; Supabase shows the steps on that page. If you skip it, set
  `googleSignIn: false` in `config.js` so the button is hidden.

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
