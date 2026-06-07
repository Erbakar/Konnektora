import type { Event } from "@konnektora/shared";
import { Calendar, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const formatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeStyle: "short"
});

export function EventCard({ event }: { event: Event }) {
  return (
    <article className="event-card">
      <div>
        <div className="event-meta">
          <span>{event.format}</span>
          <span>{event.language.toUpperCase()}</span>
        </div>
        <h3>
          <Link to={`/events/${event.slug}`}>{event.title}</Link>
        </h3>
        <p>{event.summary}</p>
      </div>
      <div className="event-details">
        <span>
          <Calendar size={16} />
          {formatter.format(new Date(event.startsAt))}
        </span>
        <span>
          <MapPin size={16} />
          {[event.city, event.country].filter(Boolean).join(", ") || "Online"}
        </span>
      </div>
      <div className="tag-row">
        {event.tags.map((tag) => (
          <span key={tag.id}>{tag.name}</span>
        ))}
      </div>
    </article>
  );
}

