import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

export default function Shell() {
  const { org, orgs, chooseOrg } = useAuth();
  const nav = useNavigate();
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">✦ Service Timer</div>
        {orgs.length > 1 ? (
          <select value={org.id} onChange={(e) => chooseOrg(e.target.value)}>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        ) : <div className="org-name">{org.name}</div>}
        <a className="org-url" href={`/${org.slug}`} target="_blank" rel="noreferrer">{window.location.host}/{org.slug} ↗</a>
        <nav>
          <NavLink end to="/app">Today</NavLink>
          <NavLink to="/app/templates">Templates</NavLink>
          <NavLink to="/app/events">Recurring events</NavLink>
          <NavLink to="/app/locations">Locations</NavLink>
          <NavLink to="/app/log">Service log</NavLink>
          <NavLink to="/app/settings">Team & settings</NavLink>
        </nav>
        <button className="link muted" onClick={async () => { await supabase.auth.signOut(); nav("/"); }}>Log out</button>
      </aside>
      <main className="main"><Outlet key={org.id} /></main>
    </div>
  );
}
