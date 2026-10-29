# Recipe Box

Save recipes you find online, browse them in a card grid, and filter by
cuisine or search by title/ingredient. No sign-up, no backend — everything
is stored in your browser.

## Features

- A **bookmarklet** you drag to your bookmarks bar: click it while viewing any
  recipe page and it reads that page's own recipe data directly in your
  browser, then opens Recipe Box pre-filled — no proxy involved, so it isn't
  affected by a site's bot protection (click **🔖 Bookmarklet** in the app to
  get yours)
- Or paste a recipe URL and click "Fetch details" to auto-fill the same way,
  routed through a public CORS proxy (works on sites that publish standard
  recipe metadata and don't block proxy traffic — results vary by site)
- If a site can't be auto-filled either way, the same form opens empty for
  manual entry
- Filter by cuisine with pill buttons built from the cuisines you've actually
  saved, plus a text search across titles and ingredients
- Click any card for the full recipe, a link back to the original page, and
  edit/delete
- Visually organized as a card grid, responsive down to phone width

## Using it

- Open `index.html` in a browser, or serve it locally:
  ```bash
  python3 -m http.server 8000
  ```
  then visit `http://localhost:8000`.
- Click **+ Add Recipe**, paste a URL, click **Fetch details**, review the
  filled-in fields (always double-check — auto-fill isn't perfect), and
  save. Or skip the URL and type everything in by hand.

### Hosting it online

Since this repo is on GitHub, you can use GitHub Pages: repository
**Settings → Pages**, source **Deploy from a branch**, pick this branch and
the `/recipe-box` folder (or root, if this is the only app you host), save,
and GitHub gives you a URL.

## How auto-fill works (and its limits)

Both auto-fill paths look for the same thing: the `Recipe` structured data
(JSON-LD / schema.org) that most recipe sites embed in their pages for
Google — title, ingredients, instructions, cuisine, image.

**The bookmarklet** runs inside the recipe page itself, in your own browser,
so it reads that data directly off the page with no network request of its
own. This is the more reliable option — it isn't affected by a site's bot
protection, since nothing about the request looks any different from you
just browsing the page.

**Pasting a URL** instead fetches the page through a public CORS proxy
(browsers block a page from directly fetching another site's HTML). This
depends on the proxy being up, and on the target site not blocking that
proxy's traffic — many recipe sites sit behind bot protection that blocks
exactly this kind of request, so it's noticeably less reliable than the
bookmarklet.

Either way:
- Not every recipe site includes this structured data — some pages will
  always need manual entry
- Auto-filled fields can be messy (e.g. instructions split oddly) — always
  review before saving
- Saving still works either way — it just falls back to a blank form you
  fill in yourself

## Data & privacy

Recipes are stored in `localStorage` in your browser only. They are **not**
synced anywhere and **not** shared between devices or browsers. Clearing
your browser's site data for this page will delete them. There's no backup
built in — if you want one, copy the relevant entry out of
`localStorage.getItem('recipeBox.recipes.v1')` via your browser's dev
console.

## Project structure

```
index.html       Page structure (header, controls, grid, dialogs)
css/style.css     Styling
js/app.js         App logic: storage, recipe parsing, fetch, rendering
```
