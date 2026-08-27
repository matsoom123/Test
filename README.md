# Finance Tracker

A lightweight, private finance tracker that runs entirely in your browser. No
server, no account, no external dependencies — your data stays on your
machine (stored in `localStorage`).

## Features

- Log income and expense transactions with category, date, and description
- Dashboard with running balance, total income, and total expenses
- Spending-by-category breakdown chart
- Monthly budgets per category with progress bars (and an over-budget warning)
- Filter transactions by category, type, or month
- Export all transactions to CSV, or import transactions from a CSV file

## Running it

No build step or install required. Either:

- Open `index.html` directly in your browser, or
- Serve it locally, e.g.:

  ```bash
  python3 -m http.server 8000
  ```

  then visit `http://localhost:8000`.

## Data & privacy

All data is stored locally in your browser's `localStorage` under the
`finance-tracker:*` keys. Nothing is sent anywhere. Clearing your browser's
site data for this page will erase your transactions and budgets, so use
**Export CSV** periodically if you want a backup.

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
index.html      Page structure
css/style.css   Styling (light/dark aware)
js/app.js       App logic: state, rendering, CSV import/export
```
