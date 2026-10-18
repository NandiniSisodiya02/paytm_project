# Footprints

**Every journey leaves a Footprint.** Footprints is a mobile-friendly metro journey planner concept for people navigating the Noida–Delhi network. Pick stations, get a line-by-line route with explicit interchange instructions, and optionally share your location to see where you are in relation to the route.

## Run it

Requires Node.js 18 or newer. From the project directory:

```sh
node server.js
```

Open <http://localhost:3000>. Location access works on localhost or an HTTPS deployment. Choose **Noida Sector 62 → Lajpat Nagar** for a quick Blue-to-Pink interchange demo; try **Noida Sector 62 → Pari Chowk** to see the Noida Sector 52–51 walk between the Blue and Aqua lines.

Run tests with:

```sh
node --test
```

## What’s in the prototype

- Searchable pickup and destination station fields, plus a swap control.
- A custom schematic Noida–Delhi map that draws animated, line-coloured footprint dots along the selected Blue, Pink, and Aqua route.
- Route steps that call out the line, direction, stops, and where to change lines.
- An optional GPS marker. **Use my location** finds the nearest station in the prototype dataset; **Start journey** keeps the location marker current while the trip is in progress. Location stays in the browser and is not sent to a server. Stop sharing at any time.
- A service worker caches the app shell and curated station dataset for repeat/offline access. Routing does not rely on an external map or tiles.

## Coverage and accuracy

This is an early, curated network demo—not a complete or live metro navigation service. Station coverage focuses on Blue, Pink, and Aqua line corridors around Noida and eastern/central Delhi. Station coordinates, route geometry, interchange walking time, and trip duration are approximate. The map is schematic and is **not** a street map or turn-by-turn walking guide. Check official DMRC/NMRC sources for current station, service, interchange, accessibility, and platform information before travelling.

The route engine minimizes ride stops with an interchange penalty; the displayed duration is a rough estimate, not live timetable data. The app is not affiliated with DMRC or NMRC.

## Next steps for a real product

Use an authoritative, regularly updated metro station/line dataset; add full-network route validation, live service alerts, station accessibility and exit details, and more accurate walking links. GPS journey progress should remain opt-in and be tested for battery, privacy, accessibility, and location accuracy. Publish only after validating route and interchange instructions with official sources and travellers unfamiliar with the network.
