import { CalendarDays, LayoutDashboard, Tag } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="brand" aria-label="Konnektora ana sayfa">
          Konnektora
        </NavLink>
        <nav className="nav">
          <NavLink to="/events">
            <CalendarDays size={18} />
            Etkinlikler
          </NavLink>
          <NavLink to="/events?tag=startup">
            <Tag size={18} />
            Tag'ler
          </NavLink>
          <NavLink to="/admin">
            <LayoutDashboard size={18} />
            Admin
          </NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

