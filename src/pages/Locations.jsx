import { useState } from "react";
import { supabase, unwrap } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useLoad } from "../lib/data";
import { slugify } from "./Onboarding";

export default function Locations() {
  const { org } = useAuth();
  const canEdit = org.role !== "operator";
  const { data: locs, reload } = useLoad(
    () => supabase.from("locations").select("*").eq("org_id", org.id).order("created_at").then(unwrap),
    [org.id],
  );
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState("");

  async function add(e) {
    e.preventDefault();
    setErr("");
    try {
      await supabase.from("locations").insert({ org_id: org.id, name: name.trim(), slug: slugify(name) || "room" }).then(unwrap);
      setName("");
      reload();
    } catch (e2) { setErr(e2.message.includes("duplicate") ? "You already have a location with that name." : e2.message); }
  }
  async function rename(l) {
    const n = prompt("Rename location", l.name);
    if (!n || n === l.name) return;
    await supabase.from("locations").update({ name: n.trim() }).eq("id", l.id).then(unwrap);
    reload();
  }
  async function remove(l) {
    if (!confirm(`Delete "${l.name}"? Its recurring events and service history will be deleted too.`)) return;
    await supabase.from("locations").delete().eq("id", l.id).then(unwrap);
    reload();
  }
  const url = (l) => `${window.location.origin}/${org.slug}/${l.slug}`;
  const copy = async (l) => { await navigator.clipboard.writeText(url(l)); setCopied(l.id); setTimeout(() => setCopied(""), 1500); };

  return (
    <div className="page">
      <h1>Locations</h1>
      <p className="muted">Each location runs its own live timer. Open its display link on any screen — projector, stage monitor, overflow TV, a phone. No login needed.</p>
      <div className="list">
        {(locs || []).map((l) => (
          <div className="list-row" key={l.id}>
            <b>{l.name}</b>
            <code className="small">{url(l)}</code>
            <span className="row gap">
              <button className="btn btn-sm ghost" onClick={() => copy(l)}>{copied === l.id ? "Copied" : "Copy link"}</button>
              <a className="btn btn-sm ghost" href={url(l)} target="_blank" rel="noreferrer">Open ↗</a>
              {canEdit && <button className="btn btn-sm ghost" onClick={() => rename(l)}>Rename</button>}
              {canEdit && <button className="btn btn-sm ghost danger" onClick={() => remove(l)}>Delete</button>}
            </span>
          </div>
        ))}
      </div>
      {canEdit && (
        <form className="card row gap" onSubmit={add}>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Overflow Room, Youth Hall, Kids Church" />
          <button className="btn">Add location</button>
          {err && <span className="error">{err}</span>}
        </form>
      )}
    </div>
  );
}
