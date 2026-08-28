# US Native Plant Range Map

A static website with an interactive map of the United States. Pick a plant
from the dropdown and its native range is shaded green on the map; a card
on the side shows care instructions (sunlight, water, soil, hardiness
zones, bloom time, mature height, and growing notes).

## Running it

No build step or server-side code — just open `index.html` in a browser,
or serve the folder locally:

```bash
cd plant-range-map
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## How it works

- `index.html` — page structure: plant dropdown, map, care-instructions card.
- `css/style.css` — styling (light/dark aware).
- `js/plants.js` — plant data: native states + care instructions for each plant.
- `js/states.js` — lookup tables between Census FIPS state codes and postal abbreviations.
- `js/app.js` — renders the map with D3 and TopoJSON, wires up the dropdown,
  shades native states, and populates the care card.
- `js/vendor/` — vendored copies of [D3](https://d3js.org/) and
  [topojson-client](https://github.com/topojson/topojson-client) (no CDN
  dependency, works fully offline).
- `data/states-albers-10m.json` — US states boundaries (from the
  [us-atlas](https://github.com/topojson/us-atlas) package), pre-projected
  with an Albers USA projection.

## Adding a plant

Add an entry to the `PLANTS` array in `js/plants.js`:

```js
{
  id: "unique-id",
  commonName: "Common Name",
  scientificName: "Genus species",
  nativeStates: ["CA", "OR", "WA"], // two-letter postal abbreviations
  care: {
    sunlight: "...",
    water: "...",
    soil: "...",
    hardinessZones: "...",
    bloomTime: "...",
    matureHeight: "...",
    notes: "...",
  },
  description: "...",
}
```

Native ranges are simplified for illustration (based on general USDA
PLANTS / BONAP range descriptions) — check the
[USDA PLANTS Database](https://plants.usda.gov/) before making real
planting decisions.
