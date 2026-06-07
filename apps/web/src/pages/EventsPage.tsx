import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { EventCard } from "../components/EventCard";
import { listEvents, listTags } from "../lib/api";

export function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTag = searchParams.get("tag");

  const { data: tags = [] } = useQuery({ queryKey: ["tags"], queryFn: listTags });
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", selectedTag],
    queryFn: () => listEvents(searchParams)
  });

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
      </aside>
      <div>
        <div className="section-header">
          <h1>Etkinlikler</h1>
          <span>{isLoading ? "Yükleniyor" : `${events.length} sonuç`}</span>
        </div>
        <div className="event-grid">
          {events.map((event) => (
            <EventCard event={event} key={event.id} />
          ))}
        </div>
      </div>
    </section>
  );
}

