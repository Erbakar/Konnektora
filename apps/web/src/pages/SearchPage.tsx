import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DiscoveryCard } from "../components/DiscoveryCard";
import { searchDiscovery } from "../lib/api";
import { useLanguage } from "../lib/i18n";

export function SearchPage() {
  const { language } = useLanguage();
  const c = language === "tr" ? {
    eyebrow: "Konnektora Keşif", title: "Her şeyi ara", lead: "Üyeleri, ilgi alanlarını, etkinlikleri ve mekânları tek yerden bul.", search: "Ara", placeholder: "Her şeyi ara", min: "Aramak için en az iki karakter yaz.", results: "sonuçları", result: "sonuç", empty: "Eşleşen bir sonuç bulunamadı; ama dilerseniz böyle bir etiket oluşturabilirsiniz.", create: (value: string) => `“${value}” etiketini oluştur`,
  } : {
    eyebrow: "Konnektora Discovery", title: "Search everything", lead: "Find members, tags, events and places in one place.", search: "Search", placeholder: "Search everything", min: "Enter at least two characters to search.", results: "results", result: "results", empty: "No matching result was found, but you can create a tag with this name.", create: (value: string) => `Create “${value}” tag`,
  };
  const [params, setParams] = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const results = useQuery({ queryKey: ["discovery-search", query], queryFn: () => searchDiscovery(query), enabled: query.length >= 2 });
  return <section className="page search-page">
    <header><span className="eyebrow">{c.eyebrow}</span><h1>{c.title}</h1><p>{c.lead}</p></header>
    <form className="global-search" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const value = String(new FormData(event.currentTarget).get("q") ?? "").trim(); if (value.length >= 2) setParams({ q: value }); }}>
      <Search size={22} /><input aria-label={c.search} defaultValue={query} name="q" placeholder={c.placeholder} minLength={2} required /><button className="primary-action" type="submit">{c.search}</button>
    </form>
    {query.length >= 2 ? <div className="section-header"><h2>“{query}” {c.results}</h2><span>{results.data?.total ?? 0} {c.result}</span></div> : <p className="empty-state">{c.min}</p>}
    <div className="discovery-results">{results.data?.items.map((item) => <DiscoveryCard item={item} key={`${item.kind}-${item.id}`} />)}</div>
    {!results.isLoading && query.length >= 2 && !results.data?.items.length ? <div className="empty-state"><p>{c.empty}</p><Link className="primary-action" to={`/tags?create=${encodeURIComponent(query)}`}>{c.create(query)}</Link></div> : null}
  </section>;
}
