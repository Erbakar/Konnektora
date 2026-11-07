import { legalCompany } from "../lib/legalContent";
import { useLanguage } from "../lib/i18n";
export function LegalCompanyDetails() {
  const { language } = useLanguage();
  const tr = language === "tr";
  return <section className="policy-content legal-company">
    <h2>{tr ? "Şirket ve iletişim bilgileri" : "Company and contact details"}</h2>
    <p><strong>{legalCompany.name}</strong></p>
    <p>{legalCompany.address}</p>
    <p>{tr ? "Vergi dairesi" : "Tax office"}: {legalCompany.taxOffice} · {tr ? "Vergi kimlik numarası" : "Tax number"}: {legalCompany.taxNumber}</p>
    <p><a href={legalCompany.domain}>konnektora.com</a> · <a href={`mailto:${legalCompany.email}`}>{legalCompany.email}</a></p>
  </section>;
}
