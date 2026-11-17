import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase, ORG_COLS } from "../lib/supabase";

export default function OrgPublic() {
  const { orgSlug } = useParams();
  const [org, setOrg] = useState(undefined);
  const [locs, setLocs] = useState([]);
  const [live, setLive] = useState({});

  useEffect(() => {
    (async () => {
      const { data: o } = await supabase.from("organisations").select(ORG_COLS).eq("slug", orgSlug).maybeSingle();
      setOrg(o || null);
      if (!o) return;
      const { data: l } = await supabase.from("locations").select("*").eq("org_id", o.id).order("created_at");
      setLocs(l || []);
      const { data: s } = await supabase.from("sessions").select("location_id,status,name").eq("org_id", o.id).neq("status", "ended");
      setLive(Object.fromEntries((s || []).map((x) => [x.location_id, x])));
      document.title = o.name;
    })();
  }, [orgSlug]);

  if (org === undefined) return <div className="center muted">Loading…</div>;
  if (org === null) return <div className="center"><div><h2>Not found</h2><p className="muted">No organisation at /{orgSlug}. <Link to="/">Home</Link></p></div></div>;

  return (
    <div className="auth-wrap">
      <div className="card auth-card wide">
        <span className="brand">✦ Service Timer</span>
        <h2>{org.name}</h2>
        <p className="muted">Choose a screen to display.</p>
        <div className="list">
          {locs.map((l) => (
            <Link key={l.id} className="list-row link-row" to={`/${org.slug}/${l.slug}`}>
              <b>{l.name}</b>
              <span className={`pill ${live[l.id]?.status || "idle"}`}>{live[l.id] ? (live[l.id].status === "live" ? "Live" : "Ready") : "Idle"}</span>
            </Link>
          ))}
        </div>
        <p className="muted small"><Link to="/login">Operator log in</Link></p>
      </div>
    </div>
  );
}
