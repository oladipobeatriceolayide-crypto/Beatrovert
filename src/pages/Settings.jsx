import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase, unwrap } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useLoad } from "../lib/data";

export default function Settings() {
  const { org, user, loadOrgs } = useAuth();
  const isAdmin = org.role !== "operator";
  const { data, reload } = useLoad(async () => {
    const members = await supabase.from("org_members").select("*").eq("org_id", org.id).order("created_at").then(unwrap);
    const code = isAdmin ? (await supabase.rpc("get_join_code", { p_org: org.id })).data : null;
    return { members, code };
  }, [org.id]);
  const [name, setName] = useState(org.name);
  const [tz, setTz] = useState(org.timezone);
  const [msg, setMsg] = useState("");

  async function saveOrg(e) {
    e.preventDefault();
    try {
      await supabase.from("organisations").update({ name, timezone: tz }).eq("id", org.id).then(unwrap);
      await loadOrgs();
      setMsg("Saved");
    } catch (e2) { setMsg(e2.message); }
  }
  async function setRole(m, role) {
    await supabase.from("org_members").update({ role }).eq("org_id", org.id).eq("user_id", m.user_id).then(unwrap);
    reload();
  }
  async function removeMember(m) {
    if (!confirm(`Remove ${m.display_name || "this member"}?`)) return;
    await supabase.from("org_members").delete().eq("org_id", org.id).eq("user_id", m.user_id).then(unwrap);
    reload();
  }

  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [org.timezone];

  return (
    <div className="page">
      <h1>Team & settings</h1>
      {data?.code && (
        <section className="card">
          <h2>Invite your team</h2>
          <p>Share this join code with your media team. They sign up, choose <b>Join with a code</b>, and can run any location.</p>
          <div className="join-code">{data.code}</div>
        </section>
      )}
      <section>
        <h2>Team</h2>
        <div className="list">
          {(data?.members || []).map((m) => (
            <div className="list-row" key={m.user_id}>
              <b>{m.display_name || "—"}{m.user_id === user.id ? " (you)" : ""}</b>
              <span className="muted">{m.role}</span>
              {isAdmin && m.role !== "owner" && m.user_id !== user.id && (
                <span className="row gap">
                  <button className="btn btn-sm ghost" onClick={() => setRole(m, m.role === "admin" ? "operator" : "admin")}>
                    Make {m.role === "admin" ? "operator" : "admin"}
                  </button>
                  <button className="btn btn-sm ghost danger" onClick={() => removeMember(m)}>Remove</button>
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
      {isAdmin && (
        <form className="card" onSubmit={saveOrg}>
          <h2>Organisation</h2>
          <label>Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label>Time zone (used for recurring events)
            <select value={tz} onChange={(e) => setTz(e.target.value)}>{zones.map((z) => <option key={z}>{z}</option>)}</select>
          </label>
          <p className="muted small">Web address: /{org.slug} (fixed, so display links never break)</p>
          <div className="row gap"><button className="btn">Save</button>{msg && <span className="muted">{msg}</span>}</div>
        </form>
      )}
      <p className="muted small"><Link to="/onboarding">Create or join another organisation</Link></p>
    </div>
  );
}
