import { useQueries, useQuery } from "@tanstack/react-query";
import { CalendarX, ListFilter, LoaderCircle, MapPinned, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EventCard } from "../components/EventCard";
import { LocationMap } from "../components/LocationMap";
import { getMyProfile, getUserSession, listEvents, listTags } from "../lib/api";
import { mockTags } from "../lib/mockData";

export function EventsPage() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [activePeriod, setActivePeriod] = useState("future");
  const [searchParams, setSearchParams] = useSearchParams();
  const user = getUserSession();
  const profile = useQuery({ queryKey: ["my-profile", user?.id, "event-discovery-location"], queryFn: getMyProfile, enabled: Boolean(user) });
  const selectedTag = searchParams.get("tag");
  const selectedFormat = searchParams.get("format") ?? "";
  const selectedQuery = searchParams.get("q") ?? "";
  const selectedDateFrom = searchParams.get("dateFrom") ?? "";
  const selectedCity = searchParams.get("city") ?? "";
  const selectedCountry = searchParams.get("country") ?? "";
  const currentDiscovery = activePeriod;
  const selectedPage = Number(searchParams.get("page") ?? "1");
  const hasFilters = [...searchParams.keys()].some((key) => key !== "page");
  const discoveryLocation = profile.data?.city || profile.data?.country || "Global";

  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: () => listTags(),
    placeholderData: mockTags
  });
  const { data: eventList, isLoading, isError, refetch } = useQuery({
    queryKey: ["events", searchParams.toString()],
    queryFn: () => listEvents(searchParams)
  });
  const events = eventList?.items ?? [];
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const discoveryDefinitions = [
    { key: "mine", title: "Etkinliklerim", params: { scope: "mine" }, auth: true },
    { key: "today", title: `Today in ${discoveryLocation} events`, params: { dateFrom: today.toISOString().slice(0, 10), dateTo: tomorrow.toISOString().slice(0, 10), ...(profile.data?.city ? { city: profile.data.city } : profile.data?.country ? { country: profile.data.country } : {}) }, auth: false },
    { key: "for_you", title: "Sana özel", params: { scope: "for_you" }, auth: true },
    { key: "online", title: "Online etkinlikler", params: { format: "online" }, auth: false },
    { key: "popular", title: `${discoveryLocation} içinde popüler etkinlikler`, params: { scope: "popular", ...(profile.data?.city ? { city: profile.data.city } : profile.data?.country ? { country: profile.data.country } : {}) }, auth: false },
    { key: "following", title: "Takip ettiklerinin etkinlikleri", params: { scope: "following" }, auth: true },
  ] as const;
  const discoveryQueries = useQueries({ queries: discoveryDefinitions.map((definition) => ({
    queryKey: ["events", "discovery-section", definition.key, definition.params],
    queryFn: () => listEvents(new URLSearchParams({ ...definition.params, pageSize: definition.key === "mine" ? "3" : "6" })),
    enabled: searchParams.size === 0 && (!definition.auth || Boolean(user)),
  })) });

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
    setActivePeriod(scope);
    const next = new URLSearchParams();
    const today = new Date();
    const start = new Date(today);
    const end = new Date(today);
    const day = today.getDay();
    if (scope === "24h") end.setDate(today.getDate() + 1);
    if (scope === "tomorrow") { start.setDate(today.getDate() + 1); end.setDate(today.getDate() + 2); }
    if (scope === "week") end.setDate(today.getDate() + (7 - day));
    if (scope === "weekend") { start.setDate(today.getDate() + ((6 - day + 7) % 7)); end.setDate(start.getDate() + 2); }
    if (scope === "next_week") { start.setDate(today.getDate() + (8 - day)); end.setDate(start.getDate() + 7); }
    if (scope === "month") end.setMonth(today.getMonth() + 1);
    if (["24h", "tomorrow", "week", "weekend", "next_week", "month"].includes(scope)) {
      next.set("dateFrom", start.toISOString().slice(0, 10));
      next.set("dateTo", end.toISOString().slice(0, 10));
    } else if (scope === "past") {
      next.set("dateTo", today.toISOString().slice(0, 10));
    } else {
      next.set("dateFrom", today.toISOString().slice(0, 10));
    }
    setSearchParams(next);
  }

  return (
    <section className="page two-column events-page">
      <button className="mobile-filter-toggle secondary-action" aria-expanded={filtersOpen} aria-controls="event-filters" onClick={() => setFiltersOpen((open) => !open)} type="button"><ListFilter size={18} /> Filtrele &amp; Ara</button>
      <aside className={`filters ${filtersOpen ? "mobile-filters-open" : ""}`} id="event-filters">
        <h2>Filtreler</h2>
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
          Tarih
          <input type="date" value={selectedDateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} />
        </label>
        <label>
          Şehir
          <input placeholder="İstanbul" value={selectedCity} onChange={(event) => updateFilter("city", event.target.value)} />
        </label>
        <div className="event-trendy-tags"><strong>Trend etiketler</strong><div className="event-tag-filter-cloud">{tags.map((tag) => (
          <button key={tag.id} className={selectedTag === tag.slug ? "active-filter" : ""} onClick={() => setSearchParams({ tag: tag.slug })} type="button"><span>#{tag.name}</span><small>{tag.eventCount ?? 0}</small></button>
        ))}</div></div>
        <label>
          Ülke
          <input placeholder="Türkiye" value={selectedCountry} onChange={(event) => updateFilter("country", event.target.value)} />
        </label>
        {hasFilters ? <button className="clear-filters-link" onClick={() => setSearchParams({})} type="button">Filtreleri temizle</button> : null}
      </aside>
      <div className="events-content">
        <div className="section-header events-page-header">
          <h1>Etkinlikler</h1>
          <div className="row-actions"><span>{isLoading ? "Yükleniyor…" : isError ? "Veri alınamadı" : `${eventList?.total ?? 0} sonuç`}</span><button className="create-inline-link" onClick={() => setMapOpen((open) => !open)}><MapPinned size={16}/>{mapOpen ? "Listeyi göster" : "Haritada göster"}</button><Link className="create-inline-link events-create-button" to="/events/create"><Plus size={16}/> Etkinlik oluştur</Link></div>
        </div>
        <nav className="discovery-tabs" aria-label="Etkinlik grupları">
          {([["future", "Tüm gelecek"], ["24h", "24 saat"], ["tomorrow", "Yarın"], ["week", "Bu hafta"], ["weekend", "Bu hafta sonu"], ["next_week", "Gelecek hafta"], ["month", "Bu ay"], ["past", "Geçmiş"]] as const).map(([scope, label]) => (
            <button key={scope} className={currentDiscovery === scope ? "active" : ""} onClick={() => selectDiscovery(scope)} type="button">{label}</button>
          ))}
        </nav>
        {isLoading ? <div className="empty-state"><LoaderCircle className="spin" size={34}/><p>Etkinlikler yükleniyor…</p></div> : null}
        {isError ? <div className="empty-state"><CalendarX size={40}/><h2>Etkinlikler yüklenemedi</h2><p>Bağlantını kontrol edip yeniden deneyebilirsin.</p><button className="secondary-action" onClick={() => void refetch()}><RefreshCw size={17}/>Yeniden dene</button></div> : null}
        {!mapOpen && searchParams.size === 0 ? <div className="event-discovery-sections">
          {discoveryDefinitions.map((definition, index) => {
            const items = discoveryQueries[index]?.data?.items ?? [];
            if (!items.length && definition.key !== "mine") return null;
            const allParams = new URLSearchParams(definition.params);
            return <section className={`event-discovery-section event-discovery-${definition.key}`} key={definition.key}><header><h2>{definition.title}</h2>{items.length ? <Link to={`/events?${allParams.toString()}`}>Tümünü göster</Link> : null}</header>{items.length ? <div className="event-grid">{items.map((event) => <EventCard event={event} key={event.id}/>)}</div> : <p className="empty-state">Katıldığınız ve yöneticisi olduğunuz etkinlikler burada gösterilecek</p>}</section>;
          })}
        </div> : mapOpen ? <LocationMap items={events.map((event) => ({ id: event.id, title: event.title, latitude: event.latitude, longitude: event.longitude, location: [event.city, event.country].filter(Boolean).join(", ") || "Online" }))}/> : <div className="event-grid">
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
