import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
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
      <p className="eyebrow">{event.format}</p>
      <h1>{event.title}</h1>
      <p className="lead">{event.summary}</p>
      <div className="detail-meta">
        <span>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "full", timeStyle: "short" }).format(new Date(event.startsAt))}</span>
        <span>{event.timezone}</span>
        <span>{[event.city, event.country].filter(Boolean).join(", ") || "Online"}</span>
      </div>
      <div className="tag-row">
        {event.tags.map((tag) => (
          <span key={tag.id}>{tag.name}</span>
        ))}
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

