import { useState } from "react";
import { supabase, unwrap } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useLoad } from "../lib/data";
import { fmt, fmtDelta } from "../lib/clock";

export default function Log() {
  const { org } = useAuth();
  const [open, setOpen] = useState(null);
  const { data } = useLoad(async () => {
    const [sessions, locations, logs] = await Promise.all([
      supabase.from("sessions").select("id,name,location_id,started_at,ended_at,segments").eq("org_id", org.id)
        .eq("status", "ended").not("started_at", "is", null).order("started_at", { ascending: false }).limit(50).then(unwrap),
      supabase.from("locations").select("id,name").eq("org_id", org.id).then(unwrap),
      supabase.from("session_log").select("*").eq("org_id", org.id).order("ended_at", { ascending: false }).limit(2000).then(unwrap),
    ]);
    return { sessions, locations, logs };
  }, [org.id]);

  if (!data) return <div className="muted">Loading…</div>;
  const { sessions, locations, logs } = data;
  const locName = (id) => locations.find((l) => l.id === id)?.name || "—";
  const bySession = {};
  for (const r of logs) (bySession[r.session_id] ||= []).push(r);

  // Segment patterns across all sessions
  const stats = {};
  for (const r of logs) {
    const s = (stats[r.seg_name] ||= { name: r.seg_name, n: 0, delta: 0, over: 0 });
    s.n++; s.delta += r.actual_s - r.planned_s; if (r.actual_s > r.planned_s + 30) s.over++;
  }
  const patterns = Object.values(stats).filter((s) => s.n >= 1)
    .map((s) => ({ ...s, avg: s.delta / s.n })).sort((a, b) => b.avg - a.avg);

  const dateFmt = new Intl.DateTimeFormat(undefined, { timeZone: org.timezone, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  return (
    <div className="page">
      <h1>Service log</h1>
      <p className="muted">Every segment records planned against actual time, so you can see where the service runs long.</p>

      <section>
        <h2>Patterns</h2>
        {!patterns.length ? <p className="muted">Run a service and the patterns will appear here.</p> : (
          <table className="table">
            <thead><tr><th>Segment</th><th>Times run</th><th>Average vs plan</th><th>Ran over (&gt;30s)</th></tr></thead>
            <tbody>
              {patterns.map((p) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td>{p.n}</td>
                  <td className={p.avg > 30 ? "over-text" : p.avg < -30 ? "under-text" : ""}>{fmtDelta(Math.round(p.avg))}</td>
                  <td>{Math.round((p.over / p.n) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Past services</h2>
        <div className="list">
          {sessions.map((s) => {
            const rows = (bySession[s.id] || []).slice().sort((a, b) => a.seg_index - b.seg_index || Date.parse(a.started_at) - Date.parse(b.started_at));
            const planned = rows.reduce((a, r) => a + r.planned_s, 0);
            const actual = rows.reduce((a, r) => a + r.actual_s, 0);
            const wall = s.ended_at ? Math.round((Date.parse(s.ended_at) - Date.parse(s.started_at)) / 1000) : 0;
            return (
              <div key={s.id} className="card log-card">
                <button className="row between log-head" onClick={() => setOpen(open === s.id ? null : s.id)}>
                  <span><b>{s.name}</b> <span className="muted">· {locName(s.location_id)} · {dateFmt.format(new Date(s.started_at))}</span></span>
                  <span>
                    <span className="muted">Ran {fmt(wall)} </span>
                    <span className={actual - planned > 60 ? "over-text" : ""}>({fmtDelta(actual - planned)})</span>
                  </span>
                </button>
                {open === s.id && (
                  <table className="table">
                    <thead><tr><th>Segment</th><th>Planned</th><th>Actual</th><th>Difference</th></tr></thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id}>
                          <td>{r.seg_name}</td><td>{fmt(r.planned_s)}</td><td>{fmt(r.actual_s)}</td>
                          <td className={r.actual_s - r.planned_s > 30 ? "over-text" : r.actual_s - r.planned_s < -30 ? "under-text" : ""}>{fmtDelta(r.actual_s - r.planned_s)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
          {!sessions.length && <p className="muted">No services yet.</p>}
        </div>
      </section>
    </div>
  );
}
