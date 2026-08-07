import { useQuery } from "@tanstack/react-query";
import { CalendarX, ListFilter, LoaderCircle, MapPinned, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EventCard } from "../components/EventCard";
import { LocationMap } from "../components/LocationMap";
import { getUserSession, listEvents, listTags } from "../lib/api";
import { mockTags } from "../lib/mockData";

export function EventsPage() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const user = getUserSession();
  const selectedScope = searchParams.get("scope") ?? "all";
  const selectedTag = searchParams.get("tag");
  const selectedFormat = searchParams.get("format") ?? "";
  const selectedQuery = searchParams.get("q") ?? "";
  const selectedDateFrom = searchParams.get("dateFrom") ?? "";
  const selectedCity = searchParams.get("city") ?? "";
  const selectedCountry = searchParams.get("country") ?? "";
  const currentDiscovery = selectedDateFrom ? "today" : selectedFormat === "online" ? "online" : selectedScope;
  const selectedPage = Number(searchParams.get("page") ?? "1");
  const hasFilters = [...searchParams.keys()].some((key) => key !== "page");

  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: listTags,
    placeholderData: mockTags
  });
  const { data: eventList, isLoading, isError, refetch } = useQuery({
    queryKey: ["events", searchParams.toString()],
    queryFn: () => listEvents(searchParams)
  });
  const events = eventList?.items ?? [];

  function updateFilter(key: string, value: string) {
    const nextParams = new URLSearchParams(searchParams);

    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }

    if (key !== "page") {
      nextParams.delete("page");
    }

    setSearchParams(nextParams);
  }

  function selectDiscovery(scope: string) {
    const next = new URLSearchParams();
    const today = new Date();
    if (scope === "today") {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      next.set("dateFrom", today.toISOString().slice(0, 10));
      next.set("dateTo", tomorrow.toISOString().slice(0, 10));
    } else if (scope === "online") next.set("format", "online");
    else if (scope !== "all") next.set("scope", scope);
    setSearchParams(next);
  }

  return (
    <section className="page two-column events-page">
      <button className="mobile-filter-toggle secondary-action" aria-expanded={filtersOpen} aria-controls="event-filters" onClick={() => setFiltersOpen((open) => !open)} type="button"><ListFilter size={18} /> Filtrele &amp; Ara</button>
      <aside className={`filters ${filtersOpen ? "mobile-filters-open" : ""}`} id="event-filters">
        <h2>Filtreler</h2>
        {tags.map((tag) => (
          <button
            key={tag.id}
            className={selectedTag === tag.slug ? "active-filter" : ""}
            onClick={() => setSearchParams({ tag: tag.slug })}
          >
            {tag.name}
          </button>
        ))}
        <label>
          Arama
          <input
            placeholder="Founder, SaaS, investor..."
            value={selectedQuery}
            onChange={(event) => updateFilter("q", event.target.value)}
          />
        </label>
        <label>
          Format
          <select value={selectedFormat} onChange={(event) => updateFilter("format", event.target.value)}>
            <option value="">Tümü</option>
            <option value="online">Online</option>
            <option value="offline">Fiziksel</option>
            <option value="hybrid">Hibrit</option>
          </select>
        </label>
        <label>
          Başlangıç
          <input type="date" value={selectedDateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} />
        </label>
        <label>
          Şehir
          <input placeholder="İstanbul" value={selectedCity} onChange={(event) => updateFilter("city", event.target.value)} />
        </label>
        <label>
          Ülke
          <input placeholder="Türkiye" value={selectedCountry} onChange={(event) => updateFilter("country", event.target.value)} />
        </label>
        {hasFilters ? <button className="clear-filters-link" onClick={() => setSearchParams({})} type="button">Filtreleri temizle</button> : null}
      </aside>
      <div className="events-content">
        <div className="section-header events-page-header">
          <h1>Etkinlikler</h1>
          <div className="row-actions"><span>{isLoading ? "Yükleniyor…" : isError ? "Veri alınamadı" : `${eventList?.total ?? 0} sonuç`}</span><button className="create-inline-link" onClick={() => setMapOpen((open) => !open)}><MapPinned size={16}/>{mapOpen ? "Listeyi göster" : "Haritada göster"}</button><Link className="create-inline-link events-create-button" to="/account#events"><Plus size={16}/> Etkinlik oluştur</Link></div>
        </div>
        <nav className="discovery-tabs" aria-label="Etkinlik grupları">
          {([["all", "Tümü"], ["mine", "Etkinliklerim"], ["today", "Bugün"], ["for_you", "Sana özel"], ["online", "Online"], ["popular", "Popüler"], ["following", "Takip ettiklerim"]] as const).map(([scope, label]) => (
            <button key={scope} className={currentDiscovery === scope ? "active" : ""} disabled={!user && ["mine", "for_you", "following"].includes(scope)} onClick={() => selectDiscovery(scope)} type="button">{label}</button>
          ))}
        </nav>
        {isLoading ? <div className="empty-state"><LoaderCircle className="spin" size={34}/><p>Etkinlikler yükleniyor…</p></div> : null}
        {isError ? <div className="empty-state"><CalendarX size={40}/><h2>Etkinlikler yüklenemedi</h2><p>Bağlantını kontrol edip yeniden deneyebilirsin.</p><button className="secondary-action" onClick={() => void refetch()}><RefreshCw size={17}/>Yeniden dene</button></div> : null}
        {mapOpen ? <LocationMap items={events.map((event) => ({ id: event.id, title: event.title, latitude: event.latitude, longitude: event.longitude, location: [event.city, event.country].filter(Boolean).join(", ") || "Online" }))}/> : <div className="event-grid">
          {events.map((event) => (
            <EventCard event={event} key={event.id} />
          ))}
        </div>}
        {!isLoading && !isError && events.length === 0 ? <p className="empty-state">Bu filtrelerle etkinlik bulunamadı.</p> : null}
        {eventList ? (
          <div className="pagination-row">
            <button
              className="secondary-action"
              disabled={selectedPage <= 1}
              onClick={() => updateFilter("page", String(Math.max(selectedPage - 1, 1)))}
              type="button"
            >
              Önceki
            </button>
            <span>
              Sayfa {eventList.page} · {eventList.pageSize} kayıt/sayfa
            </span>
            <button
              className="secondary-action"
              disabled={!eventList.hasNextPage}
              onClick={() => updateFilter("page", String(selectedPage + 1))}
              type="button"
            >
              Sonraki
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
