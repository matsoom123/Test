# Finance Tracker

A finance tracker with account sign-in and cloud storage (via
[Supabase](https://supabase.com)) — sign in on any device (laptop, phone,
another computer) and see the same transactions and budgets everywhere.

## Features

- Sign up / sign in with email + password
- Log income and expense transactions with category, date, and description
- Dashboard with running balance, total income, and total expenses
- Spending-by-category breakdown chart
- Monthly budgets per category with progress bars (and an over-budget warning)
- Filter transactions by category, type, or month
- Export all transactions to CSV, or import transactions from a CSV file
- Your data lives in your own free Supabase project, not on your one device

## One-time setup (do this before using the app)

You need a free Supabase project — this is where your data actually lives.
It takes about 5 minutes.

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and click **Start your project**.
2. Sign up (email, or GitHub/Google) — it's free.
3. Click **New project**. Pick any name (e.g. "finance-tracker") and a
   database password (save it somewhere, though you won't need it day-to-day),
   choose the region closest to you, and click **Create new project**.
4. Wait a minute or two while it sets up.

### 2. Create the database tables

1. In your new project, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open the file [`supabase/schema.sql`](supabase/schema.sql) from this
   project, copy its entire contents, and paste it into the SQL editor.
4. Click **Run**. You should see "Success. No rows returned."

This creates two tables (`transactions` and `budgets`) and locks them down so
each signed-in user can only ever see their own data.

### 3. (Recommended) Turn off email confirmation

By default Supabase makes new users click a confirmation link in their email
before they can sign in. For a personal tool this is extra friction you can
skip:

1. Left sidebar → **Authentication** → **Providers** (or **Sign In / Providers**
   depending on the Supabase version) → click **Email**.
2. Turn off **Confirm email**.
3. Save.

(If you skip this step, just check your inbox for a confirmation email after
signing up in the app.)

### 4. Connect the app to your project

1. Left sidebar → **Project Settings** → **API**.
2. Copy the **Project URL**.
3. Copy the **anon public** key (a long string).
4. In this project, open `js/config.js` in any text editor and paste them in:

   ```js
   window.SUPABASE_CONFIG = {
     url: "https://xxxxxxxx.supabase.co",
     anonKey: "eyJ...your-long-key...",
   };
   ```
5. Save the file.

That's it — setup is done. This only needs to happen once, ever (not once per
device).

## Using it

- Open `index.html` in a browser (see below for options), or better yet,
  host it somewhere so it has a real web address you can open from your
  phone too — see **Hosting it online** below.
- The first time, click **Sign Up**, enter an email + password, and sign in.
- On any other device, open the same page and sign in with the same email +
  password — you'll see the same transactions and budgets.

### Opening it locally

- Double-click `index.html`, or
- Serve it locally:
  ```bash
  python3 -m http.server 8000
  ```
  then visit `http://localhost:8000`.

This works fine on one computer, but for it to be reachable from your phone
or another computer, host it online (next section).

## Hosting it online (so you can open it from your phone too)

Since this repo already lives on GitHub, the easiest option is **GitHub
Pages** (free):

1. On GitHub, go to this repository's **Settings** → **Pages**.
2. Under "Build and deployment", set **Source** to **Deploy from a branch**.
3. Pick the branch this code is on, folder `/ (root)`, then **Save**.
4. After a minute, GitHub will show you a URL like
   `https://<your-username>.github.io/<repo-name>/`.
5. Open that URL on any device — phone included — and sign in.

Note: GitHub Pages sites are publicly reachable at that URL (anyone with the
link can load the page), but nobody can see your data without your email +
password, since Supabase's Row Level Security keeps each account's data
private.

## Data & privacy

Your transactions and budgets are stored in your own Supabase project's
database, associated with your account. Only someone signed in with your
email and password can read or change them (enforced by the Row Level
Security policies in `supabase/schema.sql`, not just by the app's UI).

Use **Export CSV** any time you want a local backup file.

## CSV format

Exports (and expected imports) use these columns:

```
date,type,category,amount,description
```

- `date`: `YYYY-MM-DD`
- `type`: `income` or `expense`
- `amount`: positive number
- `description`: optional, free text

## Project structure

```
index.html          Page structure (auth screen + dashboard)
css/style.css        Styling (light/dark aware)
js/config.js          Your Supabase project URL + key (fill this in)
js/app.js             App logic: auth, data loading/saving, rendering, CSV
supabase/schema.sql   Database tables + security policies (run once in Supabase)
```
