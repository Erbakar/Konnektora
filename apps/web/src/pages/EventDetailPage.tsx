import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarDays, ExternalLink, Flag, MapPin, ShieldCheck, UserPlus, Users } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createContentReport, getEvent, getUserSession, requestEventAttendance } from "../lib/api";

export function EventDetailPage() {
  const { slug = "" } = useParams();
  const user = getUserSession();
  const [reportOpen, setReportOpen] = useState(false);
  const { data: event, isLoading } = useQuery({
    queryKey: ["event", slug],
    queryFn: () => getEvent(slug),
    enabled: Boolean(slug)
  });
  const attendMutation = useMutation({
    mutationFn: requestEventAttendance
  });
  const reportMutation = useMutation({
    mutationFn: createContentReport
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
      <div className="detail-meta">
        <span>
          <CalendarDays size={16} />
          {new Intl.DateTimeFormat("tr-TR", { dateStyle: "full", timeStyle: "short" }).format(new Date(event.startsAt))}
        </span>
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
        {user ? (
          <button
            className="primary-action"
            disabled={attendMutation.isPending}
            onClick={() => attendMutation.mutate(event.id)}
            type="button"
          >
            <Users size={18} />
            {attendMutation.isPending ? "Sending" : "Attend"}
          </button>
        ) : (
          <Link className="primary-action" to="/account">
            <Users size={18} />
            Log in to attend
          </Link>
        )}
        <a
          className="secondary-action"
          href={`mailto:?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(
            `${event.title}\n\n${window.location.href}`
          )}`}
        >
          <UserPlus size={18} />
          Invite
        </a>
        {user ? (
          <button className="ghost-action" onClick={() => setReportOpen((current) => !current)} type="button">
            <Flag size={18} />
            Raporla
          </button>
        ) : null}
      </div>
      {reportOpen ? (
        <form
          className="admin-form compact-form"
          onSubmit={(submitEvent: FormEvent<HTMLFormElement>) => {
            submitEvent.preventDefault();
            const form = new FormData(submitEvent.currentTarget);
            reportMutation.mutate({
              targetType: "event",
              targetId: event.id,
              reason: String(form.get("reason")),
              details: String(form.get("details") || "") || undefined
            });
            submitEvent.currentTarget.reset();
          }}
        >
          <label>
            Rapor sebebi
            <input name="reason" placeholder="Yanıltıcı bilgi, uygunsuz içerik..." required minLength={3} maxLength={120} />
          </label>
          <label>
            Detay
            <textarea name="details" rows={3} maxLength={1000} />
          </label>
          <button className="secondary-action" disabled={reportMutation.isPending} type="submit">
            <Flag size={18} />
            {reportMutation.isPending ? "Gönderiliyor" : "Rapor gönder"}
          </button>
        </form>
      ) : null}
      {attendMutation.data ? (
        <p className="form-success">
          {attendMutation.data.status === "accepted"
            ? "Katılımın onaylandı."
            : "Katılım talebin organizatöre gönderildi."}
        </p>
      ) : null}
      {attendMutation.isError ? <p className="form-error">Katılım talebi gönderilemedi. Lütfen tekrar dene.</p> : null}
      {reportMutation.data ? <p className="form-success">Rapor alındı. Admin panelde incelenecek.</p> : null}
      {reportMutation.isError ? <p className="form-error">Rapor gönderilemedi. Lütfen tekrar dene.</p> : null}
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
