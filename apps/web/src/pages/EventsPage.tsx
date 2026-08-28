import { useQueries, useQuery } from "@tanstack/react-query";
import type { Event, EventList } from "@konnektora/shared";
import { CalendarX, ListFilter, LoaderCircle, MapPinned, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EventCard } from "../components/EventCard";
import { LocationMap } from "../components/LocationMap";
import { getDiscoveryFeed, getMyProfile, getUserSession, listEvents, listTags } from "../lib/api";
import { mockTags } from "../lib/mockData";
import { useLanguage } from "../lib/i18n";

const pageCopy = {
  tr: {
    filters: "Filtreler", filterSearch: "Filtrele & Ara", search: "Arama", searchPlaceholder: "Kurucu, SaaS, yatırımcı...",
    format: "Format", all: "Tümü", online: "Çevrim içi", offline: "Fiziksel", hybrid: "Hibrit", date: "Tarih",
    city: "Şehir", cityPlaceholder: "İstanbul", country: "Ülke", countryPlaceholder: "Türkiye", trendTags: "Trend etiketler",
    clearFilters: "Filtreleri temizle", title: "Etkinlikler", loading: "Yükleniyor…", unavailable: "Veri alınamadı",
    showMap: "Haritada göster", showList: "Listeyi göster", create: "Etkinlik oluştur", groups: "Etkinlik grupları",
    future: "Tüm gelecek", next24: "24 saat", tomorrow: "Yarın", week: "Bu hafta", weekend: "Bu hafta sonu",
    nextWeek: "Gelecek hafta", month: "Bu ay", past: "Geçmiş", allUpcoming: "Tüm etkinlikler",
    mine: "Etkinliklerim", invited: "Davet edildiklerim", today: (location: string) => `${location} için bugünkü etkinlikler`,
    forYou: "Sana özel", onlineEvents: "Çevrim içi etkinlikler", popular: (location: string) => `${location} içinde popüler etkinlikler`,
    following: "Takip ettiklerinin etkinlikleri", locationEvents: (location: string) => `${location} etkinlikleri`, individual: "Bireysel etkinlikler",
    seeAll: "Tümünü göster", myEmpty: "Katıldığın ve yöneticisi olduğun etkinlikler burada gösterilecek.",
    loadingEvents: "Etkinlikler yükleniyor…", loadFailed: "Etkinlikler yüklenemedi", retryCopy: "Bağlantını kontrol edip yeniden deneyebilirsin.",
    retry: "Yeniden dene", noResults: "Bu filtrelerle etkinlik bulunamadı.", previous: "Önceki", next: "Sonraki",
    page: (page: number, size: number) => `Sayfa ${page} · ${size} kayıt/sayfa`, goToPage: (page: number) => `${page}. sayfaya git`, result: (total: number) => `${total} sonuç`, global: "Global",
  },
  en: {
    filters: "Filters", filterSearch: "Filter & Search", search: "Search", searchPlaceholder: "Founder, SaaS, investor...",
    format: "Format", all: "All", online: "Online", offline: "In person", hybrid: "Hybrid", date: "Date",
    city: "City", cityPlaceholder: "London", country: "Country", countryPlaceholder: "United Kingdom", trendTags: "Trending tags",
    clearFilters: "Clear filters", title: "Events", loading: "Loading…", unavailable: "Data unavailable",
    showMap: "Show on map", showList: "Show list", create: "Create event", groups: "Event groups",
    future: "All upcoming", next24: "24 hours", tomorrow: "Tomorrow", week: "This week", weekend: "This weekend",
    nextWeek: "Next week", month: "This month", past: "Past", allUpcoming: "All events",
    mine: "My events", invited: "Invited events", today: (location: string) => `Today's events in ${location}`,
    forYou: "For you", onlineEvents: "Online events", popular: (location: string) => `Popular events in ${location}`,
    following: "Events from people you follow", locationEvents: (location: string) => `Events in ${location}`, individual: "Community events",
    seeAll: "See all", myEmpty: "Events you attend or manage will appear here.",
    loadingEvents: "Loading events…", loadFailed: "Events could not be loaded", retryCopy: "Check your connection and try again.",
    retry: "Try again", noResults: "No events match these filters.", previous: "Previous", next: "Next",
    page: (page: number, size: number) => `Page ${page} · ${size} per page`, goToPage: (page: number) => `Go to page ${page}`, result: (total: number) => `${total} results`, global: "Global",
  },
} as const;

async function listAllDiscoveryEvents(params: Record<string, string>) {
  const items: Event[] = [];
  let page = 1;
  let result: EventList;

  do {
    result = await listEvents(new URLSearchParams({ ...params, page: String(page), pageSize: "100" }));
    items.push(...result.items);
    page += 1;
  } while (result.hasNextPage);

  return { ...result, items, page: 1, pageSize: Math.max(items.length, 1), hasNextPage: false };
}

export function EventsPage() {
  const { language } = useLanguage();
  const c = pageCopy[language];
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [activePeriod, setActivePeriod] = useState("future");
  const [searchParams, setSearchParams] = useSearchParams();
  const user = getUserSession();
  const profile = useQuery({ queryKey: ["my-profile", user?.id, "event-discovery-location"], queryFn: getMyProfile, enabled: Boolean(user) });
  const deviceDiscovery = useQuery({ queryKey: ["discovery-feed", "event-device-location"], queryFn: () => getDiscoveryFeed({ scope: "local" }) });
  const selectedTag = searchParams.get("tag");
  const selectedFormat = searchParams.get("format") ?? "";
  const selectedQuery = searchParams.get("q") ?? "";
  const selectedDateFrom = searchParams.get("dateFrom") ?? "";
  const selectedCity = searchParams.get("city") ?? "";
  const selectedCountry = searchParams.get("country") ?? "";
  const currentDiscovery = activePeriod;
  const requestedPage = Number(searchParams.get("page") ?? "1");
  const selectedPage = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const hasFilters = [...searchParams.keys()].some((key) => key !== "page");
  const discoveryLocation = profile.data?.city || profile.data?.country || c.global;
  const deviceLocation = deviceDiscovery.data?.location?.trim() ?? "";
  const showDeviceLocation = Boolean(user && deviceLocation && profile.data?.city && deviceLocation.toLocaleLowerCase("tr-TR") !== profile.data.city.toLocaleLowerCase("tr-TR"));

  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: () => listTags(),
    placeholderData: mockTags
  });
  const eventRequestParams = new URLSearchParams(searchParams);
  eventRequestParams.set("page", String(selectedPage));
  eventRequestParams.set("pageSize", "15");
  const { data: eventList, isLoading, isError, refetch } = useQuery({
    queryKey: ["events", eventRequestParams.toString()],
    queryFn: () => listEvents(eventRequestParams)
  });
  const events = eventList?.items ?? [];
  const totalPages = eventList ? Math.max(1, Math.ceil(eventList.total / eventList.pageSize)) : 1;
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const discoveryDefinitions = [
    { key: "mine", title: c.mine, params: { scope: "mine" }, auth: true },
    { key: "invited", title: c.invited, params: { scope: "invited" }, auth: true },
    { key: "today", title: c.today(discoveryLocation), params: { dateFrom: today.toISOString().slice(0, 10), dateTo: tomorrow.toISOString().slice(0, 10), ...(profile.data?.city ? { city: profile.data.city } : profile.data?.country ? { country: profile.data.country } : {}) }, auth: false },
    { key: "for_you", title: c.forYou, params: { scope: "for_you" }, auth: true },
    { key: "online", title: c.onlineEvents, params: { format: "online" }, auth: false },
    { key: "popular", title: c.popular(discoveryLocation), params: { scope: "popular", ...(profile.data?.city ? { city: profile.data.city } : {}), ...(profile.data?.country ? { country: profile.data.country } : {}) }, auth: false },
    { key: "following", title: c.following, params: { scope: "following" }, auth: true },
    ...(showDeviceLocation ? [{ key: "device_location", title: c.locationEvents(deviceLocation), params: { city: deviceLocation }, auth: false } as const] : []),
    { key: "individual", title: c.individual, params: { scope: "individual" }, auth: false },
  ] as const;
  const discoveryQueries = useQueries({ queries: discoveryDefinitions.map((definition) => ({
    queryKey: ["events", "discovery-section", definition.key, definition.params],
    queryFn: () => listAllDiscoveryEvents(definition.params),
    enabled: !hasFilters && selectedPage === 1 && (!definition.auth || Boolean(user)),
  })) });

  function updateFilter(key: string, value: string) {
    const nextParams = new URLSearchParams(searchParams);

    if (key === "page" && value === "1") {
      nextParams.delete("page");
    } else if (value) {
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
      <button className="mobile-filter-toggle secondary-action" aria-expanded={filtersOpen} aria-controls="event-filters" onClick={() => setFiltersOpen((open) => !open)} type="button"><ListFilter size={18} /> {c.filterSearch}</button>
      <aside className={`filters ${filtersOpen ? "mobile-filters-open" : ""}`} id="event-filters">
        <h2>{c.filters}</h2>
        <label>
          {c.search}
          <input
            placeholder={c.searchPlaceholder}
            value={selectedQuery}
            onChange={(event) => updateFilter("q", event.target.value)}
          />
        </label>
        <label>
          {c.format}
          <select value={selectedFormat} onChange={(event) => updateFilter("format", event.target.value)}>
            <option value="">{c.all}</option>
            <option value="online">{c.online}</option>
            <option value="offline">{c.offline}</option>
            <option value="hybrid">{c.hybrid}</option>
          </select>
        </label>
        <label>
          {c.date}
          <input type="date" value={selectedDateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} />
        </label>
        <label>
          {c.city}
          <input placeholder={c.cityPlaceholder} value={selectedCity} onChange={(event) => updateFilter("city", event.target.value)} />
        </label>
        <div className="event-trendy-tags"><strong>{c.trendTags}</strong><div className="event-tag-filter-cloud">{tags.filter((tag) => (tag.eventCount ?? 0) > 0).sort((a, b) => (b.eventCount ?? 0) - (a.eventCount ?? 0)).slice(0, 10).map((tag) => (
          <button key={tag.id} className={selectedTag === tag.slug ? "active-filter" : ""} onClick={() => setSearchParams({ tag: tag.slug })} type="button"><span>#{tag.name}</span><small>{tag.eventCount ?? 0}</small></button>
        ))}</div></div>
        <label>
          {c.country}
          <input placeholder={c.countryPlaceholder} value={selectedCountry} onChange={(event) => updateFilter("country", event.target.value)} />
        </label>
        {hasFilters ? <button className="clear-filters-link" onClick={() => setSearchParams({})} type="button">{c.clearFilters}</button> : null}
      </aside>
      <div className="events-content">
        <div className="section-header events-page-header">
          <h1>{c.title}</h1>
          <div className="row-actions"><span>{isLoading ? c.loading : isError ? c.unavailable : c.result(eventList?.total ?? 0)}</span><button className="create-inline-link" onClick={() => setMapOpen((open) => !open)}><MapPinned size={16}/>{mapOpen ? c.showList : c.showMap}</button><Link className="create-inline-link events-create-button" to="/events/create"><Plus size={16}/> {c.create}</Link></div>
        </div>
        <nav className="discovery-tabs" aria-label={c.groups}>
          {([["future", c.future], ["24h", c.next24], ["tomorrow", c.tomorrow], ["week", c.week], ["weekend", c.weekend], ["next_week", c.nextWeek], ["month", c.month], ["past", c.past]] as const).map(([scope, label]) => (
            <button key={scope} className={currentDiscovery === scope ? "active" : ""} onClick={() => selectDiscovery(scope)} type="button">{label}</button>
          ))}
        </nav>
        {isLoading ? <div className="empty-state"><LoaderCircle className="spin" size={34}/><p>{c.loadingEvents}</p></div> : null}
        {isError ? <div className="empty-state"><CalendarX size={40}/><h2>{c.loadFailed}</h2><p>{c.retryCopy}</p><button className="secondary-action" onClick={() => void refetch()}><RefreshCw size={17}/>{c.retry}</button></div> : null}
        {!mapOpen && !hasFilters ? <div className="event-discovery-sections">
          {events.length ? <section className="event-discovery-section event-discovery-all"><header><h2>{c.allUpcoming}</h2></header><div className="event-grid">{events.map((event) => <EventCard event={event} key={event.id}/>)}</div></section> : null}
          {selectedPage === 1 ? discoveryDefinitions.map((definition, index) => {
            if (definition.auth && !user) return null;
            const items = discoveryQueries[index]?.data?.items ?? [];
            if (!items.length && definition.key !== "mine") return null;
            const allParams = new URLSearchParams(definition.params);
            return <section className={`event-discovery-section event-discovery-${definition.key}`} key={definition.key}><header><h2>{definition.title}</h2>{items.length ? <Link to={`/events?${allParams.toString()}`}>{c.seeAll}</Link> : null}</header>{items.length ? <div className="event-grid">{items.map((event) => <EventCard event={event} key={event.id}/>)}</div> : <p className="empty-state">{c.myEmpty}</p>}</section>;
          }) : null}
        </div> : mapOpen ? <LocationMap items={events.map((event) => ({ id: event.id, title: event.title, latitude: event.latitude, longitude: event.longitude, location: [event.city, event.country].filter(Boolean).join(", ") || "Online" }))}/> : <div className="event-grid events-results-grid">
          {events.map((event) => (
            <EventCard event={event} key={event.id} />
          ))}
        </div>}
        {!isLoading && !isError && events.length === 0 ? <p className="empty-state">{c.noResults}</p> : null}
        {eventList ? (
          <nav className="pagination-row" aria-label={c.page(eventList.page, eventList.pageSize)}>
            <button
              className="secondary-action"
              disabled={selectedPage <= 1}
              onClick={() => updateFilter("page", String(Math.max(selectedPage - 1, 1)))}
              type="button"
            >
              {c.previous}
            </button>
            <div className="pagination-pages">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  aria-current={page === eventList.page ? "page" : undefined}
                  aria-label={c.goToPage(page)}
                  className={page === eventList.page ? "active" : ""}
                  key={page}
                  onClick={() => updateFilter("page", String(page))}
                  type="button"
                >
                  {page}
                </button>
              ))}
            </div>
            <span>{c.page(eventList.page, eventList.pageSize)}</span>
            <button
              className="secondary-action"
              disabled={!eventList.hasNextPage}
              onClick={() => updateFilter("page", String(selectedPage + 1))}
              type="button"
            >
              {c.next}
            </button>
          </nav>
        ) : null}
      </div>
    </section>
  );
}
