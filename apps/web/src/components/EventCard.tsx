import type { Event } from "@konnektora/shared";
import { Calendar, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { DistanceLabel } from "./DistanceLabel";
import { resolveMediaUrl } from "../lib/api";

const formatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeStyle: "short"
});

export function EventCard({ event }: { event: Event }) {
  const place = [event.city, event.country].filter(Boolean).join(", ");
  const location = event.format === "online" ? "Online" : event.format === "hybrid" ? `Online & ${place || "Mekân açıklanacak"}` : place || "Mekân açıklanacak";
  return (
    <article className="event-card">
      <Link className={`event-card-media${event.coverImageUrl ? "" : " event-card-media-fallback"}`} to={`/events/${event.slug}`}>
        {event.coverImageUrl ? <img alt="" src={resolveMediaUrl(event.coverImageUrl)} /> : <Calendar aria-hidden="true" size={34}/>}<span className="event-card-visibility-badge">{event.visibility === "invite_only" ? "Sadece davet" : event.visibility === "approval_required" ? "Onay gerekli" : "Herkese açık"}</span>
      </Link>
      <div>
        <h3>
          <Link to={`/events/${event.slug}`}>{event.title}</Link>
        </h3>
      </div>
      <div className="event-details">
        <span>
          <Calendar size={16} />
          {formatter.format(new Date(event.startsAt))}
        </span>
        <span>
          <MapPin size={16} />
          {location}
        </span>
        <span>
          <Users size={16} />
          {event.attendeeCount ?? 0} katılımcı
        </span>
        <DistanceLabel latitude={event.latitude} longitude={event.longitude}/>
      </div>
    </article>
  );
}
