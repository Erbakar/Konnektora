import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, LifeBuoy, MessageCircle, Search, ShieldCheck } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { listPublicFaqs, listReportRules } from "../lib/api";
import { useLanguage } from "../lib/i18n";

function normalize(value: string) {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

const faqTranslations: Record<string, { title: string; body: string }> = {
  "20000000-0000-4000-8000-000000000001": { title: "How do I update my profile details?", body: "Open the Profile section on the Account page. Edit your details and save your changes." },
  "20000000-0000-4000-8000-000000000002": { title: "How can I keep my account secure?", body: "Use a unique password, verify your contact details and close sessions on devices you do not recognise." },
  "20000000-0000-4000-8000-000000000003": { title: "How do I join an event?", body: "Use the Join option on the event details page. For events that require approval, you will be notified of the organiser's response." },
  "20000000-0000-4000-8000-000000000004": { title: "How does the refund process work?", body: "For eligible transactions, you can track the refund status from the event and payment details. The result will appear in your financial activity." },
};
const faqCategoryTranslations: Record<string, { name: string; description: string }> = {
  "hesap-ve-profil": { name: "Account and profile", description: "Account, profile and privacy settings" },
  etkinlikler: { name: "Events", description: "Attendance, invitations and event management" },
  odemeler: { name: "Payments", description: "Payments, refunds and billing" },
};

export function HelpCenterPage() {
  const { language } = useLanguage();
  const copy = (tr: string, en: string) => language === "tr" ? tr : en;
  const navigate = useNavigate();
  const location = useLocation();
  const { categorySlug, faqId } = useParams();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const [search, setSearch] = useState(query);
  const faqsQuery = useQuery({ queryKey: ["public-faqs"], queryFn: listPublicFaqs });
  const rulesQuery = useQuery({ queryKey: ["public-report-rules"], queryFn: () => listReportRules(), enabled: location.pathname.endsWith("/rules") });
  const faqs = (faqsQuery.data ?? []).map((faq) => {
    if (language === "tr") return faq;
    const translated = faqTranslations[faq.id];
    const category = faq.category ? faqCategoryTranslations[faq.category.slug] : undefined;
    return {
      ...faq,
      title: translated?.title ?? faq.title,
      body: translated?.body ?? faq.body,
      category: faq.category ? {
        ...faq.category,
        name: category?.name ?? faq.category.name,
        description: category?.description ?? faq.category.description,
      } : faq.category,
    };
  });
  const categories = useMemo(() => {
    const grouped = new Map<string, { name: string; slug: string; description: string | null; titles: string[] }>();
    faqs.forEach((faq) => {
      if (!faq.category) return;
      const current = grouped.get(faq.category.slug) ?? {
        name: faq.category.name,
        slug: faq.category.slug,
        description: faq.category.description,
        titles: []
      };
      current.titles.push(faq.title);
      grouped.set(faq.category.slug, current);
    });
    return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [faqs]);

  const selectedFaq = faqId ? faqs.find((faq) => faq.id === faqId) : undefined;
  const categoryFaqs = categorySlug
    ? faqs.filter((faq) => faq.category?.slug === categorySlug).sort((a, b) => a.title.localeCompare(b.title, "tr"))
    : [];
  const results = query
    ? faqs
        .map((faq) => {
          const title = normalize(faq.title);
          const body = normalize(faq.body);
          const terms = normalize(query).split(/\s+/).filter(Boolean);
          const score = terms.reduce((total, term) => total + (title.includes(term) ? 3 : 0) + (body.includes(term) ? 1 : 0), 0);
          return { faq, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || a.faq.title.localeCompare(b.faq.title, "tr"))
        .map((item) => item.faq)
    : [];

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const value = search.trim();
    if (value) navigate(`/help/search?q=${encodeURIComponent(value)}`);
  }

  if (location.pathname.endsWith("/rules")) {
    const activeRules = (rulesQuery.data ?? []).filter((rule) => rule.status === "active").sort((a, b) => a.title.localeCompare(b.title, "tr"));
    const groupedRules = new Map<string, typeof activeRules>();
    activeRules.forEach((rule) => groupedRules.set(rule.targetType, [...(groupedRules.get(rule.targetType) ?? []), rule]));
    const groups = [...groupedRules.entries()];
    return <div className="page help-center-page"><Link className="back-link" to="/help"><ArrowLeft size={16}/> {copy("Yardım merkezine dön", "Back to Help Centre")}</Link><div className="help-page-heading"><span className="eyebrow">{copy("Topluluk standartları", "Community standards")}</span><h1>{copy("Konnektora Kuralları", "Konnektora Rules")}</h1><p>{copy("İçerik türüne göre aktif kurallar ve ihlal puanları.", "Active rules and violation points by content type.")}</p></div>{rulesQuery.isLoading ? <p role="status">{copy("Kurallar yükleniyor…", "Loading rules…")}</p> : null}{rulesQuery.isError ? <p className="form-error">{copy("Kurallar şu anda yüklenemiyor.", "Rules are currently unavailable.")}</p> : null}<div className="help-rules-groups">{groups.map(([targetType, rules]) => <section className="admin-form" key={targetType}><h2>{(language === "tr" ? { tag: "İlgi alanları", event: "Etkinlikler", place: "Mekânlar", user: "Profiller", comment: "Postlar ve yorumlar", message: "Özel mesajlar", media: "Medya" } : { tag: "Interests", event: "Events", place: "Places", user: "Profiles", comment: "Posts and comments", message: "Private messages", media: "Media" })[targetType as "tag"] ?? targetType}</h2>{rules?.map((rule) => <details className="help-rule-card" key={rule.id}><summary><strong>{rule.title}</strong><span>{rule.violationScore} {copy("ihlal puanı", "violation points")}</span></summary>{rule.description ? <p>{rule.description}</p> : <p>{copy("Açıklama eklenmemiş.", "No description provided.")}</p>}</details>)}</section>)}</div>{!rulesQuery.isLoading && !groups.length ? <div className="help-empty">{copy("Aktif Konnektora kuralı bulunmuyor.", "No active Konnektora rules were found.")}</div> : null}</div>;
  }

  if (faqsQuery.isLoading) return <div className="page help-center-page"><h1>{copy("Yardım merkezi", "Help Centre")}</h1><p role="status">{copy("Yardım içerikleri yükleniyor…", "Loading help content…")}</p></div>;
  if (faqsQuery.isError) return <div className="page help-center-page"><h1>{copy("Yardım merkezi", "Help Centre")}</h1><p className="form-error">{copy("Yardım içerikleri şu anda yüklenemiyor.", "Help content is currently unavailable.")}</p></div>;

  if (faqId) {
    return (
      <div className="page help-center-page">
        <Link className="back-link" to={selectedFaq?.category ? `/help/faqs/${selectedFaq.category.slug}` : "/help/faqs"}><ArrowLeft size={16} /> {copy("Geri", "Back")}</Link>
        {selectedFaq ? (
          <article className="help-article">
            <span>{selectedFaq.category?.name}</span>
            <h1>{selectedFaq.title}</h1>
            <div>{selectedFaq.body.split(/\n{2,}/).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
            <footer><span>{copy("Aradığın yanıtı bulamadın mı?", "Could not find the answer?")}</span><Link to="/contact?type=faq">{copy("Destek ekibine yaz", "Contact support")}</Link></footer>
          </article>
        ) : <div className="help-empty"><h1>{copy("İçerik bulunamadı", "Content not found")}</h1><Link to="/help/faqs">{copy("Tüm sorulara dön", "Back to all questions")}</Link></div>}
      </div>
    );
  }

  if (categorySlug) {
    const category = categories.find((item) => item.slug === categorySlug);
    return (
      <div className="page help-center-page">
        <Link className="back-link" to="/help/faqs"><ArrowLeft size={16} /> {copy("SSS", "FAQ")}</Link>
        <div className="help-page-heading"><span className="eyebrow">{copy("SSS kategorisi", "FAQ category")}</span><h1>{category?.name ?? copy("Kategori bulunamadı", "Category not found")}</h1><p>{category?.description}</p></div>
        <div className="help-faq-list">
          {categoryFaqs.map((faq) => <Link key={faq.id} to={`/help/faq/${faq.id}`}><span>{faq.title}</span><ArrowRight size={18} /></Link>)}
          {!categoryFaqs.length ? <div className="help-empty">{copy("Bu kategoride aktif içerik bulunmuyor.", "There is no active content in this category.")}</div> : null}
        </div>
      </div>
    );
  }

  if (location.pathname.endsWith("/search")) {
    return (
      <div className="page help-center-page">
        <Link className="back-link" to="/help"><ArrowLeft size={16} /> {copy("Yardım merkezine dön", "Back to Help Centre")}</Link>
        <div className="help-page-heading"><span className="eyebrow">{copy("Arama", "Search")}</span><h1>{copy("SSS Arama Sonuçları", "FAQ Search Results")}</h1><p>{copy(`“${query}” için ${results.length} sonuç bulundu.`, `${results.length} results found for “${query}”.`)}</p></div>
        <SearchForm language={language} search={search} setSearch={setSearch} submit={submitSearch} />
        <div className="help-faq-list">
          {results.map((faq) => <Link key={faq.id} to={`/help/faq/${faq.id}`}><span><strong>{faq.title}</strong><small>{faq.category?.name}</small></span><ArrowRight size={18} /></Link>)}
          {!results.length ? <div className="help-empty"><Search size={28} /><strong>{copy("Aramanız için sonuç bulunamadı.", "No results matched your search.")}</strong><span>{copy("Farklı bir ifade deneyebilir veya destek ekibine yazabilirsiniz.", "Try a different phrase or contact the support team.")}</span><Link to="/contact?type=faq">{copy("Destekle iletişime geç", "Contact support")}</Link></div> : null}
        </div>
      </div>
    );
  }

  if (location.pathname.endsWith("/faqs")) {
    return (
      <div className="page help-center-page">
        <Link className="back-link" to="/help"><ArrowLeft size={16} /> {copy("Yardım merkezine dön", "Back to Help Centre")}</Link>
        <div className="help-page-heading"><span className="eyebrow">{copy("Bilgi bankası", "Knowledge base")}</span><h1>{copy("Sık Sorulan Sorular", "Frequently Asked Questions")}</h1><p>{copy("Konulara göre düzenlenmiş sık sorulan sorular.", "Frequently asked questions organised by topic.")}</p></div>
        <div className="help-category-grid">
          {categories.map((category) => <Link key={category.slug} to={`/help/faqs/${category.slug}`}><BookOpen size={24} /><h2>{category.name}</h2><p>{category.titles.slice(0, 3).join(", ")}</p><span>{category.titles.length} {copy("içerik", "articles")} <ArrowRight size={16} /></span></Link>)}
          {!categories.length ? <div className="help-empty">{copy("Henüz yayınlanmış SSS kategorisi bulunmuyor.", "No FAQ categories have been published yet.")}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="page help-center-page">
      <section className="help-hero">
        <span className="eyebrow">{copy("Konnektora Destek", "Konnektora Support")}</span>
        <h1>{copy("Yardım merkezi", "Help Centre")}</h1>
        <p>{copy("Nasıl yardımcı olabiliriz?", "How can we help?")}</p>
        <SearchForm language={language} search={search} setSearch={setSearch} submit={submitSearch} />
      </section>
      <section className="help-entry-grid">
        <Link to="/help/faqs"><BookOpen size={28} /><div><h2>{copy("Sık Sorulan Sorular", "Frequently Asked Questions")}</h2><p>{copy("Kategorilere göz at ve hızlı yanıtları bul.", "Browse categories and find quick answers.")}</p></div><ArrowRight /></Link>
        <Link to="/help/rules"><ShieldCheck size={28}/><div><h2>{copy("Konnektora Kuralları", "Konnektora Rules")}</h2><p>{copy("Topluluk standartlarını ve ihlal puanlarını incele.", "Review community standards and violation points.")}</p></div><ArrowRight/></Link>
        <Link to="/contact?type=faq"><MessageCircle size={28} /><div><h2>{copy("Destekle iletişime geç", "Contact support")}</h2><p>{copy("Ekibimize mesaj gönder; en kısa sürede yanıtlayalım.", "Send our team a message and we will reply as soon as possible.")}</p></div><ArrowRight /></Link>
      </section>
      <section className="help-popular">
        <div><LifeBuoy size={22} /><h2>{copy("Popüler sorular", "Popular questions")}</h2></div>
        <div className="help-faq-list">{faqs.slice(0, 5).map((faq) => <Link key={faq.id} to={`/help/faq/${faq.id}`}><span>{faq.title}</span><ArrowRight size={18} /></Link>)}</div>
      </section>
    </div>
  );
}

function SearchForm({ language, search, setSearch, submit }: { language: "tr" | "en"; search: string; setSearch: (value: string) => void; submit: (event: FormEvent) => void }) {
  return <form className="help-search" onSubmit={submit}><Search size={20} /><input aria-label={language === "tr" ? "Yardım içeriklerinde ara" : "Search help content"} onChange={(event) => setSearch(event.target.value)} placeholder={language === "tr" ? "Bir konu, özellik veya sorun ara" : "Search for a topic, feature or issue"} value={search} /><button type="submit">{language === "tr" ? "Ara" : "Search"}</button></form>;
}
