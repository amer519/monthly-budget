# Budget

A simple, mobile-first personal budget app for one household. Built with React, Vite, TypeScript, Tailwind CSS, and Supabase.

## What you get

- A dashboard that shows how much money you have left this month, your Flex Fund, savings potential, and buffer — all recalculated instantly as you update bills.
- Summer/Winter budget profiles you can switch per month.
- A fast "add purchase" flow for the Flex Fund.
- Month-over-month history with simple charts.
- Installable on your iPhone home screen (PWA).

---

## 1. Install dependencies

```bash
npm install
```

## 2. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account if you don't have one.
2. Click **New Project**. Pick any name and a strong database password (save it somewhere safe — you won't need it day-to-day).
3. Wait ~2 minutes for the project to finish provisioning.

## 3. Run the database setup

1. In your Supabase project, open **SQL Editor** (left sidebar) → **New query**.
2. Open [`supabase/schema.sql`](supabase/schema.sql) from this repo, copy the whole file, paste it into the SQL editor, and click **Run**.
3. This creates all the tables, Row Level Security policies, and a trigger that automatically seeds your default bills and budget profile the moment your user account is created.

> If you pull a newer version of this repo later and `supabase/schema.sql` has changed, just re-run the whole file again — every statement is written to be safe to re-run and will only add what's missing, never duplicate or overwrite your data.

## 4. Create your user (no public sign-up — just you)

1. In Supabase, go to **Authentication → Users → Add user → Create new user**.
2. Enter your email and a password. Check **Auto Confirm User** so you can sign in immediately.
3. Click **Create user**. That's it — the trigger from step 3 automatically creates your profile and default bills behind the scenes.

## 5. Configure environment variables

1. In Supabase, go to **Project Settings → API**. Copy the **Project URL** and the **anon public** key.
2. In this repo, copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

3. Open `.env` and fill in your values:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

`.env` is gitignored — it never gets committed.

## 6. Run it locally

```bash
npm run dev
```

Open the printed local URL, sign in with the email/password you created in step 4, and you should see your dashboard already populated with the default bills and income ($5,864.62/mo, summer/winter targets, etc.).

## 7. Deploy to Netlify

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. In Netlify, click **Add new site → Import an existing project**, and pick your repo.
3. Build settings should auto-detect from `netlify.toml` (`npm run build`, publish directory `dist`). If not, set them manually.
4. Under **Site configuration → Environment variables**, add the same two variables from your `.env` file:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. Netlify will give you a URL like `https://your-app.netlify.app`.

## 8. Add it to your iPhone home screen

1. Open your deployed Netlify URL in **Safari** on your iPhone.
2. Tap the **Share** icon (square with an arrow) in the toolbar.
3. Tap **Add to Home Screen**, then **Add**.
4. Open it from your home screen — it launches full-screen, like a native app.

---

## Everyday use

- **Home**: your monthly dashboard. Tap **No Change** on a bill to confirm it at its expected amount, or **Update** to enter the real amount. Everything recalculates instantly.
- **Flex**: tap the **+** button anywhere to log a purchase (amount → description → optional category → save).
- **History**: see past months and simple spending/savings/flex trends.
- **Settings**: edit your income, bills, and Summer/Winter targets.

At the start of each new month, opening the app automatically creates that month's budget from your saved defaults (bills, income, season targets) — no manual setup needed. Flex purchases and confirmed/paid statuses never carry over between months.

## Local development scripts

```bash
npm run dev       # start local dev server
npm run build     # typecheck + production build
npm run test      # run calculation unit tests
npm run lint      # lint
npm run preview   # preview the production build locally
```

## Tech stack

React + Vite + TypeScript + Tailwind CSS v4 + Supabase (Postgres, Auth, Row Level Security) + React Router. No other runtime dependencies — kept intentionally minimal.
