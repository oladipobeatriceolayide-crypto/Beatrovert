import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

/*
 * Live session subscription with self-healing:
 *  - realtime updates for instant changes
 *  - refetch whenever the channel (re)connects, the tab wakes or the network returns
 *  - a slow poll as a backstop
 * Either pass { sessionId } or { locationId } (latest session at that location).
 */
export function useLiveSession({ sessionId, locationId }) {
  const [session, setSession] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [connected, setConnected] = useState(true);
  const latest = useRef(null);

  const accept = useCallback((row) => {
    if (!row) return;
    const cur = latest.current;
    // ignore stale updates arriving out of order
    if (cur && cur.id === row.id && Date.parse(row.updated_at) < Date.parse(cur.updated_at)) return;
    if (cur && cur.id !== row.id && locationId && Date.parse(row.created_at) < Date.parse(cur.created_at)) return;
    latest.current = row;
    setSession(row);
  }, [locationId]);

  const refetch = useCallback(async () => {
    let q = supabase.from("sessions").select("*");
    if (sessionId) q = q.eq("id", sessionId);
    else q = q.eq("location_id", locationId).order("created_at", { ascending: false }).limit(1);
    const { data, error } = await q;
    setLoaded(true);
    if (error) { setConnected(false); return; }
    if (data && data[0]) {
      latest.current = null; // a full fetch is authoritative
      accept(data[0]);
    } else {
      latest.current = null;
      setSession(null);
    }
  }, [sessionId, locationId, accept]);

  useEffect(() => {
    if (!sessionId && !locationId) return;
    refetch();
    const filter = sessionId ? `id=eq.${sessionId}` : `location_id=eq.${locationId}`;
    const ch = supabase
      .channel(`sess-${sessionId || locationId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions", filter }, (p) => {
        if (p.eventType === "DELETE") refetch();
        else accept(p.new);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") { setConnected(true); refetch(); }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setConnected(false);
      });
    const poll = setInterval(refetch, 15000);
    const onVis = () => document.visibilityState === "visible" && refetch();
    const onOnline = () => { setConnected(true); refetch(); };
    const onOffline = () => setConnected(false);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [sessionId, locationId, refetch, accept]);

  return { session, setSession: accept, loaded, connected, refetch };
}
