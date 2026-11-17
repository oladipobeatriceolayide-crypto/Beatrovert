import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Landing() {
  const { user, ready } = useAuth();
  if (ready && user) return <Navigate to="/app" replace />;
  return (
    <div className="landing">
      <header className="landing-nav">
        <span className="brand">✦ Service Timer</span>
        <nav>
          <Link to="/login">Log in</Link>
          <Link className="btn" to="/signup">Get started</Link>
        </nav>
      </header>
      <main className="hero">
        <h1>Keep every service on time.<br />In every room.</h1>
        <p className="lede">
          One clock for the operator, the projector, the stage and the overflow room.
          Reusable orders of service, recurring events, and a log that shows where the time really goes.
        </p>
        <Link className="btn btn-lg" to="/signup">Set up your church — free</Link>
        <div className="features">
          <div><h3>Your own link</h3><p>servicetimer/<b>your-church</b>/main-hall. Open it on any screen. No login needed to display.</p></div>
          <div><h3>Templates</h3><p>Save your order of service once. Start Sunday with one click.</p></div>
          <div><h3>Multiple locations</h3><p>Main hall, overflow, youth hall — each runs its own live timer at the same time.</p></div>
          <div><h3>Service log</h3><p>Planned against actual, per segment, week after week.</p></div>
        </div>
      </main>
    </div>
  );
}
