import type { Event } from "@konnektora/shared";
import { Calendar, MapPin, Users } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { DistanceLabel } from "./DistanceLabel";
import { getUserSession, recordContentImpression, rememberContentSource, resolveMediaUrl } from "../lib/api";
import { formatEventDateRange, localizeCityName, localizeCountryName } from "../lib/formats";
import { useLanguage } from "../lib/i18n";

export function EventCard({ event, displayTitle }: { event: Event; displayTitle?: string }) {
  const cardRef = useRef<HTMLElement>(null);
  const { language } = useLanguage();
  const locale = language === "tr" ? "tr-TR" : "en-GB";
  const viewer = getUserSession();
  const city = localizeCityName(event.city, language);
  const country = localizeCountryName(event.country, language);
  const venue = event.place?.name ?? event.locationName;
  const locationFallback = language === "tr" ? "Mekân açıklanacak" : "Venue to be announced";
  const sameCountry = Boolean(viewer?.country && event.country && viewer.country.localeCompare(event.country, undefined, { sensitivity: "accent" }) === 0);
  const sameCity = Boolean(viewer?.city && event.city && viewer.city.localeCompare(event.city, undefined, { sensitivity: "accent" }) === 0);
  const offlineLocation = sameCity
    ? venue || event.city || locationFallback
    : viewer?.country && !sameCountry
      ? [city, country].filter(Boolean).join(", ") || locationFallback
      : [venue, city, !viewer ? country : null].filter(Boolean).join(", ") || locationFallback;
  const onlineLabel = language === "tr" ? "Çevrim içi" : "Online";
  const hybridLocation = sameCity
    ? venue || event.city || locationFallback
    : viewer?.country && !sameCountry
      ? country || city || locationFallback
      : city || venue || country || locationFallback;
  const location = event.format === "online" ? onlineLabel : event.format === "hybrid" ? `${onlineLabel} & ${hybridLocation}` : offlineLocation;
  const visibility = event.visibility === "invite_only"
    ? language === "tr" ? "Sadece davetli" : "Invite only"
    : event.visibility === "approval_required"
      ? language === "tr" ? "Onay gerekli" : "Approval required"
      : language === "tr" ? "Herkese açık" : "Open to everyone";
  const attendeeCount = event.attendeeCount ?? 0;
  const invitedCount = event.invitedCount ?? 0;
  const followingCount = event.followingAttendeeCount ?? 0;
  const communitySummary = followingCount > 0
    ? `${attendeeCount || invitedCount} ${attendeeCount ? (language === "tr" ? "katılımcı" : "attendees") : (language === "tr" ? "davetli" : "invited")} · ${followingCount} ${language === "tr" ? "takip ettiğiniz" : "you follow"}`
    : invitedCount > 0
      ? `${attendeeCount} ${language === "tr" ? "katılımcı" : attendeeCount === 1 ? "attendee" : "attendees"} · ${invitedCount} ${language === "tr" ? "davetli" : "invited"}`
      : `${attendeeCount} ${language === "tr" ? "katılımcı" : attendeeCount === 1 ? "attendee" : "attendees"}`;
  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.35)) {
        void recordContentImpression("event", event.id);
        observer.disconnect();
      }
    }, { threshold: [0.35] });
    observer.observe(element);
    return () => observer.disconnect();
  }, [event.id]);
  return (
    <article className="event-card" ref={cardRef}>
      <Link className={`event-card-media${event.coverImageUrl ? "" : " event-card-media-fallback"}`} onClick={() => rememberContentSource("event", event.id)} to={`/events/${event.slug}`}>
        {event.coverImageUrl ? <img alt="" src={resolveMediaUrl(event.coverImageUrl)} /> : <Calendar aria-hidden="true" size={34}/>}<span className="event-card-visibility-badge">{visibility}</span>
      </Link>
      <div>
        <h3>
          <Link onClick={() => rememberContentSource("event", event.id)} to={`/events/${event.slug}`}>{displayTitle ?? event.title}</Link>
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
          {communitySummary}
        </span>
        <DistanceLabel latitude={event.latitude} longitude={event.longitude}/>
      </div>
    </article>
  );
}
