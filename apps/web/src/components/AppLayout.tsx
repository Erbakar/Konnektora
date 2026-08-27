import { useQuery } from "@tanstack/react-query";
import { Bell, CalendarDays, ChevronDown, Home, LogOut, MapPin, Menu, MessageCircle, QrCode, Search, Settings, Tag, Ticket, UserRound, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { SiteFooter } from "./SiteFooter";
import { clearUserSession, getUserSession, listConversations, listMyNotifications, resolveMediaUrl } from "../lib/api";
import { publicSiteHref } from "../lib/domains";
import { useLanguage } from "../lib/i18n";
import { DialogAccessibilityManager } from "./DialogAccessibilityManager";

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const storedUser = getUserSession();
  const user = storedUser?.status === "active" ? storedUser : null;
  const conversationsQuery = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: listConversations,
    enabled: Boolean(user),
    refetchInterval: 30_000
  });
  const notificationsQuery = useQuery({
    queryKey: ["my-notifications", user?.id],
    queryFn: listMyNotifications,
    enabled: Boolean(user),
    refetchInterval: 30_000,
  });
  const unreadNotifications = notificationsQuery.data?.filter((item) => !item.readAt).length ?? 0;

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className={`app-shell${user ? " authenticated-shell" : ""}`}>
      <DialogAccessibilityManager />
      <header className="corp-topbar">
        <a href={publicSiteHref()} className="brand" aria-label={t("brandHome")}>
          <img alt="Konnektora" src="/brand/konnektora-logo.svg" />
        </a>

        <nav className="corp-nav" aria-label={t("navigation")}>
          {user ? <>
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
          <NavLink to="/community">
            <Users size={18} />
            {t("members")}
          </NavLink>
          <NavLink to="/messages">
            <MessageCircle size={18} />
            {t("messages")}
            {conversationsQuery.data?.totalUnread ? <span className="nav-unread-badge">{conversationsQuery.data.totalUnread}</span> : null}
          </NavLink>
          </> : <>
            <NavLink to="/events"><CalendarDays size={18}/>{t("events")}</NavLink>
            <NavLink to="/places"><MapPin size={18}/>{t("places")}</NavLink>
            <NavLink to="/tags"><Tag size={18}/>{t("tags")}</NavLink>
          </>}
        </nav>

        <div className="corp-topbar-actions">
          {!user ? <div className="language-switch" aria-label="Dil / Language">
            <button className={language === "tr" ? "active" : ""} onClick={() => setLanguage("tr")} type="button">TR</button>
            <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")} type="button">EN</button>
          </div> : null}
          <NavLink aria-label={t("search")} className="corp-header-search" to="/search"><Search size={20}/><span>{t("search")}</span></NavLink>
          {user ? <>
            <div className="corp-user-links"><div className="corp-profile-cluster"><NavLink className="corp-user-identity" to={`/users/id/${user.id}`}>{user.avatarUrl ? <img alt="" src={resolveMediaUrl(user.avatarUrl)}/> : <span className="corp-user-avatar">{user.name.slice(0, 1).toUpperCase()}</span>}<span>@{user.username ?? user.name}</span></NavLink><details className="corp-profile-menu"><summary aria-label={language === "tr" ? "Profil menüsünü aç" : "Open profile menu"}><ChevronDown size={15}/></summary><div><NavLink to={`/users/id/${user.id}`}><UserRound size={17}/>{t("profile")}</NavLink><NavLink to="/identity"><QrCode size={17}/>{t("memberId")}</NavLink><NavLink to="/tickets"><Ticket size={17}/>{t("myTickets")}</NavLink><NavLink to="/settings"><Settings size={17}/>{t("settingsCenter")}</NavLink><NavLink to="/contacts"><Users size={17}/>{t("findFriends")}</NavLink><section className="profile-language"><span>{t("language")}</span><button className={language === "tr" ? "active" : ""} onClick={() => setLanguage("tr")} type="button">TR</button><button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")} type="button">EN</button></section><button onClick={() => { clearUserSession(); window.location.assign("/"); }} type="button"><LogOut size={17}/>{t("logOut")}</button></div></details></div><NavLink className="corp-topbar-notifications" to="/notifications"><Bell size={15}/><span>{t("notifications")}</span>{unreadNotifications ? <b>{unreadNotifications}</b> : null}</NavLink></div>
          </> : <>
            <a className="corp-topbar-link" href={publicSiteHref("/login")}>{t("login")}</a>
            <a className="corp-topbar-cta" href={publicSiteHref("/onboarding")}>{t("signUp")}</a>
          </>}
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
          {user ? <>
            <div className="mobile-menu-profile-block"><NavLink className="mobile-menu-profile" to={`/users/id/${user.id}`} onClick={() => setMenuOpen(false)}>{user.avatarUrl ? <img alt="" src={resolveMediaUrl(user.avatarUrl)}/> : <span>{user.name.slice(0, 1).toUpperCase()}</span>}<div><strong>@{user.username ?? user.name}</strong></div></NavLink><NavLink className="mobile-profile-notifications" to="/notifications" onClick={() => setMenuOpen(false)}><Bell size={15}/> {t("notifications")}{unreadNotifications ? <b className="mobile-notification-badge">{unreadNotifications}</b> : null}</NavLink></div>
            <NavLink to="/search" onClick={() => setMenuOpen(false)}><Search size={18} /> {t("search")}</NavLink>
            <NavLink to="/identity" onClick={() => setMenuOpen(false)}><QrCode size={18} /> {t("memberId")}</NavLink>
            <NavLink to="/community" onClick={() => setMenuOpen(false)}><Users size={18} /> {t("membersAndLists")}</NavLink>
            <NavLink to="/settings" onClick={() => setMenuOpen(false)}><Settings size={18} /> {t("settingsCenter")}</NavLink>
            <NavLink to="/tickets" onClick={() => setMenuOpen(false)}><Ticket size={18} /> {t("myTickets")}</NavLink>
            <button className="mobile-menu-logout" onClick={() => { clearUserSession(); window.location.assign("/"); }} type="button"><LogOut size={18} /> {t("logOut")}</button>
          </> : <>
            <a className="corp-mobile-menu-link" href={publicSiteHref("/login")} onClick={() => setMenuOpen(false)}>{t("login")}</a>
            <a className="corp-mobile-menu-cta" href={publicSiteHref("/onboarding")} onClick={() => setMenuOpen(false)}>{t("signUp")}</a>
          </>}
        </nav>
      </div>

      <nav className="mobile-tab-bar" aria-label={t("mobileNavigation")}>
        {user ? <>
        <NavLink to="/feed"><Home size={20}/><span>{t("feed")}</span></NavLink>
        <NavLink to="/tags"><Tag size={20}/><span>{t("tags")}</span></NavLink>
        <NavLink to="/events"><CalendarDays size={20}/><span>{t("events")}</span></NavLink>
        <NavLink to="/places"><MapPin size={20}/><span>{t("places")}</span></NavLink>
        <NavLink to="/messages"><MessageCircle size={20}/><span>{t("messages")}</span>{conversationsQuery.data?.totalUnread ? <b>{conversationsQuery.data.totalUnread}</b> : null}</NavLink>
        <button aria-label={t("menuOpen")} onClick={() => setMenuOpen(true)} type="button"><Menu size={20}/><span>{t("menu")}</span></button>
        </> : <><NavLink to="/"><Home size={20}/><span>{t("home")}</span></NavLink><NavLink to="/events"><CalendarDays size={20}/><span>{t("events")}</span></NavLink><NavLink to="/places"><MapPin size={20}/><span>{t("places")}</span></NavLink><NavLink to="/tags"><Tag size={20}/><span>{t("tags")}</span></NavLink><button aria-label={t("menuOpen")} onClick={() => setMenuOpen(true)} type="button"><Menu size={20}/><span>{t("menu")}</span></button></>}
      </nav>

      <main>
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
