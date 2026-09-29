import { ChevronDown, Facebook, Instagram, Youtube } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { publicSiteHref } from "../lib/domains";
import { useLanguage } from "../lib/i18n";

type FooterSection = "konnektora" | "discover" | "help" | "legal";

export function SiteFooter() {
  const { language, setLanguage, t } = useLanguage();
  const [openSection, setOpenSection] = useState<FooterSection | null>("discover");
  const toggleSection = (section: FooterSection) => {
    setOpenSection((current) => current === section ? null : section);
  };

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <img alt="Konnektora" src="/brand/konnektora-logo.svg" />
          <p>{t("footerCopy")}</p>
          <nav aria-label={language === "tr" ? "Sosyal medya" : "Social media"} className="site-footer-social">
            <a aria-label="Instagram" href="https://www.instagram.com/konnektora/" rel="noreferrer" target="_blank"><Instagram size={19}/></a>
            <a aria-label="Facebook" href="https://www.facebook.com/konnektora" rel="noreferrer" target="_blank"><Facebook size={19}/></a>
            <a aria-label="TikTok" href="https://www.tiktok.com/@_konnektora" rel="noreferrer" target="_blank">TikTok</a>
            <a aria-label="X" href="https://x.com/konnektora" rel="noreferrer" target="_blank">X</a>
            <a aria-label="YouTube" href="https://youtube.com/@konnektora" rel="noreferrer" target="_blank"><Youtube size={19}/></a>
          </nav>
        </div>
        <nav className="site-footer-columns" aria-label={language === "tr" ? "Alt bilgi bağlantıları" : "Footer links"}>
          <div className={`site-footer-section${openSection === "konnektora" ? " is-open" : ""}`}>
            <button className="site-footer-section-toggle" aria-controls="footer-konnektora-links" aria-expanded={openSection === "konnektora"} onClick={() => toggleSection("konnektora")} type="button">
              <span>Konnektora</span><ChevronDown size={18} />
            </button>
            <strong className="site-footer-section-title">Konnektora</strong>
            <div className="site-footer-section-links" id="footer-konnektora-links">
              <a href={publicSiteHref("/store")}>{language === "tr" ? "Mağaza" : "Store"}</a>
              <Link to="/business">{language === "tr" ? "İşletmeler için" : "For business"}</Link>
            </div>
          </div>
          <div className={`site-footer-section${openSection === "discover" ? " is-open" : ""}`}>
            <button className="site-footer-section-toggle" aria-controls="footer-discover-links" aria-expanded={openSection === "discover"} onClick={() => toggleSection("discover")} type="button">
              <span>{t("discover")}</span><ChevronDown size={18} />
            </button>
            <strong className="site-footer-section-title">{t("discover")}</strong>
            <div className="site-footer-section-links" id="footer-discover-links">
              <Link to="/events">{t("events")}</Link>
              <Link to="/places">{t("places")}</Link>
              <Link to="/tags">{t("tags")}</Link>
            </div>
          </div>
          <div className={`site-footer-section${openSection === "help" ? " is-open" : ""}`}>
            <button className="site-footer-section-toggle" aria-controls="footer-help-links" aria-expanded={openSection === "help"} onClick={() => toggleSection("help")} type="button">
              <span>{language === "tr" ? "Yardım" : "Help"}</span><ChevronDown size={18} />
            </button>
            <strong className="site-footer-section-title">{language === "tr" ? "Yardım" : "Help"}</strong>
            <div className="site-footer-section-links" id="footer-help-links">
              <Link to="/contact">{t("contact")}</Link>
              <Link to="/help">{t("help")}</Link>
            </div>
          </div>
          <div className={`site-footer-section${openSection === "legal" ? " is-open" : ""}`}>
            <button className="site-footer-section-toggle" aria-controls="footer-legal-links" aria-expanded={openSection === "legal"} onClick={() => toggleSection("legal")} type="button">
              <span>{language === "tr" ? "Yasal" : "Legal"}</span><ChevronDown size={18} />
            </button>
            <strong className="site-footer-section-title">{language === "tr" ? "Yasal" : "Legal"}</strong>
            <div className="site-footer-section-links" id="footer-legal-links">
              <Link to="/about">{t("about")}</Link>
              <Link to="/privacy">{t("privacy")}</Link>
              <Link to="/terms">{t("terms")}</Link>
              <Link to="/cookies">{t("cookies")}</Link>
            </div>
          </div>
          <div className="site-footer-language">
            <strong>{language === "tr" ? "Dil" : "Language"}</strong>
            <div className="site-footer-language-options" aria-label={language === "tr" ? "Dil seçimi" : "Language selection"} role="group">
              <button className={language === "tr" ? "active" : ""} onClick={() => setLanguage("tr")} type="button">Türkçe</button>
              <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")} type="button">English</button>
            </div>
          </div>
        </nav>
      </div>
      <div className="site-footer-bottom">
        <span>© {new Date().getFullYear()} Konnektora</span>
        <span>{t("closedBeta")}</span>
      </div>
    </footer>
  );
}
