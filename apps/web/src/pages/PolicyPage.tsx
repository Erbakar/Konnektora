import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { PolicyType } from "@konnektora/shared";
import { getFallbackPolicy, getPolicy } from "../lib/api";
import { useLanguage } from "../lib/i18n";

const policyRouteTypes: Record<string, PolicyType> = {
  privacy: "privacy",
  terms: "terms",
  cookies: "cookies",
  about: "about"
};

const fallbackCopy: Record<PolicyType, { tr: { title: string; body: string }; en: { title: string; body: string } }> = {
  privacy: {
    tr: { title: "Gizlilik Politikası", body: "Konnektora, hesap ve topluluk deneyimi için gerekli verileri güvenli biçimde işler. Ayrıntılı politika içeriği yönetim panelinden güncellenebilir." },
    en: { title: "Privacy Policy", body: "Konnektora processes the data required for account and community experiences securely. The detailed policy can be updated from the administration panel." },
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
  const isPublished = Boolean(policyQuery.data?.publishedAt);

  return (
    <section className="page policy-page">
      <div className="policy-header">
        <p className="eyebrow">Konnektora</p>
        <h1>{isPublished ? policyQuery.data?.title : fallback.title}</h1>
        <p>
          {isPublished
            ? t(`Son yayın tarihi: ${new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(policyQuery.data!.publishedAt!))}`, `Last published: ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(policyQuery.data!.publishedAt!))}`)
            : t("Bu sayfa admin panelinden yayınlandığında güncel içerik burada görünür.", "Updated content will appear here when this page is published from the administration panel.")}
        </p>
      </div>
      <article className="policy-content">
        {policyQuery.data ? (
          isPublished ? <div dangerouslySetInnerHTML={{ __html: policyQuery.data.body }} /> : <p>{fallback.body}</p>
        ) : (
          <div>
            <p>{language === "tr" ? "Bu politika sayfası henüz yayınlanmadı." : "This policy has not been published yet."}</p>
            <Link className="corp-link" to="/">
              {t("Ana sayfaya dön", "Back to home")}
            </Link>
          </div>
        )}
      </article>
    </section>
  );
}
