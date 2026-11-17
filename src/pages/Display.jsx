import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase, ORG_COLS } from "../lib/supabase";
import { timerState, useClockSync, useNow } from "../lib/clock";
import { useLiveSession } from "../lib/useSession";
import TimerFace from "../components/TimerFace";

export default function Display() {
  const { orgSlug, locSlug } = useParams();
  const [place, setPlace] = useState(null);
  const [missing, setMissing] = useState(false);
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef(null);

  useClockSync();
  const now = useNow(100);

  useEffect(() => {
    (async () => {
      const { data: org } = await supabase.from("organisations").select(ORG_COLS).eq("slug", orgSlug).maybeSingle();
      if (!org) return setMissing(true);
      const { data: loc } = await supabase.from("locations").select("*").eq("org_id", org.id).eq("slug", locSlug).maybeSingle();
      if (!loc) return setMissing(true);
      setPlace({ org, loc });
      document.title = `${loc.name} · ${org.name}`;
    })();
  }, [orgSlug, locSlug]);

  const { session, connected } = useLiveSession({ locationId: place?.loc.id });

  const toggleFS = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  };

  // Keep the screen awake
  useEffect(() => {
    let lock;
    const req = async () => { try { lock = await navigator.wakeLock?.request("screen"); } catch { /* not supported */ } };
    req();
    const onVis = () => document.visibilityState === "visible" && req();
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); lock?.release?.(); };
  }, []);

  // Hide cursor & controls when idle
  useEffect(() => {
    const wake = () => {
      setIdle(false);
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setIdle(true), 2500);
    };
    wake();
    window.addEventListener("mousemove", wake);
    const onKey = (e) => { if (e.key === "f" || e.key === "F") toggleFS(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("mousemove", wake); window.removeEventListener("keydown", onKey); clearTimeout(idleTimer.current); };
  }, []);

  if (missing) return <div className="display center"><div><h2>Display not found</h2><p className="muted">Check the link: /{orgSlug}/{locSlug}</p></div></div>;
  if (!place) return <div className="display center muted">Connecting…</div>;

  const t = timerState(session, now);
  const clock = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: place.org.timezone }).format(new Date(now));

  return (
    <div className={`display ${idle ? "idle" : ""}`} onDoubleClick={toggleFS}>
      <TimerFace t={t} session={session} clock={clock} />
      <div className="display-chrome">
        <span>{place.org.name} · {place.loc.name}</span>
        <button className="btn btn-sm ghost" onClick={toggleFS}>⛶ Fullscreen (F)</button>
      </div>
      {!connected && <div className="offline-dot" title="Reconnecting… the timer keeps running from the last update">Reconnecting…</div>}
    </div>
  );
}
