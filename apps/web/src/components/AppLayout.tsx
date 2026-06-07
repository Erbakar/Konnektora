import { CalendarDays, LayoutDashboard, Tag } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { SiteFooter } from "./SiteFooter";

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="corp-topbar">
        <NavLink to="/" className="brand" aria-label="Konnektora ana sayfa">
          <img alt="Konnektora" src="/brand/konnektora-logo.svg" />
        </NavLink>
        <nav className="corp-nav">
          <NavLink to="/events">
            <CalendarDays size={18} />
            Events
          </NavLink>
          <NavLink to="/events?tag=startup">
            <Tag size={18} />
            Tags
          </NavLink>
        </nav>
        <div className="corp-topbar-actions">
          <NavLink className="corp-topbar-link" to="/admin">
            Log in
          </NavLink>
          <NavLink className="corp-topbar-cta" to="/events">
            Explore events
          </NavLink>
          <NavLink className="corp-topbar-admin" to="/admin" title="Admin">
            <LayoutDashboard size={18} />
          </NavLink>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
