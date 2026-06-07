import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { EventCard } from "../components/EventCard";
import { listEvents } from "../lib/api";

export function HomePage() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", "home"],
    queryFn: () => listEvents()
  });

  return (
    <section className="page">
      <div className="hero">
        <div>
          <p className="eyebrow">EU etkinlik keşfi</p>
          <h1>Konnektora</h1>
          <p className="lead">
            Tag tabanlı keşif ve sade admin yönetimiyle topluluk, startup ve profesyonel
            etkinlikleri tek yerde organize edin.
          </p>
          <Link className="primary-action" to="/events">
            Etkinlikleri gör
            <ArrowRight size={18} />
          </Link>
        </div>
        <div className="hero-panel">
          <strong>Yaklaşan etkinlikler</strong>
          <span>{isLoading ? "Yükleniyor" : `${events.length} yayınlanmış etkinlik`}</span>
        </div>
      </div>
      <section className="section-header">
        <h2>Öne çıkan etkinlikler</h2>
        <Link to="/events">Tümünü gör</Link>
      </section>
      <div className="event-grid">
        {events.slice(0, 3).map((event) => (
          <EventCard event={event} key={event.id} />
        ))}
      </div>
    </section>
  );
}

