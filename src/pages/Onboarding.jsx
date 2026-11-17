import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

export const slugify = (s) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export default function Onboarding() {
  const { loadOrgs, chooseOrg, orgs } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("create");
  const [yourName, setYourName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [available, setAvailable] = useState(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => { if (!slugTouched) setSlug(slugify(orgName)); }, [orgName, slugTouched]);
  useEffect(() => {
    if (slug.length < 3) { setAvailable(null); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("slug_available", { p_slug: slug });
      setAvailable(data);
    }, 300);
    return () => clearTimeout(t);
  }, [slug]);

  async function create(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const { data, error } = await supabase.rpc("create_organisation", {
      p_name: orgName, p_slug: slug, p_display_name: yourName, p_timezone: tz,
    });
    setBusy(false);
    if (error) {
      setErr(error.message.includes("slug") ? "That web address isn't allowed. Use 3–40 letters, numbers or dashes." : error.message);
      return;
    }
    await loadOrgs(); chooseOrg(data.id); nav("/app");
  }

  async function join(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const { data, error } = await supabase.rpc("join_organisation", { p_code: code, p_display_name: yourName });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    await loadOrgs(); chooseOrg(data.id); nav("/app");
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card wide">
        <span className="brand">✦ Service Timer</span>
        <h2>{orgs.length ? "Add another organisation" : "Set up your church"}</h2>
        <div className="tabs">
          <button className={tab === "create" ? "on" : ""} onClick={() => setTab("create")}>Create new</button>
          <button className={tab === "join" ? "on" : ""} onClick={() => setTab("join")}>Join with a code</button>
        </div>
        <form onSubmit={tab === "create" ? create : join}>
          <label>Your name<input required value={yourName} onChange={(e) => setYourName(e.target.value)} placeholder="e.g. Bea" /></label>
          {tab === "create" ? (
            <>
              <label>Church or organisation name<input required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. Grace Chapel Fredericton" /></label>
              <label>Your web address
                <div className="slug-row">
                  <span className="muted">{window.location.host}/</span>
                  <input required value={slug} onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} />
                </div>
                {slug.length >= 3 && available !== null && (
                  <span className={available ? "ok small" : "error small"}>{available ? "Available" : "Already taken"}</span>
                )}
              </label>
              <p className="muted small">We'll add a "Main Hall" location and a sample Sunday Service template to get you going.</p>
            </>
          ) : (
            <label>Join code<input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="6 characters from your admin" maxLength={6} /></label>
          )}
          {err && <p className="error">{err}</p>}
          <button className="btn" disabled={busy || (tab === "create" && available === false)}>
            {busy ? "…" : tab === "create" ? "Create" : "Join"}
          </button>
        </form>
      </div>
    </div>
  );
}
