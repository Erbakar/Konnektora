import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { DiscoveryCard } from "../components/DiscoveryCard";
import { searchDiscovery } from "../lib/api";

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const results = useQuery({ queryKey: ["discovery-search", query], queryFn: () => searchDiscovery(query), enabled: query.length >= 2 });
  return <section className="page search-page">
    <header><span className="eyebrow">Konnektora Keşif</span><h1>Her şeyi ara</h1><p>Üyeleri, ilgi alanlarını, etkinlikleri ve mekânları tek yerden bul.</p></header>
    <form className="global-search" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const value = String(new FormData(event.currentTarget).get("q") ?? "").trim(); if (value.length >= 2) setParams({ q: value }); }}>
      <Search size={22} /><input aria-label="Arama" defaultValue={query} name="q" placeholder="Her şeyi ara" minLength={2} required /><button className="primary-action" type="submit">Ara</button>
    </form>
    {query.length >= 2 ? <div className="section-header"><h2>“{query}” sonuçları</h2><span>{results.data?.total ?? 0} sonuç</span></div> : <p className="empty-state">Aramak için en az iki karakter yaz.</p>}
    <div className="discovery-results">{results.data?.items.map((item) => <DiscoveryCard item={item} key={`${item.kind}-${item.id}`} />)}</div>
    {!results.isLoading && query.length >= 2 && !results.data?.items.length ? <p className="empty-state">Eşleşen bir sonuç bulunamadı.</p> : null}
  </section>;
}
