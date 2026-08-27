import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, LifeBuoy, MessageCircle, Search, ShieldCheck } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { listPublicFaqs, listReportRules } from "../lib/api";

function normalize(value: string) {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function HelpCenterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { categorySlug, faqId } = useParams();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const [search, setSearch] = useState(query);
  const faqsQuery = useQuery({ queryKey: ["public-faqs"], queryFn: listPublicFaqs });
  const rulesQuery = useQuery({ queryKey: ["public-report-rules"], queryFn: () => listReportRules(), enabled: location.pathname.endsWith("/rules") });
  const faqs = faqsQuery.data ?? [];
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
    return <main className="page help-center-page"><Link className="back-link" to="/help"><ArrowLeft size={16}/> Yardım merkezine dön</Link><div className="help-page-heading"><span className="eyebrow">Topluluk standartları</span><h1>Konnektora Kuralları</h1><p>İçerik türüne göre aktif kurallar ve ihlal puanları.</p></div>{rulesQuery.isLoading ? <p role="status">Kurallar yükleniyor…</p> : null}{rulesQuery.isError ? <p className="form-error">Kurallar şu anda yüklenemiyor.</p> : null}<div className="help-rules-groups">{groups.map(([targetType, rules]) => <section className="admin-form" key={targetType}><h2>{({ tag: "İlgi alanları", event: "Etkinlikler", place: "Mekânlar", user: "Profiller", comment: "Postlar ve yorumlar", message: "Özel mesajlar", media: "Medya" } as Record<string, string>)[targetType] ?? targetType}</h2>{rules?.map((rule) => <details className="help-rule-card" key={rule.id}><summary><strong>{rule.title}</strong><span>{rule.violationScore} ihlal puanı</span></summary>{rule.description ? <p>{rule.description}</p> : <p>Açıklama eklenmemiş.</p>}</details>)}</section>)}</div>{!rulesQuery.isLoading && !groups.length ? <div className="help-empty">Aktif Konnektora kuralı bulunmuyor.</div> : null}</main>;
  }

  if (faqsQuery.isLoading) return <main className="page help-center-page"><p role="status">Yardım içerikleri yükleniyor…</p></main>;
  if (faqsQuery.isError) return <main className="page help-center-page"><p className="form-error">Yardım içerikleri şu anda yüklenemiyor.</p></main>;

  if (faqId) {
    return (
      <main className="page help-center-page">
        <Link className="back-link" to={selectedFaq?.category ? `/help/faqs/${selectedFaq.category.slug}` : "/help/faqs"}><ArrowLeft size={16} /> Geri</Link>
        {selectedFaq ? (
          <article className="help-article">
            <span>{selectedFaq.category?.name}</span>
            <h1>{selectedFaq.title}</h1>
            <div>{selectedFaq.body.split(/\n{2,}/).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
            <footer><span>Aradığın yanıtı bulamadın mı?</span><Link to="/contact">Destek ekibine yaz</Link></footer>
          </article>
        ) : <div className="help-empty"><h1>İçerik bulunamadı</h1><Link to="/help/faqs">Tüm sorulara dön</Link></div>}
      </main>
    );
  }

  if (categorySlug) {
    const category = categories.find((item) => item.slug === categorySlug);
    return (
      <main className="page help-center-page">
        <Link className="back-link" to="/help/faqs"><ArrowLeft size={16} /> FAQ</Link>
        <div className="help-page-heading"><span className="eyebrow">FAQ kategorisi</span><h1>{category?.name ?? "Kategori bulunamadı"}</h1><p>{category?.description}</p></div>
        <div className="help-faq-list">
          {categoryFaqs.map((faq) => <Link key={faq.id} to={`/help/faq/${faq.id}`}><span>{faq.title}</span><ArrowRight size={18} /></Link>)}
          {!categoryFaqs.length ? <div className="help-empty">Bu kategoride aktif içerik bulunmuyor.</div> : null}
        </div>
      </main>
    );
  }

  if (location.pathname.endsWith("/search")) {
    return (
      <main className="page help-center-page">
        <Link className="back-link" to="/help"><ArrowLeft size={16} /> Yardım merkezine dön</Link>
        <div className="help-page-heading"><span className="eyebrow">Arama</span><h1>FAQ Arama Sonuçları</h1><p>“{query}” için {results.length} sonuç bulundu.</p></div>
        <SearchForm search={search} setSearch={setSearch} submit={submitSearch} />
        <div className="help-faq-list">
          {results.map((faq) => <Link key={faq.id} to={`/help/faq/${faq.id}`}><span><strong>{faq.title}</strong><small>{faq.category?.name}</small></span><ArrowRight size={18} /></Link>)}
          {!results.length ? <div className="help-empty"><Search size={28} /><strong>Aramanız için sonuç bulunamadı.</strong><span>Farklı bir ifade deneyebilir veya destek ekibine yazabilirsiniz.</span><Link to="/contact">Destekle iletişime geç</Link></div> : null}
        </div>
      </main>
    );
  }

  if (location.pathname.endsWith("/faqs")) {
    return (
      <main className="page help-center-page">
        <Link className="back-link" to="/help"><ArrowLeft size={16} /> Yardım merkezine dön</Link>
        <div className="help-page-heading"><span className="eyebrow">Bilgi bankası</span><h1>FAQ</h1><p>Konulara göre düzenlenmiş sık sorulan sorular.</p></div>
        <div className="help-category-grid">
          {categories.map((category) => <Link key={category.slug} to={`/help/faqs/${category.slug}`}><BookOpen size={24} /><h2>{category.name}</h2><p>{category.titles.slice(0, 3).join(", ")}</p><span>{category.titles.length} içerik <ArrowRight size={16} /></span></Link>)}
          {!categories.length ? <div className="help-empty">Henüz yayınlanmış FAQ kategorisi bulunmuyor.</div> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="page help-center-page">
      <section className="help-hero">
        <span className="eyebrow">Konnektora Destek</span>
        <h1>Yardım merkezi</h1>
        <p>Nasıl yardımcı olabiliriz?</p>
        <SearchForm search={search} setSearch={setSearch} submit={submitSearch} />
      </section>
      <section className="help-entry-grid">
        <Link to="/help/faqs"><BookOpen size={28} /><div><h2>FAQ ana sayfası</h2><p>Kategorilere göz at ve hızlı yanıtları bul.</p></div><ArrowRight /></Link>
        <Link to="/help/rules"><ShieldCheck size={28}/><div><h2>Konnektora Rules</h2><p>Topluluk standartlarını ve ihlal puanlarını incele.</p></div><ArrowRight/></Link>
        <Link to="/contact"><MessageCircle size={28} /><div><h2>Destekle iletişime geç</h2><p>Ekibimize mesaj gönder; en kısa sürede yanıtlayalım.</p></div><ArrowRight /></Link>
      </section>
      <section className="help-popular">
        <div><LifeBuoy size={22} /><h2>Popüler sorular</h2></div>
        <div className="help-faq-list">{faqs.slice(0, 5).map((faq) => <Link key={faq.id} to={`/help/faq/${faq.id}`}><span>{faq.title}</span><ArrowRight size={18} /></Link>)}</div>
      </section>
    </main>
  );
}

function SearchForm({ search, setSearch, submit }: { search: string; setSearch: (value: string) => void; submit: (event: FormEvent) => void }) {
  return <form className="help-search" onSubmit={submit}><Search size={20} /><input aria-label="Yardım içeriklerinde ara" onChange={(event) => setSearch(event.target.value)} placeholder="Bir konu, özellik veya sorun ara" value={search} /><button type="submit">Ara</button></form>;
}
