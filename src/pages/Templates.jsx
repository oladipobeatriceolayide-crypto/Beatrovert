import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase, unwrap } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useLoad, totalOf } from "../lib/data";
import { fmt } from "../lib/clock";
import SegmentEditor from "../components/SegmentEditor";

export default function Templates() {
  const { org } = useAuth();
  const { id } = useParams();
  const nav = useNavigate();
  const { data: list, reload } = useLoad(
    () => supabase.from("templates").select("*").eq("org_id", org.id).order("name").then(unwrap),
    [org.id],
  );
  const [draft, setDraft] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!list) return;
    if (id === "new") setDraft({ name: "", segments: [{ name: "", duration_s: 300 }] });
    else if (id) setDraft(list.find((t) => t.id === id) || null);
    else setDraft(null);
    setMsg("");
  }, [id, list]);

  async function save() {
    const segments = draft.segments.filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), duration_s: s.duration_s }));
    if (!draft.name.trim() || !segments.length) { setMsg("Give it a name and at least one named segment."); return; }
    try {
      if (draft.id) {
        await supabase.from("templates").update({ name: draft.name.trim(), segments, updated_at: new Date().toISOString() }).eq("id", draft.id).then(unwrap);
        setMsg("Saved");
        reload();
      } else {
        const row = await supabase.from("templates").insert({ org_id: org.id, name: draft.name.trim(), segments }).select().single().then(unwrap);
        await reload();
        nav(`/app/templates/${row.id}`);
      }
    } catch (e) { setMsg(e.message); }
  }

  async function duplicate() {
    const row = await supabase.from("templates").insert({ org_id: org.id, name: draft.name + " (copy)", segments: draft.segments }).select().single().then(unwrap);
    await reload();
    nav(`/app/templates/${row.id}`);
  }

  async function remove() {
    if (!confirm(`Delete "${draft.name}"? Recurring events using it will also be removed. Past logs are kept.`)) return;
    await supabase.from("templates").delete().eq("id", draft.id).then(unwrap);
    await reload();
    nav("/app/templates");
  }

  return (
    <div className="page">
      <div className="row between">
        <h1>Templates</h1>
        <Link className="btn" to="/app/templates/new">+ New template</Link>
      </div>
      <p className="muted">Reusable orders of service. Changing a template doesn't affect services already run.</p>
      <div className="split">
        <div className="list">
          {(list || []).map((t) => (
            <Link key={t.id} to={`/app/templates/${t.id}`} className={`list-row link-row ${t.id === id ? "active" : ""}`}>
              <b>{t.name}</b>
              <span className="muted">{t.segments.length} segments · {fmt(totalOf(t.segments))}</span>
            </Link>
          ))}
          {list && !list.length && <p className="muted">No templates yet.</p>}
        </div>
        {draft && (
          <div className="card">
            <label>Template name<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Sunday Service" /></label>
            <SegmentEditor segments={draft.segments} onChange={(segments) => setDraft({ ...draft, segments })} />
            <div className="row gap">
              <button className="btn" onClick={save}>Save</button>
              {draft.id && <button className="btn ghost" onClick={duplicate}>Duplicate</button>}
              {draft.id && <button className="btn ghost danger" onClick={remove}>Delete</button>}
              {msg && <span className="muted">{msg}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
