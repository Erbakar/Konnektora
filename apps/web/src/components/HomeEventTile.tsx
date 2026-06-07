import type { Event } from "@konnektora/shared";
import { CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";

const formatter = new Intl.DateTimeFormat("en", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit"
});

const visibilityLabel: Record<Event["visibility"], string> = {
  open: "Open",
  approval_required: "Approval",
  invite_only: "Invite only"
};

export function HomeEventTile({ event }: { event: Event }) {
  const location = [event.city, event.country].filter(Boolean).join(", ") || "Online";

  return (
    <Link className="home-event-tile" to={`/events/${event.slug}`}>
      <div className="home-event-tile-media">
        {event.coverImageUrl ? <img alt="" src={event.coverImageUrl} /> : <div className="home-event-tile-fallback" />}
        <span className="home-event-tile-badge">{visibilityLabel[event.visibility]}</span>
      </div>
      <div className="home-event-tile-body">
        <h3>{event.title}</h3>
        <p className="home-event-tile-meta">
          <CalendarDays size={15} />
          {formatter.format(new Date(event.startsAt))}
        </p>
        <p className="home-event-tile-organizer">by {event.organizerName || "Konnektora"}</p>
        <p className="home-event-tile-location">{location}</p>
      </div>
    </Link>
  );
}
