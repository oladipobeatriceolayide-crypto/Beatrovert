import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

/** Small helper: load something for the current org and allow reloading. */
export function useLoad(fn, deps) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async () => {
    try { setData(await fn()); setErr(""); } catch (e) { setErr(e.message); }
  }, deps);
  useEffect(() => { load(); }, [load]);
  return { data, err, reload: load, setData };
}

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Weekday (0=Sun) and YYYY-MM-DD of a moment in a given time zone. */
function partsInTz(date, tz) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return { dow: DAYS.indexOf(p.weekday), ymd: `${p.year}-${p.month}-${p.day}` };
}

/** Upcoming occurrences of recurring events over the next 7 days. */
export function upcoming(events, tz) {
  const out = [];
  const now = new Date();
  for (let d = 0; d < 7; d++) {
    const day = new Date(now.getTime() + d * 86400000);
    const { dow, ymd } = partsInTz(day, tz);
    for (const ev of events) {
      if (!ev.active || !ev.days_of_week.includes(dow)) continue;
      out.push({ ev, dayOffset: d, ymd, label: d === 0 ? "Today" : d === 1 ? "Tomorrow" : DAYS[dow], time: ev.start_time.slice(0, 5) });
    }
  }
  return out.sort((a, b) => a.dayOffset - b.dayOffset || a.time.localeCompare(b.time));
}

export async function openSession({ locationId, templateId, eventId = null, name = null }) {
  const { data, error } = await supabase.rpc("open_session", {
    p_location: locationId, p_template: templateId, p_event: eventId, p_name: name,
  });
  if (error) throw new Error(error.message);
  return data;
}

export const totalOf = (segs) => (segs || []).reduce((a, s) => a + (s.duration_s || 0), 0);
