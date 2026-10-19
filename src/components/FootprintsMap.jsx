import { useMemo, useState } from "react";
import { LocateFixed, Map as MapIcon, Minus, Plus, RotateCcw } from "lucide-react";

const BOUNDS = { west: 77.0, east: 77.54, south: 28.43, north: 28.73 };
const LABEL_STATIONS = new Set([
  "noida-sec-62", "noida-sec-52", "noida-sec-51", "botanical-garden", "new-ashok-nagar",
  "mayur-vihar-1", "anand-vihar", "karkarduma", "yamuna-bank", "lajpat-nagar",
  "rajiv-chowk", "shiv-vihar", "parichowk", "vaishali"
]);

function project(station) {
  return {
    x: 25 + ((station.lon - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * 850,
    y: 20 + ((BOUNDS.north - station.lat) / (BOUNDS.north - BOUNDS.south)) * 360
  };
}

function getLineForStation(stationId, lines) {
  return lines.find(line => (line.branches || [line.stations]).some(branch => branch.includes(stationId)));
}

export default function FootprintsMap({ stations, lines, route, userPosition, onStationSelect, onCenter }) {
  const [zoom, setZoom] = useState(1);
  const stationById = useMemo(() => new Map(stations.map(station => [station.id, station])), [stations]);
  const routeColorByStation = useMemo(() => {
    const result = new Map();
    for (const transition of route?.transitions || []) {
      const color = transition.kind === "ride"
        ? lines.find(line => line.id === transition.toLine)?.color
        : "#87968c";
      result.set(transition.from, color);
      result.set(transition.to, color);
    }
    return result;
  }, [lines, route]);
  const routeLines = useMemo(() => {
    const ids = [...new Set((route?.transitions || [])
      .filter(transition => transition.kind === "ride")
      .map(transition => transition.toLine))];
    return ids.map(id => lines.find(line => line.id === id)).filter(Boolean);
  }, [lines, route]);

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/80 shadow-lg shadow-slate-200/50 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/20">
      <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"><MapIcon size={18} /></span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Your map</p>
            <h2 className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-100">
              {route ? `${stationById.get(route.start)?.name} → ${stationById.get(route.end)?.name}` : "Delhi · Noida network"}
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onCenter}
          className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300"
          aria-label="Center map"
        >
          <LocateFixed size={17} />
        </button>
      </div>
      <div className="relative max-h-[520px] overflow-auto border-y border-slate-100 bg-[#f4f5fa] dark:border-white/5 dark:bg-[#111525]">
        <svg viewBox="0 0 900 405" style={{ width: `${zoom * 100}%`, minWidth: `${zoom * 650}px` }} className="block min-h-[260px] aspect-[900/405]" role="img" aria-label={`Schematic Delhi and Noida metro map, zoom ${Math.round(zoom * 100)} percent`}>
          <defs>
            <pattern id="map-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#dfe8dd" strokeWidth="0.7" className="dark:stroke-slate-700" />
            </pattern>
            <filter id="footprint-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <rect width="900" height="405" fill="url(#map-grid)" />
          <path d="M40 300 C200 252 265 344 420 294 S700 230 875 274" fill="none" stroke="#fff" strokeWidth="8" className="dark:stroke-slate-800" />
          <path d="M208 20 C252 90 217 169 302 231 S352 316 340 390" fill="none" stroke="#fff" strokeWidth="8" className="dark:stroke-slate-800" />
          <path d="M25 140 C160 180 280 91 421 138 S680 107 875 163" fill="none" stroke="#fff" strokeWidth="8" className="dark:stroke-slate-800" />
          <g className="fill-slate-300 text-[8px] font-bold tracking-[2px] dark:fill-slate-600">
            <text x="95" y="77">WEST DELHI</text><text x="370" y="220">CENTRAL DELHI</text>
            <text x="617" y="146">EAST DELHI</text><text x="775" y="279">NOIDA</text>
            <text x="795" y="369">GREATER NOIDA</text>
          </g>
          {lines.flatMap(line => (line.branches || [line.stations]).map((branch, branchIndex) => {
            const points = branch.map(id => stationById.get(id)).filter(Boolean).map(project);
            if (points.length < 2) return null;
            const pointsValue = points.map(point => `${point.x},${point.y}`).join(" ");
            return <g key={`${line.id}-${branchIndex}`}>
              <polyline points={pointsValue} fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" className="dark:stroke-slate-900" />
              <polyline points={pointsValue} fill="none" stroke={line.color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity=".78" />
            </g>;
          }))}
          {(route?.transitions || []).map((transition, index) => {
            const from = stationById.get(transition.from);
            const to = stationById.get(transition.to);
            if (!from || !to) return null;
            const a = project(from);
            const b = project(to);
            const line = lines.find(item => item.id === transition.toLine);
            const color = line?.color || "#87968c";
            return <g key={`footprint-${index}`}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="white" strokeWidth="12" strokeLinecap="round" className="dark:stroke-slate-900" />
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth="7" strokeLinecap="round" opacity=".36" filter="url(#footprint-glow)" />
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth="4.2" strokeLinecap="round" strokeDasharray="1 11" className="footprint-dots" />
              {transition.kind === "walk" && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#647568" strokeWidth="2" strokeDasharray="3 5" />}
            </g>;
          })}
          {stations.map(station => {
            const p = project(station);
            const line = getLineForStation(station.id, lines);
            const active = route?.visitedStationIds.includes(station.id);
            const color = routeColorByStation.get(station.id);
            return <g
              key={station.id}
              className="cursor-pointer"
              role="button"
              tabIndex="0"
              aria-label={`${station.name}${active ? ", on your route" : ""}`}
              onClick={() => onStationSelect(station.name)}
              onKeyDown={event => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onStationSelect(station.name);
                }
              }}
            >
              {active && <circle cx={p.x} cy={p.y} r="8" fill={color || line?.color || "#38815a"} opacity=".18" />}
              <circle cx={p.x} cy={p.y} r={active ? 4.6 : 2.7} fill={active ? color || line?.color : "#fff"} stroke={active ? "#fff" : line?.color || "#839287"} strokeWidth={active ? 1.8 : 1.3} />
              {(LABEL_STATIONS.has(station.id) || active) && (
                <text x={p.x + 7} y={p.y - 7} fill={active ? color || line?.color : "#68776d"} stroke="#f3f6f1" strokeWidth="3" paintOrder="stroke" className="text-[8px] font-semibold dark:stroke-[#111d19]">
                  {station.name.replace("Noida ", "")}
                </text>
              )}
            </g>;
          })}
          {userPosition && userPosition.lon >= BOUNDS.west && userPosition.lon <= BOUNDS.east && userPosition.lat >= BOUNDS.south && userPosition.lat <= BOUNDS.north && (() => {
            const p = project(userPosition);
            return <g>
              <circle cx={p.x} cy={p.y} r="13" fill="#7c3aed" opacity=".16" className="location-pulse" />
              <circle cx={p.x} cy={p.y} r="5.5" fill="#6d28d9" stroke="white" strokeWidth="2.5" />
              <text x={p.x + 11} y={p.y - 10} fill="#6d28d9" stroke="white" strokeWidth="3" paintOrder="stroke" className="text-[8px] font-extrabold tracking-widest">YOU</text>
            </g>;
          })()}
          <g transform="translate(866 38)" fill="#718075" className="text-[9px] font-bold">
            <text x="0" y="0" textAnchor="middle">N</text><path d="M0 7 -4 17 0 14 4 17Z" />
          </g>
        </svg>
        <div className="sticky bottom-3 left-3 z-10 ml-3 mt-3 flex w-fit items-center gap-1 rounded-xl border border-slate-200/80 bg-white/90 p-1 shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-900/90" role="group" aria-label="Map zoom controls">
          <button
            type="button"
            onClick={() => setZoom(value => Math.max(1, Number((value - 0.25).toFixed(2))))}
            disabled={zoom <= 1}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 transition hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Zoom out"
          >
            <Minus size={15} />
          </button>
          <span className="min-w-10 text-center text-[10px] font-bold text-slate-500 dark:text-slate-300" aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoom(value => Math.min(2.5, Number((value + 0.25).toFixed(2))))}
            disabled={zoom >= 2.5}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 transition hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Zoom in"
          >
            <Plus size={15} />
          </button>
          <span className="mx-0.5 h-5 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setZoom(1)}
            disabled={zoom === 1}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 transition hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Reset map zoom"
          >
            <RotateCcw size={14} />
          </button>
        </div>
        <div className="absolute bottom-3 right-3 rounded-lg bg-white/85 px-2.5 py-1.5 text-[8px] font-semibold tracking-wide text-slate-400 shadow-sm backdrop-blur dark:bg-slate-900/85 dark:text-slate-500">
          SCHEMATIC · STATION POSITIONS APPROXIMATE
        </div>
      </div>
      <div className="flex min-h-12 flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 sm:px-7">
        {lines.map(line => <span key={line.id} className="inline-flex items-center gap-2"><i className="h-[3px] w-4 rounded-full" style={{ background: line.color }} />{line.name}</span>)}
        {route && <span className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-200"><i className="footprint-legend-dot h-2 w-2 rounded-full" style={{ background: routeLines[0]?.color }} />Your route</span>}
      </div>
    </section>
  );
}
