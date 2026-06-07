import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ExternalLink, MapPin, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useParams } from "react-router-dom";
import { getEvent } from "../lib/api";

export function EventDetailPage() {
  const { slug = "" } = useParams();
  const { data: event, isLoading } = useQuery({
    queryKey: ["event", slug],
    queryFn: () => getEvent(slug),
    enabled: Boolean(slug)
  });

  if (isLoading) {
    return <section className="page">Etkinlik yükleniyor...</section>;
  }

  if (!event) {
    return <section className="page">Etkinlik bulunamadı.</section>;
  }

  return (
    <article className="page detail-page">
      {event.coverImageUrl ? (
        <div className="detail-media">
          <img alt="" src={event.coverImageUrl} />
        </div>
      ) : null}
      <p className="eyebrow">
        {event.format} · {event.visibility.replace("_", " ")}
      </p>
      <h1>{event.title}</h1>
      <p className="lead">{event.summary}</p>
      <div className="detail-meta">
        <span>
          <CalendarDays size={16} />
          {new Intl.DateTimeFormat("tr-TR", { dateStyle: "full", timeStyle: "short" }).format(new Date(event.startsAt))}
        </span>
        <span>{event.timezone}</span>
        <span>
          <MapPin size={16} />
          {[event.city, event.country].filter(Boolean).join(", ") || "Online"}
        </span>
        <span>
          <ShieldCheck size={16} />
          {event.organizerName || "Konnektora community"}
        </span>
      </div>
      <div className="tag-row">
        {event.tags.map((tag) => (
          <span key={tag.id}>{tag.name}</span>
        ))}
      </div>
      <div className="detail-actions">
        <button className="primary-action" type="button">
          <Users size={18} />
          Attend
        </button>
        <button className="secondary-action" type="button">
          <UserPlus size={18} />
          Invite
        </button>
      </div>
      <p className="detail-copy">{event.description}</p>
      {event.externalRegistrationUrl ? (
        <a className="primary-action" href={event.externalRegistrationUrl} rel="noreferrer" target="_blank">
          Kayıt sayfası
          <ExternalLink size={18} />
        </a>
      ) : null}
    </article>
  );
}
