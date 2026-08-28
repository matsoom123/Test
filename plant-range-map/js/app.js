(function () {
  "use strict";

  const TOPOJSON_URL = "data/states-albers-10m.json";

  // Must match the <svg viewBox> in index.html.
  const VIEWBOX = { minX: -60, minY: 5, width: 1025, height: 605 };

  // Alaska and Hawaii are drawn as fixed "inset boxes" in the Albers USA
  // projection, positioned in the bottom-left regardless of true geography.
  // When zoomed into a different state they can coincidentally fall inside
  // the crop, which reads as a rendering bug — so hide them while zoomed
  // into anything else.
  const INSET_FIPS = new Set([2, 15]);

  const svg = d3.select("#usMap");
  const tooltip = document.getElementById("mapTooltip");
  const select = document.getElementById("plantSelect");
  const selectLabel = document.getElementById("selectLabel");
  const backButton = document.getElementById("backButton");
  const careCard = document.getElementById("careCard");
  const careCardClose = document.getElementById("careCardClose");

  const geoPath = d3.geoPath(); // us-atlas albers data is pre-projected
  let statesGroup = null;
  let statesSelection = null;

  populateSelect(window.PLANTS, null);
  loadMap();

  select.addEventListener("change", () => {
    applySelection(select.value);
  });

  careCardClose.addEventListener("click", () => {
    select.value = "";
    applySelection("");
  });

  backButton.addEventListener("click", resetZoom);

  function populateSelect(plantList, stateAbbr) {
    select.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";

    if (stateAbbr && plantList.length === 0) {
      placeholder.textContent = "No plants in this list are native here";
      select.appendChild(placeholder);
      select.disabled = true;
      return;
    }

    placeholder.textContent = stateAbbr
      ? `— Select a plant (${plantList.length}) —`
      : "— Select a plant —";
    select.appendChild(placeholder);
    select.disabled = false;

    const sorted = [...plantList].sort((a, b) =>
      a.commonName.localeCompare(b.commonName)
    );
    for (const plant of sorted) {
      const option = document.createElement("option");
      option.value = plant.id;
      option.textContent = `${plant.commonName} (${plant.scientificName})`;
      select.appendChild(option);
    }
  }

  function loadMap() {
    fetch(TOPOJSON_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load map data (${res.status})`);
        return res.json();
      })
      .then((us) => {
        const features = topojson.feature(us, us.objects.states).features;

        statesGroup = svg.append("g").attr("class", "states");

        statesSelection = statesGroup
          .selectAll("path")
          .data(features)
          .join("path")
          .attr("d", geoPath)
          .attr("class", "state")
          .attr("data-fips", (d) => d.id)
          .attr("data-abbr", (d) => window.STATE_FIPS_TO_ABBR[+d.id] || "")
          .on("mousemove", (event, d) => showTooltip(event, d))
          .on("mouseleave", hideTooltip)
          .on("click", (event, d) => zoomToState(d));

        // Re-apply whatever is currently selected once the map is ready.
        applySelection(select.value);
      })
      .catch((err) => {
        svg.parentElement &&
          (svg.parentNode.insertBefore(errorBanner(err), svg));
        console.error(err);
      });
  }

  function errorBanner(err) {
    const div = document.createElement("div");
    div.className = "map-error";
    div.textContent = "Couldn't load the map data. " + String(err.message || err);
    return div;
  }

  function zoomToState(d) {
    if (!statesGroup) return;

    const abbr = window.STATE_FIPS_TO_ABBR[+d.id];
    const name = window.STATE_FIPS_TO_NAME[+d.id] || abbr;

    const [[x0, y0], [x1, y1]] = geoPath.bounds(d);
    const dx = Math.max(x1 - x0, 1);
    const dy = Math.max(y1 - y0, 1);
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;

    // Leave ~18% padding around the state; cap zoom so tiny states
    // (e.g. Rhode Island, DC) don't blow up to an absurd scale.
    const scale = Math.max(
      1,
      Math.min(10, 0.82 / Math.max(dx / VIEWBOX.width, dy / VIEWBOX.height))
    );
    const viewCx = VIEWBOX.minX + VIEWBOX.width / 2;
    const viewCy = VIEWBOX.minY + VIEWBOX.height / 2;
    const tx = viewCx - scale * cx;
    const ty = viewCy - scale * cy;

    statesGroup
      .transition()
      .duration(650)
      .ease(d3.easeCubicInOut)
      .attr("transform", `translate(${tx},${ty}) scale(${scale})`);

    selectLabel.textContent = `Plants native to ${name}`;
    backButton.hidden = false;

    statesSelection.style("display", (s) =>
      INSET_FIPS.has(+s.id) && +s.id !== +d.id ? "none" : null
    );

    const matches = window.PLANTS.filter((p) => p.nativeStates.includes(abbr));
    populateSelect(matches, abbr);
    select.value = "";
    applySelection("");
  }

  function resetZoom() {
    if (statesGroup) {
      statesGroup
        .transition()
        .duration(650)
        .ease(d3.easeCubicInOut)
        .attr("transform", null);
    }

    selectLabel.textContent = "Choose a plant";
    backButton.hidden = true;

    if (statesSelection) {
      statesSelection.style("display", null);
    }

    populateSelect(window.PLANTS, null);
    select.value = "";
    applySelection("");
  }

  function applySelection(plantId) {
    const plant = window.PLANTS.find((p) => p.id === plantId);

    if (statesSelection) {
      const nativeSet = new Set(plant ? plant.nativeStates : []);
      statesSelection.classed("native", (d) =>
        nativeSet.has(window.STATE_FIPS_TO_ABBR[+d.id])
      );
    }

    if (plant) {
      showCareCard(plant);
    } else {
      hideCareCard();
    }
  }

  function showCareCard(plant) {
    document.getElementById("careName").textContent = plant.commonName;
    document.getElementById("careScientific").textContent = plant.scientificName;
    document.getElementById("careDescription").textContent = plant.description;
    document.getElementById("careSunlight").textContent = plant.care.sunlight;
    document.getElementById("careWater").textContent = plant.care.water;
    document.getElementById("careSoil").textContent = plant.care.soil;
    document.getElementById("careZones").textContent = plant.care.hardinessZones;
    document.getElementById("careBloom").textContent = plant.care.bloomTime;
    document.getElementById("careHeight").textContent = plant.care.matureHeight;
    document.getElementById("careNotes").textContent = plant.care.notes;
    document.getElementById("careFunFactText").textContent = plant.funFact;
    document.getElementById("careStateCount").textContent =
      `Native to ${plant.nativeStates.length} state${plant.nativeStates.length === 1 ? "" : "s"}.`;
    careCard.hidden = false;
  }

  function hideCareCard() {
    careCard.hidden = true;
  }

  function showTooltip(event, d) {
    const name = window.STATE_FIPS_TO_NAME[+d.id] || "Unknown";
    tooltip.textContent = name;
    tooltip.hidden = false;
    const wrapRect = tooltip.parentElement.getBoundingClientRect();
    tooltip.style.left = `${event.clientX - wrapRect.left + 12}px`;
    tooltip.style.top = `${event.clientY - wrapRect.top + 12}px`;
  }

  function hideTooltip() {
    tooltip.hidden = true;
  }
})();
