import { Link } from "react-router-dom";
import { LegalCompanyDetails } from "../components/LegalCompanyDetails";
import { legalContent, type LegalDocumentType } from "../lib/legalContent";
import { useLanguage } from "../lib/i18n";
export function LegalPage({ type }: { type: LegalDocumentType }) {
  const { language } = useLanguage();
  const document = legalContent[type][language];
  return <section className="page policy-page">
    <header className="policy-header"><p className="eyebrow">Konnektora · konnektora.com</p><h1>{document.title}</h1><p>{language === "tr" ? "Son güncelleme: 13 Ekim 2026" : "Last updated: 13 October 2026"}</p></header>
    <article className="policy-content">{document.sections.map(section => <section key={section.title}><h2>{section.title}</h2>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</section>)}</article>
    <LegalCompanyDetails />
    <nav className="policy-content legal-related" aria-label={language === "tr" ? "İlgili yasal metinler" : "Related legal documents"}>
      <Link to="/privacy">{language === "tr" ? "Gizlilik Politikası" : "Privacy Policy"}</Link>
      <Link to="/terms">{language === "tr" ? "Kullanım Şartları" : "Terms of Use"}</Link>
      {Object.entries(legalContent).filter(([key]) => key !== type).map(([key, content]) => <Link key={key} to={`/${key}`}>{content[language].title}</Link>)}
      <Link to="/cookie-preferences">{language === "tr" ? "Çerez Tercihleri" : "Cookie Preferences"}</Link>
      <Link to="/contact">{language === "tr" ? "İletişim" : "Contact"}</Link>
    </nav>
  </section>;
}
export function CookiePreferencesPage() {
  const { language } = useLanguage();
  const tr = language === "tr";
  return <section className="page policy-page">
    <header className="policy-header"><p className="eyebrow">Konnektora</p><h1>{tr ? "Çerez Tercihleri" : "Cookie Preferences"}</h1><p>{tr ? "Bu cihazdaki çerezleri ve site verilerini yönetin." : "Manage cookies and site data on this device."}</p></header>
    <article className="policy-content">
      <h2>{tr ? "Tarayıcı üzerinden kontrol" : "Browser controls"}</h2>
      <p>{tr ? "Bu sayfa tarayıcınızın çerez ayarlarını değiştirmez. Çerezleri engellemek veya mevcut site verilerini silmek için aşağıdaki tarayıcı rehberlerini kullanın. Oturum verilerini silmek sizi hesaptan çıkarabilir; sunucudaki hesabınızı silmez." : "This page does not change your browser settings. Use the guides below to block cookies or clear stored site data. Removing session data may sign you out, but does not delete your server-side account."}</p>
      <ul>
        <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noreferrer">Google Chrome</a></li>
        <li><a href="https://support.mozilla.org/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noreferrer">Mozilla Firefox</a></li>
        <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noreferrer">Safari</a></li>
        <li><a href="https://support.microsoft.com/search/results?query=delete%20cookies%20Microsoft%20Edge" target="_blank" rel="noreferrer">Microsoft Edge</a></li>
      </ul>
      <h2>{tr ? "Oturum, dil ve dış hizmetler" : "Sessions, language and external services"}</h2>
      <p>{tr ? "Giriş ve güvenlik verileri ilgili hizmetler için gereklidir. Dil tercihinizi sayfanın altındaki dil seçiminden değiştirebilirsiniz. Google, Facebook ve dış içerik sağlayıcılarının çerezlerini tarayıcı veya ilgili sağlayıcının gizlilik ayarlarından yönetin." : "Sign-in and security records support the corresponding services. Change language using the footer. Manage Google, Facebook and external content cookies through your browser or provider privacy settings."}</p>
      <Link to="/cookies">{tr ? "Çerez Politikasını oku" : "Read the Cookie Policy"}</Link>
    </article>
  </section>;
}
