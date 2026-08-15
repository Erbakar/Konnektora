import { Link } from "react-router-dom";
import { useLanguage } from "../lib/i18n";

export function SiteFooter() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <img alt="Konnektora" src="/brand/konnektora-logo.svg" />
          <p>{t("footerCopy")}</p>
        </div>
        <div className="site-footer-columns">
          <div>
            <strong>Konnektora</strong>
            <Link to="/store">{language === "tr" ? "Mağaza" : "Store"}</Link>
            <Link to="/business">For business</Link>
          </div>
          <div>
            <strong>{t("discover")}</strong>
            <Link to="/events">{t("events")}</Link>
            <Link to="/places">{t("places")}</Link>
            <Link to="/tags">{t("tags")}</Link>
          </div>
          <div>
            <strong>{language === "tr" ? "Yardım" : "Help"}</strong>
            <Link to="/contact">{t("contact")}</Link>
            <Link to="/help">{t("help")}</Link>
          </div>
          <div>
            <strong>{language === "tr" ? "Yasal" : "Legal"}</strong>
            <Link to="/about">{t("about")}</Link>
            <Link to="/privacy">{t("privacy")}</Link>
            <Link to="/terms">{t("terms")}</Link>
            <Link to="/cookies">{t("cookies")}</Link>
          </div>
          <div>
            <strong>Languages</strong>
            <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")} type="button">English</button>
            <button className={language === "tr" ? "active" : ""} onClick={() => setLanguage("tr")} type="button">Türkçe</button>
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
