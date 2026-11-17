import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase, unwrap } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { fmt, timerState, useClockSync, useNow } from "../lib/clock";
import { useLiveSession } from "../lib/useSession";
import { totalOf } from "../lib/data";
import TimerFace from "../components/TimerFace";
import SegmentEditor from "../components/SegmentEditor";

export default function Operator() {
  const { sessionId } = useParams();
  const { org } = useAuth();
  useClockSync();
  const now = useNow(100);
  const { session, setSession, connected, loaded } = useLiveSession({ sessionId });
  const [loc, setLoc] = useState(null);
  const [err, setErr] = useState("");
  const [msgDraft, setMsgDraft] = useState("");
  const [editSegs, setEditSegs] = useState(null);
  const busy = useRef(false);

  useEffect(() => {
    if (!session?.location_id || loc) return;
    supabase.from("locations").select("*").eq("id", session.location_id).single().then(({ data }) => setLoc(data));
  }, [session?.location_id, loc]);

  useEffect(() => { if (session) document.title = `▶ ${session.name}`; }, [session?.name]);

  async function act(action, extra = {}) {
    if (busy.current) return;
    busy.current = true;
    setErr("");
    try {
      const row = await supabase.rpc("timer_action", { p_session: sessionId, p_action: action, p_index: extra.index ?? null }).then(unwrap);
      setSession(row);
    } catch (e) { setErr(e.message); }
    finally { setTimeout(() => { busy.current = false; }, 200); }
  }

  async function sendMessage(text) {
    try {
      const row = await supabase.rpc("set_session_message", { p_session: sessionId, p_message: text }).then(unwrap);
      setSession(row);
    } catch (e) { setErr(e.message); }
  }

  async function saveSegments() {
    const segments = editSegs.filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), duration_s: s.duration_s }));
    try {
      const row = await supabase.from("sessions").update({ segments, updated_at: new Date().toISOString() }).eq("id", sessionId).select().single().then(unwrap);
      setSession(row);
      setEditSegs(null);
    } catch (e) { setErr(e.message); }
  }

  async function discard() {
    if (!confirm("Discard this prepared service?")) return;
    await supabase.from("sessions").delete().eq("id", sessionId);
    window.location.href = "/app";
  }

  // Keyboard: Space pause/resume, → next, ← previous, + / − one minute
  const stateRef = useRef(null);
  stateRef.current = session;
  useEffect(() => {
    const onKey = (e) => {
      const s = stateRef.current;
      if (!s || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (s.status === "ready" && e.code === "Enter") { e.preventDefault(); act("start"); return; }
      if (s.status !== "live") return;
      if (e.code === "Space") { e.preventDefault(); act(s.paused_at ? "resume" : "pause"); }
      else if (e.code === "ArrowRight") { e.preventDefault(); act("next"); }
      else if (e.code === "ArrowLeft") { e.preventDefault(); act("prev"); }
      else if (e.key === "+" || e.key === "=") { e.preventDefault(); act("adjust", { index: 60 }); }
      else if (e.key === "-" || e.key === "_") { e.preventDefault(); act("adjust", { index: -60 }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!loaded) return <div className="center muted">Loading…</div>;
  if (!session) return <div className="center"><div><p>Session not found.</p><Link to="/app">Back</Link></div></div>;

  const t = timerState(session, now);
  const displayUrl = loc ? `${window.location.origin}/${org.slug}/${loc.slug}` : "";
  const clock = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: org.timezone }).format(new Date(now));
  const runStart = session.started_at ? Date.parse(session.started_at) : null;
  const plannedSoFar = totalOf(session.segments.slice(0, session.current_index)) * 1000;
  const scheduleDrift = runStart && t?.status === "live" ? Math.round((now - runStart - plannedSoFar - t.elapsedMs + Math.max(0, -t.remainingMs)) / 1000) : null;

  return (
    <div className="operator">
      <header className="op-head">
        <Link to="/app" className="muted">← Dashboard</Link>
        <div className="op-title">
          <b>{session.name}</b>
          <span className="muted"> · {loc?.name}</span>
        </div>
        <div className="row gap">
          <span className={`conn ${connected ? "on" : "off"}`}>{connected ? "● Live sync" : "● Reconnecting…"}</span>
          {displayUrl && <a className="btn btn-sm ghost" href={displayUrl} target="_blank" rel="noreferrer">Open display ↗</a>}
        </div>
      </header>

      {err && <p className="error">{err}</p>}

      <div className="op-body">
        <div className="op-main">
          <TimerFace t={t} session={session} compact clock={clock} />

          {session.status === "ready" && (
            <div className="op-controls">
              <button className="btn btn-lg go" onClick={() => act("start")}>▶ Start service (Enter)</button>
              <button className="btn ghost" onClick={() => setEditSegs(session.segments)}>Adjust today's segments</button>
              <button className="btn ghost danger" onClick={discard}>Discard</button>
            </div>
          )}

          {session.status === "live" && (
            <>
              <div className="op-controls">
                <button className="btn" onClick={() => act("prev")} disabled={session.current_index === 0}>← Back</button>
                <button className="btn" onClick={() => act(session.paused_at ? "resume" : "pause")}>
                  {session.paused_at ? "▶ Resume" : "❚❚ Pause"} <kbd>Space</kbd>
                </button>
                <button className="btn go" onClick={() => act("next")}>
                  {session.current_index + 1 >= session.segments.length ? "Finish ✓" : "Next →"} <kbd>→</kbd>
                </button>
              </div>
              <div className="op-controls secondary">
                <button className="btn btn-sm ghost" onClick={() => act("adjust", { index: -60 })}>− 1 min</button>
                <button className="btn btn-sm ghost" onClick={() => act("adjust", { index: 60 })}>+ 1 min</button>
                <button className="btn btn-sm ghost" onClick={() => act("reset")}>↺ Restart segment</button>
                <button className="btn btn-sm ghost danger" onClick={() => confirm("End the service now?") && act("end")}>End service</button>
              </div>
              {scheduleDrift !== null && (
                <p className={`drift ${scheduleDrift > 60 ? "over-text" : ""}`}>
                  Service is {Math.abs(scheduleDrift) < 30 ? "on schedule" : `${fmt(Math.abs(scheduleDrift))} ${scheduleDrift > 0 ? "behind" : "ahead of"} schedule`}
                  {session.extra_s ? ` · this segment ${session.extra_s > 0 ? "+" : "−"}${fmt(Math.abs(session.extra_s))}` : ""}
                </p>
              )}
            </>
          )}

          {session.status === "ended" && (
            <div className="op-controls">
              <Link className="btn" to="/app/log">View in service log</Link>
              <Link className="btn ghost" to="/app">Back to dashboard</Link>
            </div>
          )}

          {session.status !== "ended" && (
            <form className="op-msg" onSubmit={(e) => { e.preventDefault(); sendMessage(msgDraft); }}>
              <input value={msgDraft} onChange={(e) => setMsgDraft(e.target.value)} placeholder="Message to the stage, e.g. Please wrap up" />
              <button className="btn btn-sm">Send</button>
              {session.message && <button type="button" className="btn btn-sm ghost" onClick={() => { setMsgDraft(""); sendMessage(""); }}>Clear “{session.message}”</button>}
            </form>
          )}
          <p className="muted small">Shortcuts: Space pause/resume · → next · ← back · + / − one minute</p>
        </div>

        <aside className="op-side">
          <h3>Order of service</h3>
          {editSegs ? (
            <>
              <SegmentEditor segments={editSegs} onChange={setEditSegs} />
              <div className="row gap"><button className="btn btn-sm" onClick={saveSegments}>Save</button><button className="btn btn-sm ghost" onClick={() => setEditSegs(null)}>Cancel</button></div>
              <p className="muted small">Changes apply to today only, not the template.</p>
            </>
          ) : (
            <ol className="op-segs">
              {session.segments.map((s, i) => {
                const state = session.status === "ended" || i < session.current_index ? "done" : i === session.current_index && session.status === "live" ? "now" : "";
                return (
                  <li key={i} className={state}>
                    <button disabled={session.status !== "live" || i === session.current_index} onClick={() => act("goto", { index: i })} title="Jump to this segment">
                      <span>{s.name}</span><span className="muted">{fmt(s.duration_s)}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="muted small">Total planned {fmt(totalOf(session.segments))}</p>
        </aside>
      </div>
    </div>
  );
}
