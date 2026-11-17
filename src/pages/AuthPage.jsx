import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

export default function AuthPage({ mode }) {
  const { user, ready, loadOrgs } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);

  if (ready && user) return <Navigate to="/app" replace />;

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/onboarding" },
        });
        if (error) throw error;
        if (!data.session) { setSent(true); return; }
        nav("/onboarding");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const orgs = await loadOrgs();
        nav(orgs.length ? "/app" : "/onboarding");
      }
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="auth-wrap"><div className="card auth-card">
        <h2>Check your email</h2>
        <p className="muted">We sent a confirmation link to <b>{email}</b>. Open it to finish setting up.</p>
      </div></div>
    );
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <Link to="/" className="brand">✦ Service Timer</Link>
        <h2>{mode === "signup" ? "Create your account" : "Welcome back"}</h2>
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></label>
        <label>Password<input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {err && <p className="error">{err}</p>}
        <button className="btn" disabled={busy}>{busy ? "…" : mode === "signup" ? "Sign up" : "Log in"}</button>
        <p className="muted small">
          {mode === "signup"
            ? <>Already have an account? <Link to="/login">Log in</Link></>
            : <>New here? <Link to="/signup">Create an account</Link></>}
        </p>
      </form>
    </div>
  );
}
