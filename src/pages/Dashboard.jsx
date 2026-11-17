import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase, unwrap } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useLoad, upcoming, openSession, totalOf } from "../lib/data";
import { fmt } from "../lib/clock";

export default function Dashboard() {
  const { org } = useAuth();
  const nav = useNavigate();
  const [err, setErr] = useState("");
  const [loc, setLoc] = useState("");
  const [tpl, setTpl] = useState("");

  const { data } = useLoad(async () => {
    const [locations, templates, events, open] = await Promise.all([
      supabase.from("locations").select("*").eq("org_id", org.id).order("created_at").then(unwrap),
      supabase.from("templates").select("*").eq("org_id", org.id).order("name").then(unwrap),
      supabase.from("events").select("*").eq("org_id", org.id).then(unwrap),
      supabase.from("sessions").select("*").eq("org_id", org.id).neq("status", "ended").then(unwrap),
    ]);
    return { locations, templates, events, open };
  }, [org.id]);

  if (!data) return <div className="muted">Loading…</div>;
  const { locations, templates, events, open } = data;
  const openBy = Object.fromEntries(open.map((s) => [s.location_id, s]));
  const locName = (id) => locations.find((l) => l.id === id)?.name || "—";
  const tplName = (id) => templates.find((t) => t.id === id)?.name || "—";
  const next = upcoming(events, org.timezone).slice(0, 6);

  async function start(args) {
    setErr("");
    try {
      const s = await openSession(args);
      nav(`/app/run/${s.id}`);
    } catch (e) { setErr(e.message); }
  }

  return (
    <div className="page">
      <h1>Today</h1>
      {err && <p className="error">{err}</p>}

      <section>
        <h2>Locations</h2>
        <div className="grid">
          {locations.map((l) => {
            const s = openBy[l.id];
            return (
              <div className="card loc-card" key={l.id}>
                <div className="row between">
                  <b>{l.name}</b>
                  <span className={`pill ${s ? s.status : "idle"}`}>{s ? (s.status === "live" ? "Live" : "Ready") : "Idle"}</span>
                </div>
                {s && <p className="muted small">{s.name}</p>}
                <div className="row gap">
                  {s && <Link className="btn btn-sm" to={`/app/run/${s.id}`}>Open controls</Link>}
                  <a className="btn btn-sm ghost" href={`/${org.slug}/${l.slug}`} target="_blank" rel="noreferrer">Display ↗</a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2>Coming up</h2>
        {next.length === 0 ? (
          <p className="muted">No recurring events yet. <Link to="/app/events">Set one up</Link> so Sunday is one click.</p>
        ) : (
          <div className="list">
            {next.map(({ ev, label, time, dayOffset, ymd }) => (
              <div className="list-row" key={ev.id + ymd}>
                <span className="when"><b>{label}</b> {time}</span>
                <span>{ev.name}</span>
                <span className="muted">{locName(ev.location_id)} · {tplName(ev.template_id)}</span>
                {dayOffset === 0 && (
                  openBy[ev.location_id]
                    ? <Link className="btn btn-sm" to={`/app/run/${openBy[ev.location_id].id}`}>Open</Link>
                    : <button className="btn btn-sm" onClick={() => start({ locationId: ev.location_id, templateId: ev.template_id, eventId: ev.id, name: ev.name })}>Start</button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2>Start a one-off service</h2>
        <div className="card row gap wrap">
          <select value={loc} onChange={(e) => setLoc(e.target.value)}>
            <option value="">Location…</option>
            {locations.map((l) => <option key={l.id} value={l.id} disabled={!!openBy[l.id]}>{l.name}{openBy[l.id] ? " (in use)" : ""}</option>)}
          </select>
          <select value={tpl} onChange={(e) => setTpl(e.target.value)}>
            <option value="">Template…</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({fmt(totalOf(t.segments))})</option>)}
          </select>
          <button className="btn" disabled={!loc || !tpl} onClick={() => start({ locationId: loc, templateId: tpl })}>Prepare</button>
        </div>
      </section>
    </div>
  );
}
