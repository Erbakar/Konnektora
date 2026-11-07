import { LegalCompanyDetails } from "../components/LegalCompanyDetails";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { PolicyType } from "@konnektora/shared";
import { getFallbackPolicy, getPolicy } from "../lib/api";
import { useLanguage } from "../lib/i18n";
import { SocialLoginPrivacyNotice } from "../components/SocialLoginPrivacyNotice";
import { aboutContent, aboutHero } from "../lib/aboutContent";
import { privacyDetails, termsDetails } from "../lib/policyContent";

const policyRouteTypes: Record<string, PolicyType> = {
  privacy: "privacy",
  terms: "terms",
  cookies: "cookies",
  about: "about"
};

const fallbackCopy: Record<PolicyType, { tr: { title: string; body: string }; en: { title: string; body: string } }> = {
  privacy: {
    tr: { title: "Gizlilik Politikası", body: "Konnektora; hesap oluşturma ve doğrulama için ad, e-posta ve telefon bilgilerini, profilinizi oluşturmak için paylaştığınız profil ve ilgi alanı bilgilerini işler. Paylaştığınız içerikler, mesajlar ve etkinlik veya mekân katılım bilgileriniz ilgili topluluk özelliklerini sunmak için kullanılır. Profil bilgilerinin kimler tarafından görülebileceğini Ayarlar → Gizlilik bölümünden yönetebilirsiniz. Destek formuna gönderdiğiniz ad, iletişim bilgileri ve mesaj içeriği talebinizin incelenmesi ve size yanıt verilmesi için saklanır." },
    en: { title: "Privacy Policy", body: "Konnektora processes your name, email and phone number to create and verify your account, and the profile and interest details you provide to build your profile. Your shared content, messages and event or place participation details are used to provide the relevant community features. You can manage visibility of your profile details under Settings → Privacy. Your name, contact details and messages submitted to support are stored to review your request and respond to you." },
  },
  terms: {
    tr: { title: "Kullanım Koşulları", body: "Konnektora'yı kullanırken topluluk kurallarına, güvenlik ilkelerine ve yürürlükteki kullanım koşullarına uymanız gerekir." },
    en: { title: "Terms of Use", body: "When using Konnektora, you must follow the community rules, safety principles and applicable terms of use." },
  },
  cookies: {
    tr: { title: "Çerez Politikası", body: "Konnektora, oturum güvenliği ve temel site işlevleri için gerekli çerezleri kullanır." },
    en: { title: "Cookie Policy", body: "Konnektora uses cookies required for session security and essential site functionality." },
  },
  about: {
    tr: { title: "Hakkımızda", body: "Konnektora, anlamlı profesyonel bağlantılar ve güvenilir topluluk etkinlikleri için geliştirilmiş seçkin bir platformdur." },
    en: { title: "About us", body: "Konnektora is a curated platform built for meaningful professional connections and trusted community events." },
  },
};

export function PolicyPage({ type = "privacy" }: { type?: PolicyType }) {
  const { language } = useLanguage();
  const policyType = policyRouteTypes[type] ?? type;
  const policyQuery = useQuery({
    queryKey: ["policy", policyType],
    queryFn: () => getPolicy(policyType),
    placeholderData: getFallbackPolicy(policyType)
  });
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const fallback = fallbackCopy[policyType][language];
  // Older CMS terms must not hide the completed terms released on 4 October.
  const isPublished = Boolean(policyQuery.data?.publishedAt) && (
    (policyType !== "terms" && policyType !== "about") || new Date(policyQuery.data!.publishedAt!).getTime() >= Date.parse(policyType === "about" ? "2026-11-07T00:00:00Z" : "2026-10-04T00:00:00Z")
  );

  return (
    <section className="page policy-page">
      <div className="policy-header">
        <p className="eyebrow">Konnektora</p>
        <h1>{isPublished ? policyQuery.data?.title : fallback.title}</h1>
        <p>
          {isPublished
            ? t(`Son yayın tarihi: ${new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(policyQuery.data!.publishedAt!))}`, `Last published: ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(policyQuery.data!.publishedAt!))}`)
            : policyType === "about"
              ? aboutHero[language]
              : policyType === "privacy"
              ? t("Hesap, profil ve sosyal giriş verileri hakkında bilgi.", "Information about account, profile and social login data.")
              : policyType === "terms"
                ? t("Son güncelleme: 4 Ekim 2026", "Last updated: 4 October 2026")
                : t("Bu sayfa admin panelinden yayınlandığında güncel içerik burada görünür.", "Updated content will appear here when this page is published from the administration panel.")}
        </p>
      </div>
      <article className="policy-content">
        {policyQuery.data || policyType === "privacy" || policyType === "terms" || policyType === "about" ? (
          isPublished ? <div dangerouslySetInnerHTML={{ __html: policyQuery.data!.body }} /> : policyType === "about" ? <div className="about-content">{aboutContent[language].map((section, sectionIndex) => <section key={section.title ?? sectionIndex}>{section.title ? <h2>{section.title}</h2> : null}{section.blocks.map((block, index) => block.type === "list" ? <ul key={index}>{block.items.map(item => <li key={item}>{item}</li>)}</ul> : block.type === "h3" ? <h3 key={index}>{block.text}</h3> : block.type === "motto" ? <p className="about-motto" key={index}>{block.text}</p> : <p className={block.type === "lead" ? "about-lead" : undefined} key={index}>{block.text}</p>)}</section>)}</div> : policyType === "terms" ? termsDetails[language].map((section) => (
            <section key={section.title}><h2>{section.title}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>
          )) : <p>{fallback.body}</p>
        ) : (
          <div>
            <p>{language === "tr" ? "Bu politika sayfası henüz yayınlanmadı." : "This policy has not been published yet."}</p>
            <Link className="corp-link" to="/">
              {t("Ana sayfaya dön", "Back to home")}
            </Link>
          </div>
        )}
      </article>
      {policyType === "privacy" ? <article className="policy-content">
        {privacyDetails[language].map((section) => <section key={section.title}><h2>{section.title}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}
        <h2>{t("Hizmet sağlayıcı belgeleri", "Service provider documents")}</h2>
        <ul>
          <li><a href="https://railway.com/legal/dpa" target="_blank" rel="noreferrer">Railway</a></li>
          <li><a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noreferrer">Cloudflare</a></li>
          <li><a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noreferrer">Resend</a></li>
          <li><a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google</a></li>
          <li><a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noreferrer">Meta</a></li>
        </ul>
        <SocialLoginPrivacyNotice />
      </article> : null}
      {policyType !== "about" ? <LegalCompanyDetails /> : null}
      {policyType === "privacy" ? <article className="policy-content"><Link to="/kvkk">{t("KVKK Aydınlatma Metni", "KVKK Privacy Notice")}</Link></article> : null}
      {policyType === "terms" ? <article className="policy-content"><Link to="/privacy">{t("Gizlilik politikası", "Privacy policy")}</Link>{" · "}<Link to="/data-deletion">{t("Veri silme talebi", "Data deletion request")}</Link></article> : null}
    </section>
  );
}
