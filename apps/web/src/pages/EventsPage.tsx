import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { EventCard } from "../components/EventCard";
import { listEvents, listTags } from "../lib/api";

export function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTag = searchParams.get("tag");
  const selectedFormat = searchParams.get("format") ?? "";
  const selectedLanguage = searchParams.get("language") ?? "";
  const selectedQuery = searchParams.get("q") ?? "";
  const selectedDateFrom = searchParams.get("dateFrom") ?? "";
  const selectedDateTo = searchParams.get("dateTo") ?? "";
  const selectedCity = searchParams.get("city") ?? "";
  const selectedCountry = searchParams.get("country") ?? "";
  const selectedPage = Number(searchParams.get("page") ?? "1");

  const { data: tags = [] } = useQuery({ queryKey: ["tags"], queryFn: listTags });
  const { data: eventList, isLoading } = useQuery({
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

  return (
    <section className="page two-column">
      <aside className="filters">
        <h2>Filtreler</h2>
        <button className={!selectedTag ? "active-filter" : ""} onClick={() => setSearchParams({})}>
          Tümü
        </button>
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
            <option value="offline">Offline</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </label>
        <label>
          Dil
          <select value={selectedLanguage} onChange={(event) => updateFilter("language", event.target.value)}>
            <option value="">Tümü</option>
            <option value="en">English</option>
            <option value="tr">Türkçe</option>
          </select>
        </label>
        <label>
          Başlangıç
          <input type="date" value={selectedDateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} />
        </label>
        <label>
          Bitiş
          <input type="date" value={selectedDateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} />
        </label>
        <label>
          Şehir
          <input placeholder="Istanbul" value={selectedCity} onChange={(event) => updateFilter("city", event.target.value)} />
        </label>
        <label>
          Ülke
          <input placeholder="Turkey" value={selectedCountry} onChange={(event) => updateFilter("country", event.target.value)} />
        </label>
      </aside>
      <div>
        <div className="section-header">
          <h1>Etkinlikler</h1>
          <span>{isLoading ? "Yükleniyor" : `${eventList?.total ?? 0} sonuç`}</span>
        </div>
        <div className="event-grid">
          {events.map((event) => (
            <EventCard event={event} key={event.id} />
          ))}
        </div>
        {!isLoading && events.length === 0 ? <p className="empty-state">Bu filtrelerle etkinlik bulunamadı.</p> : null}
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
