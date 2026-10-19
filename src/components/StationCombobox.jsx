import { useId, useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";

export default function StationCombobox({ label, value, onChange, stations, placeholder, accent }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const matches = useMemo(() => {
    const query = value.trim().toLocaleLowerCase();
    if (!query) return stations.slice(0, 6);
    return stations.filter(station => station.name.toLocaleLowerCase().includes(query)).slice(0, 7);
  }, [stations, value]);

  function select(station) {
    onChange(station.name);
    setOpen(false);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") setOpen(false);
    if (event.key === "ArrowDown" && matches.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(index => (index + 1) % matches.length);
    }
    if (event.key === "ArrowUp" && matches.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(index => (index - 1 + matches.length) % matches.length);
    }
    if (event.key === "Enter" && open && matches[activeIndex]) {
      event.preventDefault();
      select(matches[activeIndex]);
    }
  }

  return (
    <div className="relative min-w-0 flex-1">
      <label htmlFor={id} className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: accent }}>
          {label === "From" ? <MapPin size={17} /> : <Search size={16} />}
        </span>
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          autoComplete="off"
          value={value}
          onChange={event => {
            onChange(event.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 130)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-[52px] w-full rounded-2xl border border-slate-200/90 bg-white/80 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100/70 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-emerald-950"
        />
      </div>
      {open && matches.length > 0 && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          {matches.map((station, index) => (
            <li key={station.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onMouseDown={event => event.preventDefault()}
                onClick={() => select(station)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                  index === activeIndex
                    ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <MapPin size={14} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">{station.name}</span>
                  <span className="mt-0.5 block text-[10px] text-slate-400">Delhi · Noida network</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && value.trim() && matches.length === 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          No station matches yet. Try a nearby metro station name.
        </div>
      )}
    </div>
  );
}
