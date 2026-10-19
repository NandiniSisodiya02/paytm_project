import { ArrowDown, ArrowRight, BadgeCheck, Check, CircleCheck, Footprints, Info, MapPin, TrainFront } from "lucide-react";

function RouteStep({ icon: Icon, iconClass, kicker, title, children, lineColor, number, completed }) {
  const DisplayIcon = completed ? CircleCheck : Icon;
  return (
    <article className="relative flex gap-4 pb-5 last:pb-0">
      <div className="relative flex w-10 shrink-0 justify-center">
        <span className={`relative z-10 grid h-10 w-10 place-items-center rounded-2xl ${iconClass}`} style={lineColor ? { color: lineColor, backgroundColor: `${lineColor}18` } : undefined}>
          <DisplayIcon size={17} />
        </span>
        {number && <span className="absolute -right-1 -top-1 z-20 grid h-4 w-4 place-items-center rounded-full bg-white text-[8px] font-extrabold text-slate-500 shadow dark:bg-slate-800">{number}</span>}
        <span className="journey-stem absolute bottom-0 top-10 w-px bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="min-w-0 flex-1 rounded-2xl border border-slate-100 bg-white/60 p-4 dark:border-white/5 dark:bg-slate-800/45">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.17em] text-slate-400">{kicker}</p>
        <h3 className="mt-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h3>
        <div className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{children}</div>
      </div>
    </article>
  );
}

export default function JourneyTimeline({ route, groups, stationsById, linesById, summary, tracking, progressIndex, onToggleTracking }) {
  if (!route) {
    return (
      <div className="grid min-h-72 place-items-center rounded-[28px] border border-dashed border-slate-200 text-center dark:border-slate-700">
        <div className="max-w-xs px-6">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Footprints size={21} /></span>
          <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-100">Your journey starts here</h3>
          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">Choose your starting station and destination to get a step-by-step route.</p>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/20 sm:p-7">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-5 dark:border-white/10">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Every step, made simple</p>
          <h2 className="mt-2 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Your journey guide</h2>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{stationsById.get(route.start)?.name} <ArrowRight className="mx-1 inline" size={12} /> {stationsById.get(route.end)?.name}</p>
        </div>
        <div className="shrink-0 rounded-2xl bg-emerald-50 px-3 py-2 text-right dark:bg-emerald-950/70">
          <span className="block text-sm font-extrabold text-emerald-800 dark:text-emerald-200">~{summary.minutes} min</span>
          <span className="mt-0.5 block text-[9px] font-semibold text-emerald-700/70 dark:text-emerald-300/70">{summary.interchangesCount} transfer{summary.interchangesCount === 1 ? "" : "s"}</span>
        </div>
      </div>

      <div className="mt-5">
        <RouteStep icon={MapPin} iconClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" kicker="Start here" title={stationsById.get(route.start)?.name} completed={progressIndex >= 0}>
          Enter the station and follow the signs to the metro platform. Confirm the platform on the station display.
        </RouteStep>

        {groups.map((group, index) => {
          if (group.kind === "transfer") {
            const previousLine = linesById.get(group.fromLine);
            const nextLine = linesById.get(group.toLine);
            return (
              <RouteStep key={`transfer-${index}`} icon={ArrowRight} iconClass="bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" kicker="Change lines here" title={stationsById.get(group.stationId)?.name} number={index + 1} completed={route.visitedStationIds.indexOf(group.stationId) <= progressIndex}>
                <span>Follow signs from <strong style={{ color: previousLine?.color }}>{previousLine?.name}</strong> to <strong style={{ color: nextLine?.color }}>{nextLine?.name}</strong>. Check the station display for the correct platform and direction.</span>
              </RouteStep>
            );
          }
          if (group.kind === "walk") {
            return (
              <RouteStep key={`walk-${index}`} icon={Footprints} iconClass="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" kicker="Walk between stations" title={`Continue to ${stationsById.get(group.to)?.name}`}>
                {group.link?.instruction} <span className="font-semibold text-slate-600 dark:text-slate-300">About {group.link?.minutes} min on foot.</span>
              </RouteStep>
            );
          }
          const line = linesById.get(group.lineId);
          const toward = stationsById.get(group.stops[group.stops.length - 1])?.name;
          const firstStopIndex = route.visitedStationIds.indexOf(group.stops[0]);
          return (
            <RouteStep key={`line-${index}`} icon={TrainFront} iconClass="bg-slate-100 dark:bg-slate-800" lineColor={line?.color} kicker={`Ride ${line?.name} · towards ${toward}`} title={`Board at ${stationsById.get(group.stops[0])?.name}`} completed={firstStopIndex <= progressIndex}>
              <span className="block">Stay on for <strong className="text-slate-700 dark:text-slate-200">{group.stops.length - 1} stop{group.stops.length === 2 ? "" : "s"}</strong>. Follow the <strong style={{ color: line?.color }}>{line?.name}</strong> signs and confirm the platform display.</span>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                Platform number not verified · check station display
              </span>
              <ol className="relative ml-2 mt-4 border-l-2 border-dashed border-slate-200 pl-4 dark:border-slate-700">
                {group.stops.slice(1).map((stationId, stopOffset) => {
                  const stationIndex = route.visitedStationIds.indexOf(stationId);
                  const completed = stationIndex <= progressIndex;
                  const current = stationIndex === progressIndex;
                  return (
                    <li key={stationId} aria-current={current ? "step" : undefined} className="relative pb-3 last:pb-0">
                      <span className={`absolute -left-[22px] top-0.5 grid h-4 w-4 place-items-center rounded-full ring-2 ring-white dark:ring-slate-900 ${completed ? "bg-cyan-500 text-white" : "bg-slate-200 text-slate-500 dark:bg-slate-700"}`}>
                        {completed && <Check size={11} strokeWidth={3} />}
                      </span>
                      <span className="flex items-center justify-between gap-2 text-[11px]">
                        <span className={completed ? "font-semibold text-slate-700 dark:text-slate-200" : "text-slate-500 dark:text-slate-400"}>{stationsById.get(stationId)?.name}</span>
                        <span className="shrink-0 text-[9px] font-semibold text-slate-400">{current ? "You are here" : completed ? "Passed" : `Stop ${stopOffset + 1}`}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </RouteStep>
          );
        })}

        <RouteStep icon={BadgeCheck} iconClass="bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300" kicker="You’re here" title={stationsById.get(route.end)?.name} completed={progressIndex >= route.visitedStationIds.length - 1}>
          Follow exit signs, then check the station’s exit board for your final stop.
        </RouteStep>
      </div>

      <button
        type="button"
        onClick={onToggleTracking}
        className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-bold transition ${
          tracking
            ? "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-200"
            : "bg-emerald-700 text-white shadow-lg shadow-emerald-900/15 hover:bg-emerald-800"
        }`}
      >
        {tracking ? <ArrowDown size={15} /> : <Footprints size={15} />}
        {tracking ? "End live journey" : "Start journey tracking"}
      </button>
      <p className="mt-3 flex items-start gap-2 text-[10px] leading-4 text-slate-400">
        <Info className="mt-0.5 shrink-0" size={13} />
        {tracking ? "Stop checks advance only when an accurate GPS fix places you near a route station. GPS may be unreliable underground." : "Start live tracking to update stop checks from your location. Platform and gate details are not verified; follow station signage."}
      </p>
    </section>
  );
}
