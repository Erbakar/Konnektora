import { useQuery } from "@tanstack/react-query";
import { Bell, CalendarDays, ChevronDown, Home, LogOut, MapPin, Menu, MessageCircle, QrCode, Search, Settings, Tag, Ticket, UserRound, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { SiteFooter } from "./SiteFooter";
import { clearUserSession, getUserSession, listConversations, listMyNotifications, resolveMediaUrl } from "../lib/api";
import { publicSiteHref } from "../lib/domains";
import { useLanguage } from "../lib/i18n";

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
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
    setMoreOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!moreMenuRef.current?.contains(event.target as Node)) setMoreOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [moreOpen]);

  return (
    <div className={`app-shell${user ? " authenticated-shell" : ""}`}>
      <header className="corp-topbar">
        <a href={publicSiteHref()} className="brand" aria-label="Konnektora ana sayfa">
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
          <NavLink to="/messages">
            <MessageCircle size={18} />
            {t("messages")}
            {conversationsQuery.data?.totalUnread ? <span className="nav-unread-badge">{conversationsQuery.data.totalUnread}</span> : null}
          </NavLink>
          <div className={`corp-nav-more${moreOpen ? " is-open" : ""}`} ref={moreMenuRef}>
            <button aria-expanded={moreOpen} aria-haspopup="menu" onClick={() => setMoreOpen((open) => !open)} type="button">
              {language === "tr" ? "Diğer" : "More"} <ChevronDown size={16} />
            </button>
            {moreOpen ? <div className="corp-nav-more-menu" role="menu">
              <NavLink role="menuitem" to="/tickets"><Ticket size={18} /><span>{language === "tr" ? "Biletlerim" : "My tickets"}</span></NavLink>
              <NavLink role="menuitem" to="/identity"><QrCode size={18} /><span>{t("memberId")}</span></NavLink>
              <NavLink role="menuitem" to="/search"><Search size={18} /><span>{t("search")}</span></NavLink>
              <NavLink role="menuitem" to="/community"><Users size={18} /><span>{language === "tr" ? "Üyeler" : "Members"}</span></NavLink>
            </div> : null}
          </div>
          </> : <>
            <NavLink to="/events"><CalendarDays size={18}/>{t("events")}</NavLink>
            <NavLink to="/places"><MapPin size={18}/>{t("places")}</NavLink>
            <NavLink to="/tags"><Tag size={18}/>{t("tags")}</NavLink>
          </>}
        </nav>

        <div className="corp-topbar-actions">
          <div className="language-switch" aria-label="Dil / Language">
            <button className={language === "tr" ? "active" : ""} onClick={() => setLanguage("tr")} type="button">TR</button>
            <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")} type="button">EN</button>
          </div>
          <NavLink aria-label={t("search")} className="corp-header-search" to="/search"><Search size={20}/><span>{t("search")}</span></NavLink>
          {user ? <>
            <div className="corp-user-links"><div className="corp-profile-cluster"><NavLink className="corp-user-identity" to={`/users/id/${user.id}`}>{user.avatarUrl ? <img alt="" src={resolveMediaUrl(user.avatarUrl)}/> : <span className="corp-user-avatar">{user.name.slice(0, 1).toUpperCase()}</span>}<span>{user.name}</span></NavLink><details className="corp-profile-menu"><summary aria-label="Profil menüsünü aç"><ChevronDown size={15}/></summary><div><NavLink to={`/users/id/${user.id}`}><UserRound size={17}/>Profilim</NavLink><NavLink to="/settings"><Settings size={17}/>Ayarlar Merkezi</NavLink><NavLink to="/contacts"><Users size={17}/>Arkadaşlarımı Bul & Davet Et</NavLink><section className="profile-language"><span>Dil</span><button className={language === "tr" ? "active" : ""} onClick={() => setLanguage("tr")} type="button">TR</button><button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")} type="button">EN</button></section><button onClick={() => { clearUserSession(); window.location.assign("/"); }} type="button"><LogOut size={17}/>Çıkış</button></div></details></div><NavLink className="corp-topbar-notifications" to="/notifications"><Bell size={15}/><span>{language === "tr" ? "Bildirimler" : "Notifications"}</span>{unreadNotifications ? <b>{unreadNotifications}</b> : null}</NavLink></div>
          </> : <>
            <a className="corp-topbar-link" href={publicSiteHref("/login")}>{t("login")}</a>
            <a className="corp-topbar-cta" href={publicSiteHref("/onboarding")}>{language === "tr" ? "Kayıt ol" : "Sign up"}</a>
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
            <NavLink className="mobile-menu-profile" to={`/users/id/${user.id}`} onClick={() => setMenuOpen(false)}>{user.avatarUrl ? <img alt="" src={resolveMediaUrl(user.avatarUrl)}/> : <span>{user.name.slice(0, 1).toUpperCase()}</span>}<div><strong>{user.name}</strong><small>{user.email}</small></div></NavLink>
            <NavLink to="/search" onClick={() => setMenuOpen(false)}><Search size={18} /> {t("search")}</NavLink>
            <NavLink to="/identity" onClick={() => setMenuOpen(false)}><QrCode size={18} /> {t("memberId")}</NavLink>
            <NavLink to="/community" onClick={() => setMenuOpen(false)}><Users size={18} /> {language === "tr" ? "Üyeler" : "Members"}</NavLink>
            <NavLink to="/notifications" onClick={() => setMenuOpen(false)}><Bell size={18} /> {language === "tr" ? "Bildirimler" : "Notifications"}{unreadNotifications ? <b className="mobile-notification-badge">{unreadNotifications}</b> : null}</NavLink>
            <NavLink to="/settings" onClick={() => setMenuOpen(false)}><Settings size={18} /> {language === "tr" ? "Ayarlar Merkezi" : "Settings center"}</NavLink>
            <NavLink to="/tickets" onClick={() => setMenuOpen(false)}><Ticket size={18} /> {language === "tr" ? "Biletlerim" : "My tickets"}</NavLink>
            <button className="mobile-menu-logout" onClick={() => { clearUserSession(); window.location.assign("/"); }} type="button"><LogOut size={18} /> {language === "tr" ? "Çıkış" : "Log out"}</button>
          </> : <>
            <a className="corp-mobile-menu-link" href={publicSiteHref("/login")} onClick={() => setMenuOpen(false)}>{t("login")}</a>
            <a className="corp-mobile-menu-cta" href={publicSiteHref("/onboarding")} onClick={() => setMenuOpen(false)}>{language === "tr" ? "Kayıt ol" : "Sign up"}</a>
          </>}
        </nav>
      </div>

      <nav className="mobile-tab-bar" aria-label="Mobil ana navigasyon">
        {user ? <>
        <NavLink to="/feed"><Home size={20}/><span>Feed</span></NavLink>
        <NavLink to="/tags"><Tag size={20}/><span>Etiketler</span></NavLink>
        <NavLink to="/events"><CalendarDays size={20}/><span>Etkinlikler</span></NavLink>
        <NavLink to="/places"><MapPin size={20}/><span>Mekânlar</span></NavLink>
        <NavLink to="/messages"><MessageCircle size={20}/><span>Mesajlar</span>{conversationsQuery.data?.totalUnread ? <b>{conversationsQuery.data.totalUnread}</b> : null}</NavLink>
        <button aria-label="Menüyü aç" onClick={() => setMenuOpen(true)} type="button"><Menu size={20}/><span>Menü</span></button>
        </> : <><NavLink to="/"><Home size={20}/><span>Anasayfa</span></NavLink><NavLink to="/events"><CalendarDays size={20}/><span>Etkinlikler</span></NavLink><NavLink to="/places"><MapPin size={20}/><span>Mekanlar</span></NavLink><NavLink to="/tags"><Tag size={20}/><span>İlgi Alanları</span></NavLink><button aria-label="Menüyü aç" onClick={() => setMenuOpen(true)} type="button"><Menu size={20}/><span>Menü</span></button></>}
      </nav>

      <main>
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
