const { stations, lines, interchanges } = window.FootprintsMetro;
const stationById = new Map(stations.map(station => [station.id, station]));
const lineById = new Map(lines.map(line => [line.id, line]));
const { findStation, shortestRoute, groupJourney, summarize } =
  window.FootprintsRouting.createRouter({ stations, lines, interchanges });
const map = document.querySelector("#metro-map");
const pickupInput = document.querySelector("#pickup");
const dropoffInput = document.querySelector("#dropoff");
const routePanel = document.querySelector("#route-panel");
const routeSteps = document.querySelector("#route-steps");
const plannerError = document.querySelector("#planner-error");
const locationStatus = document.querySelector("#location-status");
const locationLabel = locationStatus.querySelector("span:last-child");
const locateButton = document.querySelector("#locate-button");
const stopLocationButton = document.querySelector("#stop-location-button");
const startJourneyButton = document.querySelector("#start-journey-button");
const mapTooltip = document.querySelector("#map-tooltip");
const SVG_NS = "http://www.w3.org/2000/svg";
const BOUNDS = { west: 77.00, east: 77.54, south: 28.43, north: 28.73 };
const majorLabels = new Set([
  "noida-sec-62", "noida-sec-52", "noida-sec-51", "botanical-garden", "new-ashok-nagar",
  "mayur-vihar-1", "anand-vihar", "karkarduma", "yamuna-bank", "lajpat-nagar",
  "rajiv-chowk", "shiv-vihar", "parichowk", "vaishali"
]);
let userPosition = null;
let watchId = null;
let activeRoute = null;

function svgElement(tag, attrs = {}, text) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  if (text !== undefined) element.textContent = text;
  return element;
}

function projectPoint(point) {
  return {
    x: 28 + ((point.lon - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * 844,
    y: 20 + ((BOUNDS.north - point.lat) / (BOUNDS.north - BOUNDS.south)) * 354
  };
}

function stationPoint(stationId) {
  const station = stationById.get(stationId);
  return station ? projectPoint(station) : null;
}

function renderMap(route = null) {
  map.replaceChildren();
  map.setAttribute("viewBox", "0 0 900 405");
  map.append(svgElement("rect", { x: 0, y: 0, width: 900, height: 405, fill: "#f4f5f0" }));

  const blocks = svgElement("g", { class: "map-blocks" });
  for (let i = 0; i < 18; i += 1) {
    const x = 8 + (i * 83) % 840;
    const y = 20 + (i * 127) % 330;
    const width = 22 + (i * 17) % 45;
    const height = 13 + (i * 11) % 24;
    blocks.append(svgElement("rect", { x, y, width, height, rx: 4, fill: i % 3 === 0 ? "#e9eee5" : "#ecefe9" }));
  }
  map.append(blocks);

  const roads = svgElement("g", { fill: "none", stroke: "#fff", "stroke-width": 7, "stroke-linecap": "round", opacity: ".82" });
  [
    "M 0 285 C 180 250 245 355 422 294 S 692 235 900 274",
    "M 208 0 C 252 90 217 169 302 231 S 352 316 340 405",
    "M 0 140 C 160 180 280 91 421 138 S 680 107 900 163",
    "M 633 0 C 580 90 663 189 601 263 S 592 347 636 405"
  ].forEach(d => roads.append(svgElement("path", { d })));
  map.append(roads);

  const areaLabels = svgElement("g", { class: "map-area-labels" });
  [
    { x: 95, y: 77, text: "WEST DELHI" }, { x: 370, y: 220, text: "CENTRAL DELHI" },
    { x: 617, y: 146, text: "EAST DELHI" }, { x: 775, y: 279, text: "NOIDA" },
    { x: 795, y: 369, text: "GREATER NOIDA" }
  ].forEach(label => areaLabels.append(svgElement("text", { x: label.x, y: label.y }, label.text)));
  map.append(areaLabels);

  const allLineBranches = lines.flatMap(line => (line.branches || [line.stations]).map(stationIds => ({ line, stationIds })));
  for (const { line, stationIds } of allLineBranches) {
    const points = stationIds.map(stationPoint).filter(Boolean);
    if (points.length < 2) continue;
    const d = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
    map.append(svgElement("path", { d, class: "metro-line-halo" }));
    map.append(svgElement("path", {
      d,
      class: `metro-line metro-line-${line.id}`,
      stroke: line.color,
      "data-line": line.id
    }));
  }

  const routeStationIds = new Set(route ? route.visitedStationIds : []);
  if (route) {
    const stationColors = new Map();
    for (const transition of route.transitions) {
      const from = stationPoint(transition.from);
      const to = stationPoint(transition.to);
      if (!from || !to) continue;
      const line = transition.kind === "ride" ? lineById.get(transition.toLine) : null;
      const color = line ? line.color : "#7f9680";
      if (!stationColors.has(transition.from)) stationColors.set(transition.from, color);
      if (!stationColors.has(transition.to)) stationColors.set(transition.to, color);
      const d = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
      map.append(svgElement("path", { d, class: "route-halo" }));
      if (line) {
        map.append(svgElement("path", {
          d,
          class: "route-footprint",
          stroke: line.color,
          "data-line": line.id
        }));
        map.append(svgElement("path", {
          d,
          class: "route-center-line",
          stroke: line.color,
          "data-line": line.id
        }));
      } else {
        map.append(svgElement("path", {
          d,
          class: "route-walk",
          "aria-label": "Walking interchange"
        }));
      }
    }
    route.stationColors = stationColors;
  }

  const stationLayer = svgElement("g", { class: "station-layer" });
  for (const station of stations) {
    const { x, y } = projectPoint(station);
    const isInterchange = lines.filter(line => (line.branches || [line.stations]).some(branch => branch.includes(station.id))).length > 1;
    const routeColor = route && route.stationColors.get(station.id);
    const dot = svgElement("circle", {
      cx: x,
      cy: y,
      r: isInterchange ? 4.2 : 2.6,
      class: `map-station${routeStationIds.has(station.id) ? " map-station-active" : ""}${route && station.id === route.start ? " map-station-start" : ""}${route && station.id === route.end ? " map-station-end" : ""}`,
      tabindex: "0",
      role: "button",
      "aria-label": `${station.name}${isInterchange ? ", interchange" : ""}`,
      "data-station": station.id
    });
    if (routeColor) dot.style.setProperty("--route-color", routeColor);
    stationLayer.append(dot);
    if (majorLabels.has(station.id) || isInterchange) {
      const label = svgElement("text", {
        x: x + 7,
        y: y - 6,
        class: `station-label${routeStationIds.has(station.id) ? " station-label-active" : ""}`,
        "pointer-events": "none"
      }, station.name.replace("Noida ", ""));
      if (routeColor) label.style.setProperty("--route-color", routeColor);
      stationLayer.append(label);
    }
  }
  map.append(stationLayer);

  const locationOnMap = userPosition
    && userPosition.lon >= BOUNDS.west && userPosition.lon <= BOUNDS.east
    && userPosition.lat >= BOUNDS.south && userPosition.lat <= BOUNDS.north;
  if (locationOnMap) {
    const p = projectPoint(userPosition);
    const cx = p.x;
    const cy = p.y;
    const marker = svgElement("g", { class: "user-map-marker", "aria-label": "Your current location" });
    marker.append(svgElement("circle", { cx, cy, r: 15, class: "user-marker-pulse" }));
    marker.append(svgElement("circle", { cx, cy, r: 6, class: "user-marker-dot" }));
    marker.append(svgElement("text", { x: cx + 12, y: cy - 10, class: "user-marker-label" }, "YOU"));
    map.append(marker);
  } else if (userPosition) {
    map.append(svgElement("text", { x: 450, y: 390, class: "user-marker-label", "text-anchor": "middle" }, "YOUR LOCATION IS OUTSIDE THIS MAP"));
  }

  const compass = svgElement("g", { class: "map-compass", transform: "translate(867 40)" });
  compass.append(svgElement("text", { x: 0, y: 0, "text-anchor": "middle" }, "N"));
  compass.append(svgElement("path", { d: "M 0 7 L -4 17 L 0 14 L 4 17 Z" }));
  map.append(compass);
  document.querySelector("#footprint-legend").hidden = !route;
  document.querySelector("#show-network-button").hidden = !route;
  document.querySelector("#map-mode").innerHTML = route
    ? "<span></span> YOUR ROUTE"
    : "<span></span> NETWORK OVERVIEW";
  document.querySelector("#map-title").textContent = route
    ? `${stationById.get(route.start).name} to ${stationById.get(route.end).name}`
    : "The city, at your pace.";
  const routeLines = route
    ? [...new Set(route.transitions.filter(transition => transition.kind === "ride").map(transition => transition.toLine))]
      .map(lineId => lineById.get(lineId))
    : [];
  document.querySelector("#footprint-label").textContent = routeLines.length
    ? `${routeLines.map(line => line.name).join(" + ")} footprint`
    : "Your footprint";
  document.querySelector("#footprint-key").style.background = routeLines.length
    ? `linear-gradient(90deg, ${routeLines.map(line => line.color).join(", ")})`
    : "";
}

function populateStationSuggestions() {
  const options = document.querySelector("#station-options");
  for (const station of [...stations].sort((a, b) => a.name.localeCompare(b.name))) {
    const option = document.createElement("option");
    option.value = station.name;
    options.append(option);
  }
}

function addText(parent, tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

function renderRoute(route) {
  activeRoute = route;
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    locationLabel.textContent = "Location paused · showing last fix";
    startJourneyButton.textContent = "⌖ Start journey";
    startJourneyButton.classList.remove("journey-live");
  }
  stopLocationButton.hidden = true;
  locateButton.hidden = false;
  locateButton.disabled = false;
  startJourneyButton.textContent = "⌖ Start journey";
  startJourneyButton.classList.remove("journey-live");
  locationLabel.textContent = userPosition ? locationLabel.textContent : "Location not shared";
  locationStatus.classList.toggle("location-active", Boolean(userPosition));
  routePanel.hidden = false;
  routeSteps.replaceChildren();
  const start = stationById.get(route.start);
  const end = stationById.get(route.end);
  const groups = groupJourney(route);
  const summary = summarize(route);
  document.querySelector("#route-title").textContent = "Here’s your way there.";
  document.querySelector("#route-subtitle").textContent = `${start.name}  →  ${end.name}`;
  document.querySelector("#route-time").textContent = `~${summary.minutes} min`;
  document.querySelector("#route-stops").textContent = `${summary.rides} station${summary.rides === 1 ? "" : "s"} · ${summary.interchangesCount} interchange${summary.interchangesCount === 1 ? "" : "s"}`;

  const startStep = document.createElement("article");
  startStep.className = "journey-step journey-start";
  const startMarker = document.createElement("span");
  startMarker.className = "journey-marker start-marker";
  startStep.append(startMarker);
  const startContent = document.createElement("div");
  startContent.className = "journey-content";
  addText(startContent, "span", "step-kicker", "START HERE");
  addText(startContent, "h3", "", start.name);
  addText(startContent, "p", "step-description", "Enter the station and follow signs for your line.");
  startStep.append(startContent);
  routeSteps.append(startStep);

  for (const group of groups) {
    const step = document.createElement("article");
    step.className = `journey-step ${group.kind === "walk" ? "journey-walk" : group.kind === "transfer" ? "journey-transfer" : "journey-ride"}`;
    const marker = document.createElement("span");
    marker.className = group.kind === "walk" ? "journey-marker walk-marker"
      : group.kind === "transfer" ? "journey-marker transfer-marker" : "journey-marker line-marker";
    if (group.kind === "ride") {
      marker.style.setProperty("--line-color", lineById.get(group.lineId).color);
      step.style.setProperty("--line-color", lineById.get(group.lineId).color);
    }
    if (group.kind === "transfer") {
      marker.style.setProperty("--from-line-color", lineById.get(group.fromLine).color);
      marker.style.setProperty("--to-line-color", lineById.get(group.toLine).color);
    }
    step.append(marker);
    const content = document.createElement("div");
    content.className = "journey-content";

    if (group.kind === "walk") {
      addText(content, "span", "step-kicker", "STATION INTERCHANGE");
      addText(content, "h3", "", `Walk to ${stationById.get(group.to).name}`);
      addText(content, "p", "step-description", group.link.instruction);
      addText(content, "span", "walk-time", `↗ about ${group.link.minutes} min walk`);
    } else if (group.kind === "transfer") {
      addText(content, "span", "step-kicker", "CHANGE LINES HERE");
      addText(content, "h3", "", `At ${stationById.get(group.stationId).name}`);
      const transferText = document.createElement("p");
      transferText.className = "step-description";
      transferText.append(document.createTextNode("Follow the "));
      const oldLine = addText(transferText, "strong", "inline-line", lineById.get(group.fromLine).name);
      oldLine.style.setProperty("--line-color", lineById.get(group.fromLine).color);
      transferText.append(document.createTextNode(" interchange signs and board the "));
      const nextLine = addText(transferText, "strong", "inline-line", lineById.get(group.toLine).name);
      nextLine.style.setProperty("--line-color", lineById.get(group.toLine).color);
      transferText.append(document.createTextNode(" towards your next stop."));
      content.append(transferText);
    } else {
      const line = lineById.get(group.lineId);
      const lineHeader = document.createElement("div");
      lineHeader.className = "line-step-heading";
      const linePill = addText(lineHeader, "span", "line-pill", line.name);
      linePill.style.setProperty("--line-color", line.color);
      addText(lineHeader, "span", "step-kicker", `TOWARDS ${stationById.get(group.stops[group.stops.length - 1]).name.toUpperCase()}`);
      content.append(lineHeader);
      addText(content, "h3", "", `Board at ${stationById.get(group.stops[0]).name}`);
      const stopNames = group.stops.slice(1).map(id => stationById.get(id).name);
      const list = document.createElement("ol");
      list.className = "stop-list";
      for (const name of stopNames) addText(list, "li", "", name);
      content.append(list);
    }
    step.append(content);
    routeSteps.append(step);
  }

  const endStep = document.createElement("article");
  endStep.className = "journey-step journey-end";
  const endMarker = document.createElement("span");
  endMarker.className = "journey-marker end-marker";
  endStep.append(endMarker);
  const endContent = document.createElement("div");
  endContent.className = "journey-content";
  addText(endContent, "span", "step-kicker", "YOU’RE HERE");
  addText(endContent, "h3", "", end.name);
  addText(endContent, "p", "step-description", "Exit the station and follow signs to your destination.");
  endStep.append(endContent);
  routeSteps.append(endStep);
  renderMap(route);
  document.querySelector("#map-panel").scrollIntoView({ behavior: "smooth", block: "center" });
}

function showPlannerError(text) {
  plannerError.textContent = text;
  plannerError.hidden = false;
}

function planRoute(fromValue, toValue) {
  plannerError.hidden = true;
  const from = findStation(fromValue);
  const to = findStation(toValue);
  if (!from || !to) {
    showPlannerError("Choose a station from the suggestions so we can guide you accurately.");
    return;
  }
  const route = shortestRoute(from.id, to.id);
  if (!route) {
    showPlannerError("We can’t find a connected route in this Noida–Delhi beta yet. Try stations on the Blue, Pink or Aqua lines.");
    return;
  }
  renderRoute(route);
}

function nearestStation(position) {
  const toRadians = degree => degree * Math.PI / 180;
  let closest = null;
  let closestDistance = Infinity;
  for (const station of stations) {
    const latDelta = toRadians(station.lat - position.lat);
    const lonDelta = toRadians(station.lon - position.lon);
    const a = Math.sin(latDelta / 2) ** 2
      + Math.cos(toRadians(position.lat)) * Math.cos(toRadians(station.lat)) * Math.sin(lonDelta / 2) ** 2;
    const distance = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = station;
    }
  }
  return { station: closest, distance: closestDistance };
}

function locateUser() {
  if (!navigator.geolocation) {
    locationLabel.textContent = "Location isn’t supported";
    return;
  }
  locateButton.disabled = true;
  locationLabel.textContent = "Finding your location…";
  navigator.geolocation.getCurrentPosition(position => {
    userPosition = { lat: position.coords.latitude, lon: position.coords.longitude };
    const nearest = nearestStation(userPosition);
    const distanceKm = (nearest.distance / 1000).toFixed(1);
    const withinCoverage = nearest.distance < 15000;
    locationLabel.textContent = withinCoverage
      ? `Near ${nearest.station.name} · ${distanceKm} km`
      : `Outside beta · nearest ${nearest.station.name}`;
    locationStatus.classList.add("location-active");
    locateButton.hidden = true;
    stopLocationButton.hidden = false;
    if (withinCoverage && !pickupInput.value.trim()) pickupInput.value = nearest.station.name;
    renderMap(activeRoute);
  }, error => {
    const reason = error.code === error.PERMISSION_DENIED
      ? "Location permission denied"
      : error.code === error.POSITION_UNAVAILABLE ? "Location unavailable" : "Location request timed out";
    locationLabel.textContent = reason;
    locateButton.disabled = false;
  }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
}

function stopSharingLocation() {
  const wasTracking = watchId !== null;
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (wasTracking) {
    startJourneyButton.textContent = "⌖ Start journey";
    startJourneyButton.classList.remove("journey-live");
  }
  userPosition = null;
  locationLabel.textContent = "Location not shared";
  locationStatus.classList.remove("location-active");
  locateButton.hidden = false;
  locateButton.disabled = false;
  stopLocationButton.hidden = true;
  renderMap(activeRoute);
}

function startJourneyTracking() {
  if (!activeRoute) return;
  if (!navigator.geolocation) {
    locationLabel.textContent = "Location isn’t supported";
    return;
  }
  if (watchId !== null) {
    stopSharingLocation();
    startJourneyButton.textContent = "⌖ Start journey";
    startJourneyButton.classList.remove("journey-live");
    return;
  }
  locationLabel.textContent = "Locating you along the route…";
  watchId = navigator.geolocation.watchPosition(position => {
    userPosition = { lat: position.coords.latitude, lon: position.coords.longitude };
    const nearest = nearestStation(userPosition);
    const routeStation = activeRoute.visitedStationIds.includes(nearest.station.id);
    if (nearest.distance < 15000) {
      locationLabel.textContent = routeStation && nearest.distance < 1200
        ? `Near ${nearest.station.name} · on your route`
        : `Near ${nearest.station.name} · ${ (nearest.distance / 1000).toFixed(1) } km`;
    } else {
      locationLabel.textContent = `Outside beta · nearest ${nearest.station.name}`;
    }
    locationStatus.classList.add("location-active");
    stopLocationButton.hidden = false;
    locateButton.hidden = true;
    locateButton.disabled = false;
    if (!pickupInput.value.trim() && nearest.distance < 15000) pickupInput.value = nearest.station.name;
    renderMap(activeRoute);
  }, error => {
    locationLabel.textContent = error.code === error.PERMISSION_DENIED
      ? "Location permission denied"
      : "Could not update your location";
    if (watchId !== null && error.code === error.PERMISSION_DENIED) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
      startJourneyButton.textContent = "⌖ Start journey";
      startJourneyButton.classList.remove("journey-live");
    }
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 });
  startJourneyButton.textContent = "■ End journey";
  startJourneyButton.classList.add("journey-live");
}

populateStationSuggestions();
renderMap();
document.querySelector("#find-route-button").addEventListener("click", () => planRoute(pickupInput.value, dropoffInput.value));
document.querySelector("#swap-button").addEventListener("click", () => {
  const previousPickup = pickupInput.value;
  pickupInput.value = dropoffInput.value;
  dropoffInput.value = previousPickup;
  if (pickupInput.value && dropoffInput.value) planRoute(pickupInput.value, dropoffInput.value);
});
document.querySelectorAll(".quick-route").forEach(button => {
  button.addEventListener("click", () => {
    pickupInput.value = button.dataset.from;
    dropoffInput.value = button.dataset.to;
    planRoute(pickupInput.value, dropoffInput.value);
  });
});
for (const input of [pickupInput, dropoffInput]) {
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      planRoute(pickupInput.value, dropoffInput.value);
    }
  });
  input.addEventListener("input", () => {
    plannerError.hidden = true;
  });
}
locateButton.addEventListener("click", locateUser);
stopLocationButton.addEventListener("click", stopSharingLocation);
startJourneyButton.addEventListener("click", startJourneyTracking);
document.querySelector("#center-map-button").addEventListener("click", () => {
  mapPanel.scrollIntoView({ behavior: "smooth", block: "center" });
});
document.querySelector("#show-network-button").addEventListener("click", () => {
  activeRoute = null;
  routePanel.hidden = true;
  renderMap();
});
map.addEventListener("click", event => {
  const target = event.target.closest("[data-station]");
  if (!target) return;
  const station = stationById.get(target.dataset.station);
  if (station) mapTooltip.textContent = station.name;
  mapTooltip.hidden = false;
  const bounds = map.getBoundingClientRect();
  mapTooltip.style.left = `${Math.min(event.clientX - bounds.left, bounds.width - 150)}px`;
  mapTooltip.style.top = `${Math.max(8, event.clientY - bounds.top - 36)}px`;
  window.setTimeout(() => { mapTooltip.hidden = true; }, 2200);
});
map.addEventListener("keydown", event => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-station]")) {
    event.preventDefault();
    event.target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }
});
window.addEventListener("keydown", event => {
  if (event.key === "Escape") mapTooltip.hidden = true;
});

const mapPanel = document.querySelector("#map-panel");
document.querySelector("#current-date").textContent = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  month: "long",
  day: "numeric"
}).format(new Date()).toLocaleUpperCase();
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(error => {
      console.error("Could not register offline map shell:", error);
    });
  });
}
