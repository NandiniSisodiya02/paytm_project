import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownUp,
  ArrowRight,
  ArrowUpRight,
  Compass,
  Footprints,
  LocateFixed,
  Moon,
  Navigation,
  ShieldCheck,
  Sparkles,
  Sun,
  TrainFront,
} from "lucide-react";
import metroData from "../metro-data.js";
import { createRouter } from "../routing.js";
import FootprintsMap from "./components/FootprintsMap.jsx";
import JourneyTimeline from "./components/JourneyTimeline.jsx";
import StationCombobox from "./components/StationCombobox.jsx";
import { findNearbyRouteStop, findNearestStation } from "./utils/location.js";

const router = createRouter(metroData);
const initialFrom = "Noida Sector 62";
const initialTo = "Lajpat Nagar";

export default function App() {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [route, setRoute] = useState(() => router.shortestRoute("noida-sec-62", "lajpat-nagar"));
  const [error, setError] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [userPosition, setUserPosition] = useState(null);
  const [locationMessage, setLocationMessage] = useState("Location is private");
  const [tracking, setTracking] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [progressIndex, setProgressIndex] = useState(-1);
  const progressIndexRef = useRef(-1);

  const groups = useMemo(() => route ? router.groupJourney(route) : [], [route]);
  const summary = useMemo(() => route ? router.summarize(route) : null, [route]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, [isDark]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register("/sw.js").catch(error => {
        console.error("Could not register Footprints offline support:", error);
      });
      return;
    }
    navigator.serviceWorker.getRegistration("/").then(registration => {
      if (registration) return registration.unregister();
      return undefined;
    }).catch(error => {
      console.error("Could not clear the previous Footprints offline worker:", error);
    });
  }, []);

  useEffect(() => {
    if (!tracking || !navigator.geolocation) return undefined;
    const watchId = navigator.geolocation.watchPosition(position => {
      const point = { lat: position.coords.latitude, lon: position.coords.longitude };
      setUserPosition(point);
      const nearbyStop = findNearbyRouteStop(
        { ...point, accuracy: position.coords.accuracy },
        route,
        router.stationById,
        Math.max(0, progressIndexRef.current)
      );
      if (nearbyStop) {
        progressIndexRef.current = nearbyStop.index;
        setProgressIndex(nearbyStop.index);
        setLocationMessage(`Reached ${nearbyStop.station.name} · stop ${nearbyStop.index + 1} of ${route.visitedStationIds.length}`);
      } else {
        setLocationMessage(position.coords.accuracy > 100 ? "GPS accuracy is low · stop progress paused" : "GPS active · approaching your next stop");
      }
    }, geoError => {
      setLocationMessage(geoError.code === geoError.PERMISSION_DENIED ? "Location permission denied" : "GPS signal unavailable");
      setTracking(false);
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [route, tracking]);

  function planTrip(origin = from, destination = to) {
    const start = router.findStation(origin);
    const end = router.findStation(destination);
    if (!start || !end) {
      setError("Choose a station from the suggestions so we can plan the right route.");
      return;
    }
    const nextRoute = router.shortestRoute(start.id, end.id);
    if (!nextRoute) {
      setError("We can’t find a connected route in the current Delhi–Noida beta. Try stations on the Blue, Pink, or Aqua lines.");
      return;
    }
    setFrom(start.name);
    setTo(end.name);
    setRoute(nextRoute);
    progressIndexRef.current = -1;
    setProgressIndex(-1);
    setError("");
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("GPS is not supported in this browser");
      return;
    }
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(position => {
      const point = { lat: position.coords.latitude, lon: position.coords.longitude };
      setUserPosition(point);
      const nearest = findNearestStation(point, metroData.stations);
      if (nearest && nearest.distance < 1000) {
        setLocationMessage(`Near ${nearest.station.name}`);
        setFrom(nearest.station.name);
        if (router.findStation(to)) planTrip(nearest.station.name, to);
      } else {
        setLocationMessage("GPS location ready · outside beta coverage");
      }
      setLocationBusy(false);
    }, geoError => {
      setLocationMessage(geoError.code === geoError.PERMISSION_DENIED ? "Location permission denied" : "GPS signal unavailable");
      setLocationBusy(false);
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  }

  function toggleTracking() {
    if (!tracking && !navigator.geolocation) {
      setLocationMessage("GPS is not supported in this browser");
      return;
    }
    setTracking(value => {
      const nextValue = !value;
      setLocationMessage(nextValue ? "Finding your location…" : "Location is private");
      return nextValue;
    });
  }

  function swapStations() {
    setFrom(to);
    setTo(from);
    if (router.findStation(to) && router.findStation(from)) planTrip(to, from);
  }

  function selectMapStation(stationName) {
    if (!from || (from && to)) {
      setFrom(stationName);
      setTo("");
      setError("");
      return;
    }
    setTo(stationName);
    planTrip(from, stationName);
  }

  const currentDate = new Intl.DateTimeFormat("en-IN", { weekday: "short", month: "short", day: "numeric" }).format(new Date());

  return (
    <div className="min-h-screen bg-[#f5f7f4] text-slate-800 transition-colors dark:bg-[#0b1511] dark:text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-36 -top-40 h-[440px] w-[440px] rounded-full bg-violet-200/25 blur-3xl dark:bg-violet-900/10" />
        <div className="absolute -right-44 top-40 h-[500px] w-[500px] rounded-full bg-cyan-100/40 blur-3xl dark:bg-cyan-900/10" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1500px]">
        <aside className="hidden w-[230px] shrink-0 flex-col border-r border-slate-200/70 bg-white/55 px-5 py-7 backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/35 lg:flex">
          <a href="#home" className="flex items-center gap-3 text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
            <span className="grid h-10 w-10 place-items-center rounded-[15px] bg-emerald-700 text-white shadow-lg shadow-emerald-900/15"><Footprints size={20} /></span>
            <span>Footprints<span className="text-emerald-600">.</span></span>
          </a>
          <p className="mb-3 mt-12 px-2 text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Your journey</p>
          <a href="#planner" className="flex items-center gap-3 rounded-xl bg-emerald-50 px-3 py-3 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"><Compass size={16} /> Plan a journey</a>
          <a href="#map" className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold text-slate-500 transition hover:bg-white dark:text-slate-400 dark:hover:bg-slate-800"><TrainFront size={16} /> Metro map</a>

          <div className="mt-auto rounded-[22px] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 dark:border-emerald-900/50 dark:from-emerald-950/50 dark:to-slate-900">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm dark:bg-slate-800 dark:text-emerald-300"><Sparkles size={17} /></span>
            <h2 className="mt-4 text-xs font-bold text-slate-800 dark:text-slate-100">New to the metro?</h2>
            <p className="mt-1.5 text-[10px] leading-5 text-slate-500 dark:text-slate-400">We’ll break your journey into simple steps, so every interchange feels easy.</p>
          </div>
          <div className="mt-5 flex items-center gap-2 px-1 text-[9px] font-semibold text-slate-500 dark:text-slate-400"><span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950" /> Delhi · Noida network <span className="ml-auto rounded bg-slate-100 px-1.5 py-1 text-[7px] font-extrabold tracking-wider text-slate-500 dark:bg-slate-800">BETA</span></div>
        </aside>

        <main id="home" className="mx-auto w-full min-w-0 max-w-[1160px] px-4 pb-8 sm:px-7 lg:px-10">
          <header className="flex min-h-[72px] items-center justify-between border-b border-slate-200/75 dark:border-white/10">
            <a href="#home" className="flex items-center gap-2.5 text-sm font-extrabold tracking-tight text-slate-900 dark:text-white lg:hidden">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-700 text-white"><Footprints size={16} /></span>Footprints<span className="text-emerald-600">.</span>
            </a>
            <div className="hidden text-[11px] text-slate-400 lg:block">Workspace <span className="mx-2 text-slate-300">/</span><strong className="font-bold text-slate-600 dark:text-slate-300">Journey planner</strong></div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <span className={`h-2 w-2 rounded-full ${tracking ? "animate-pulse bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950" : "bg-slate-300 dark:bg-slate-600"}`} />
                <span className="hidden sm:inline">{tracking ? "Live GPS active" : locationMessage}</span>
                <span className="sm:hidden">{tracking ? "GPS live" : "GPS off"}</span>
              </div>
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locationBusy}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 text-[10px] font-bold text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-60 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300"
              >
                <LocateFixed size={14} /> <span className="hidden sm:inline">{locationBusy ? "Finding you…" : "Use my location"}</span><span className="sm:hidden">Locate</span>
              </button>
              <button type="button" onClick={() => setIsDark(value => !value)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-500 transition hover:text-emerald-700 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300" aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}>
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-200 text-[10px] font-extrabold text-emerald-800 dark:from-emerald-900 dark:to-teal-950 dark:text-emerald-100">G</span>
            </div>
          </header>

          <section className="relative mt-7 overflow-hidden rounded-[30px] bg-[#17152f] px-6 py-7 text-white shadow-xl shadow-violet-950/10 sm:px-9 sm:py-9">
            <div className="pointer-events-none absolute -right-20 -top-48 h-[430px] w-[430px] rounded-full border border-white/[0.08]" />
            <div className="pointer-events-none absolute -right-5 -top-28 h-[310px] w-[310px] rounded-full border border-white/[0.08]" />
            <div className="relative z-10 flex items-center justify-between gap-5">
              <div className="max-w-[650px]">
                <p className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.2em] text-emerald-200/75">{currentDate}<span className="h-1 w-1 rounded-full bg-emerald-300" /> YOUR CITY, YOUR WAY</p>
                <h1 className="mt-4 text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-[1.04] tracking-[-0.055em]">Every journey leaves a <span className="text-[#7be7ea]">Footprint.</span></h1>
                <p className="mt-4 max-w-[550px] text-xs leading-6 text-emerald-50/75 sm:text-sm">Get the full picture—from your first platform to the right interchange. Metro directions, made human.</p>
                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[9px] font-semibold text-white/80 backdrop-blur"><ShieldCheck size={12} /> Curated for Delhi · Noida</span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[9px] font-semibold text-white/80 backdrop-blur"><Navigation size={12} /> Location stays on your device</span>
                </div>
              </div>
              <div className="relative hidden h-36 w-36 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] md:flex">
                <div className="absolute h-28 w-28 rounded-full border border-dashed border-white/20" />
                <div className="absolute h-20 w-20 rounded-full border border-white/10" />
                <span className="grid h-14 w-14 place-items-center rounded-[20px] bg-[#7be7ea] text-slate-950 shadow-lg shadow-black/20"><Footprints size={25} /></span>
                <span className="absolute right-5 top-5 h-2.5 w-2.5 rounded-full bg-metro-pink shadow-[0_0_18px_#dc5689]" />
                <span className="absolute bottom-5 left-5 h-2.5 w-2.5 rounded-full bg-metro-aqua shadow-[0_0_18px_#12a79d]" />
              </div>
            </div>
          </section>

          <section id="planner" className="relative z-20 -mt-1 rounded-[28px] border border-white/80 bg-white/85 p-4 shadow-lg shadow-slate-300/35 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/85 dark:shadow-black/15 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.19em] text-emerald-700 dark:text-emerald-300">Let’s get you there</p>
                <h2 className="mt-1 text-base font-extrabold tracking-tight text-slate-900 dark:text-white">Plan your journey</h2>
              </div>
              <span className="hidden items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800 sm:inline-flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Estimates</span>
            </div>
            <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-end">
              <StationCombobox label="From" value={from} onChange={setFrom} stations={metroData.stations} placeholder="Choose your starting station" accent="#4e9a69" />
              <button type="button" onClick={swapStations} className="mx-auto grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 lg:mb-1" aria-label="Swap origin and destination">
                <ArrowDownUp size={16} />
              </button>
              <StationCombobox label="To" value={to} onChange={setTo} stations={metroData.stations} placeholder="Where are you headed?" accent="#dc5689" />
              <button type="button" onClick={() => planTrip()} className="inline-flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 text-xs font-extrabold text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-emerald-800 lg:mb-0.5">
                Find my route <ArrowRight size={15} />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-[9px] text-slate-400">
              <Sparkles size={12} className="text-emerald-600" /> Try a popular route:
              <button type="button" onClick={() => planTrip("Noida Sector 62", "Lajpat Nagar")} className="rounded-full border border-emerald-100 bg-emerald-50/70 px-2.5 py-1 font-semibold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">Noida Sector 62 <ArrowRight className="mx-1 inline" size={10} /> Lajpat Nagar</button>
              <button type="button" onClick={() => planTrip("Noida Sector 62", "Pari Chowk")} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-600 transition hover:border-teal-200 hover:text-teal-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300">Noida Sector 62 <ArrowRight className="mx-1 inline" size={10} /> Pari Chowk</button>
            </div>
            {error && <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">{error}</p>}
          </section>

          <div className="my-5 grid grid-cols-3 gap-2.5 sm:gap-3">
            <JourneyStat icon={TrainFront} label="Stations" value={summary?.rides ?? "—"} color="emerald" />
            <JourneyStat icon={ArrowUpRight} label="Interchanges" value={summary?.interchangesCount ?? "—"} color="amber" />
            <JourneyStat icon={Footprints} label="Journey time" value={summary ? `~${summary.minutes}m` : "—"} color="blue" />
          </div>

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.85fr)]">
            <div id="map">
              <FootprintsMap
                stations={metroData.stations}
                lines={metroData.lines}
                route={route}
                userPosition={userPosition}
                onStationSelect={selectMapStation}
                onCenter={() => document.querySelector("#planner")?.scrollIntoView({ behavior: "smooth", block: "center" })}
              />
            </div>
            <JourneyTimeline
              route={route}
              groups={groups}
              stationsById={router.stationById}
              linesById={router.lineById}
              summary={summary}
              tracking={tracking}
              progressIndex={progressIndex}
              onToggleTracking={toggleTracking}
            />
          </div>

          <footer className="mt-6 flex flex-col gap-2 border-t border-slate-200/80 pt-4 text-[9px] text-slate-400 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <span><strong className="text-slate-500 dark:text-slate-300">Footprints</strong> · Every journey leaves a Footprint.</span>
            <span>Unofficial journey guide · Times and platform details are estimates</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function JourneyStat({ icon: Icon, label, value, color }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    blue: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  };
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-white/70 bg-white/75 p-3 shadow-sm shadow-slate-200/30 backdrop-blur dark:border-white/5 dark:bg-slate-900/70 sm:gap-3.5 sm:px-4">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl sm:h-10 sm:w-10 ${tones[color]}`}><Icon size={17} /></span>
      <span className="min-w-0">
        <span className="block truncate text-[8px] font-extrabold uppercase tracking-wider text-slate-400">{label}</span>
        <span className="mt-0.5 block text-sm font-extrabold text-slate-800 dark:text-slate-100 sm:text-base">{value}</span>
      </span>
    </div>
  );
}
