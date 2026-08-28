(function () {
  "use strict";

  const TOPOJSON_URL = "data/states-albers-10m.json";

  const svg = d3.select("#usMap");
  const tooltip = document.getElementById("mapTooltip");
  const select = document.getElementById("plantSelect");
  const careCard = document.getElementById("careCard");
  const careCardClose = document.getElementById("careCardClose");

  const geoPath = d3.geoPath(); // us-atlas data is pre-projected (Albers USA)
  let statesSelection = null;

  populateSelect();
  loadMap();

  select.addEventListener("change", () => {
    applySelection(select.value);
  });

  careCardClose.addEventListener("click", () => {
    select.value = "";
    applySelection("");
  });

  function populateSelect() {
    const sorted = [...window.PLANTS].sort((a, b) =>
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

        statesSelection = svg
          .append("g")
          .attr("class", "states")
          .selectAll("path")
          .data(features)
          .join("path")
          .attr("d", geoPath)
          .attr("class", "state")
          .attr("data-fips", (d) => d.id)
          .attr("data-abbr", (d) => window.STATE_FIPS_TO_ABBR[+d.id] || "")
          .on("mousemove", (event, d) => showTooltip(event, d))
          .on("mouseleave", hideTooltip);

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
