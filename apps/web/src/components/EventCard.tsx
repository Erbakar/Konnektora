import type { Event } from "@konnektora/shared";
import { Calendar, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { DistanceLabel } from "./DistanceLabel";
import { resolveMediaUrl } from "../lib/api";
import { formatEventDateRange } from "../lib/formats";
import { useLanguage } from "../lib/i18n";

export function EventCard({ event }: { event: Event }) {
  const { language } = useLanguage();
  const locale = language === "tr" ? "tr-TR" : "en-GB";
  const place = [event.city, event.country].filter(Boolean).join(", ");
  const locationFallback = language === "tr" ? "Mekân açıklanacak" : "Venue to be announced";
  const location = event.format === "online" ? (language === "tr" ? "Çevrim içi" : "Online") : event.format === "hybrid" ? `${language === "tr" ? "Çevrim içi" : "Online"} & ${place || locationFallback}` : place || locationFallback;
  const visibility = event.visibility === "invite_only"
    ? language === "tr" ? "Sadece davetli" : "Invite only"
    : event.visibility === "approval_required"
      ? language === "tr" ? "Onay gerekli" : "Approval required"
      : language === "tr" ? "Herkese açık" : "Open to everyone";
  return (
    <article className="event-card">
      <Link className={`event-card-media${event.coverImageUrl ? "" : " event-card-media-fallback"}`} to={`/events/${event.slug}`}>
        {event.coverImageUrl ? <img alt="" src={resolveMediaUrl(event.coverImageUrl)} /> : <Calendar aria-hidden="true" size={34}/>}<span className="event-card-visibility-badge">{visibility}</span>
      </Link>
      <div>
        <h3>
          <Link to={`/events/${event.slug}`}>{event.title}</Link>
        </h3>
      </div>
      <div className="event-details">
        <span>
          <Calendar size={16} />
          {formatEventDateRange(event.startsAt, event.endsAt, { locale })}
        </span>
        <span>
          <MapPin size={16} />
          {location}
        </span>
        <span>
          <Users size={16} />
          {event.attendeeCount ?? 0} {language === "tr" ? "katılımcı" : "attendees"}
        </span>
        <DistanceLabel latitude={event.latitude} longitude={event.longitude}/>
      </div>
    </article>
  );
}
