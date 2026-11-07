import { ChevronDown, Facebook, Instagram, Linkedin, Youtube } from "lucide-react";
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
            <a aria-label="TikTok" href="https://www.tiktok.com/@_konnektora" rel="noreferrer" target="_blank"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 2c.4 2.8 2 4.5 4.4 4.7v3.5a8.8 8.8 0 0 1-4.4-1.4v7.1a6 6 0 1 1-5.2-5.9v3.6a2.5 2.5 0 1 0 1.7 2.3V2z"/></svg></a>
            <a aria-label="X" href="https://x.com/konnektora" rel="noreferrer" target="_blank">X</a>
            <a aria-label="YouTube" href="https://youtube.com/@konnektora" rel="noreferrer" target="_blank"><Youtube size={19}/></a>
            <a aria-label="LinkedIn" href="https://www.linkedin.com/company/konnektora-app/" rel="noreferrer" target="_blank"><Linkedin size={19}/></a>
          </nav>
        </div>
        <nav className="site-footer-columns" aria-label={language === "tr" ? "Alt bilgi bağlantıları" : "Footer links"}>
          <div className={`site-footer-section${openSection === "konnektora" ? " is-open" : ""}`}>
            <button className="site-footer-section-toggle" aria-controls="footer-konnektora-links" aria-expanded={openSection === "konnektora"} onClick={() => toggleSection("konnektora")} type="button">
              <span>Konnektora</span><ChevronDown size={18} />
            </button>
            <strong className="site-footer-section-title">Konnektora</strong>
            <div className="site-footer-section-links" id="footer-konnektora-links">
              <a href={publicSiteHref("/store")}>{language === "tr" ? "Mağaza & Fiyatlar" : "Store & Pricing"}</a>
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
              <Link to="/press">{language === "tr" ? "Basın Kiti" : "Press Kit"}</Link>
            </div>
          </div>
          <div className={`site-footer-section${openSection === "legal" ? " is-open" : ""}`}>
            <button className="site-footer-section-toggle" aria-controls="footer-legal-links" aria-expanded={openSection === "legal"} onClick={() => toggleSection("legal")} type="button">
              <span>{language === "tr" ? "Şirket" : "Company"}</span><ChevronDown size={18} />
            </button>
            <strong className="site-footer-section-title">{language === "tr" ? "Şirket" : "Company"}</strong>
            <div className="site-footer-section-links" id="footer-legal-links">
              <Link to="/about">{t("about")}</Link>
              <Link to="/privacy">{t("privacy")}</Link>
              <Link to="/data-deletion">{language === "tr" ? "Veri silme talebi" : "Data deletion"}</Link>
              <Link to="/cookies">{language === "tr" ? "Çerez Politikası" : "Cookie Policy"}</Link>
              <Link to="/kvkk">KVKK</Link>
              <Link to="/information">{language === "tr" ? "Bilgilendirme" : "Information"}</Link>
              <Link to="/terms">{language === "tr" ? "Kullanım Şartları" : "Terms of Use"}</Link>
              <Link to="/distance-selling">{language === "tr" ? "Mesafeli Satış Sözleşmesi" : "Distance Sales Agreement"}</Link>
              <Link to="/pre-information">{language === "tr" ? "Ön Bilgilendirme Formu" : "Preliminary Information Form"}</Link>
              <Link to="/cookie-preferences">{language === "tr" ? "Çerez Tercihleri" : "Cookie Preferences"}</Link>
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
