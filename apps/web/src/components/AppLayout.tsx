import { useQuery } from "@tanstack/react-query";
import type { Notification } from "@konnektora/shared";
import { Bell, CalendarDays, ChevronDown, Home, LogOut, MapPin, Menu, MessageCircle, Navigation, QrCode, Search, Settings, Tag, Ticket, UserRound, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { SiteFooter } from "./SiteFooter";
import { clearUserSession, getUserSession, listConversations, listMyNotifications, markMyNotificationRead, resolveMediaUrl, updatePreferredLanguage, USER_SESSION_CHANGED_EVENT } from "../lib/api";
import { publicSiteHref } from "../lib/domains";
import { useLanguage } from "../lib/i18n";
import { DialogAccessibilityManager } from "./DialogAccessibilityManager";
import { CheckInDecisionDialog } from "./CheckInDecisionDialog";

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [locationIntroOpen, setLocationIntroOpen] = useState(false);
  const [liveCheckInDecision, setLiveCheckInDecision] = useState<Notification | null>(null);
  const [, setSessionRevision] = useState(0);
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const openedMemberScans = useRef(new Set<string>());
  const openedCheckInDecisions = useRef(new Set<string>());
  const scanSessionStartedAt = useRef(Date.now());
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
    refetchInterval: 2_500,
  });
  const unreadNotifications = notificationsQuery.data?.filter((item) => !item.readAt).length ?? 0;

  useEffect(() => {
    if (!user) return;
    void updatePreferredLanguage(language).catch(() => undefined);
  }, [language, user?.id]);

  useEffect(() => {
    const scan = notificationsQuery.data?.find((item) => item.type === "member_scan" && !item.readAt && item.targetId && item.createdAt && new Date(item.createdAt).getTime() >= scanSessionStartedAt.current && !openedMemberScans.current.has(item.id));
    if (!scan?.targetId) return;
    openedMemberScans.current.add(scan.id);
    navigate(`/users/id/${scan.targetId}`);
    void markMyNotificationRead(scan.id).then(() => notificationsQuery.refetch());
  }, [navigate, notificationsQuery.data]);

  useEffect(() => {
    if (liveCheckInDecision) return;
    const decisionTypes = new Set(["event_check_in_admitted", "event_check_in_declined", "place_check_in_admitted", "place_check_in_declined"]);
    const decision = notificationsQuery.data?.find((item) => decisionTypes.has(item.type) && !item.readAt && item.createdAt && new Date(item.createdAt).getTime() >= scanSessionStartedAt.current && !openedCheckInDecisions.current.has(item.id));
    if (!decision) return;
    openedCheckInDecisions.current.add(decision.id);
    setLiveCheckInDecision(decision);
  }, [liveCheckInDecision, notificationsQuery.data]);

  useEffect(() => {
    const refreshSession = () => setSessionRevision((revision) => revision + 1);
    window.addEventListener(USER_SESSION_CHANGED_EVENT, refreshSession);
    return () => window.removeEventListener(USER_SESSION_CHANGED_EVENT, refreshSession);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!user || user.role !== "user" || user.onboardingCompleted !== false || location.pathname === "/onboarding" || location.pathname === "/verify-email") return;
    navigate("/onboarding", { replace: true });
  }, [location.pathname, navigate, user]);

  useEffect(() => {
    const relevantPage = location.pathname === "/" || location.pathname.startsWith("/events") || location.pathname.startsWith("/places");
    setLocationIntroOpen(Boolean(relevantPage && navigator.geolocation && sessionStorage.getItem("konnektora:location-intro") !== "seen"));
  }, [location.pathname]);

  function requestLocationPermission() {
    sessionStorage.setItem("konnektora:location-intro", "seen");
    setLocationIntroOpen(false);
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      () => window.dispatchEvent(new Event("konnektora:location-updated")),
      () => window.dispatchEvent(new Event("konnektora:location-updated")),
      { maximumAge: 300_000, timeout: 10_000 },
    );
  }

  useEffect(() => {
    const announced = new WeakSet<Element>();
    const revealFeedback = () => {
      document.querySelectorAll(".form-error, .service-feedback--error").forEach((element) => {
        if (announced.has(element) || !element.textContent?.trim()) return;
        announced.add(element);
        element.setAttribute("role", "alert");
        element.setAttribute("aria-live", "assertive");
        const box = element.getBoundingClientRect();
        if (box.top < 0 || box.bottom > window.innerHeight) element.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      document.querySelectorAll(".form-success, .service-feedback--success").forEach((element) => {
        element.setAttribute("role", "status");
        element.setAttribute("aria-live", "polite");
      });
    };
    revealFeedback();
    const observer = new MutationObserver(revealFeedback);
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className={`app-shell${user ? " authenticated-shell" : ""}`}>
      <DialogAccessibilityManager />
      {liveCheckInDecision ? <CheckInDecisionDialog notification={liveCheckInDecision} onClose={() => { const id = liveCheckInDecision.id; setLiveCheckInDecision(null); void markMyNotificationRead(id).then(() => notificationsQuery.refetch()); }}/>: null}
      {locationIntroOpen ? <div className="dialog-backdrop location-intro-backdrop" role="presentation"><section aria-describedby="location-intro-description" aria-labelledby="location-intro-title" aria-modal="true" className="content-dialog location-intro-dialog" role="dialog"><span className="location-intro-icon"><Navigation size={25}/></span><p className="eyebrow">{language === "tr" ? "Konum tabanlı keşif" : "Location-based discovery"}</p><h2 id="location-intro-title">{language === "tr" ? "Size daha yakın deneyimleri gösterelim" : "Let us show experiences closer to you"}</h2><p id="location-intro-description">{language === "tr" ? "Konnektora, özellikle etkinlikler ve mekânlarda ilgi alanı ve konum bazlı bir deneyim sunar. Bu ekranı kapattığınızda tarayıcınız konum erişimi için izin isteyecek." : "Konnektora uses interests and location to improve event and venue discovery. After you continue, your browser will ask for location access."}</p><button className="primary-action" onClick={requestLocationPermission} type="button">{language === "tr" ? "Tamam, devam et" : "Continue"}</button></section></div> : null}
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
