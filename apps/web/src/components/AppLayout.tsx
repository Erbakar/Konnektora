import { useQuery } from "@tanstack/react-query";
import { CalendarDays, LayoutDashboard, MapPin, Menu, MessageCircle, Tag, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { SiteFooter } from "./SiteFooter";
import { getUserSession, listConversations } from "../lib/api";

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const user = getUserSession();
  const conversationsQuery = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: listConversations,
    enabled: Boolean(user),
    refetchInterval: 30_000
  });

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="app-shell">
      <header className="corp-topbar">
        <NavLink to="/" className="brand" aria-label="Konnektora ana sayfa">
          <img alt="Konnektora" src="/brand/konnektora-logo.svg" />
        </NavLink>

        <nav className="corp-nav" aria-label="Ana navigasyon">
          <NavLink to="/events">
            <CalendarDays size={18} />
            Events
          </NavLink>
          <NavLink to="/events?tag=startup">
            <Tag size={18} />
            Tags
          </NavLink>
          <NavLink to="/places">
            <MapPin size={18} />
            Places
          </NavLink>
          <NavLink to="/messages">
            <MessageCircle size={18} />
            Messages
            {conversationsQuery.data?.totalUnread ? <span className="nav-unread-badge">{conversationsQuery.data.totalUnread}</span> : null}
          </NavLink>
          <NavLink to="/account">
            <UserRound size={18} />
            Create
          </NavLink>
        </nav>

        <div className="corp-topbar-actions">
          <NavLink className="corp-topbar-link" to="/account">
            Log in
          </NavLink>
          <NavLink className="corp-topbar-cta" to="/events">
            Explore events
          </NavLink>
          <NavLink className="corp-topbar-admin" to="/admin" title="Admin">
            <LayoutDashboard size={18} />
          </NavLink>
        </div>

        <button
          type="button"
          className="corp-menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="corp-mobile-menu"
          aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      <div
        id="corp-mobile-menu"
        className={`corp-mobile-menu${menuOpen ? " is-open" : ""}`}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          className="corp-mobile-menu-backdrop"
          aria-label="Menüyü kapat"
          onClick={() => setMenuOpen(false)}
        />
        <nav className="corp-mobile-menu-panel" aria-label="Mobil navigasyon">
          <NavLink to="/events" onClick={() => setMenuOpen(false)}>
            <CalendarDays size={18} />
            Events
          </NavLink>
          <NavLink to="/events?tag=startup" onClick={() => setMenuOpen(false)}>
            <Tag size={18} />
            Tags
          </NavLink>
          <NavLink to="/places" onClick={() => setMenuOpen(false)}>
            <MapPin size={18} />
            Places
          </NavLink>
          <NavLink to="/messages" onClick={() => setMenuOpen(false)}>
            <MessageCircle size={18} />
            Messages
            {conversationsQuery.data?.totalUnread ? <span className="nav-unread-badge">{conversationsQuery.data.totalUnread}</span> : null}
          </NavLink>
          <NavLink to="/account" onClick={() => setMenuOpen(false)}>
            <UserRound size={18} />
            Create
          </NavLink>
          <NavLink className="corp-mobile-menu-link" to="/account" onClick={() => setMenuOpen(false)}>
            Log in
          </NavLink>
          <NavLink className="corp-mobile-menu-cta" to="/events" onClick={() => setMenuOpen(false)}>
            Explore events
          </NavLink>
          <NavLink className="corp-mobile-menu-admin" to="/admin" onClick={() => setMenuOpen(false)}>
            <LayoutDashboard size={18} />
            Admin
          </NavLink>
        </nav>
      </div>

      <main>
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
