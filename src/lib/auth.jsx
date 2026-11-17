import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [orgs, setOrgs] = useState([]);
  const [orgId, setOrgId] = useState(() => localStorage.getItem("st.org") || null);

  const loadOrgs = useCallback(async () => {
    const { data } = await supabase.rpc("my_organisations");
    setOrgs(data || []);
    return data || [];
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setUser(data.session?.user ?? null);
      if (data.session) await loadOrgs();
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setUser(sess?.user ?? null);
      if (sess) loadOrgs(); else setOrgs([]);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadOrgs]);

  const org = orgs.find((o) => o.id === orgId) || orgs[0] || null;
  const chooseOrg = (id) => { localStorage.setItem("st.org", id); setOrgId(id); };

  return (
    <AuthCtx.Provider value={{ user, ready, orgs, org, chooseOrg, loadOrgs }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
