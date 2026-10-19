# Footprints

**Every journey leaves a Footprint.** Footprints is a mobile-first Delhi–Noida metro navigation prototype that makes route changes easier to understand with a line-coloured map, a searchable station planner, and simple step-by-step directions.

## Run locally

Requires Node.js 20 or newer.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production bundle:

```sh
npm run build
npm run preview
```

Run the route-data tests with `npm test`.

## Frontend structure

- `src/App.jsx`: dashboard layout, route form, theme switch, GPS consent and journey state.
- `src/components/StationCombobox.jsx`: accessible station autocomplete.
- `src/components/FootprintsMap.jsx`: responsive schematic map and metro-coloured route footprint.
- `src/components/JourneyTimeline.jsx`: vertical stop-by-stop boarding, interchange and exit instructions.
- `src/utils/location.js`: distance calculations and GPS-to-route-stop matching.
- `src/styles.css`: Tailwind v4 layers, responsive motion, class-based dark mode and shared theme tokens.
- `metro-data.js` and `routing.js`: curated station graph and route selection.
- `public/`: app icon, web manifest and offline service worker.

## Deploy

The app is a static Vite site with no server-side runtime. Push the repository to GitHub and import it into Vercel or Netlify; the included `vercel.json` and `netlify.toml` configure the production build (`npm run build`) and `dist` output directory. For any other static host, use the same build command and publish `dist/`.

The GPS indicator switches to **Live GPS active** only after the traveller chooses journey tracking and grants browser permission. Location is used locally and is not sent to a server.

## Coverage and accuracy

This is a curated UI prototype, not a live transit service. Route coverage focuses on Blue, Pink and Aqua line corridors around Noida and eastern/central Delhi. Coordinates, map geometry and journey-time estimates are approximate. Platform numbers, gate assignments, live arrivals and service alerts are not included; the interface asks users to verify these on station signage rather than showing unverified details. GPS stop progress only advances near stations when the browser reports an accurate fix; GPS may be unavailable or inaccurate underground. Check official DMRC/NMRC sources before travelling. Footprints is not affiliated with DMRC or NMRC.
