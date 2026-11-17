import { useEffect, useState } from "react";
import { supabase } from "./supabase";

/*
 * Every screen keeps time from the SERVER's clock, never its own.
 * offset = serverTime - localTime, measured with a few round trips
 * and keeping the one with the shortest round trip (most accurate).
 */
let offset = 0;
let synced = false;

export async function syncClock() {
  let best = null;
  for (let i = 0; i < 4; i++) {
    const t0 = Date.now();
    const { data, error } = await supabase.rpc("server_now");
    const t1 = Date.now();
    if (error || !data) continue;
    const rtt = t1 - t0;
    const off = Date.parse(data) + rtt / 2 - t1;
    if (!best || rtt < best.rtt) best = { rtt, off };
  }
  if (best) {
    offset = best.off;
    synced = true;
  }
  return synced;
}

export const serverNow = () => Date.now() + offset;

/** Re-sync on load, every 5 minutes, and whenever the tab comes back. */
export function useClockSync() {
  useEffect(() => {
    syncClock();
    const id = setInterval(syncClock, 5 * 60 * 1000);
    const onVis = () => document.visibilityState === "visible" && syncClock();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", syncClock);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", syncClock);
    };
  }, []);
}

/** Re-render roughly 10x a second. Time is always recomputed from timestamps,
 *  so a throttled or sleeping tab is correct the moment it wakes. */
export function useNow(interval = 100) {
  const [now, setNow] = useState(serverNow());
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), interval);
    const onVis = () => setNow(serverNow());
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [interval]);
  return now;
}

/** Pure function: given a session row and "now", work out the timer. */
export function timerState(s, now = serverNow()) {
  if (!s) return null;
  const segs = s.segments || [];
  const seg = segs[s.current_index] || null;
  const next = segs[s.current_index + 1] || null;
  if (s.status !== "live" || !seg) {
    return { status: s.status, seg, next, segs, index: s.current_index };
  }
  const durMs = (seg.duration_s + (s.extra_s || 0)) * 1000;
  const started = Date.parse(s.seg_started_at);
  const pausedExtra = s.paused_at ? now - Date.parse(s.paused_at) : 0;
  const elapsedMs = Math.max(0, now - started - (s.paused_ms || 0) - pausedExtra);
  const remainingMs = durMs - elapsedMs;
  const overtime = remainingMs < 0;
  const remS = Math.ceil(remainingMs / 1000);
  let level = "ok";
  if (overtime) level = "over";
  else if (remS <= 60) level = "min1";
  else if (remS <= 120) level = "min2";
  return {
    status: "live",
    seg,
    next,
    segs,
    index: s.current_index,
    paused: !!s.paused_at,
    durMs,
    elapsedMs,
    remainingMs,
    overtime,
    level,
    pct: durMs > 0 ? Math.max(0, Math.min(1, remainingMs / durMs)) : 0,
    display: overtime ? "+" + fmt(Math.floor(-remainingMs / 1000)) : fmt(Math.max(0, remS)),
  };
}

export function fmt(totalS) {
  const s = Math.abs(Math.round(totalS));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function fmtDelta(s) {
  if (Math.abs(s) < 1) return "on time";
  return (s > 0 ? "+" : "−") + fmt(Math.abs(s));
}
