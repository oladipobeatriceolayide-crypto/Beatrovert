import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase, unwrap } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useLoad, DAYS } from "../lib/data";

const blank = { name: "", location_id: "", template_id: "", days_of_week: [0], start_time: "10:00" };

export default function Events() {
  const { org } = useAuth();
  const { data, reload } = useLoad(async () => {
    const [events, locations, templates] = await Promise.all([
      supabase.from("events").select("*").eq("org_id", org.id).order("created_at").then(unwrap),
      supabase.from("locations").select("*").eq("org_id", org.id).order("created_at").then(unwrap),
      supabase.from("templates").select("id,name").eq("org_id", org.id).order("name").then(unwrap),
    ]);
    return { events, locations, templates };
  }, [org.id]);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState("");

  if (!data) return <div className="muted">Loading…</div>;
  const { events, locations, templates } = data;
  const name = (arr, id) => arr.find((x) => x.id === id)?.name || "—";

  const toggleDay = (d) => setForm((f) => ({
    ...f, days_of_week: f.days_of_week.includes(d) ? f.days_of_week.filter((x) => x !== d) : [...f.days_of_week, d].sort(),
  }));

  async function save(e) {
    e.preventDefault();
    setErr("");
    if (!form.days_of_week.length) { setErr("Pick at least one day."); return; }
    const row = { name: form.name, location_id: form.location_id, template_id: form.template_id, days_of_week: form.days_of_week, start_time: form.start_time };
    try {
      if (form.id) await supabase.from("events").update(row).eq("id", form.id).then(unwrap);
      else await supabase.from("events").insert({ ...row, org_id: org.id }).then(unwrap);
      setForm(null);
      reload();
    } catch (e2) { setErr(e2.message); }
  }

  async function toggleActive(ev) {
    await supabase.from("events").update({ active: !ev.active }).eq("id", ev.id).then(unwrap);
    reload();
  }
  async function remove(ev) {
    if (!confirm(`Delete "${ev.name}"?`)) return;
    await supabase.from("events").delete().eq("id", ev.id).then(unwrap);
    reload();
  }

  return (
    <div className="page">
      <div className="row between">
        <h1>Recurring events</h1>
        {!form && <button className="btn" onClick={() => setForm({ ...blank, location_id: locations[0]?.id || "", template_id: templates[0]?.id || "" })}>+ New event</button>}
      </div>
      <p className="muted">Save services that repeat. On the day, they appear under <Link to="/app">Today</Link> ready to start in one click.</p>

      {form && (
        <form className="card" onSubmit={save}>
          <label>Event name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sunday Service" /></label>
          <div className="row gap wrap">
            <label>Location<select required value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })}>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
            <label>Template<select required value={form.template_id} onChange={(e) => setForm({ ...form, template_id: e.target.value })}>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
            <label>Start time<input type="time" required value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></label>
          </div>
          <div className="days">
            {DAYS.map((d, i) => (
              <button type="button" key={d} className={form.days_of_week.includes(i) ? "day on" : "day"} onClick={() => toggleDay(i)}>{d}</button>
            ))}
          </div>
          {err && <p className="error">{err}</p>}
          <div className="row gap">
            <button className="btn">Save</button>
            <button type="button" className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="list">
        {events.map((ev) => (
          <div className={`list-row ${ev.active ? "" : "faded"}`} key={ev.id}>
            <b>{ev.name}</b>
            <span>{ev.days_of_week.map((d) => DAYS[d]).join(", ")} · {ev.start_time.slice(0, 5)}</span>
            <span className="muted">{name(locations, ev.location_id)} · {name(templates, ev.template_id)}</span>
            <span className="row gap">
              <button className="btn btn-sm ghost" onClick={() => setForm({ ...ev, start_time: ev.start_time.slice(0, 5) })}>Edit</button>
              <button className="btn btn-sm ghost" onClick={() => toggleActive(ev)}>{ev.active ? "Pause" : "Resume"}</button>
              <button className="btn btn-sm ghost danger" onClick={() => remove(ev)}>Delete</button>
            </span>
          </div>
        ))}
        {!events.length && !form && <p className="muted">None yet.</p>}
      </div>
    </div>
  );
}
