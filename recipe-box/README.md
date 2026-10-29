# Recipe Box

Save recipes you find online, browse them in a card grid, and filter by
cuisine or search by title/ingredient. No sign-up, no backend — everything
is stored in your browser.

## Features

- Paste a recipe URL and "Fetch details" to auto-fill title, image,
  ingredients, instructions, and cuisine (works on sites that publish
  standard recipe metadata — AllRecipes, NYT Cooking, Serious Eats, Food
  Network, and many others)
- If a site can't be auto-filled, the same form opens empty for manual entry
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

Browsers block a page from directly fetching another site's HTML (CORS), so
this app routes the fetch through a public CORS proxy, then looks for the
`Recipe` structured data (JSON-LD / schema.org) that most recipe sites embed
in their pages for Google. That's reliable for sites that publish it, but:

- Not every recipe site includes this data — some will fail to auto-fill
- It depends on a third-party proxy being available; if it's down, auto-fill
  will fail and you'll be prompted to enter details manually
- Auto-filled fields can be messy (e.g. instructions split oddly) — always
  review before saving

Either way, saving still works — it just falls back to a blank form you fill
in yourself.

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
