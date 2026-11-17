import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import "./styles.css";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import Onboarding from "./pages/Onboarding";
import Shell from "./pages/Shell";
import Dashboard from "./pages/Dashboard";
import Templates from "./pages/Templates";
import Events from "./pages/Events";
import Locations from "./pages/Locations";
import Log from "./pages/Log";
import Settings from "./pages/Settings";
import Operator from "./pages/Operator";
import Display from "./pages/Display";
import OrgPublic from "./pages/OrgPublic";

function RequireAuth({ children, needOrg = true }) {
  const { user, ready, org } = useAuth();
  if (!ready) return <div className="center muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (needOrg && !org) return <Navigate to="/onboarding" replace />;
  return children;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="/onboarding" element={<RequireAuth needOrg={false}><Onboarding /></RequireAuth>} />
          <Route path="/app/run/:sessionId" element={<RequireAuth><Operator /></RequireAuth>} />
          <Route path="/app" element={<RequireAuth><Shell /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="templates" element={<Templates />} />
            <Route path="templates/:id" element={<Templates />} />
            <Route path="events" element={<Events />} />
            <Route path="locations" element={<Locations />} />
            <Route path="log" element={<Log />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="/:orgSlug" element={<OrgPublic />} />
          <Route path="/:orgSlug/:locSlug" element={<Display />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
