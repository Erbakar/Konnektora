import { useQuery } from "@tanstack/react-query";
import { Bell, CalendarDays, Home, LayoutDashboard, MapPin, Menu, MessageCircle, QrCode, Search, Tag, UserRound, WalletCards, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { SiteFooter } from "./SiteFooter";
import { getUserSession, listConversations } from "../lib/api";
import { useLanguage } from "../lib/i18n";

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
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

        <nav className="corp-nav" aria-label={t("navigation")}>
          <NavLink to="/feed"><Home size={18} /> {t("feed")}</NavLink>
          <NavLink to="/events">
            <CalendarDays size={18} />
            {t("events")}
          </NavLink>
          <NavLink to="/tags">
            <Tag size={18} />
            {t("tags")}
          </NavLink>
          <NavLink to="/places">
            <MapPin size={18} />
            {t("places")}
          </NavLink>
          <NavLink to="/messages">
            <MessageCircle size={18} />
            {t("messages")}
            {conversationsQuery.data?.totalUnread ? <span className="nav-unread-badge">{conversationsQuery.data.totalUnread}</span> : null}
          </NavLink>
          <NavLink to="/notifications"><Bell size={18} /> Bildirimler</NavLink>
          <NavLink to="/identity"><QrCode size={18} /> {t("memberId")}</NavLink>
          <NavLink to="/finance"><WalletCards size={18} /> {t("finance")}</NavLink>
          <NavLink to="/search"><Search size={18} /> {t("search")}</NavLink>
          <NavLink to="/onboarding">
            <UserRound size={18} />
            {t("create")}
          </NavLink>
        </nav>

        <div className="corp-topbar-actions">
          <div className="language-switch" aria-label="Dil / Language">
            <button className={language === "tr" ? "active" : ""} onClick={() => setLanguage("tr")} type="button">TR</button>
            <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")} type="button">EN</button>
          </div>
          <NavLink className="corp-topbar-link" to="/account">
            {t("login")}
          </NavLink>
          <NavLink className="corp-topbar-cta" to="/events">
            {t("explore")}
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
          aria-label={menuOpen ? t("menuClose") : t("menuOpen")}
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
          aria-label={t("menuClose")}
          onClick={() => setMenuOpen(false)}
        />
        <nav className="corp-mobile-menu-panel" aria-label={t("mobileNavigation")}>
          <div className="language-switch language-switch-mobile" aria-label="Dil / Language">
            <button className={language === "tr" ? "active" : ""} onClick={() => setLanguage("tr")} type="button">TR</button>
            <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")} type="button">EN</button>
          </div>
          <NavLink to="/feed" onClick={() => setMenuOpen(false)}><Home size={18} /> {t("feed")}</NavLink>
          <NavLink to="/events" onClick={() => setMenuOpen(false)}>
            <CalendarDays size={18} />
            {t("events")}
          </NavLink>
          <NavLink to="/tags" onClick={() => setMenuOpen(false)}>
            <Tag size={18} />
            {t("tags")}
          </NavLink>
          <NavLink to="/places" onClick={() => setMenuOpen(false)}>
            <MapPin size={18} />
            {t("places")}
          </NavLink>
          <NavLink to="/messages" onClick={() => setMenuOpen(false)}>
            <MessageCircle size={18} />
            {t("messages")}
            {conversationsQuery.data?.totalUnread ? <span className="nav-unread-badge">{conversationsQuery.data.totalUnread}</span> : null}
          </NavLink>
          <NavLink to="/notifications" onClick={() => setMenuOpen(false)}><Bell size={18} /> Bildirimler</NavLink>
          <NavLink to="/identity" onClick={() => setMenuOpen(false)}><QrCode size={18} /> {t("memberId")}</NavLink>
          <NavLink to="/finance" onClick={() => setMenuOpen(false)}><WalletCards size={18} /> {t("finance")}</NavLink>
          <NavLink to="/search" onClick={() => setMenuOpen(false)}><Search size={18} /> {t("search")}</NavLink>
          <NavLink to="/onboarding" onClick={() => setMenuOpen(false)}>
            <UserRound size={18} />
            {t("create")}
          </NavLink>
          <NavLink className="corp-mobile-menu-link" to="/account" onClick={() => setMenuOpen(false)}>
            {t("login")}
          </NavLink>
          <NavLink className="corp-mobile-menu-cta" to="/events" onClick={() => setMenuOpen(false)}>
            {t("explore")}
          </NavLink>
          <NavLink className="corp-mobile-menu-admin" to="/admin" onClick={() => setMenuOpen(false)}>
            <LayoutDashboard size={18} />
            {t("admin")}
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
