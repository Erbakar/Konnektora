import { Link } from "react-router-dom";
import { useLanguage } from "../lib/i18n";

export function SiteFooter() {
  const { t } = useLanguage();
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <img alt="Konnektora" src="/brand/konnektora-logo.svg" />
          <p>{t("footerCopy")}</p>
        </div>
        <div className="site-footer-columns">
          <div>
            <strong>{t("discover")}</strong>
            <Link to="/events">{t("events")}</Link>
            <Link to="/places">{t("places")}</Link>
            <Link to="/messages">{t("messages")}</Link>
            <Link to="/events?tag=startup">{t("tags")}</Link>
            <Link to="/events?tag=networking">{t("networking")}</Link>
          </div>
          <div>
            <strong>{t("community")}</strong>
            <Link to="/events?tag=founder">{t("founders")}</Link>
            <Link to="/events?tag=yatirim">{t("investment")}</Link>
            <Link to="/admin">{t("organizerTools")}</Link>
          </div>
          <div>
            <strong>Konnektora</strong>
            <a href="https://github.com/Erbakar/Konnektora" rel="noreferrer" target="_blank">
              GitHub
            </a>
            <Link to="/admin">{t("adminLogin")}</Link>
            <Link to="/contact">{t("contact")}</Link>
            <Link to="/help">{t("help")}</Link>
            <Link to="/about">{t("about")}</Link>
            <Link to="/privacy">{t("privacy")}</Link>
            <Link to="/terms">{t("terms")}</Link>
            <Link to="/cookies">{t("cookies")}</Link>
          </div>
        </div>
      </div>
      <div className="site-footer-bottom">
        <span>© {new Date().getFullYear()} Konnektora</span>
        <span>{t("closedBeta")}</span>
      </div>
    </footer>
  );
}
