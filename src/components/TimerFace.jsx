import { fmt } from "../lib/clock";

/** The big clock. Used full-screen on displays and as a preview for the operator. */
export default function TimerFace({ t, session, compact = false, clock }) {
  const levelClass = t?.status === "live" ? `lvl-${t.level}${t.paused ? " paused" : ""}` : "";
  return (
    <div className={`face ${compact ? "compact" : ""} ${levelClass}`}>
      {session?.message && <div className="face-msg">{session.message}</div>}

      {!session || session.status === "ended" ? (
        <div className="face-idle">
          <div className="face-clock">{clock}</div>
          <div className="face-sub">{session?.status === "ended" ? "Service complete" : "Waiting for the service to start"}</div>
        </div>
      ) : session.status === "ready" ? (
        <div className="face-idle">
          <div className="face-label">Starting soon</div>
          <div className="face-name">{session.name}</div>
          {t?.seg && <div className="face-sub">First: {t.seg.name} · {fmt(t.seg.duration_s)}</div>}
          <div className="face-clock small">{clock}</div>
        </div>
      ) : (
        <>
          <div className="face-top">
            <span className="face-name">{t.seg?.name}</span>
            <span className="face-pos">{t.index + 1} / {t.segs.length}</span>
          </div>
          <div className="face-time">{t.display}</div>
          <div className="face-state">
            {t.paused ? "PAUSED" : t.overtime ? "OVER TIME — PLEASE WRAP UP" : t.level === "min1" ? "1 MINUTE" : t.level === "min2" ? "2 MINUTES" : " "}
          </div>
          <div className="face-bar"><div style={{ width: `${t.pct * 100}%` }} /></div>
          <div className="face-bottom">
            <span>{t.next ? <>Next: <b>{t.next.name}</b> · {fmt(t.next.duration_s)}</> : "Last segment"}</span>
            {clock && <span className="face-wall">{clock}</span>}
          </div>
        </>
      )}
    </div>
  );
}
